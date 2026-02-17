const router = require("express").Router();
const DiscussionForum = require("../models/DiscussionForum");
const { protect, authorize } = require("../middlewares/auth.middleware");


// =======================================================
// GET : Liste des discussions
// =======================================================
router.get("/", protect, async (req, res) => {
  try {
    const discussions = await DiscussionForum.find()
      .populate({
        path: "acheteur",
        select: "email type_user"
      });

    res.json({
      success: true,
      count: discussions.length,
      data: discussions
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération des discussions"
    });
  }
});



// =======================================================
// POST : Créer une discussion (utilisateur connecté)
// =======================================================
router.post("/", protect, async (req, res) => {
  try {
    const { titre, contenu, statut } = req.body;

    if (!titre || !contenu) {
      return res.status(400).json({
        success: false,
        message: "Titre et contenu sont requis"
      });
    }

    const discussion = await DiscussionForum.create({
      acheteur: req.userId,
      titre,
      contenu,
      statut: statut || "ouvert",
      nombre_vues: 0
    });

    const discussionPopule = await DiscussionForum.findById(discussion._id)
      .populate("acheteur", "nom email type_user");

    res.status(201).json({
      success: true,
      message: "Discussion créée avec succès",
      data: discussionPopule
    });

  } catch (error) {
    console.error("Erreur création discussion:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la création"
    });
  }
});


// =======================================================
// PUT : Modifier une discussion (propriétaire seulement)
// =======================================================
router.put("/:id", protect, async (req, res) => {
  try {
    const discussion = await DiscussionForum.findById(req.params.id);

    if (!discussion) {
      return res.status(404).json({
        success: false,
        message: "Discussion non trouvée"
      });
    }

    // Vérifier propriétaire
    if (discussion.acheteur.toString() !== req.userId) {
      return res.status(403).json({
        success: false,
        message: "Non autorisé à modifier cette discussion"
      });
    }

    const updated = await DiscussionForum.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate("acheteur", "nom email type_user");

    res.json({
      success: true,
      message: "Discussion modifiée",
      data: updated
    });

  } catch (error) {
    console.error("Erreur modification:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la modification"
    });
  }
});


// =======================================================
// DELETE : Supprimer discussion (propriétaire ou admin)
// =======================================================
router.delete("/:id", protect, async (req, res) => {
  try {
    const discussion = await DiscussionForum.findById(req.params.id);

    if (!discussion) {
      return res.status(404).json({
        success: false,
        message: "Discussion non trouvée"
      });
    }

    if (discussion.acheteur.toString() !== req.userId && req.userType !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Non autorisé à supprimer"
      });
    }

    await DiscussionForum.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Discussion supprimée avec succès"
    });

  } catch (error) {
    console.error("Erreur suppression:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la suppression"
    });
  }
});


// =======================================================
// GET : Une discussion + incrémenter les vues
// =======================================================
router.get("/:id", protect, async (req, res) => {
  try {
    const discussion = await DiscussionForum.findByIdAndUpdate(
      req.params.id,
      { $inc: { nombre_vues: 1 } },
      { new: true }
    ).populate("acheteur", "nom email type_user");

    if (!discussion) {
      return res.status(404).json({
        success: false,
        message: "Discussion non trouvée"
      });
    }

    res.json({
      success: true,
      data: discussion
    });

  } catch (error) {
    console.error("Erreur récupération:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération"
    });
  }
});


module.exports = router;
