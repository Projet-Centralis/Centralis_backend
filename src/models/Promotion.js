const mongoose = require('mongoose');

module.exports = mongoose.model(
    "Promotion",
    new mongoose.Schema(
        {
            produit: {type: mongoose.Schema.Types.ObjectId, ref: 'Produit', required: true},
            titre: String,
            decription: String,
            pourcentage_reduction: Number,
            prix_promotion: Number,
            date_debut: Date,
            date_fin: Date,
            actif: Boolean
        },
        {timestamps: true}
    )
);