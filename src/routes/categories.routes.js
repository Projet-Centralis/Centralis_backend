const router = require("express").Router();
const Categorie = require("../models/CategorieProduit");

router.get("/", async (req, res) => {
  res.json(await Categorie.find());
});

router.post("/", async (req, res) => {
  res.status(201).json(await Categorie.create(req.body));
});

module.exports = router;
