const mongoose = require("mongoose");

module.exports = mongoose.model(
  "EventUser",
  new mongoose.Schema(
    {
      event: {type: mongoose.Schema.Types.ObjectId, ref: 'Event'},
      user: {type: mongoose.Schema.Types.ObjectId, ref: 'User'} 
    },
    { timestamps: true }
  )
);
