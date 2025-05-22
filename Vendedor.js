import mongoose from 'mongoose';

const vendedorSchema = new mongoose.Schema({
  nome: {
    type: String,
    required: true,
  },
  link: {
    type: String,
    required: true,
  },
  atendimentos: {
    type: Number,
    default: 0,
  }
});

export default mongoose.model('Vendedor', vendedorSchema);
