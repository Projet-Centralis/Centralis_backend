const router = require("express").Router();
const Notification = require("../models/Notification");
const { protect } = require("../middlewares/auth.middleware");

router.get("/", protect, async (req, res) => {
  res.json(await Notification.find({ destinataire: req.user.userId }));
});

module.exports = router;
