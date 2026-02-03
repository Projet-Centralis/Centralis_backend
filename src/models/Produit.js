const mongoose = require('mongoose');

module.exports = mongoose.model(
    "Produit",
    new mongoose.Schema(
        {
            boutique: {type: mongoose.Schema.Types.ObjectId, ref: 'Boutique', required: true},
            categorie: {type: mongoose.Schema.Types.ObjectId, ref: 'Categorie', required: true},
            nom_produit: String,
            description: String,
            prix: Number,
            prix_promotionnel: Number,
            quantite_stock: Number,
            seuil_alerte_stock: Number,
            images: [String],
            est_actif: {type: Boolean, default: true},
        },
        {timestamps: true}
    )
    
);