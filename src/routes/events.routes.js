// const router = require("express").Router();
// const Event = require("../models/Event");
// const { protect, authorize } = require("../middlewares/auth.middleware");

// router.get("/",protect, authorize("BOUTIQUE"), async (req, res) => {
//   res.json(await Event.find({ statut: "valide" }));
// });

// router.post("/", protect, authorize("BOUTIQUE"), async (req, res) => {
//   res.status(201).json(await Event.create(req.body));
// });

// router.put("/:id/valider", protect, authorize("ADMIN"), async (req, res) => {
//   res.json(await Event.findByIdAndUpdate(req.params.id, { statut: "valide" }, { new: true }));
// });

// module.exports = router;

const router = require("express").Router();
const Event = require("../models/Event");
const Boutique = require("../models/Boutique");
const { protect, authorize } = require("../middlewares/auth.middleware");
const EventUser = require("../models/EventUser");

// Récupérer tous les events validés
router.get("/events_valide", async (req, res) => {
  const events = await Event.find({ statut: "valide" }).populate('boutique', 'nom_boutique'); 
  res.json(events);
});

// Récupérer tous les events
router.get("/", async (req, res) => {
  const events = await Event.find();
  res.json({ success: true, data: events });
});

// Créer un event (BOUTIQUE)
router.post("/", protect, authorize("BOUTIQUE"), async (req, res) => {
  const event = await Event.create(req.body);
  res.status(201).json(event);
});

