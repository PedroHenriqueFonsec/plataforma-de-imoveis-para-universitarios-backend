import express from "express";
import axios from "axios";

const router = express.Router();

router.get("/geocode/:endereco", async (req, res) => {
  try {
    const endereco = decodeURIComponent(req.params.endereco);

    const response = await axios.get("https://nominatim.openstreetmap.org/search", {
      params: {
        q: endereco,
        format: "json",
        limit: 1
      },
      headers: {
        "User-Agent": "plataforma-de-imoveis"
      }
    });

    if (response.data.length === 0) {
      return res.status(404).json({ mensagem: "Endereço não encontrado." });
    }

    const { lat, lon } = response.data[0];
    res.json({ lat, lon });
  } catch (err) {
    console.error("Erro na rota /geocode:", err.message);
    res.status(500).json({ mensagem: "Erro ao buscar coordenadas." });
  }
});

module.exports = router;
