const router = require("express").Router();
const Emplacement = require("../models/EmplacementStock");
const Boutique = require("../models/Boutique");
const { protect, authorize } = require("../middlewares/auth.middleware");

// ========== GET ==========

// GET tous les emplacements de la boutique connectée
router.get("/boutique", protect, authorize("BOUTIQUE"), async (req, res) => {
  try {
    const boutique = await Boutique.findOne({ user: req.user.id });
    
    if (!boutique) {
      return res.status(404).json({ 
        success: false,
        message: "Aucune boutique trouvée pour cet utilisateur" 
      });
    }
    
    const emplacements = await Emplacement.find({ boutique: boutique._id })
      .populate("boutique", "nom_boutique")
      .sort({ nom_emplacement: 1 });
    
    res.json({
      success: true,
      data: emplacements
    });
    
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
});

// GET un emplacement par ID
router.get("/:id", protect, authorize("BOUTIQUE"), async (req, res) => {
  try {
    const boutique = await Boutique.findOne({ user: req.user.id });
    
    if (!boutique) {
      return res.status(404).json({ 
        success: false,
        message: "Boutique non trouvée" 
      });
    }
    
    const emplacement = await Emplacement.findOne({
      _id: req.params.id,
      boutique: boutique._id
    }).populate("boutique", "nom_boutique");
    
    if (!emplacement) {
      return res.status(404).json({ 
        success: false,
        message: "Emplacement non trouvé" 
      });
    }
    
    res.json({
      success: true,
      data: emplacement
    });
    
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
});

// ========== POST ==========

// POST créer un nouvel emplacement
router.post("/", protect, authorize("BOUTIQUE"), async (req, res) => {
  try {
    const { nom_emplacement, description, capacite_max } = req.body;
    
    // Validation
    if (!nom_emplacement) {
      return res.status(400).json({ 
        success: false,
        message: "Le nom de l'emplacement est requis" 
      });
    }
    
    const boutique = await Boutique.findOne({ user: req.user.id });
    
    if (!boutique) {
      return res.status(404).json({ 
        success: false,
        message: "Boutique non trouvée" 
      });
    }
    
    // Vérifier si un emplacement avec ce nom existe déjà pour cette boutique
    const existingEmplacement = await Emplacement.findOne({
      boutique: boutique._id,
      nom_emplacement: nom_emplacement
    });
    
    if (existingEmplacement) {
      return res.status(400).json({ 
        success: false,
        message: "Un emplacement avec ce nom existe déjà" 
      });
    }
    
    const emplacement = await Emplacement.create({
      boutique: boutique._id,
      nom_emplacement,
      description: description || "",
      capacite_max: capacite_max || 0
    });
    
    const populatedEmplacement = await Emplacement.findById(emplacement._id)
      .populate("boutique", "nom_boutique");
    
    res.status(201).json({
      success: true,
      message: "Emplacement créé avec succès",
      data: populatedEmplacement
    });
    
  } catch (error) {
    console.error("Erreur création emplacement:", error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
});

// ========== PUT ==========

// PUT mettre à jour un emplacement
router.put("/:id", protect, authorize("BOUTIQUE"), async (req, res) => {
  try {
    const { nom_emplacement, description, capacite_max } = req.body;
    
    const boutique = await Boutique.findOne({ user: req.user.id });
    
    if (!boutique) {
      return res.status(404).json({ 
        success: false,
        message: "Boutique non trouvée" 
      });
    }
    
    // Vérifier que l'emplacement appartient à la boutique
    const emplacement = await Emplacement.findOne({
      _id: req.params.id,
      boutique: boutique._id
    });
    
    if (!emplacement) {
      return res.status(404).json({ 
        success: false,
        message: "Emplacement non trouvé ou non autorisé" 
      });
    }
    
    // Si le nom est modifié, vérifier qu'il n'existe pas déjà
    if (nom_emplacement && nom_emplacement !== emplacement.nom_emplacement) {
      const existingEmplacement = await Emplacement.findOne({
        boutique: boutique._id,
        nom_emplacement: nom_emplacement,
        _id: { $ne: req.params.id }
      });
      
      if (existingEmplacement) {
        return res.status(400).json({ 
          success: false,
          message: "Un emplacement avec ce nom existe déjà" 
        });
      }
    }
    
    const updatedEmplacement = await Emplacement.findByIdAndUpdate(
      req.params.id,
      {
        nom_emplacement: nom_emplacement || emplacement.nom_emplacement,
        description: description !== undefined ? description : emplacement.description,
        capacite_max: capacite_max !== undefined ? capacite_max : emplacement.capacite_max
      },
      { new: true }
    ).populate("boutique", "nom_boutique");
    
    res.json({
      success: true,
      message: "Emplacement mis à jour avec succès",
      data: updatedEmplacement
    });
    
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
});

// ========== DELETE ==========

// DELETE supprimer un emplacement
router.delete("/:id", protect, authorize("BOUTIQUE"), async (req, res) => {
  try {
    const boutique = await Boutique.findOne({ user: req.user.id });
    
    if (!boutique) {
      return res.status(404).json({ 
        success: false,
        message: "Boutique non trouvée" 
      });
    }
    
    // Vérifier que l'emplacement appartient à la boutique
    const emplacement = await Emplacement.findOneAndDelete({
      _id: req.params.id,
      boutique: boutique._id
    });
    
    if (!emplacement) {
      return res.status(404).json({ 
        success: false,
        message: "Emplacement non trouvé ou non autorisé" 
      });
    }
    
    // Optionnel: Vérifier s'il y a des stocks associés à cet emplacement
    // et les traiter (les supprimer ou les réaffecter)
    
    res.json({
      success: true,
      message: "Emplacement supprimé avec succès"
    });
    
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
});

module.exports = router;