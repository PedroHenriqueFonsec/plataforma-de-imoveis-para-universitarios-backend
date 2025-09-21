const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

const usuarioRoute = require("./src/routes/UsuarioRoute");
const imovelRoute = require("./src/routes/ImovelRoute");
const aluguelRoute = require("./src/routes/AluguelRoute");

app.use("/api/usuarios", usuarioRoute);
app.use("/api/imoveis", imovelRoute);
app.use("/api/alugueis", aluguelRoute);

mongoose.connect(process.env.MONGO_URI).then(() => {
  console.log("MongoDB conectado com sucesso!");
  app.listen(process.env.PORT, () =>
    console.log(`Servidor rodando na porta ${process.env.PORT}`)
  );
}).catch((err) => console.error("Erro ao tentar conectar no MongoDB:", err));