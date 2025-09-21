const mongoose = require("mongoose");
const Imovel = require("../models/Imovel");
const Usuario = require("../models/Usuario");
const Aluguel = require("../models/Aluguel");

module.exports = {
  async iniciarAluguel(req, res) {
    const { id: imovelId } = req.params;
    const { estudanteId } = req.body;

    if (!estudanteId) {
      return res.status(400).json({ mensagem: "O ID do estudante é obrigatório." });
    }

    try {
      const imovel = await Imovel.findById(imovelId);
      if (!imovel) {
        return res.status(404).json({ mensagem: "Imóvel não encontrado." });
      }

      if (String(imovel.proprietario) !== req.userId) {
        return res.status(403).json({ mensagem: "Você não tem permissão para alugar este imóvel." });
      }

      if (imovel.status !== "disponivel") {
        return res.status(400).json({ mensagem: "O imóvel não está disponível para aluguel." });
      }

      const estudante = await Usuario.findById(estudanteId);
      if (!estudante || estudante.tipo !== "estudante") {
        return res.status(400).json({ mensagem: "Estudante inválido ou não encontrado." });
      }

      const aluguelExistente = await Aluguel.findOne({
        locatario: estudanteId,
        status: { $in: ["pendente", "ativo"] },
      });

      if (aluguelExistente) {
        return res.status(400).json({ mensagem: "Este estudante já possui um aluguel ativo ou pendente." });
      }

      const novoAluguel = await Aluguel.create({
        imovel: imovelId,
        locatario: estudanteId,
        status: "pendente",
        dataInicio: new Date(),
        dataFim: null,
      });

      imovel.status = "pendente";
      await imovel.save();

      return res.status(201).json({
        mensagem: "Solicitação de aluguel criada com sucesso!",
        aluguel: novoAluguel
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({
        mensagem: "Erro ao iniciar o aluguel!",
        erro: err.message
      });
    }
  },

  async cancelarAluguel(req, res) {
    const usuarioId = req.userId;
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ mensagem: "O ID do aluguel é obrigatório." });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ mensagem: "ID do aluguel inválido." });
    }

    try {
      const aluguel = await Aluguel.findById(id).populate("imovel");
      if (!aluguel) {
        return res.status(404).json({ mensagem: "Aluguel não encontrado." });
      }

      if (String(aluguel.locatario) === String(usuarioId)) {
        if (aluguel.status !== "pendente") {
          return res.status(400).json({ mensagem: `Aluguel com status '${aluguel.status}' não pode ser cancelado.` });
        }
      } else if (String(aluguel.imovel.proprietario) === String(usuarioId)) {
        if (aluguel.status !== "pendente") {
          return res.status(400).json({ mensagem: `Aluguel com status '${aluguel.status}' não pode ser cancelado.` });
        }
      } else {
        return res.status(403).json({ mensagem: "Você não tem permissão para cancelar este aluguel." });
      }

      aluguel.imovel.status = "disponivel";
      await aluguel.imovel.save();
      await Aluguel.deleteOne({ _id: aluguel._id });

      return res.status(200).json({
        mensagem: "Aluguel cancelado com sucesso!",
        aluguel
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({
        mensagem: "Erro ao cancelar o aluguel!",
        erro: err.message
      });
    }
  },

  async confirmarAluguel(req, res) {
    const estudanteId = req.userId;
    const { aluguelId } = req.body;

    if (!aluguelId) {
      return res.status(400).json({ mensagem: "O ID do aluguel é obrigatório." });
    }

    if (!mongoose.Types.ObjectId.isValid(aluguelId)) {
      return res.status(400).json({ mensagem: "ID do aluguel inválido." });
    }

    try {
      const usuario = await Usuario.findById(estudanteId);
      if (!usuario || usuario.tipo !== "estudante") {
        return res.status(403).json({ mensagem: "Apenas estudantes podem confirmar aluguéis." });
      }

      const aluguel = await Aluguel.findOne({
        _id: aluguelId,
        locatario: estudanteId,
        status: "pendente",
      }).populate("imovel");

      if (!aluguel) {
        return res.status(400).json({ mensagem: "Aluguel pendente não encontrado." });
      }

      aluguel.status = "ativo";
      aluguel.dataInicio = new Date();
      await aluguel.save();

      aluguel.imovel.status = "alugado";
      await aluguel.imovel.save();

      return res.status(200).json({
        mensagem: "Aluguel confirmado com sucesso!",
        aluguel
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({
        mensagem: "Erro ao confirmar o aluguel!",
        erro: err.message
      });
    }
  },

  async buscarAlugueisEstudante(req, res) {
    const estudanteId = req.userId;

    if (!estudanteId) {
      return res.status(401).json({ mensagem: "O ID do estudante é obrigatório." });
    }

    try {
      const usuario = await Usuario.findById(estudanteId);
      if (!usuario) {
        return res.status(403).json({ mensagem: "Apenas estudantes podem acessar aluguéis." });
      }

      const alugueis = await Aluguel.find({ locatario: estudanteId })
        .populate("imovel")
        .sort({ createdAt: -1 });

      const pendentes = alugueis.filter(a => ["pendente"].includes(a.status));
      const alugados = alugueis.filter(a => ["ativo"].includes(a.status));
      const passados = alugueis.filter(a => ["finalizado"].includes(a.status));

      return res.json({
        alugueisPendentes: pendentes || null,
        alugueisAlugados: alugados || null,
        alugueisPassados: passados || null,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({
        mensagem: "Erro ao buscar os aluguéis!",
        erro: err.message
      });
    }
  },

  async buscarAlugueisProprietario(req, res) {
    const proprietarioId = req.userId;

    if (!proprietarioId) {
      return res.status(401).json({ mensagem: "O ID do proprietário é obrigatório." });
    }

    try {
      const imoveis = await Imovel.find({ proprietario: proprietarioId });
      if (!imoveis.length) {
        return res.status(404).json({ mensagem: "Este proprietário não possui imóveis." });
      }

      const imovelIds = imoveis.map(imovel => imovel._id);

      const alugueis = await Aluguel.find({ imovel: { $in: imovelIds } })
        .populate("locatario")
        .populate("imovel")
        .sort({ createdAt: -1 });

      const pendentes = alugueis.filter(a => ["pendente"].includes(a.status));
      const alugados = alugueis.filter(a => ["ativo"].includes(a.status));
      const passados = alugueis.filter(a => ["finalizado"].includes(a.status));

      return res.json({
        alugueisPendentes: pendentes || null,
        alugueisAlugados: alugados || null,
        alugueisPassados: passados || null,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({
        mensagem: "Erro ao buscar os aluguéis do proprietário!",
        erro: err.message
      });
    }
  },

  async finalizarAluguel(req, res) {
    const proprietarioId = req.userId;
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ mensagem: "O ID do aluguel é obrigatório." });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ mensagem: "ID do aluguel inválido." });
    }

    try {
      const aluguel = await Aluguel.findById(id).populate("imovel");

      if (!aluguel) {
        return res.status(404).json({ mensagem: "Aluguel não encontrado." });
      }

      if (String(aluguel.imovel.proprietario) !== String(proprietarioId)) {
        return res.status(403).json({ mensagem: "Você não tem permissão para finalizar este aluguel." });
      }

      if (aluguel.status !== "ativo") {
        return res.status(400).json({
          mensagem: `Só é possível finalizar um aluguel com status 'ativo'. Status atual: '${aluguel.status}'.`
        });
      }

      aluguel.status = "finalizado";
      aluguel.dataFim = new Date();
      await aluguel.save();
      aluguel.imovel.status = "disponivel";
      await aluguel.imovel.save();

      return res.status(200).json({
        mensagem: "Aluguel finalizado com sucesso!",
        aluguel
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({
        mensagem: "Erro ao finalizar o aluguel!",
        erro: err.message
      });
    }
  },

  async buscarAluguelImovel(req, res) {
    const { imovelId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(imovelId)) {
      return res.status(400).json({ mensagem: "ID do imóvel inválido." });
    }

    try {
      const aluguel = await Aluguel.findOne({
        imovel: imovelId,
        status: { $in: ["pendente", "ativo"] },
      }).populate("locatario");

      if (!aluguel) {
        return res.status(404).json({ mensagem: "Nenhum aluguel ativo ou pendente encontrado para este imóvel." });
      }

      return res.status(200).json(aluguel);
    } catch (err) {
      console.error(err);
      return res.status(500).json({
        mensagem: "Erro ao buscar aluguel do imóvel!",
        erro: err.message
      });
    }
  },

}