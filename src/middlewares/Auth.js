const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "chave_super_secreta";

module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ mensagem: "Token não fornecido." });
  }

  const token = authHeader.split(" ")[1];

  try {
    const payload = jwt.verify(token, JWT_SECRET);

    req.userId = payload.id;
    req.userTipo = payload.tipo;

    next();
  } catch (err) {
    return res.status(401).json({ mensagem: "Token inválido ou expirado." });
  }
};
