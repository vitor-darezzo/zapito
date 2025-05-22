const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const whatsapp = require('../service/whatsappservice');
const logger = require('../config/logger');
const Message = require('../models/message');
const crypto = require('crypto');

// Configuração do rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // Limite de 100 requisições por IP
  message: 'Too many requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});

// Middleware de validação de assinatura
const validateSignature = (req) => {
  const signature = req.headers['x-hub-signature-256'];
  if (!signature || !process.env.APP_SECRET) {
    logger.warn('Assinatura ou APP_SECRET faltando');
    return false;
  }

  const hash = crypto
    .createHmac('sha256', process.env.APP_SECRET)
    .update(JSON.stringify(req.body))
    .digest('hex');

  return signature === `sha256=${hash}`;
};

/**
 * @route POST /send
 * @description Envia mensagem via WhatsApp Business API
 * @access Public
 * @param {string} to - Número de telefone do destinatário
 * @param {string} templateName - Nome do template a ser enviado
 * @param {string} [language=pt_BR] - Idioma do template
 * @param {Array} [components=[]] - Componentes dinâmicos do template
 */
router.post('/send', limiter, async (req, res) => {
  // Validação básica dos campos obrigatórios
  const requiredFields = ['to', 'templateName'];
  const missingFields = requiredFields.filter(field => !req.body[field]);
  
  if (missingFields.length > 0) {
    logger.warn('Campos obrigatórios faltando', { missingFields });
    return res.status(400).json({
      status: 'error',
      error: `Campos obrigatórios faltando: ${missingFields.join(', ')}`
    });
  }

  // Validação de formato do número
  if (!/^\d{10,15}$/.test(req.body.to)) {
    logger.warn('Formato de número inválido', { to: req.body.to });
    return res.status(400).json({ 
      status: 'error',
      error: 'Formato de número inválido. Use formato internacional (ex: 5511999999999)' 
    });
  }

  // Validação de componentes
  if (req.body.components && !Array.isArray(req.body.components)) {
    return res.status(400).json({
      status: 'error',
      error: 'O campo components deve ser um array'
    });
  }

  // Validação de assinatura em produção
  if (process.env.NODE_ENV === 'production' && !validateSignature(req)) {
    logger.error('Assinatura inválida', { headers: req.headers });
    return res.status(403).json({ 
      status: 'error',
      error: 'Assinatura inválida' 
    });
  }

  try {
    // Envia a mensagem via WhatsApp Service
    const result = await whatsapp.sendTemplateMessage(
      req.body.to,
      req.body.templateName,
      req.body.language || 'pt_BR',
      req.body.components || []
    );

    // Registra no banco de dados
    const savedMessage = await Message.create({
      from: process.env.PHONE_NUMBER_ID,
      to: req.body.to,
      templateName: req.body.templateName,
      status: 'sent',
      messageId: result?.messages?.[0]?.id,
      timestamp: new Date()
    });

    logger.info('Mensagem enviada com sucesso', { 
      messageId: savedMessage._id,
      whatsappId: result?.messages?.[0]?.id,
      to: req.body.to
    });

    return res.json({ 
      status: 'success',
      data: {
        messageId: savedMessage._id,
        whatsappResponse: result
      }
    });

  } catch (err) {
    // Log de erro detalhado
    const errorDetails = {
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
      payload: req.body
    };
    
    logger.error('Falha no envio da mensagem', errorDetails);
    
    // Registra falha no banco
    await Message.create({
      from: process.env.PHONE_NUMBER_ID,
      to: req.body.to,
      templateName: req.body.templateName,
      status: 'failed',
      error: err.message,
      timestamp: new Date()
    });

    // Determina o código de status apropriado
    const statusCode = err.response?.status || 
                      err.statusCode || 
                      500;
    
    // Resposta de erro
    return res.status(statusCode).json({
      status: 'error',
      error: err.response?.data?.error?.message || 
             err.message || 
             'Erro interno no servidor',
      ...(process.env.NODE_ENV === 'development' && {
        details: errorDetails
      })
    });
  }
});

module.exports = router;