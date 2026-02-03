const router = require("express").Router();
const Produit = require("../models/Produit");
const { protect } = require("../middlewares/auth.middleware");

// GET par boutique
router.get("/boutique/:id", async (req, res) => {
  res.json(await Produit.find({ boutique: req.params.id }));
});

// POST
router.post("/", protect, async (req, res) => {
  res.status(201).json(await Produit.create(req.body));
});

// PUT
router.put("/:id", protect, async (req, res) => {
  res.json(await Produit.findByIdAndUpdate(req.params.id, req.body, { new: true }));
});

// DELETE
router.delete("/:id", protect, async (req, res) => {
  await Produit.findByIdAndDelete(req.params.id);
  res.sendStatus(204);
});

module.exports = router;
