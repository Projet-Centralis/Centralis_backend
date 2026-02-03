const mongoose = require('mongoose');

module.exports = mongoose.model('TypeUser', new mongoose.Schema({
    type_user: {
        type: String,
        enum: ["ADMIN", "BOUTIQUE", "ACHETEUR"],
        required: true,
        unique: true
    }
}));    