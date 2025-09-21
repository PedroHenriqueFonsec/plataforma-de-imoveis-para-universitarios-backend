const express = require("express");
const router = express.Router();
const usuarioController = require("../controllers/UsuarioController");
const autenticar = require("../middlewares/Auth");
const upload = require("../config/multer");

router.post("/cadastrar", upload.single("foto"), usuarioController.cadastrar);
router.post("/login", usuarioController.login);
router.get("/perfil", autenticar, usuarioController.perfil);
router.put("/perfil", autenticar, upload.single("foto"), usuarioController.atualizarPerfil);
router.get("/estudantes", autenticar, usuarioController.listarEstudantes);
router.get("/favoritos", autenticar, usuarioController.listarFavoritos);
router.post("/favoritos/:id", autenticar, usuarioController.favoritarImovel);

module.exports = router;
