const mongoose = require("mongoose");

const imovelSchema = new mongoose.Schema({
  titulo: {
    type: String,
    required: [true, "Digite o titulo do imóvel."],
    trim: true,
    minlength: [1, "O titulo deve ter pelo menos 1 caractere."],
    maxlength: [100, "O titulo deve ter no máximo 100 caracteres."]
  },
  descricao: {
    type: String,
    trim: true,
    maxlength: [1000, "A descrição deve ter no máximo 1000 caracteres."]
  },
  localizacao: {
    lat: {
      type: Number,
      required: [true, "A latitude é obrigatória."]
    },
    lng: {
      type: Number,
      required: [true, "A longitude é obrigatória."]
    },
  },
  preco: {
    type: Number,
    required: [true, "Digite o preço do imóvel."],
    min: [0, "O preço deve ser um número positivo."],
  },
  proximidadeUnifesoSede: {
    type: Number,
    required: [true, "A proximidade ao campus sede da Unifeso é obrigatória."],
    min: 0,
  },
  proximidadeUnifesoQuinta: {
    type: Number,
    required: [true, "A proximidade ao campus Quinta da Unifeso é obrigatória."],
    min: 0,
  },
  tipo: {
    type: String,
    enum: {
      values: ["apartamento", "casa", "kitnet"],
      message: "Tipo inválido. Selecione apartamento, casa ou kitnet ."
    },
    required: [true, "Selecione o tipo do imóvel."],
    trim: true
  },
  status: {
    type: String,
    enum: {
      values: ["disponivel", "pendente", "alugado", "indisponivel"],
      message: "Status inválido. Selecione disponível, alugado ou indisponível."
    },
    default: "disponivel",
    required: [true, "Selecione o status do imóvel."],
    trim: true
  },
  proprietario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Usuario",
    required: [true, "O proprietário é obrigatório."]
  },
  quartos: {
    type: Number,
    min: [1, "O número de quartos deve ser maior que zero"],
    default: 1,
    required: [true, "Digite o número de quartos."],
  },
  endereco: {
    type: String,
    trim: true
  },
  banheiros: {
    type: Number,
    min: [1, "O número de banheiros deve ser maior que zero."],
    default: 1,
    required: [true, "Digite o número de banheiros."],
  },
  mobiliado: {
    type: Boolean,
    default: false
  },
  area: {
    type: Number,
    required: [true, "Digite a área."],
    min: [0, "A área deve ser positiva."]
  },
  permitidoPet: {
    type: Boolean,
    default: false
  },
  garagem: {
    type: Boolean,
    default: false
  },
  imagens: [{
    type: String,
    required: [true, "Adicione pelo menos uma imagem do imóvel."]
  }],
}, {
  timestamps: true,
  toJSON: {
    transform(doc, ret) {
      delete ret.__v;
      return ret;
    }
  }
});

module.exports = mongoose.model("Imovel", imovelSchema);
