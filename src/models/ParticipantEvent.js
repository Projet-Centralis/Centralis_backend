const mongoose = require("mongoose");

module.exports = mongoose.model(
  "ParticipantEvent",
  new mongoose.Schema(
    {
      event: { type: mongoose.Schema.Types.ObjectId, ref: "Event" },
      acheteur: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      statut: String
    },
    { timestamps: true }
  )
);
