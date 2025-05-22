// services/whatsappService.js – compatível com dois formatos de chamada
// -----------------------------------------------------------------------------
import axios from "axios";

const API_VERSION = "v19.0"; // ajuste se usar outra versão
const API_URL = `https://graph.facebook.com/${API_VERSION}/${process.env.WHATSAPP_PHONE_ID}/messages`;

const HEADERS = {
  Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
  "Content-Type": "application/json",
};

/**
 * Envia mensagem de template para a Cloud API.
 * Pode ser chamado de duas formas:
 *
 * 1) sendTemplateMessage(to, {
 *        name: "template_name",
 *        language: { code: "pt_BR" },
 *        components: [...]
 *    })
 * 2) sendTemplateMessage(to, "template_name", "pt_BR", componentsArray)
 */
export async function sendTemplateMessage(to, nameOrPayload, language = "pt_BR", components = []) {
  // --- Normaliza payload -----------------------------------------------------
  let templatePayload;

  if (typeof nameOrPayload === "object" && nameOrPayload !== null) {
    // Chamada (1) – payload pronto
    templatePayload = nameOrPayload;
  } else {
    // Chamada (2) – construir a partir dos argumentos
    templatePayload = {
      name: nameOrPayload,
      language: { code: language },
      ...(components.length && { components }),
    };
  }

  const body = {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: templatePayload,
  };

  return axios.post(API_URL, body, { headers: HEADERS });
}

/**
 * Envia texto simples.
 */
export async function sendText(to, text) {
  const body = {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body: text },
  };
  return axios.post(API_URL, body, { headers: HEADERS });
}

export default { sendTemplateMessage, sendText };
