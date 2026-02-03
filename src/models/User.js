const mongoose = require('mongoose');

module.exports = mongoose.model('User', new mongoose.Schema(
    {
        email: {type: String, required: true, unique: true},
        password: {type: String, required: true},
        type_user: {type: mongoose.Schema.Types.ObjectId, ref: 'TypeUser'}
    },
    {timestamps: true}
    )
);