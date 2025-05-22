// controllers/sessionController.js

import Interacao from '../models/Interacao.js';

const DEFAULT_STATE = 'MENU_INICIAL';

class SessionController {
  /**
   * Retorna o estado atual da sessão do cliente
   * @param {string} userId - ID do cliente (WhatsApp number)
   * @returns {Promise<{ state: string }>}
   */
  async getState(userId) {
    let session = await Interacao.findOne({ userId });
    if (!session) {
      session = await Interacao.create({ userId, state: DEFAULT_STATE });
    }
    return { state: session.state };
  }

  /**
   * Atualiza o estado da sessão do cliente
   * @param {string} userId - ID do cliente
   * @param {string} newState - Novo estado da conversa
   * @returns {Promise<void>}
   */
  async updateState(userId, newState) {
    await Interacao.updateOne(
      { userId },
      { state: newState },
      { upsert: true }
    );
  }

  /**
   * Limpa completamente a sessão do cliente (se necessário)
   * @param {string} userId - ID do cliente
   * @returns {Promise<void>}
   */
  async clearState(userId) {
    await Interacao.deleteOne({ userId });
  }
}

export default new SessionController();
