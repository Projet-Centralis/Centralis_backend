const router = require("express").Router();
const Promotion = require("../models/Promotion");
const { protect, authorize } = require("../middlewares/auth.middleware");

// GET promotions
router.get("/", async (req, res) => {
  res.json(await Promotion.find().populate("produit"));
});

// POST promotion (BOUTIQUE)
router.post("/", protect, authorize("BOUTIQUE"), async (req, res) => {
  res.status(201).json(await Promotion.create(req.body));
});

module.exports = router;
