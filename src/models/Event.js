const mongoose = require("mongoose");

module.exports = mongoose.model(
  "Event",
  new mongoose.Schema(
    {
      boutique: { type: mongoose.Schema.Types.ObjectId, ref: "Boutique" },
      titre: String,
      description: String,
      date_debut: Date,
      date_fin: Date,
      statut: String,
      capacite_max: Number
    },
    { timestamps: true }
  )
);
