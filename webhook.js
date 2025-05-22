import express from "express";
import crypto from "crypto";
import logger from "../config/logger.js";
import sessionController from "../controllers/sessionController.js";
import chatbotController from "../controllers/chatbotController.js";

const router = express.Router();

// ───────────── Validação de Assinatura (Meta) ─────────────
function validateSignature(req) {
  try {
    const sig = req.headers["x-hub-signature-256"];
    if (!sig || !process.env.APP_SECRET || !req.rawBody) return false;

    const expectedHash = crypto
      .createHmac("sha256", process.env.APP_SECRET)
      .update(req.rawBody)
      .digest("hex");

    const expectedSignature = `sha256=${expectedHash}`;
    return crypto.timingSafeEqual(
      Buffer.from(sig),
      Buffer.from(expectedSignature)
    );
  } catch (err) {
    logger.warn("Erro ao validar assinatura:", err);
    return false;
  }
}

// ───────────── Verificação inicial GET (Meta) ─────────────
router.get("/", (req, res) => {
  const verifyToken = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (verifyToken === process.env.VERIFY_TOKEN) {
    logger.info("✅ Webhook verificado com sucesso!");
    return res.status(200).send(challenge);
  }

  logger.warn("❌ Token de verificação inválido");
  return res.sendStatus(403);
});

// ───────────── Recebimento de mensagens POST ─────────────
router.post("/", async (req, res) => {
  if (!validateSignature(req)) {
    logger.warn("⚠️ Assinatura inválida – possível spoof");
    return res.sendStatus(403);
  }

  try {
    const entry = req.body?.entry?.[0]?.changes?.[0]?.value;
    const msg = entry?.messages?.[0];

    if (!msg || !msg.from) return res.sendStatus(200);

    const from = msg.from;
    const nome = entry.contacts?.[0]?.profile?.name || "Cliente";

    const bodyTxt =
      msg.text?.body ||
      msg.button?.payload ||
      msg.button?.text ||
      msg.interactive?.button_reply?.id ||
      msg.interactive?.button_reply?.title ||
      msg.interactive?.list_reply?.id ||
      msg.interactive?.list_reply?.title ||
      "";

    const session = await sessionController.getState(from);

    logger.info(`📦 Sessão atual:`, session);
    const { nextState, messages } = await chatbotController.process(
      from,
      nome,
      bodyTxt,
      session.state
    );

    logger.info(`➡️ Próximo estado: ${nextState}`);
    await sessionController.updateState(from, nextState);

    for (const fn of messages) {
      try {
        if (typeof fn === "function") {
          await fn();
        } else {
          logger.warn("⚠️ Ignorando resposta inválida (não é função):", fn);
        }
      } catch (err) {
        logger.error("❌ Erro ao executar função de resposta:", err);
      }
    }

    res.sendStatus(200);
  } catch (err) {
    logger.error("❌ Erro no handler de mensagens:", err);
    res.sendStatus(500);
  }
});

export default router;
