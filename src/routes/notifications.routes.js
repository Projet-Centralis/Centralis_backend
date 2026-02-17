const router = require("express").Router();
const Notification = require("../models/Notification");
const { protect } = require("../middlewares/auth.middleware");

router.get("/", protect, async (req, res) => {
  console.log("USER FROM TOKEN:", req.user);
  res.json(await Notification.find({ destinataire: req.user._id }));
});

module.exports = router;
