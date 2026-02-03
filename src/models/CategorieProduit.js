const mongoose = require('mongoose');

module.exports = mongoose.model(
    "CategorieProduit",
    new mongoose.Schema(
        {
            nom: { type: String, required: true, unique: true },
            description: { type: String, required: false },
        },
        { timestamps: true }
    )   
);