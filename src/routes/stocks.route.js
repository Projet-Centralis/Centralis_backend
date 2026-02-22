const router = require("express").Router();
const Stock = require("../models/Stock");
const Produit = require("../models/Produit");
const Boutique = require("../models/Boutique");
const emplacement = require("../models/EmplacementStock");
const MouvementStock = require("../models/MouvementStock");
const { protect, authorize } = require("../middlewares/auth.middleware");

// GET stocks d'un produit
router.get("/produit/:produitId", protect, authorize("BOUTIQUE"), async (req, res) => {
  try {
    // Vérifier que le produit appartient à la boutique de l'utilisateur
    const boutique = await Boutique.findOne({ user: req.user.id });
    
    if (!boutique) {
      return res.status(404).json({ 
        success: false,
        message: "Boutique non trouvée" 
      });
    }

    const produit = await Produit.findOne({
      _id: req.params.produitId,
      boutique: boutique._id
    });

    if (!produit) {
      return res.status(404).json({ 
        success: false,
        message: "Produit non trouvé ou non autorisé" 
      });
    }

    const stocks = await Stock.find({ produit: req.params.produitId })
      .populate("produit", "nom_produit")
      .populate("emplacement", "nom description");

    res.json({
      success: true,
      data: stocks
    });
    
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
});

// // POST ajouter/modifier stock
// router.post("/produit/:produitId", protect, authorize("BOUTIQUE"), async (req, res) => {
//   try {
//     const { emplacement, quantite, operation = 'entree' } = req.body;
    
//     if (!emplacement || quantite === undefined) {
//       return res.status(400).json({ 
//         success: false,
//         message: "Emplacement et quantité requis" 
//       });
//     }

//     const boutique = await Boutique.findOne({ user: req.user.id });
    
//     if (!boutique) {
//       return res.status(404).json({ 
//         success: false,
//         message: "Boutique non trouvée" 
//       });
//     }

//     const produit = await Produit.findOne({
//       _id: req.params.produitId,
//       boutique: boutique._id
//     });

//     if (!produit) {
//       return res.status(404).json({ 
//         success: false,
//         message: "Produit non trouvé ou non autorisé" 
//       });
//     }

//     // Chercher un stock existant pour cet emplacement
//     let stock = await Stock.findOne({
//       produit: req.params.produitId,
//       emplacement: emplacement
//     });

//     const now = new Date();
    
//     if (stock) {
//       // Mettre à jour le stock existant
//       stock.quantite = operation === 'entree' 
//         ? stock.quantite + parseInt(quantite) 
//         : Math.max(0, stock.quantite - parseInt(quantite));
      
//       if (operation === 'entree') {
//         stock.date_derniere_entree = now;
//       } else {
//         stock.date_deriere_sortie = now;
//       }
      
//       await stock.save();
//     } else {
//       // Créer un nouveau stock
//       if (operation !== 'entree') {
//         return res.status(400).json({ 
//           success: false,
//           message: "Impossible de sortir du stock d'un emplacement vide" 
//         });
//       }
      
//       stock = await Stock.create({
//         produit: req.params.produitId,
//         emplacement: emplacement,
//         quantite: parseInt(quantite),
//         date_derniere_entree: now
//       });
//     }

//     // Mettre à jour la quantité totale du produit
//     const stocks = await Stock.find({ produit: req.params.produitId });
//     const totalQuantite = stocks.reduce((sum, s) => sum + s.quantite, 0);
    
//     await Produit.findByIdAndUpdate(req.params.produitId, {
//       quantite_stock: totalQuantite
//     });

//     const populatedStock = await Stock.findById(stock._id)
//       .populate("produit", "nom_produit")
//       .populate("emplacement", "nom description");

//     res.status(201).json({
//       success: true,
//       message: `Stock ${operation === 'entree' ? 'ajouté' : 'retiré'} avec succès`,
//       data: populatedStock
//     });
    
//   } catch (error) {
//     console.error("Erreur détaillée:", error);
//     res.status(500).json({ 
//       success: false,
//       message: error.message 
//     });
//   }
// });


// // PUT mettre à jour stock
// router.put("/:id", protect, authorize("BOUTIQUE"), async (req, res) => {
//   try {
//     const { quantite, emplacement } = req.body;
    
//     const stock = await Stock.findById(req.params.id)
//       .populate("produit");
    
//     if (!stock) {
//       return res.status(404).json({ 
//         success: false,
//         message: "Stock non trouvé" 
//       });
//     }

//     // Vérifier que le produit appartient à la boutique de l'utilisateur
//     const boutique = await Boutique.findOne({ user: req.user.id });
    
//     if (!boutique) {
//       return res.status(404).json({ 
//         success: false,
//         message: "Boutique non trouvée" 
//       });
//     }

//     const produit = await Produit.findOne({
//       _id: stock.produit._id,
//       boutique: boutique._id
//     });

//     if (!produit) {
//       return res.status(403).json({ 
//         success: false,
//         message: "Non autorisé" 
//       });
//     }

//     const updatedStock = await Stock.findByIdAndUpdate(
//       req.params.id,
//       {
//         quantite: quantite !== undefined ? quantite : stock.quantite,
//         emplacement: emplacement || stock.emplacement
//       },
//       { new: true }
//     ).populate("produit", "nom_produit")
//      .populate("emplacement", "nom description");

//     // Mettre à jour la quantité totale du produit
//     const stocks = await Stock.find({ produit: stock.produit._id });
//     const totalQuantite = stocks.reduce((sum, s) => sum + s.quantite, 0);
    
//     await Produit.findByIdAndUpdate(stock.produit._id, {
//       quantite_stock: totalQuantite
//     });

//     res.json({
//       success: true,
//       message: "Stock mis à jour avec succès",
//       data: updatedStock
//     });
    
//   } catch (error) {
//     res.status(500).json({ 
//       success: false,
//       message: error.message 
//     });
//   }
// });

// POST ajouter/modifier stock (modifié pour enregistrer l'historique)
router.post("/produit/:produitId", protect, authorize("BOUTIQUE"), async (req, res) => {
  try {
    const { emplacement, quantite, operation = 'entree', motif = '' } = req.body;
    
    if (!emplacement || quantite === undefined) {
      return res.status(400).json({ 
        success: false,
        message: "Emplacement et quantité requis" 
      });
    }

    const boutique = await Boutique.findOne({ user: req.user.id });
    
    if (!boutique) {
      return res.status(404).json({ 
        success: false,
        message: "Boutique non trouvée" 
      });
    }

    const produit = await Produit.findOne({
      _id: req.params.produitId,
      boutique: boutique._id
    });

    if (!produit) {
      return res.status(404).json({ 
        success: false,
        message: "Produit non trouvé ou non autorisé" 
      });
    }

    // Chercher l'emplacement
    let emplacementId = emplacement;
    // let emplacementDoc;
    
    // if (!emplacement.match(/^[0-9a-fA-F]{24}$/)) {
    //   emplacementDoc = await Emplacement.findOne({ 
    //     boutique: boutique._id,
    //     nom_emplacement: emplacement 
    //   });
      
    //   if (!emplacementDoc) {
    //     return res.status(404).json({ 
    //       success: false,
    //       message: "Emplacement non trouvé" 
    //     });
    //   }
      
    //   emplacementId = emplacementDoc._id;
    // } else {
    //   emplacementDoc = await Emplacement.findById(emplacementId);
    // }

    // Chercher un stock existant pour cet emplacement
    let stock = await Stock.findOne({
      produit: req.params.produitId,
      emplacement: emplacement
    });

    const now = new Date();
    let quantiteAvant = stock ? stock.quantite : 0;
    let quantiteApres;
    
    if (stock) {
      // Mettre à jour le stock existant
      quantiteApres = operation === 'entree' 
        ? stock.quantite + parseInt(quantite) 
        : Math.max(0, stock.quantite - parseInt(quantite));
      
      stock.quantite = quantiteApres;
      
      if (operation === 'entree') {
        stock.date_derniere_entree = now;
      } else {
        stock.date_deriere_sortie = now;
      }
      
      await stock.save();
    } else {
      // Créer un nouveau stock
      if (operation !== 'entree') {
        return res.status(400).json({ 
          success: false,
          message: "Impossible de sortir du stock d'un emplacement vide" 
        });
      }
      
      quantiteApres = parseInt(quantite);
      
      stock = await Stock.create({
        produit: req.params.produitId,
        emplacement: emplacementId,
        quantite: quantiteApres,
        date_derniere_entree: now
      });
    }

    // Mettre à jour la quantité totale du produit
    const stocks = await Stock.find({ produit: req.params.produitId });
    const totalQuantite = stocks.reduce((sum, s) => sum + s.quantite, 0);
    
    await Produit.findByIdAndUpdate(req.params.produitId, {
      quantite_stock: totalQuantite
    });

    // Enregistrer le mouvement dans l'historique
    await MouvementStock.create({
      produit: req.params.produitId,
      emplacement: emplacementId,
      type_mouvement: operation,
      quantite: parseInt(quantite),
      quantite_avant: quantiteAvant,
      quantite_apres: quantiteApres,
      motif: motif || (operation === 'entree' ? 'Entrée de stock' : 'Sortie de stock'),
      utilisateur: req.user.id,
      date_mouvement: now
    });

    const populatedStock = await Stock.findById(stock._id)
      .populate("produit", "nom_produit")
      .populate("emplacement", "nom_emplacement description");

    res.status(201).json({
      success: true,
      message: `Stock ${operation === 'entree' ? 'ajouté' : 'retiré'} avec succès`,
      data: populatedStock
    });
    
  } catch (error) {
    console.error("Erreur détaillée:", error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
});

// PUT mettre à jour stock (ajustement)
router.put("/:id", protect, authorize("BOUTIQUE"), async (req, res) => {
  try {
    const { quantite, emplacement, motif = 'Ajustement manuel' } = req.body;
    
    const stock = await Stock.findById(req.params.id)
      .populate("produit");
    
    if (!stock) {
      return res.status(404).json({ 
        success: false,
        message: "Stock non trouvé" 
      });
    }

    // Vérifier que le produit appartient à la boutique de l'utilisateur
    const boutique = await Boutique.findOne({ user: req.user.id });
    
    if (!boutique) {
      return res.status(404).json({ 
        success: false,
        message: "Boutique non trouvée" 
      });
    }

    const produit = await Produit.findOne({
      _id: stock.produit._id,
      boutique: boutique._id
    });

    if (!produit) {
      return res.status(403).json({ 
        success: false,
        message: "Non autorisé" 
      });
    }

    const quantiteAvant = stock.quantite;
    
    const updatedStock = await Stock.findByIdAndUpdate(
      req.params.id,
      {
        quantite: quantite !== undefined ? quantite : stock.quantite,
        emplacement: emplacement || stock.emplacement
      },
      { new: true }
    ).populate("produit", "nom_produit")
     .populate("emplacement", "nom_emplacement description");

    // Enregistrer l'ajustement
    if (quantite !== undefined && quantite !== quantiteAvant) {
      await MouvementStock.create({
        produit: stock.produit._id,
        emplacement: updatedStock.emplacement,
        type_mouvement: 'ajustement',
        quantite: Math.abs(quantite - quantiteAvant),
        quantite_avant: quantiteAvant,
        quantite_apres: quantite,
        motif: motif,
        utilisateur: req.user.id
      });
    }

    // Mettre à jour la quantité totale du produit
    const stocks = await Stock.find({ produit: stock.produit._id });
    const totalQuantite = stocks.reduce((sum, s) => sum + s.quantite, 0);
    
    await Produit.findByIdAndUpdate(stock.produit._id, {
      quantite_stock: totalQuantite
    });

    res.json({
      success: true,
      message: "Stock mis à jour avec succès",
      data: updatedStock
    });
    
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
});

// DELETE supprimer stock
router.delete("/:id", protect, authorize("BOUTIQUE"), async (req, res) => {
  try {
    const stock = await Stock.findById(req.params.id)
      .populate("produit");
    
    if (!stock) {
      return res.status(404).json({ 
        success: false,
        message: "Stock non trouvé" 
      });
    }

    // Vérifier que le produit appartient à la boutique de l'utilisateur
    const boutique = await Boutique.findOne({ user: req.user.id });
    
    if (!boutique) {
      return res.status(404).json({ 
        success: false,
        message: "Boutique non trouvée" 
      });
    }

    const produit = await Produit.findOne({
      _id: stock.produit._id,
      boutique: boutique._id
    });

    if (!produit) {
      return res.status(403).json({ 
        success: false,
        message: "Non autorisé" 
      });
    }

    await Stock.findByIdAndDelete(req.params.id);

    // Mettre à jour la quantité totale du produit
    const stocks = await Stock.find({ produit: stock.produit._id });
    const totalQuantite = stocks.reduce((sum, s) => sum + s.quantite, 0);
    
    await Produit.findByIdAndUpdate(stock.produit._id, {
      quantite_stock: totalQuantite
    });

    res.json({
      success: true,
      message: "Stock supprimé avec succès"
    });
    
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
});

// GET historique des mouvements d'un produit
router.get("/produit/:produitId/mouvements", protect, authorize("BOUTIQUE"), async (req, res) => {
  try {
    const boutique = await Boutique.findOne({ user: req.user.id });
    
    if (!boutique) {
      return res.status(404).json({ 
        success: false,
        message: "Boutique non trouvée" 
      });
    }

    const produit = await Produit.findOne({
      _id: req.params.produitId,
      boutique: boutique._id
    });

    if (!produit) {
      return res.status(404).json({ 
        success: false,
        message: "Produit non trouvé ou non autorisé" 
      });
    }

    const mouvements = await MouvementStock.find({ produit: req.params.produitId })
      .populate("produit", "nom_produit")
      .populate("emplacement", "nom_emplacement")
      .populate("utilisateur", "nom email")
      .sort({ date_mouvement: -1 });

    res.json({
      success: true,
      data: mouvements
    });
    
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
});

// GET tous les mouvements de la boutique
router.get("/mouvements", protect, authorize("BOUTIQUE"), async (req, res) => {
  try {
    const boutique = await Boutique.findOne({ user: req.user.id });
    
    if (!boutique) {
      return res.status(404).json({ 
        success: false,
        message: "Boutique non trouvée" 
      });
    }

    // Récupérer tous les produits de la boutique
    const produits = await Produit.find({ boutique: boutique._id }).select('_id');
    const produitIds = produits.map(p => p._id);

    const mouvements = await MouvementStock.find({ produit: { $in: produitIds } })
      .populate("produit", "nom_produit")
      .populate("emplacement", "nom_emplacement")
      .populate("utilisateur", "nom email")
      .sort({ date_mouvement: -1 })
      .limit(100); // Limiter aux 100 derniers mouvements

    res.json({
      success: true,
      data: mouvements
    });
    
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
});

module.exports = router;