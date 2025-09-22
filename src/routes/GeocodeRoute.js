const express = require("express");
const axios = require("axios");
const router = express.Router();

router.get("/:endereco", async (req, res) => {
  const { endereco } = req.params;
  try {
    const response = await axios.get("https://nominatim.openstreetmap.org/search", {
      params: { q: endereco, format: "json" },
    });
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar geolocalização" });
  }
});

module.exports = router;
