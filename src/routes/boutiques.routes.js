// const router = require("express").Router();
// const Boutique = require("../models/Boutique");
// const { protect, authorize } = require("../middlewares/auth.middleware");


// // GET toutes les boutiques
// router.get("/", protect, async (req, res) => {
//   res.json(await Boutique.find().populate("user"));
// });

// // POST boutique (BOUTIQUE)
// router.post("/", protect, authorize("BOUTIQUE","ADMIN"), async (req, res) => {
//   res.status(201).json(
//     await Boutique.create({ ...req.body, user: req.user.userId })
//   );
// });

// // PUT
// router.put("/:id", protect, authorize("BOUTIQUE"), async (req, res) => {
//   res.json(await Boutique.findByIdAndUpdate(req.params.id, req.body, { new: true }));
// });

// // DELETE
// router.delete("/:id", protect, authorize("ADMIN"), async (req, res) => {
//   await Boutique.findByIdAndDelete(req.params.id);
//   res.sendStatus(204);
// });

// module.exports = router;
const router = require("express").Router();
const Boutique = require("../models/Boutique");
const BoutiqueFavori = require("../models/BoutiqueFavori");
const { protect, authorize } = require("../middlewares/auth.middleware");

// GET toutes les boutiques
router.get("/", protect, async (req, res) => {
  try {
    const boutiques = await Boutique.find().populate("user", "email type_user");
    res.json({
      success: true,
      count: boutiques.length,
      data: boutiques
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération des boutiques"
    });
  }
});

// POST création d'une boutique (réservé aux BOUTIQUE et ADMIN)
router.post("/", protect, authorize("BOUTIQUE", "ADMIN"), async (req, res) => {
  try {
    // Vérifier les champs requis
    const { nom_boutique, description, logo, telephone, email_contact } = req.body;
    
    if (!nom_boutique) {
      return res.status(400).json({
        success: false,
        message: "Le nom de la boutique est requis"
      });
    }

    // Vérifier si l'utilisateur a déjà une boutique
    const existingBoutique = await Boutique.findOne({ user: req.userId });
    if (existingBoutique && req.userType === "BOUTIQUE") {
      return res.status(400).json({
        success: false,
        message: "Vous avez déjà créé une boutique",
        boutique: existingBoutique
      });
    }

    // Créer la boutique
    const nouvelleBoutique = await Boutique.create({
      user: req.userId, // L'ID de l'utilisateur connecté
      nom_boutique,
      description,
      logo,
      telephone,
      email_contact
    });

    // Peupler les informations de l'utilisateur
    const boutiqueAvecUser = await Boutique.findById(nouvelleBoutique._id)
      .populate("user", "email type_user");

    res.status(201).json({
      success: true,
      message: "Boutique créée avec succès",
      data: boutiqueAvecUser
    });

  } catch (error) {
    console.error("Erreur création boutique:", error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: "Erreur de validation",
        errors: error.errors
      });
    }
    
    res.status(500).json({
      success: false,
      message: "Erreur lors de la création de la boutique"
    });
  }
});

// PUT modification d'une boutique
router.put("/:id", protect, authorize("BOUTIQUE"), async (req, res) => {
  try {
    // Vérifier que la boutique appartient à l'utilisateur
    const boutique = await Boutique.findById(req.params.id);
    
    if (!boutique) {
      return res.status(404).json({
        success: false,
        message: "Boutique non trouvée"
      });
    }

    // Pour les BOUTIQUE, vérifier la propriété
    if (req.userType === "BOUTIQUE" && boutique.user.toString() !== req.userId) {
      return res.status(403).json({
        success: false,
        message: "Vous n'êtes pas autorisé à modifier cette boutique"
      });
    }

    // Mettre à jour la boutique
    const boutiqueModifiee = await Boutique.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate("user", "email type_user");

    res.json({
      success: true,
      message: "Boutique modifiée avec succès",
      data: boutiqueModifiee
    });

  } catch (error) {
    console.error("Erreur modification boutique:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la modification de la boutique"
    });
  }
});

// DELETE suppression d'une boutique
router.delete("/:id", protect, authorize("ADMIN"), async (req, res) => {
  try {
    const boutique = await Boutique.findByIdAndDelete(req.params.id);
    
    if (!boutique) {
      return res.status(404).json({
        success: false,
        message: "Boutique non trouvée"
      });
    }

    res.json({
      success: true,
      message: "Boutique supprimée avec succès"
    });

  } catch (error) {
    console.error("Erreur suppression boutique:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la suppression de la boutique"
    });
  }
});

