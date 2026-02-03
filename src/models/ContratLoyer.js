const mongoose = require("mongoose");

module.exports = mongoose.model(
  "ContratLoyer",
  new mongoose.Schema(
    {
      boutique: { type: mongoose.Schema.Types.ObjectId, ref: "Boutique" },
      montant_mensuel: Number,
      jour_echeance: Number,
      date_debut: Date,
      date_fin: Date,
      is_active: Boolean
    },
    { timestamps: true }
  )
);
