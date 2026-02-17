const router = require("express").Router();
const CommentaireForum = require("../models/CommentaireForum");
const DiscussionForum = require("../models/DiscussionForum");
const { protect } = require("../middlewares/auth.middleware");


// =======================================================
// GET : Tous les commentaires d'une discussion
// =======================================================
router.get("/discussion/:discussionId", protect, async (req, res) => {
  try {
    const commentaires = await CommentaireForum.find({
      discussion: req.params.discussionId
    })
      .populate({
        path: "acheteur",
        select: "email type_user",
        populate: {
          path: "type_user",
          select: "nom"
        }
      })
      .populate("parent")
      .sort({ createdAt: 1 });

    res.json({
      success: true,
      count: commentaires.length,
      data: commentaires
    });

  } catch (error) {
    console.error("Erreur récupération commentaires:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération"
    });
  }
});


// =======================================================
// POST : Ajouter un commentaire
// =======================================================
router.post("/", protect, async (req, res) => {
  try {
    const { discussion, contenu, parent } = req.body;

    if (!discussion || !contenu) {
      return res.status(400).json({
        success: false,
        message: "Discussion et contenu requis"
      });
    }

    // Vérifier que la discussion existe
    const discussionExist = await DiscussionForum.findById(discussion);
    if (!discussionExist) {
      return res.status(404).json({
        success: false,
        message: "Discussion non trouvée"
      });
    }

    const commentaire = await CommentaireForum.create({
      discussion,
      acheteur: req.userId,
      contenu,
      parent: parent || null
    });

    const commentairePopule = await CommentaireForum.findById(commentaire._id)
      .populate({
        path: "acheteur",
        select: "email type_user",
        populate: {
          path: "type_user",
          select: "nom"
        }
      })
      .populate("parent");

    res.status(201).json({
      success: true,
      message: "Commentaire ajouté",
      data: commentairePopule
    });

  } catch (error) {
    console.error("Erreur création commentaire:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la création"
    });
  }
});


// =======================================================
// PUT : Modifier un commentaire (propriétaire)
// =======================================================
router.put("/:id", protect, async (req, res) => {
  try {
    const commentaire = await CommentaireForum.findById(req.params.id);

    if (!commentaire) {
      return res.status(404).json({
        success: false,
        message: "Commentaire non trouvé"
      });
    }

    if (commentaire.acheteur.toString() !== req.userId) {
      return res.status(403).json({
        success: false,
        message: "Non autorisé"
      });
    }

    const updated = await CommentaireForum.findByIdAndUpdate(
      req.params.id,
      { contenu: req.body.contenu },
      { new: true }
    ).populate({
      path: "acheteur",
      select: "email type_user",
      populate: {
        path: "type_user",
        select: "nom"
      }
    });

    res.json({
      success: true,
      message: "Commentaire modifié",
      data: updated
    });

  } catch (error) {
    console.error("Erreur modification:", error);
    res.status(500).json({
      success: false,
      message: "Erreur modification"
    });
  }
});


// =======================================================
// DELETE : Supprimer commentaire (owner ou admin)
// =======================================================
router.delete("/:id", protect, async (req, res) => {
  try {
    const commentaire = await CommentaireForum.findById(req.params.id);

    if (!commentaire) {
      return res.status(404).json({
        success: false,
        message: "Commentaire non trouvé"
      });
    }

    if (commentaire.acheteur.toString() !== req.userId && req.userType !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Non autorisé"
      });
    }

    await CommentaireForum.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Commentaire supprimé"
    });

  } catch (error) {
    console.error("Erreur suppression:", error);
    res.status(500).json({
      success: false,
      message: "Erreur suppression"
    });
  }
});


module.exports = router;
