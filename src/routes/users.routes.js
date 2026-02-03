const router = require("express").Router();
const User = require("../models/User");
const { protect, authorize } = require("../middlewares/auth.middleware");

// GET tous les users (ADMIN)
router.get("/", protect, authorize("ADMIN"), async (req, res) => {
  res.json(await User.find().select("-password"));
});

// GET user par ID
router.get("/:id", protect, async (req, res) => {
  res.json(await User.findById(req.params.id).select("-password"));
});

module.exports = router;
