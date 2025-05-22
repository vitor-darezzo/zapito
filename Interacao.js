// models/Interacao.js
import mongoose from 'mongoose';

const interacaoSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  state: { type: String, default: 'MENU_INICIAL' },
  vendedorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendedor' },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true,
  collection: 'interacoes'
});

const Interacao = mongoose.model('Interacao', interacaoSchema);
export default Interacao;
