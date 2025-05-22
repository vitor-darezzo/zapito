// ChatbotController.js – build 3.3 (Hotfix: export corrigido)
// -------------------------------------------------------------------------
import mongoose from "mongoose";
import WhatsAppService from "../services/whatsappService.js";
import SessionController from "./sessionController.js";
import Vendedor from "../models/Vendedor.js";
import AtendenteSAC from "../models/sac.js";

const periodoDoDia = () => {
  const h = Number(
    new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "numeric" }).format(new Date())
  );
  return h < 12 ? "bom dia" : h < 18 ? "boa tarde" : "boa noite";
};

const normalize = (s = "") =>
  s.normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[\/-]|–|—/g, " ")
    .replace(/[^\p{Letter}\p{Number} ]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const sendTemplate = (to, tpl, vars = []) => async () => {
  const payload = {
    name: tpl,
    language: { code: "pt_BR" },
    ...(vars.length && {
      components: [
        { type: "body", parameters: vars.map((v) => ({ type: "text", text: String(v) })) },
      ],
    }),
  };
  return WhatsAppService.sendTemplateMessage(to, payload);
};
const sendText = (to, text) => async () => WhatsAppService.sendText(to, text);

export const STATES = Object.freeze({
  INICIAL: "MENU_INICIAL",
  OPCOES: "AGUARDANDO_OPCAO",
  SAC: "MENU_SAC",
  OUTROS: "MENU_OUTROS",
  FEEDBACK: "AGUARDANDO_FEEDBACK",
  FINALIZADO: "FINALIZADO",
});

export const TEMPLATES = Object.freeze({
  MENU_INICIAL: "menu_inicial_zapito",
  MENU_SAC: "menu_sac_zapito",
  MENU_OUTROS: "menu_outros_zapito",
  VENDEDOR: "vendedor_zapito",
  PEDIDO: "pedido_zapito",
  SAC: "sac_zapito",
  DESPEDIDA: "despedida_zapito",
  TRABALHE_CONOSCO: "trabalhe_conosco",
  DUV_SITE: "duvidas_sobre_o_site",
  ENDERECO: "endereco",
  HORARIO: "horario_atendimento",
  TELEFONE: "numero_ligacao"
});

class Chatbot {
  async process(from, nome, body, state) {
    try {
      const txt = normalize(body);

      if (process.env.NODE_ENV !== "production" && txt === "dev_reset") {
        await SessionController.clearState(from);
        return this._resp(STATES.OPCOES, sendText(from, "🔄 Sessão reiniciada (DEV)"));
      }

      const restartKeys = (process.env.RESTART_KEYS || "").split(",").map(normalize);
      if (restartKeys.some((k) => k && txt.includes(k))) {
        await SessionController.updateState(from, STATES.OPCOES);
        return this._resp(
          STATES.OPCOES,
          sendTemplate(from, TEMPLATES.MENU_INICIAL, [nome, periodoDoDia()])
        );
      }

      switch (state) {
        case STATES.INICIAL:
          return this._resp(
            STATES.OPCOES,
            sendTemplate(from, TEMPLATES.MENU_INICIAL, [nome, periodoDoDia()])
          );
        case STATES.OPCOES:
          return await this._handleOpcoes(from, nome, txt);
        case STATES.SAC:
          return await this._handleSac(from, nome, txt);
        case STATES.OUTROS:
          return await this._handleOutros(from, nome, txt);
        case STATES.FEEDBACK:
          return this._handleFeedback(from, nome, txt);
        default:
          return this._resp(
            STATES.OPCOES,
            sendTemplate(from, TEMPLATES.MENU_INICIAL, [nome, periodoDoDia()])
          );
      }
    } catch (err) {
      console.error("[ERRO INTERNO]", err);
      return this._resp(STATES.OPCOES, sendText(from, "⚠️ Erro interno. Tente novamente."));
    }
  }

  async _handleOpcoes(from, nome, txt) {
    if (["1", "vendas", "vendedor"].includes(txt)) {
      const vend = await this._definirVendedor();
      await SessionController.updateState(from, STATES.FEEDBACK, vend._id);
      await this._incrementStat("vendas");
      return this._resp(STATES.FEEDBACK, sendTemplate(from, TEMPLATES.VENDEDOR, [nome, vend.nome, vend.link]));
    }

    if (["2", "pedido", "posicao de pedido", "posição de pedido"].includes(txt)) {
      await this._incrementStat("pedido");
      return this._resp(STATES.FEEDBACK, sendTemplate(from, TEMPLATES.PEDIDO, [nome]));
    }

    if (["3", "sac"].includes(txt)) {
      await this._incrementStat("sac_menu");
      return this._resp(STATES.SAC, sendTemplate(from, TEMPLATES.MENU_SAC, [nome]));
    }

    if (["4", "outros"].includes(txt)) {
      await this._incrementStat("outros_menu");
      return this._resp(STATES.OUTROS, sendTemplate(from, TEMPLATES.MENU_OUTROS, [nome]));
    }

    return this._resp(STATES.OPCOES, sendTemplate(from, TEMPLATES.MENU_INICIAL, [nome, periodoDoDia()]));
  }

  async _handleSac(from, nome, txt) {
    const map = {
      "vendedores loja fisica": "Vendedores / Loja Física",
      "mercado livre": "Mercado Livre",
      "shopee amazon magalu": "Shopee / Amazon / Magalu",
      "realizar uma reclamacao": "Realizar uma Reclamação",
    };
    const setor = map[txt];
    if (setor) {
      const at = await this._definirAtendenteSAC(setor);
      await SessionController.updateState(from, STATES.FEEDBACK, at._id);
      await this._incrementStat(`sac_${txt}`);
      return this._resp(STATES.FEEDBACK, sendTemplate(from, TEMPLATES.SAC, [nome, at.link]));
    }
    if (txt.includes("menu")) {
      return this._resp(STATES.OPCOES, sendTemplate(from, TEMPLATES.MENU_INICIAL, [nome, periodoDoDia()]));
    }
    if (txt.includes("finalizar")) {
      return this._resp(STATES.FINALIZADO, sendTemplate(from, TEMPLATES.DESPEDIDA));
    }
    return this._resp(STATES.SAC, sendTemplate(from, TEMPLATES.MENU_SAC, [nome]));
  }

  async _handleOutros(from, nome, txt) {
    const rotas = {
      "duvidas sobre o site": { tpl: TEMPLATES.DUV_SITE, vars: [] },
      endereco: { tpl: TEMPLATES.ENDERECO, vars: [] },
      "horario de funcionamento": { tpl: TEMPLATES.HORARIO, vars: [] },
      telefone: { tpl: TEMPLATES.TELEFONE, vars: [] },
      "numero para ligacoes": { tpl: TEMPLATES.TELEFONE, vars: [] },
      "número para ligações": { tpl: TEMPLATES.TELEFONE, vars: [] },
      "trabalhe conosco": { tpl: TEMPLATES.TRABALHE_CONOSCO, vars: [] },
    };
    const rota = rotas[txt];
    if (rota) {
      await this._incrementStat(`outros_${txt}`);
      return this._resp(STATES.OUTROS, sendTemplate(from, rota.tpl, rota.vars));
    }
    if (txt.includes("menu")) {
      return this._resp(STATES.OPCOES, sendTemplate(from, TEMPLATES.MENU_INICIAL, [nome, periodoDoDia()]));
    }
    if (txt.includes("finalizar")) {
      return this._resp(STATES.FINALIZADO, sendTemplate(from, TEMPLATES.DESPEDIDA));
    }
    return this._resp(STATES.OUTROS, sendTemplate(from, TEMPLATES.MENU_OUTROS, [nome]));
  }

  _handleFeedback(from, nome, txt) {
    if (txt.includes("menu")) {
      return this._resp(STATES.OPCOES, sendTemplate(from, TEMPLATES.MENU_INICIAL, [nome, periodoDoDia()]));
    }
    if (txt.includes("finalizar")) {
      return this._resp(STATES.FINALIZADO, sendTemplate(from, TEMPLATES.DESPEDIDA));
    }
    return this._resp(STATES.FEEDBACK, sendText(from, "Digite 'menu' ou 'finalizar'."));
  }

  async _definirVendedor() {
    const vend = await Vendedor.findOneAndUpdate({}, { $inc: { atendimentos: 1 } }, { sort: { atendimentos: 1 }, new: true });
    if (!vend) throw new Error("Nenhum vendedor encontrado");
    return vend;
  }

  async _definirAtendenteSAC(setor) {
    const at = await AtendenteSAC.findOneAndUpdate({ setor }, { $inc: { atendimentos: 1 } }, { sort: { atendimentos: 1 }, new: true });
    if (!at) throw new Error("Nenhum atendente SAC encontrado");
    return at;
  }

  async _incrementStat(key) {
    try {
      await mongoose.connection.collection("stats").updateOne(
        { opcao: key },
        { $inc: { count: 1 } },
        { upsert: true }
      );
    } catch (err) {
      console.warn("[STAT_FAIL]", key, err.message);
    }
  }

  _resp(nextState, ...messages) {
    return { nextState, messages };
  }
}

export default new Chatbot();
