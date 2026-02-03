const mongoose = require('mongoose');

module.exports = mongoose.model(
    "EmplacementStock",
    new mongoose.Schema(
        {
            boutique: {type: mongoose.Schema.Types.ObjectId, ref: 'Boutique', required: true},
            nom_emplacement: String,
            description: String,
            capacite_max: Number
        },
        {timestamps: true}
    )
);