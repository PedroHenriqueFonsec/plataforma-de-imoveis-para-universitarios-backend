const express = require("express");
const axios = require("axios");
const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const endereco = req.query.endereco;
    if (!endereco) {
      return res.status(400).json({ mensagem: "Endereço é obrigatório!" });
    }

    console.log("Requisição recebida para /geocode com endereço:", endereco);

    const response = await axios.get("https://nominatim.openstreetmap.org/search", {
      params: {
        q: endereco,
        format: "json",
        limit: 1,
      },
      headers: {
        "User-Agent": "plataforma-de-imoveis/1.0"
      }
    });

    console.log("Resposta do Nominatim:", response.data);

    if (!response.data || response.data.length === 0) {
      return res.status(404).json({ mensagem: "Endereço não encontrado!" });
    }

    const { lat, lon } = response.data[0];
    res.json({ lat, lon });
  } catch (err) {
    console.error("Erro na rota /geocode:", err.response?.data || err.message);
    res.status(500).json({ mensagem: "Erro ao buscar coordenadas!" });
  }
});

module.exports = router;
