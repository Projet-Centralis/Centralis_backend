const router = require("express").Router();
const Event = require("../models/Event");
const EventUser = require("../models/EventUser");
const { protect, authorize } = require("../middlewares/auth.middleware");

// Récupérer tous les events validés
router.get("/events_valide", async (req, res) => {
  const events = await Event.find({ statut: "valide" });
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
});

module.exports = router;
