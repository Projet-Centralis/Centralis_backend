// const router = require("express").Router();
// const Produit = require("../models/Produit");
// const { protect } = require("../middlewares/auth.middleware");

// // GET par boutique
// router.get("/boutique/:id", async (req, res) => {
//   res.json(await Produit.find({ boutique: req.params.id }));
// });

// // POST
// router.post("/", protect, async (req, res) => {
//   res.status(201).json(await Produit.create(req.body));
// });

// // PUT
// router.put("/:id", protect, async (req, res) => {
//   res.json(await Produit.findByIdAndUpdate(req.params.id, req.body, { new: true }));
// });

// // DELETE
// router.delete("/:id", protect, async (req, res) => {
//   await Produit.findByIdAndDelete(req.params.id);
//   res.sendStatus(204);
// });

// module.exports = router;

const router = require("express").Router();
const Produit = require("../models/Produit");
const Boutique = require("../models/Boutique");
const { protect, authorize } = require("../middlewares/auth.middleware");

// GET produits de la boutique connectée
router.get("/boutique", protect, authorize("BOUTIQUE"), async (req, res) => {
  try {
    const boutique = await Boutique.findOne({ user: req.user.id });
    
    if (!boutique) {
      return res.status(404).json({ 
        success: false,
        message: "Aucune boutique trouvée pour cet utilisateur" 
      });
    }
    
    const produits = await Produit.find({ boutique: boutique._id })
      .populate("categorie", "nom description")
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: produits
    });
    
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
});

// POST créer produit
router.post("/", protect, authorize("BOUTIQUE"), async (req, res) => {
  try {
    const { 
      categorie, 
      nom_produit, 
      description, 
      prix, 
      prix_promotionnel, 
      quantite_stock,
      seuil_alerte_stock,
      images 
    } = req.body;
    
    // Validation
    if (!categorie || !nom_produit || !description || !prix || quantite_stock === undefined) {
      return res.status(400).json({ 
        success: false,
        message: "Champs requis manquants" 
      });
    }
    
    const boutique = await Boutique.findOne({ user: req.user.id });
    
    if (!boutique) {
      return res.status(404).json({ 
        success: false,
        message: "Boutique non trouvée" 
      });
    }
    
    const produit = await Produit.create({
      boutique: boutique._id,
      categorie,
      nom_produit,
      description,
      prix: parseFloat(prix),
      prix_promotionnel: prix_promotionnel ? parseFloat(prix_promotionnel) : undefined,
      quantite_stock: parseInt(quantite_stock),
      seuil_alerte_stock: seuil_alerte_stock || 10,
      images: images || [],
      est_actif: true
    });
    
    const populatedProduit = await Produit.findById(produit._id)
      .populate("categorie", "nom description");
    
    res.status(201).json({
      success: true,
      message: "Produit créé avec succès",
      data: populatedProduit
    });
    
  } catch (error) {
    console.error("Erreur création produit:", error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
});

// PUT mettre à jour produit
router.put("/:id", protect, authorize("BOUTIQUE"), async (req, res) => {
  try {
    const boutique = await Boutique.findOne({ user: req.user.id });
    
    if (!boutique) {
      return res.status(404).json({ 
        success: false,
        message: "Boutique non trouvée" 
      });
    }
    
    const produit = await Produit.findOne({
      _id: req.params.id,
      boutique: boutique._id
    });
    
    if (!produit) {
      return res.status(404).json({ 
        success: false,
        message: "Produit non trouvé ou non autorisé" 
      });
    }
    
    const updatedProduit = await Produit.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    ).populate("categorie", "nom description");
    
    res.json({
      success: true,
      message: "Produit mis à jour avec succès",
      data: updatedProduit
    });
    
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
});

// PATCH changer statut produit
router.put("/:id/status", protect, authorize("BOUTIQUE"), async (req, res) => {
  try {
    const { est_actif } = req.body;
    
    const boutique = await Boutique.findOne({ user: req.user.id });
    
    if (!boutique) {
      return res.status(404).json({ 
        success: false,
        message: "Boutique non trouvée" 
      });
    }
    
    const produit = await Produit.findOne({
      _id: req.params.id,
      boutique: boutique._id
    });
    
    if (!produit) {
      return res.status(404).json({ 
        success: false,
        message: "Produit non trouvé ou non autorisé" 
      });
    }
    
    const updatedProduit = await Produit.findByIdAndUpdate(
      req.params.id,
      { est_actif },
      { new: true }
    ).populate("categorie", "nom description");
    
    res.json({
      success: true,
      message: `Produit ${est_actif ? 'activé' : 'désactivé'} avec succès`,
      data: updatedProduit
    });
    
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
});

// DELETE supprimer produit
router.delete("/:id", protect, authorize("BOUTIQUE"), async (req, res) => {
  try {
    const boutique = await Boutique.findOne({ user: req.user.id });
    
    if (!boutique) {
      return res.status(404).json({ 
        success: false,
        message: "Boutique non trouvée" 
      });
    }
    
    const produit = await Produit.findOneAndDelete({
      _id: req.params.id,
      boutique: boutique._id
    });
    
    if (!produit) {
      return res.status(404).json({ 
        success: false,
        message: "Produit non trouvé ou non autorisé" 
      });
    }
    
    res.json({
      success: true,
      message: "Produit supprimé avec succès"
    });
    
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
});

module.exports = router;