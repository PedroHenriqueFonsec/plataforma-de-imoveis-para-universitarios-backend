const express = require("express");
const router = express.Router();
const AluguelController = require("../controllers/AluguelController");
const autenticar = require("../middlewares/Auth");

router.post("/confirmar", autenticar, AluguelController.confirmarAluguel);
router.get("/estudante", autenticar, AluguelController.buscarAlugueisEstudante);
router.get("/proprietario", autenticar, AluguelController.buscarAlugueisProprietario);
router.get("/imovel/:imovelId", autenticar, AluguelController.buscarAluguelImovel);
router.post("/alugar/:id", autenticar, AluguelController.iniciarAluguel);
router.post("/cancelar/:id", autenticar, AluguelController.cancelarAluguel);
router.post("/finalizar/:id", autenticar, AluguelController.finalizarAluguel);

module.exports = router;