// Valider un event (ADMIN)
router.put("/:id/valider", protect, authorize("ADMIN"), async (req, res) => {
  const event = await Event.findByIdAndUpdate(
    req.params.id,
    { statut: "valide" },
    { new: true }
  );
  res.json(event);
});
// Route pour créer un événement
router.post("/", protect, authorize("BOUTIQUE"), async (req, res) => {
  try {
    // Validation des données requises
    const { titre, description, date_debut, date_fin, capacite_max } = req.body;
    
    if (!titre || !description || !date_debut || !date_fin || !capacite_max) {
      return res.status(400).json({ 
        success: false,
        message: "Tous les champs sont requis" 
      });
    }
    
    // Trouver la boutique de l'utilisateur
    const boutique = await Boutique.findOne({ user: req.user.id });
    
    if (!boutique) {
      return res.status(404).json({ 
        success: false,
        message: "Aucune boutique trouvée pour cet utilisateur" 
      });
    }
    
    // Créer l'événement
    const event = await Event.create({
      boutique: boutique._id,
      user: req.user.id,
      titre,
      description,
      date_debut: new Date(date_debut),
      date_fin: new Date(date_fin),
      capacite_max: parseInt(capacite_max),
      statut: "en attente" // Statut par défaut
    });
    
    // Populer les références pour la réponse
    const populatedEvent = await Event.findById(event._id)
      .populate("boutique", "nom_boutique logo")
      .populate("user", "email");
    
    res.status(201).json({
      success: true,
      message: "Événement créé avec succès",
      data: populatedEvent
    });
    
  } catch (error) {
    console.error("Erreur création événement:", error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
});

// Route pour mettre à jour un événement
router.put("/:id", protect, authorize("BOUTIQUE"), async (req, res) => {
  try {
    const { titre, description, date_debut, date_fin, capacite_max } = req.body;
    
    // Vérifier que l'événement existe et appartient à la boutique de l'utilisateur
    const boutique = await Boutique.findOne({ user: req.user.id });
    
    if (!boutique) {
      return res.status(404).json({ 
        success: false,
        message: "Boutique non trouvée" 
      });
    }
    
    const event = await Event.findOne({
      _id: req.params.id,
      boutique: boutique._id
    });
    
    if (!event) {
      return res.status(404).json({ 
        success: false,
        message: "Événement non trouvé ou non autorisé" 
      });
    }
    
    // Mettre à jour l'événement
    const updatedEvent = await Event.findByIdAndUpdate(
      req.params.id,
      {
        titre: titre || event.titre,
        description: description || event.description,
        date_debut: date_debut ? new Date(date_debut) : event.date_debut,
        date_fin: date_fin ? new Date(date_fin) : event.date_fin,
        capacite_max: capacite_max || event.capacite_max
      },
      { new: true }
    ).populate("boutique", "nom_boutique logo")
     .populate("user", "email");
    
    res.json({
      success: true,
      message: "Événement mis à jour avec succès",
      data: updatedEvent
    });
    
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
});

// Route pour supprimer un événement
router.delete("/:id", protect, authorize("BOUTIQUE"), async (req, res) => {
  try {
    // Vérifier que l'événement existe et appartient à la boutique de l'utilisateur
    const boutique = await Boutique.findOne({ user: req.user.id });
    
    if (!boutique) {
      return res.status(404).json({ 
        success: false,
        message: "Boutique non trouvée" 
      });
    }
    
    const event = await Event.findOneAndDelete({
      _id: req.params.id,
      boutique: boutique._id
    });
    
    if (!event) {
      return res.status(404).json({ 
        success: false,
        message: "Événement non trouvé ou non autorisé" 
      });
    }
    
    res.json({
      success: true,
      message: "Événement supprimé avec succès"
    });
    
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
});

// Valider un événement (admin)
router.put("/:id/valider", protect, authorize("ADMIN"), async (req, res) => {
  try {
    const event = await Event.findByIdAndUpdate(
      req.params.id, 
      { statut: "valide" }, 
      { new: true }
    ).populate("boutique", "nom_boutique logo")
     .populate("user", "email");
    
    if (!event) {
      return res.status(404).json({ 
        success: false,
        message: "Événement non trouvé" 
      });
    }
    
    res.json({
      success: true,
      message: "Événement validé avec succès",
      data: event
    });
    
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
});


// Ajouter un user à un event 
router.post("/:id/register", protect, async (req, res) => {
  try {
    const eventId = req.params.id;
    const userId = req.userId;

    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ success: false, message: "Event non trouvé" });

    // Vérifier si la capacité est atteinte
    const count = await EventUser.countDocuments({ event: eventId });
    if (count >= event.capacite_max) {
      return res.status(400).json({ success: false, message: "Capacité maximale atteinte" });
    }

    // Vérifier si l'utilisateur est déjà inscrit
    const alreadyRegistered = await EventUser.findOne({ event: eventId, user: userId });
    if (alreadyRegistered) {
      return res.status(400).json({ success: false, message: "Vous êtes déjà inscrit à cet event" });
    }

    const eventUser = await EventUser.create({ event: eventId, user: userId });

    res.status(201).json({ success: true, message: "Inscription réussie", eventUser });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Lister les events d’un user
router.get("/my-events", protect, async (req, res) => {
  try {
    const userId = req.userId;
    const events = await EventUser.find({ user: userId }).populate("event");
    res.status(200).json({ success: true, events });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Capacité restante pour un event
router.get("/:id/capacite-restante", async (req, res) => {
  try {
    const eventId = req.params.id;
    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ success: false, message: "Event non trouvé" });

    const count = await EventUser.countDocuments({ event: eventId });
    const capaciteRestante = event.capacite_max - count;

    res.status(200).json({ success: true, capacite_restante: capaciteRestante });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
// Route publique - événements validés
router.get("/", async (req, res) => {
  try {
    const events = await Event.find({ statut: "valide" })
      .populate("boutique", "nom_boutique logo description")
      .populate("user", "email")
      .sort({ date_debut: 1 });
    
    res.json(events);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
});

// Route pour les événements d'une boutique spécifique
router.get("/boutique", protect, authorize("BOUTIQUE"), async (req, res) => {
  try {
    // Trouver la boutique de l'utilisateur
    const boutique = await Boutique.findOne({ user: req.user.id });
    
    if (!boutique) {
      return res.status(404).json({ 
        success: false,
        message: "Aucune boutique trouvée pour cet utilisateur" 
      });
    }
    
    // Récupérer les événements de cette boutique
    const events = await Event.find({ boutique: boutique._id })
      .populate("user", "email")
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: events
    });
    
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
});


module.exports = router;