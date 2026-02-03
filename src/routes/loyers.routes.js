const router = require("express").Router();
const Contrat = require("../models/ContratLoyer");
const Paiement = require("../models/PaiementLoyer");
const { protect, authorize } = require("../middlewares/auth.middleware");

router.get("/contrats", protect, authorize("ADMIN"), async (req, res) => {
  res.json(await Contrat.find().populate("boutique"));
});

router.post("/paiements", protect, authorize("ADMIN"), async (req, res) => {
  res.status(201).json(await Paiement.create(req.body));
});

module.exports = router;
