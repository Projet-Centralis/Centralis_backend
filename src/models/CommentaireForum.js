const mongoose = require("mongoose");

module.exports = mongoose.model(
  "CommentaireForum",
  new mongoose.Schema(
    {
      discussion: { type: mongoose.Schema.Types.ObjectId, ref: "DiscussionForum" },
      acheteur: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      contenu: String,
      parent: { type: mongoose.Schema.Types.ObjectId, ref: "CommentaireForum" }
    },
    { timestamps: true }
  )
);
