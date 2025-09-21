const Imovel = require("../models/Imovel");
const axios = require("axios");
const Usuario = require("../models/Usuario");

const unifesoSedeCoords = {
  lat: -22.4338603,
  lng: -42.9791791,
};
const unifesoQuintaCoords = {
  lat: -22.3936848,
  lng: -42.959655,
};

function calcularDistanciaKm(coord1, coord2) {
  const R = 6371;
  const dLat = (coord2.lat - coord1.lat) * Math.PI / 180;
  const dLon = (coord2.lng - coord1.lng) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(coord1.lat * Math.PI / 180) *
    Math.cos(coord2.lat * Math.PI / 180) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return (R * c).toFixed(2);
}

module.exports = {
  async criar(req, res) {
    const {
      titulo, descricao, latitude, longitude, preco, tipo, quartos = 1,
      banheiros = 1, mobiliado = false, area, permitidoPet = false, garagem = false
    } = req.body;
    const imagens = req.files?.map((file) => file.path);

    if (!titulo) {
      return res.status(400).json({ mensagem: "O título é obrigatório." });
    }

    if (!latitude || !longitude) {
      return res.status(400).json({ mensagem: "A latitude e a longitude são obrigatórias." });
    }

    if (preco === undefined) {
      return res.status(400).json({ mensagem: "O preço é obrigatório." });
    }

    if (area === undefined) {
      return res.status(400).json({ mensagem: "A área do imóvel é obrigatória." });
    }

    if (!imagens || imagens.length === 0) {
      return res.status(400).json({ mensagem: "É obrigatória pelo menos uma imagem." });
    }

    let endereco = "";

    try {
      const geoRes = await axios.get(`https://nominatim.openstreetmap.org/reverse`, {
        params: {
          format: "json",
          lat: latitude,
          lon: longitude,
        },
        headers: {
          "User-Agent": "Plataforma-Imoveis/0.0",
        },
      });

      const a = geoRes.data.address;

      endereco = [
        a.road,
        a.house_number,
        a.suburb || a.neighbourhood,
        a.city || a.town || a.village,
        a.state,
        a.postcode
      ].filter(Boolean).join(", ");

      if (!endereco) {
        endereco = geoRes.data.display_name || "Endereço não encontrado.";
      }

    } catch (e) {
      return res.status(500).json({
        mensagem: "Erro ao buscar endereço!",
        erro: e.message
      });
    }

    const distanciaSede = calcularDistanciaKm(
      { lat: latitude, lng: longitude },
      unifesoSedeCoords
    );

    const distanciaQuinta = calcularDistanciaKm(
      { lat: latitude, lng: longitude },
      unifesoQuintaCoords
    );

    try {
      const novoImovel = await Imovel.create({
        titulo: titulo.trim(),
        descricao: descricao?.trim(),
        status: "disponivel",
        localizacao: {
          lat: latitude,
          lng: longitude
        },
        preco,
        proximidadeUnifesoSede: Number(distanciaSede),
        proximidadeUnifesoQuinta: Number(distanciaQuinta),
        endereco,
        tipo,
        proprietario: req.userId,
        quartos,
        banheiros,
        mobiliado,
        area,
        permitidoPet,
        garagem,
        imagens
      });

      return res.status(201).json({
        mensagem: "Imóvel cadastrado com sucesso!",
        imovel: novoImovel
      });
    } catch (err) {
      return res.status(500).json({
        mensagem: "Erro ao cadastrar imóvel!",
        erro: err.message
      });
    }
  },

  async buscar(req, res) {
    const {
      precoMin, precoMax, tipo, status, quartos, banheiros, endereco,
      mobiliado, areaMin, areaMax, permitidoPet, garagem,
      busca, ordenarPor, ordem = "asc", pagina = 1, limite = 12
    } = req.query;
    const filtros = {};
    const tiposValidos = ["apartamento", "casa", "kitnet"];
    const statusValidos = ["disponivel", "pendente", "alugado", "indisponivel"];
    const paginaNum = parseInt(pagina, 10);
    const limiteNum = parseInt(limite, 10);
    const camposOrdenacaoPermitidos = [
      "preco",
      "proximidadeUnifesoSede",
      "proximidadeUnifesoQuinta",
      "quartos",
      "banheiros",
      "area",
      "createdAt"
    ];

    if (req.query.proprietario === "meus") {
      filtros.proprietario = req.userId;
    }

    if (precoMin && (isNaN(Number(precoMin)) || Number(precoMin) < 1)) {
      return res.status(400).json({ mensagem: "Digite um número positivo." });
    }

    if (precoMax && (isNaN(Number(precoMax)) || Number(precoMax) < 1)) {
      return res.status(400).json({ mensagem: "Digite um número positivo." });
    }

    if (precoMin && precoMax && Number(precoMin) > Number(precoMax)) {
      return res.status(400).json({ mensagem: "O preço mínimo não pode ser maior que o preço máximo." });
    }

    if (tipo && !tiposValidos.includes(tipo)) {
      return res.status(400).json({ mensagem: `Escolha entre esses tipos: ${tiposValidos.join(", ")}.` });
    }

    if (quartos && isNaN(Number(quartos))) {
      return res.status(400).json({ mensagem: "Número de quartos inválido." });
    }

    if (banheiros && isNaN(Number(banheiros))) {
      return res.status(400).json({ mensagem: "Número de banheiros inválido." });
    }

    if (mobiliado !== undefined && mobiliado !== "true" && mobiliado !== "false") {
      return res.status(400).json({ mensagem: "O valor de mobiliado deve ser true ou false." });
    }

    if (areaMin && (isNaN(Number(areaMin)) || Number(areaMin) < 0)) {
      return res.status(400).json({ mensagem: "A área mínima deve ser um número positivo." });
    }

    if (areaMax && (isNaN(Number(areaMax)) || Number(areaMax) < 0)) {
      return res.status(400).json({ mensagem: "A área máxima deve ser um número positivo." });
    }

    if (areaMin && areaMax && Number(areaMin) > Number(areaMax)) {
      return res.status(400).json({ mensagem: "A área mínima não pode ser maior que a área máxima." });
    }

    if (permitidoPet !== undefined && permitidoPet !== "true" && permitidoPet !== "false") {
      return res.status(400).json({ mensagem: "O valor de permitidoPet deve ser true ou false." });
    }

    if (garagem !== undefined && garagem !== "true" && garagem !== "false") {
      return res.status(400).json({ mensagem: "O valor de garagem deve ser true ou false." });
    }

    if (ordem && !["asc", "desc"].includes(ordem)) {
      return res.status(400).json({ mensagem: "A ordenação deve ser asc (crescente) ou desc (decrescente)." });
    }

    if (ordenarPor && !camposOrdenacaoPermitidos.includes(ordenarPor)) {
      return res.status(400).json({
        mensagem: `Campo de ordenação inválido. Use um dos seguintes: ${camposOrdenacaoPermitidos.join(", ")}.`
      });
    }

    if (pagina && (!Number.isInteger(Number(pagina)) || Number(pagina) <= 0)) {
      return res.status(400).json({ mensagem: "O número da página deve ser um número positivo." });
    }

    if (limite && (!Number.isInteger(Number(limite)) || Number(limite) <= 0 || Number(limite) > 100)) {
      return res.status(400).json({ mensagem: "O limite deve ser um número entre 1 e 100." });
    }

    if (status && !["disponivel", "pendente", "alugado", "indisponivel"].includes(status)) {
      return res.status(400).json({ mensagem: "Status inválido. Selecione disponível, alugado ou indisponível." });
    }

    if (isNaN(paginaNum) || paginaNum < 1) {
      return res.status(400).json({ mensagem: "O número da página deve ser um número maior que zero." });
    }

    if (isNaN(limiteNum) || limiteNum <= 0) {
      return res.status(400).json({ mensagem: "O limite por página deve ser um número maior que zero." });
    }

    if (tipo) filtros.tipo = tipo;

    if (precoMin || precoMax) {
      filtros.preco = {};
      if (precoMin) filtros.preco.$gte = Number(precoMin);
      if (precoMax) filtros.preco.$lte = Number(precoMax);
    }

    if (endereco) {
      filtros.endereco = { $regex: endereco, $options: "i" };
    }

    if (quartos) {
      filtros.quartos = { $gte: Number(quartos) };
    }

    if (banheiros) {
      filtros.banheiros = { $gte: Number(banheiros) };
    }

    if (mobiliado !== undefined) {
      filtros.mobiliado = mobiliado === "true";
    }

    if (permitidoPet !== undefined) {
      filtros.permitidoPet = permitidoPet === "true";
    }

    if (garagem !== undefined) {
      filtros.garagem = garagem === "true";
    }

    if (areaMin || areaMax) {
      filtros.area = {};
      if (areaMin) filtros.area.$gte = Number(areaMin);
      if (areaMax) filtros.area.$lte = Number(areaMax);
    }

    if (req.query.status) {
      if (!statusValidos.includes(req.query.status)) {
        return res.status(400).json({ mensagem: "Status inválido. Selecione disponível, pendente, alugado ou indisponível." });
      }
      filtros.status = req.query.status;
    }

    if (busca) {
      filtros.$or = [
        { titulo: new RegExp(busca, "i") },
        { descricao: new RegExp(busca, "i") },
        { endereco: new RegExp(busca, "i") },
      ];
    }

    const opcoesOrdenar = {};
    if (ordenarPor) {
      opcoesOrdenar[ordenarPor] = ordem === "desc" ? -1 : 1;
    }

    const pular = (paginaNum - 1) * limiteNum;

    try {
      const imoveis = await Imovel.find(filtros)
        .sort(opcoesOrdenar)
        .skip(pular)
        .limit(limiteNum)
        .populate("proprietario", "nome email");
      const total = await Imovel.countDocuments(filtros);
      let favoritosDoUsuario = [];
      if (req.userId) {
        const usuario = await Usuario.findById(req.userId);
        if (usuario?.tipo === "estudante") {
          favoritosDoUsuario = usuario.favoritos.map((id) => id.toString());
        }
      }

      const imoveisComFavoritos = imoveis.map((imovel) => {
        const favoritado = favoritosDoUsuario.includes(imovel._id.toString());
        return { ...imovel.toObject(), favoritado };
      });

      return res.json({
        total,
        paginaAtual: parseInt(pagina),
        totalPaginas: Math.ceil(total / limiteNum),
        imoveis: imoveisComFavoritos,
      });
    } catch (err) {
      return res.status(500).json({
        mensagem: "Erro ao buscar ou listar os imóveis.",
        erro: err.message
      });
    }
  },

  async buscarPorId(req, res) {
    try {
      const imovel = await Imovel.findById(req.params.id).populate("proprietario", "nome email telefone");
      if (!imovel) {
        return res.status(404).json({ mensagem: "Imóvel não encontrado." });
      }

      let favoritado = false;
      if (req.userId) {
        const usuario = await Usuario.findById(req.userId);
        if (usuario?.tipo === "estudante") {
          favoritado = usuario.favoritos.some(favId => favId.toString() === imovel._id.toString());
        }
      }

      return res.json({ ...imovel.toObject(), favoritado });
    } catch (err) {
      return res.status(500).json({
        mensagem: "Erro ao buscar imóvel!",
        erro: err.message
      });
    }
  },

  async editar(req, res) {
    const {
      titulo, descricao, latitude, longitude, preco, tipo, quartos, banheiros,
      mobiliado, area, permitidoPet, garagem, status
    } = req.body;
    const tiposValidos = ["apartamento", "casa", "kitnet"];
    const statusValidos = ["disponivel", "indisponivel"];

    try {
      const imovel = await Imovel.findById(req.params.id);

      if (!imovel) {
        return res.status(404).json({ mensagem: "Imóvel não encontrado." });
      }

      if (imovel.proprietario.toString() !== req.userId) {
        return res.status(403).json({ mensagem: "Você não tem permissão para editar este imóvel." });
      }

      if ("proprietario" in req.body) {
        return res.status(400).json({ mensagem: "Você não pode alterar o proprietário do imóvel." });
      }

      if (imovel.status !== "disponivel" && imovel.status !== "indisponivel") {
        return res.status(400).json({ mensagem: "O imóvel não pode ser editado porque seu status não é 'disponível' ou 'indisponível'." });
      }

      if (tipo !== undefined && !tiposValidos.includes(tipo)) {
        return res.status(400).json({ mensagem: `Tipo inválido. Escolha entre: ${tiposValidos.join(", ")}.` });
      }

      if (status !== undefined) {
        if (!statusValidos.includes(status)) {
          return res.status(400).json({ mensagem: "Status inválido. O status só pode ser 'disponivel' ou 'indisponivel'." });
        }
        if (imovel.status !== status) {
          if ((imovel.status === "disponivel" && status === "indisponivel") || (imovel.status === "indisponivel" && status === "disponivel")) {
            imovel.status = status;
          } else {
            return res.status(400).json({ mensagem: "Só é permitido alterar o status entre 'disponivel' e 'indisponivel'." });
          }
        }
      }

      if (latitude && longitude) {
        imovel.localizacao = { lat: latitude, lng: longitude };

        try {
          const geoRes = await axios.get(`https://nominatim.openstreetmap.org/reverse`, {
            params: {
              format: "json",
              lat: latitude,
              lon: longitude,
            },
            headers: {
              "User-Agent": "Plataforma-Imoveis/0.0",
            },
          });

          const a = geoRes.data.address;

          let endereco = [
            a.road,
            a.house_number,
            a.suburb || a.neighbourhood,
            a.city || a.town || a.village,
            a.state,
            a.postcode
          ].filter(Boolean).join(", ");

          if (!endereco) {
            endereco = geoRes.data.display_name || "Endereço não encontrado.";
          }

          imovel.endereco = endereco;

        } catch (e) {
          return res.status(500).json({
            mensagem: "Erro ao buscar novo endereço.",
            erro: e.message
          });
        }

        imovel.proximidadeUnifesoSede = calcularDistanciaKm(
          { lat: latitude, lng: longitude },
          unifesoSedeCoords
        );
        imovel.proximidadeUnifesoQuinta = calcularDistanciaKm(
          { lat: latitude, lng: longitude },
          unifesoQuintaCoords
        );
      }

      if (req.files && req.files.length > 0) {
        const novasImagens = req.files.map(file => file.path);
        imovel.imagens = novasImagens;
      }

      const camposPermitidos = [
        "titulo",
        "descricao",
        "preco",
        "tipo",
        "quartos",
        "banheiros",
        "mobiliado",
        "area",
        "permitidoPet",
        "garagem",
        "status"
      ];

      camposPermitidos.forEach((campo) => {
        if (req.body[campo] !== undefined) {
          imovel[campo] = req.body[campo];
        }
      });

      await imovel.save();

      return res.json({ mensagem: "Imóvel atualizado com sucesso!", imovel });
    } catch (err) {
      return res.status(500).json({
        mensagem: "Erro ao editar imóvel!",
        erro: err.message
      });
    }
  },

  async deletar(req, res) {
    try {
      const imovel = await Imovel.findById(req.params.id);

      if (!imovel) {
        return res.status(404).json({ mensagem: "Imóvel não encontrado." });
      }

      if (imovel.proprietario.toString() !== req.userId) {
        return res.status(403).json({ mensagem: "Você não tem permissão para deletar este imóvel." });
      }

      if (imovel.status !== "disponivel" && imovel.status !== "indisponivel") {
        return res.status(400).json({ mensagem: "O imóvel só pode ser deletado se o seu status estiver disponível ou indisponível." });
      }

      await imovel.deleteOne();

      return res.json({ mensagem: "Imóvel removido com sucesso!" });
    } catch (err) {
      return res.status(500).json({
        mensagem: "Erro ao deletar imóvel!",
        erro: err.message
      });
    }
  }
};
