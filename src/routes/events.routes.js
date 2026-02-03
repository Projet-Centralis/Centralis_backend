const router = require("express").Router();
const Event = require("../models/Event");
const { protect, authorize } = require("../middlewares/auth.middleware");

router.get("/", async (req, res) => {
  res.json(await Event.find({ statut: "valide" }));
});

router.post("/", protect, authorize("BOUTIQUE"), async (req, res) => {
  res.status(201).json(await Event.create(req.body));
});

router.put("/:id/valider", protect, authorize("ADMIN"), async (req, res) => {
  res.json(await Event.findByIdAndUpdate(req.params.id, { statut: "valide" }, { new: true }));
});

module.exports = router;
