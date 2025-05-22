import "dotenv/config";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import logger from "./config/logger.js";
import webhookRoutes from "./routes/webhook.js";
import mongoose from "mongoose";

const { PORT = 3000, MONGODB_URI } = process.env;
const app = express();

// 🔐 Buffer cru da requisição — essencial para a assinatura Meta
app.use('/webhook', express.json({ verify: rawBodyBuffer }), webhookRoutes);

// webhook.js
function rawBodyBuffer(req, res, buf) {
  if (buf && buf.length) {
    req.rawBody = buf.toString('utf8');
  }
}

// 🔌 Conexão MongoDB
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  logger.info("✅ Conectado ao MongoDB");
  app.listen(PORT, () => {
    logger.info(`🟢 Zapito ouvindo em http://localhost:${PORT}`);
  });
}).catch((err) => {
  logger.error("Erro ao conectar ao MongoDB", err);
});
