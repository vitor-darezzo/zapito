import mongoose from "mongoose";

const atendenteSacSchema = new mongoose.Schema({
  setor: {
    type: String,
    required: true
  },
  link: {
    type: String,
    required: true
  },
  atendimentos: {
    type: Number,
    default: 0
  }
});

export default mongoose.model("AtendenteSAC", atendenteSacSchema, "atendimentosac");
