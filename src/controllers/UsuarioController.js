const Usuario = require("../models/Usuario");
const Imovel = require("../models/Imovel");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;

function gerarToken(usuario) {
  return jwt.sign(
    { id: usuario._id, tipo: usuario.tipo },
    JWT_SECRET,
    { expiresIn: "1d" }
  );
}

module.exports = {
  async cadastrar(req, res) {
    const { nome, email, senha, telefone, tipo } = req.body;

    try {
      if (!nome || !email || !senha || !telefone || !tipo) {
        return res.status(400).json({ mensagem: "Todos os campos são obrigatórios." });
      }

      const usuarioExistente = await Usuario.findOne({ email: email.trim().toLowerCase() });
      if (usuarioExistente) {
        return res.status(400).json({ mensagem: "E-mail já cadastrado." });
      }

      const foto = req.file ? req.file.path : null;

      const novoUsuario = await Usuario.create({
        nome: nome.trim(),
        email: email.trim().toLowerCase(),
        senha,
        telefone,
        foto,
        tipo: tipo.toLowerCase()
      });

      return res.status(201).json({
        mensagem: "Usuário cadastrado com sucesso!",
        usuario: novoUsuario,
      });
    } catch (err) {
      return res.status(500).json({
        mensagem: "Erro ao cadastrar usuário!",
        erro: err.message,
      });
    }
  },

  async login(req, res) {
    const { email, senha } = req.body;

    try {
      if (!email || !senha) {
        return res.status(400).json({ mensagem: "O e-mail e a senha são obrigatórios." });
      }

      const usuario = await Usuario.findOne({ email: email.trim().toLowerCase() });
      if (!usuario || !(await usuario.compareSenha(senha))) {
        return res.status(401).json({ mensagem: "Usuário ou senha inválidos." });
      }

      const token = gerarToken(usuario);

      return res.json({
        mensagem: "Login realizado com sucesso!",
        token,
        usuario,
      });
    } catch (err) {
      return res.status(500).json({
        mensagem: "Erro ao fazer o login!",
        erro: err.message,
      });
    }
  },

  async perfil(req, res) {
    try {
      const usuario = await Usuario.findById(req.userId);
      if (!usuario) {
        return res.status(404).json({ mensagem: "Usuário não encontrado." });
      }

      return res.json(usuario);
    } catch (err) {
      return res.status(500).json({
        mensagem: "Erro ao buscar o perfil!",
        erro: err.message,
      });
    }
  },

  async atualizarPerfil(req, res) {
    const { nome, email, telefone, senhaAtual, novaSenha } = req.body;

    try {
      const usuario = await Usuario.findById(req.userId);

      if (!usuario) {
        return res.status(404).json({ mensagem: "Usuário não encontrado." });
      }

      if (nome) usuario.nome = nome.trim();

      if (email && email.trim() !== usuario.email) {
        const emailExistente = await Usuario.findOne({ email: email.trim().toLowerCase() });
        if (emailExistente) {
          return res.status(400).json({ mensagem: "E-mail já em uso por outro usuário." });
        }
        usuario.email = email.trim().toLowerCase();
      }

      if (telefone) { usuario.telefone = telefone; }

      if (!senhaAtual || !(await usuario.compareSenha(senhaAtual))) {
        return res.status(400).json({ mensagem: "Senha atual incorreta." });
      }

      if (novaSenha) {
        if (novaSenha === senhaAtual) {
          return res.status(400).json({ mensagem: "Digite uma nova senha diferente da atual." });
        }

        if (novaSenha.length < 6) {
          return res.status(400).json({ mensagem: "A nova senha deve ter no mínimo 6 caracteres." });
        }

        usuario.senha = novaSenha;
      }

      if ("tipo" in req.body) {
        return res.status(403).json({ mensagem: "Não é permitido alterar o tipo de usuário." });
      }

      if (req.file) {
        usuario.foto = req.file.path;
      }

      await usuario.save();

      return res.json({
        mensagem: "Perfil atualizado com sucesso!",
        usuario,
      });

    } catch (err) {
      return res.status(500).json({
        mensagem: "Erro ao atualizar o perfil!",
        erro: err.message,
      });
    }
  },

  async listarEstudantes(req, res) {
    try {
      const estudantes = await Usuario.find({ tipo: "estudante" }).select("nome email");
      return res.json(estudantes);
    } catch (err) {
      return res.status(500).json({
        mensagem: "Erro ao listar estudantes",
        erro: err.message
      });
    }
  },

  async favoritarImovel(req, res) {
    const { id: imovelId } = req.params;

    try {
      const usuario = await Usuario.findById(req.userId);

      if (!usuario || usuario.tipo !== "estudante") {
        return res.status(403).json({ mensagem: "Apenas estudantes podem favoritar imóveis." });
      }

      const index = usuario.favoritos.findIndex(id => id.toString() === imovelId);
      let acaoFavoritos;

      if (index > -1) {
        usuario.favoritos.splice(index, 1);
        acaoFavoritos = "removido dos";
      } else {
        usuario.favoritos.push(imovelId);
        acaoFavoritos = "adicionado aos";
      }

      await usuario.save();
      return res.json({
        mensagem: `Imóvel ${acaoFavoritos} favoritos com sucesso!`,
        favoritos: usuario.favoritos,
      });
    } catch (err) {
      return res.status(500).json({
        mensagem: "Erro ao atualizar favoritos!",
        erro: err.message,
      });
    }
  },

  async listarFavoritos(req, res) {
    try {
      const {
        precoMin, precoMax, tipo, status, quartos, banheiros, endereco,
        mobiliado, areaMin, areaMax, permitidoPet, garagem,
        busca, ordenarPor, ordem = "asc", pagina = 1, limite = 12 } = req.query;
      const tiposValidos = ["apartamento", "casa", "kitnet"];
      const statusValidos = ["disponivel", "alugado", "indisponivel"];
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
      const usuario = await Usuario.findById(req.userId);
      if (!usuario || usuario.tipo !== "estudante") {
        return res.status(403).json({ mensagem: "Apenas estudantes podem ver os seus favoritos." });
      }

      const favoritosIds = usuario.favoritos;
      if (favoritosIds.length === 0) {
        return res.json({ imoveis: [], total: 0, totalPaginas: 1, paginaAtual: 1 });
      }

      const filtros = { _id: { $in: favoritosIds } };
      if (precoMin && (isNaN(Number(precoMin)) || Number(precoMin) < 0)) {
        return res.status(400).json({ mensagem: "Digite um número positivo." });
      }

      if (precoMax && (isNaN(Number(precoMax)) || Number(precoMax) < 0)) {
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

      if (isNaN(paginaNum) || paginaNum < 1) {
        return res.status(400).json({ mensagem: "O número da página deve ser um número maior que zero." });
      }

      if (isNaN(limiteNum) || limiteNum <= 0) {
        return res.status(400).json({ mensagem: "O limite por página deve ser um número maior que zero." });
      }

      if (status && !["disponivel", "alugado", "indisponivel"].includes(status)) {
        return res.status(400).json({ mensagem: "Status inválido. Selecione disponível, alugado ou indisponível." });
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
          return res.status(400).json({ mensagem: "Status inválido. Selecione disponível, alugado ou indisponível." });
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

      const imoveis = await Imovel.find(filtros)
        .sort(opcoesOrdenar)
        .skip(pular)
        .limit(limiteNum)
        .populate("proprietario", "nome email");
      const total = await Imovel.countDocuments(filtros);

      return res.json({
        total,
        paginaAtual: parseInt(pagina),
        totalPaginas: Math.ceil(total / limiteNum),
        imoveis,
      });
    } catch (err) {
      return res.status(500).json({
        mensagem: "Erro ao buscar favoritos!",
        erro: err.message,
      });
    }
  },
};
