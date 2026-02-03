const mongoose = require("mongoose");

module.exports = mongoose.model(
  "PaiementLoyer",
  new mongoose.Schema(
    {
      contrat: { type: mongoose.Schema.Types.ObjectId, ref: "ContratLoyer" },
      boutique: { type: mongoose.Schema.Types.ObjectId, ref: "Boutique" },
      mois: Date,
      montant_du: Number,
      montant_paye: Number,
      statut: String
    },
    { timestamps: true }
  )
);
