const express = require("express");
const router = express.Router();
const imovelController = require("../controllers/ImovelController");
const autenticar = require("../middlewares/Auth");
const upload = require("../config/multer");

router.post("/", autenticar, upload.array("imagens", 8), imovelController.criar);
router.get("/", autenticar, imovelController.buscar);
router.get("/:id", autenticar, imovelController.buscarPorId);
router.put("/:id", upload.array("imagens", 8), autenticar, imovelController.editar);
router.delete("/:id", autenticar, imovelController.deletar);

module.exports = router;
