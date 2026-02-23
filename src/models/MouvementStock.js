const mongoose = require('mongoose');

module.exports = mongoose.model(
    "MouvementStock",
    new mongoose.Schema(
        {
            produit: { type: mongoose.Schema.Types.ObjectId, ref: 'Produit', required: true },
            emplacement: { type: mongoose.Schema.Types.ObjectId, ref: 'EmplacementStock', required: true },
            type_mouvement: { 
                type: String, 
                enum: ['entree', 'sortie', 'ajustement'],
                required: true 
            },
            quantite: { type: Number, required: true },
            quantite_avant: Number,
            quantite_apres: Number,
            motif: String,
            utilisateur: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            date_mouvement: { type: Date, default: Date.now },
            reference: String 
        },
        { timestamps: true }
    )
);