// ---------------------------------------------------FAVORIS---------------------------------------------------
  // POST ajouter une boutique en favoris
  router.post("/favoris/:boutiqueId", protect, async (req, res) => {
    try {
      const boutiqueId = req.params.boutiqueId;
      const userId = req.userId;

      // Vérifier si la boutique existe
      const boutique = await Boutique.findById(boutiqueId);
      if (!boutique) {
        return res.status(404).json({
          success: false,
          message: "Boutique non trouvée"
        });
      }
      // Vérifier si le favori existe déjà
      const exist = await BoutiqueFavori.findOne({ acheteur: userId, boutique: boutiqueId });
      if (exist) {
        return res.status(400).json({
          success: false,
          message: "Cette boutique est déjà dans vos favoris"
        });
      }
      // Créer le favori
      const favori = await BoutiqueFavori.create({
        acheteur: userId,
        boutique: boutiqueId
      });

      // Peupler les infos pour la réponse
      const favoriPopule = await BoutiqueFavori.findById(favori._id)
        .populate("acheteur", "email type_user")
        .populate("boutique", "nom_boutique logo description");

      res.status(201).json({
        success: true,
        message: "Boutique ajoutée aux favoris",
        data: favoriPopule
      });

    } catch (error) {
      console.error("Erreur ajout favoris :", error);
      res.status(500).json({
        success: false,
        message: "Erreur lors de l'ajout aux favoris"
      });
    }
  });


// DELETE retirer une boutique des favoris
router.delete("/favoris/:boutiqueId", protect, async (req, res) => {
  try {
    const boutiqueId = req.params.boutiqueId;
    const userId = req.userId;

    // Vérifier si le favori existe
    const favori = await BoutiqueFavori.findOne({ acheteur: userId, boutique: boutiqueId });
    if (!favori) {
      return res.status(404).json({
        success: false,
        message: "Cette boutique n'est pas dans vos favoris"
      });
    }

    // Supprimer le favori
    await BoutiqueFavori.findByIdAndDelete(favori._id);

    res.json({
      success: true,
      message: "Boutique retirée des favoris"
    });

  } catch (error) {
    console.error("Erreur suppression favoris :", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la suppression du favori"
    });
  }
});

// GET toutes les boutiques favorites de l'utilisateur
router.get("/favoris", protect, async (req, res) => {
  try {
    const favoris = await BoutiqueFavori.find({ acheteur: req.userId })
      .populate("boutique", "nom_boutique logo description")
      .populate("acheteur", "email type_user");             

    res.json({
      success: true,
      count: favoris.length,
      data: favoris
    });
  } catch (error) {
    console.error("Erreur récupération favoris :", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération des favoris"
    });
  }
});

// GET nombre de favoris pour une boutique spécifique
router.get("/favoris/count/:boutiqueId", protect, async (req, res) => {
  try {
    const boutiqueId = req.params.boutiqueId;

    // Vérifier que la boutique existe
    const boutique = await Boutique.findById(boutiqueId);
    if (!boutique) {
      return res.status(404).json({
        success: false,
        message: "Boutique non trouvée"
      });
    }

    // Compter le nombre de favoris pour cette boutique
    const count = await BoutiqueFavori.countDocuments({ boutique: boutiqueId });

    res.json({
      success: true,
      boutique: {
        _id: boutique._id,
        nom_boutique: boutique.nom_boutique
      },
      favoris_count: count
    });

  } catch (error) {
    console.error("Erreur récupération nombre favoris boutique :", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération du nombre de favoris pour cette boutique"
    });
  }
});

// GET une boutique spécifique
router.get("/:id", protect, async (req, res) => {
  try {
    const boutique = await Boutique.findById(req.params.id)
      .populate("user", "email type_user");
    
    if (!boutique) {
      return res.status(404).json({
        success: false,
        message: "Boutique non trouvée"
      });
    }

    res.json({
      success: true,
      data: boutique
    });

  } catch (error) {
    console.error("Erreur récupération boutique:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération de la boutique"
    });
  }
});

module.exports = router;