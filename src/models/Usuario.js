const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const usuarioSchema = new mongoose.Schema({
  nome: {
    type: String,
    required: [true, "Digite o seu nome."],
    trim: true,
    minlength: [1, "O nome deve ter pelo menos 1 caractere."],
    maxlength: [100, "O nome deve ter no máximo 100 caracteres."]
  },
  email: {
    type: String,
    required: [true, "Digite o seu e-mail."],
    unique: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
      message: () => "E-mail inválido."
    }
  },
  senha: {
    type: String,
    required: [true, "Digite uma senha."],
    minlength: [6, "A senha deve ter no mínimo 6 caracteres."],
    maxlength: [100, "A senha deve ter no máximo 100 caracteres."]
  },
  telefone: {
    type: String,
    required: [true, "Digite o seu telefone."],
    validate: {
      validator: v => /^(\+55)?\s?\(?\d{2}\)?\s?\d{4,5}-?\d{4}$/.test(v),
      message: () => "Telefone inválido."
    }
  },
  tipo: {
    type: String,
    enum: {
      values: ["estudante", "proprietario"],
      message: "O tipo deve ser estudante ou proprietario."
    },
    required: [true, "Selecione um tipo de usuário."]
  },
  foto: {
    type: String
  },
  favoritos: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Imovel"
  }]
}, {
  timestamps: true,
  toJSON: {
    transform(doc, ret) {
      delete ret.senha;
      delete ret.__v;
      return ret;
    }
  }
});

usuarioSchema.pre("save", async function (next) {
  if (!this.isModified("senha")) return next();

  try {
    const saltRounds = 10;
    this.senha = await bcrypt.hash(this.senha, saltRounds);
    next();
  } catch (err) {
    next(err);
  }
});

usuarioSchema.methods.compareSenha = async function (senhaCandidata) {
  return await bcrypt.compare(senhaCandidata, this.senha);
};

module.exports = mongoose.model("Usuario", usuarioSchema);
