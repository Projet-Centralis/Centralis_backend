// const mongoose = require("mongoose");

// module.exports = mongoose.model(
//   "Event",
//   new mongoose.Schema(
//     {
//       boutique: { type: mongoose.Schema.Types.ObjectId, ref: "Boutique" },
//       titre: String,
//       description: String,
//       date_debut: Date,
//       date_fin: Date,
//       statut: String,
//       capacite_max: Number
//     },
//     { timestamps: true }
//   )
// );

const mongoose = require("mongoose");

module.exports = mongoose.model(
  "Event",
  new mongoose.Schema(
    {
      boutique: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "Boutique", 
        required: true 
      },
      user: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "User", 
        required: true 
      },
      titre: { 
        type: String, 
        required: true 
      },
      description: { 
        type: String, 
        required: true 
      },
      date_debut: { 
        type: Date, 
        required: true 
      },
      date_fin: { 
        type: Date, 
        required: true 
      },
      statut: { 
        type: String, 
        enum: ["en attente", "valide", "rejete", "termine"],
        default: "en attente"
      },
      capacite_max: { 
        type: Number, 
        required: true,
        min: 1
      }
    },
    { timestamps: true }
  )
);