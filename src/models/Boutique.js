const mongoose = require('mongoose');

module.exports = mongoose.model(
    'Boutique',
    new mongoose.Schema(
        {
            user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
            nom_boutique: { type: String, required: true },
            description: String,
            logo: String,
            telephone: String,
            email_contact: String
        },
        { timestamps: true }
    )   
);