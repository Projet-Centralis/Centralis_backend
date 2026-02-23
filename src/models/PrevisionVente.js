const mongoose = require('mongoose');

module.exports = mongoose.model(
    "PrevisionVente",
    new mongoose.Schema(
        {
            boutique: { type: mongoose.Schema.Types.ObjectId, ref: 'Boutique', required: true },
            date_prevision: { type: Date, required: true },
            montant_prevu: { type: Number, required: true },
            probabilite: { type: Number, min: 0, max: 100, default: 70 },
            produit_concerne: { type: mongoose.Schema.Types.ObjectId, ref: 'Produit' },
            type_prevision: { 
                type: String, 
                enum: ['journaliere', 'hebdomadaire', 'mensuelle', 'saisonniere'],
                default: 'journaliere'
            },
            facteurs: {
                saisonnalite: Number,
                tendance: Number,
                evenements_speciaux: String,
                meteo: String
            },
            statut: { 
                type: String, 
                enum: ['en_cours', 'atteint', 'depasse', 'non_atteint'],
                default: 'en_cours'
            },
            createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
        },
        { timestamps: true }
    )
);