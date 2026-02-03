const mongoose = require("mongoose");

module.exports = mongoose.model(
  "Notification",
  new mongoose.Schema(
    {
      destinataire: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      type_notification: String,
      titre: String,
      message: String,
      is_lu: Boolean
    },
    { timestamps: true }
  )
);
