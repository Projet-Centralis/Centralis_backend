const mongoose = require("mongoose");

module.exports = mongoose.model(
  "DiscussionForum",
  new mongoose.Schema(
    {
      acheteur: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      titre: String,
      contenu: String,
      statut: String,
      nombre_vues: Number
    },
    { timestamps: true }
  )
);
