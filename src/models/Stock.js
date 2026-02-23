const mongoose = require('mongoose');

module.exports = mongoose.model(
    "Stock",
    new mongoose.Schema(
        {
            produit : { type: mongoose.Schema.Types.ObjectId, ref: 'Produit', required: true },
            emplacement: {type: mongoose.Schema.Types.ObjectId, ref: 'EmplacementStock', required: true },
            quantite: Number,
            date_derniere_entree: Date,
            date_deriere_sortie: Date
        },
        { timestamps: true }
    )
);