const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

require("dotenv").config();

const app = express();

app.use(cors({
  origin: "https://plataforma-de-imoveis-para-universi.vercel.app/",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));
app.options("*", cors());
app.use(express.json());

const usuarioRoute = require("./src/routes/UsuarioRoute");
const imovelRoute = require("./src/routes/ImovelRoute");
const aluguelRoute = require("./src/routes/AluguelRoute");

app.use("/api/usuarios", usuarioRoute);
app.use("/api/imoveis", imovelRoute);
app.use("/api/alugueis", aluguelRoute);

mongoose.connect(process.env.MONGO_URI).then(() => {
  console.log("MongoDB conectado com sucesso!");
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
}).catch((err) => console.error("Erro ao tentar conectar no MongoDB:", err));