const mongoose = require('mongoose');

module.exports = mongoose.model(
    "BoutiqueFavori",
    new mongoose.Schema(
        {
            acheteur: {type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true},
            boutique: {type: mongoose.Schema.Types.ObjectId, ref: 'Boutique', required: true},
        },
        {timestamps: true}
    )
        
);