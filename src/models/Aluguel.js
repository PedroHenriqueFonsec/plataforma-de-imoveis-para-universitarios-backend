const mongoose = require("mongoose");

const aluguelSchema = new mongoose.Schema({
  imovel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Imovel",
    required: [true, "O imóvel é obrigatório."]
  },
  locatario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Usuario",
    required: [true, "O locatário é obrigatório."]
  },
  status: {
    type: String,
    enum: {
      values: ["pendente", "ativo", "finalizado"],
      message: "Status inválido. Selecione pendente, ativo ou finalizado."
    },
    default: "ativo",
    required: [true, "O status é obrigatório."],
    trim: true,
  },
  dataInicio: {
    type: Date,
    required: [true, "A data de início é obrigatória."]
  },
  dataFim: {
    type: Date,
    required: false,
    default: null
  }
}, {
  timestamps: true,
  toJSON: {
    transform(doc, ret) {
      delete ret.__v;
      return ret;
    }
  }
});

module.exports = mongoose.model("Aluguel", aluguelSchema);