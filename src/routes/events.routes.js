// // const router = require("express").Router();
// // const Event = require("../models/Event");
// // const { protect, authorize } = require("../middlewares/auth.middleware");

// // router.get("/",protect, authorize("BOUTIQUE"), async (req, res) => {
// //   res.json(await Event.find({ statut: "valide" }));
// // });

// // router.post("/", protect, authorize("BOUTIQUE"), async (req, res) => {
// //   res.status(201).json(await Event.create(req.body));
// // });

// // router.put("/:id/valider", protect, authorize("ADMIN"), async (req, res) => {
// //   res.json(await Event.findByIdAndUpdate(req.params.id, { statut: "valide" }, { new: true }));
// // });

// // module.exports = router;

// const router = require("express").Router();
// const Event = require("../models/Event");
// const Boutique = require("../models/Boutique");
// const { protect, authorize } = require("../middlewares/auth.middleware");
// const EventUser = require("../models/EventUser");
// const BoutiqueFavori = require("../models/BoutiqueFavori");
// const Notification = require("../models/Notification");


// // Récupérer tous les events validés
// router.get("/events_valide", async (req, res) => {
//   const events = await Event.find({ statut: "valide" }).populate(
//     "boutique",
//     "nom_boutique",
//   );
//   res.json(events);
// });

// // Récupérer tous les events
// router.get("/non_valide", async (req, res) => {
//  const events = await Event.find({ statut: "en_attente" }).populate(
//     "boutique",
//     "nom_boutique",
//   );
//   res.json(events);
// });

// // Créer un event (BOUTIQUE)
// router.post("/", protect, authorize("BOUTIQUE"), async (req, res) => {
//   const event = await Event.create(req.body);
//   res.status(201).json(event);
// });

// // // Valider un event (ADMIN)
// // router.put("/:id/valider", protect, authorize("ADMIN"), async (req, res) => {
// //   const event = await Event.findByIdAndUpdate(
// //     req.params.id,
// //     { statut: "valide" },
// //     { new: true }
// //   );
// //   res.json(event);
// // });
// router.put("/:id/valider", protect, authorize("ADMIN"), async (req, res) => {
//   try {
//     const event = await Event.findById(req.params.id)
//       .populate("boutique", "nom_boutique logo");

//     if (!event) {
//       return res.status(404).json({
//         success: false,
//         message: "Événement non trouvé",
//       });
//     }

//     if (event.statut === "valide") {
//       return res.status(400).json({
//         success: false,
//         message: "Cet événement est déjà validé",
//       });
//     }
//     event.statut = "valide";
//     await event.save();

//     // =====================================================
//     // NOTIFICATIONS AUX USERS QUI ONT LA BOUTIQUE EN FAVORI
//     // =====================================================

//     const favoris = await BoutiqueFavori.find({
//       boutique: event.boutique._id,
//     }).select("acheteur");

//     if (favoris.length > 0) {

//       const notifications = favoris.map(fav => ({
//         destinataire: fav.acheteur,
//         type_notification: "EVENT_VALIDE",
//         titre: "Nouvel événement disponible 🎉",
//         message: `La boutique ${event.boutique.nom_boutique} organise maintenant : ${event.titre}`,
//         is_lu: false,
//       }));

//       await Notification.insertMany(notifications);
//     }

//     // =====================================================

//     res.json({
//       success: true,
//       message: "Événement validé + notifications envoyées",
//       data: event
//     });

//   } catch (error) {
//     console.error("Erreur validation event:", error);
//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// });

// router.put("/:id/rejeter", protect, authorize("ADMIN"), async (req, res) => {
//   try {

//     const event = await Event.findById(req.params.id);
//     if (!event) {
//       return res.status(404).json({
//         success: false,
//         message: "Événement non trouvé",
//       });
//     }
//     if (event.statut === "rejete") {
//       return res.status(400).json({
//         success: false,
//         message: "Cet événement est déjà rejeté",
//       });
//     }
//     // changer statut
//     event.statut = "rejete";
//     await event.save();

//     if (event.boutique) {
//       await Notification.create({
//         destinataire: event.boutique._id,
//         type_notification: "EVENT_REJETE",
//         titre: "Événement refusé ❌",
//         message: `Votre événement "${event.titre}" a été refusé par l'administration.`,
//         is_lu: false,
//       });
//     }

//     // =====================================================

//     res.json({
//       success: true,
//       message: "Événement rejeté + notification envoyée à la boutique",
//       data: event
//     });

//   } catch (error) {
//     console.error("Erreur rejet event:", error);
//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// });


// // Route pour créer un événement
// router.post("/", protect, authorize("BOUTIQUE"), async (req, res) => {
//   try {
//     // Validation des données requises
//     const { titre, description, date_debut, date_fin, capacite_max } = req.body;

//     if (!titre || !description || !date_debut || !date_fin || !capacite_max) {
//       return res.status(400).json({
//         success: false,
//         message: "Tous les champs sont requis",
//       });
//     }

//     // Trouver la boutique de l'utilisateur
//     const boutique = await Boutique.findOne({ user: req.user.id });

//     if (!boutique) {
//       return res.status(404).json({
//         success: false,
//         message: "Aucune boutique trouvée pour cet utilisateur",
//       });
//     }

//     // Créer l'événement
//     const event = await Event.create({
//       boutique: boutique._id,
//       titre,
//       description,
//       date_debut: new Date(date_debut),
//       date_fin: new Date(date_fin),
//       capacite_max: parseInt(capacite_max),
//       statut: "en attente", // Statut par défaut
//     });

//     // Populer les références pour la réponse
//     const populatedEvent = await Event.findById(event._id)
//       .populate("boutique", "nom_boutique logo")
//       .populate("user", "email");

//     res.status(201).json({
//       success: true,
//       message: "Événement créé avec succès",
//       data: populatedEvent,
//     });
//   } catch (error) {
//     console.error("Erreur création événement:", error);
//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// });

// // Route pour mettre à jour un événement
// router.put("/:id", protect, authorize("BOUTIQUE"), async (req, res) => {
//   try {
//     const { titre, description, date_debut, date_fin, capacite_max } = req.body;

//     // Vérifier que l'événement existe et appartient à la boutique de l'utilisateur
//     const boutique = await Boutique.findOne({ user: req.user.id });

//     if (!boutique) {
//       return res.status(404).json({
//         success: false,
//         message: "Boutique non trouvée",
//       });
//     }

//     const event = await Event.findOne({
//       _id: req.params.id,
//       boutique: boutique._id,
//     });

//     if (!event) {
//       return res.status(404).json({
//         success: false,
//         message: "Événement non trouvé ou non autorisé",
//       });
//     }

//     // Mettre à jour l'événement
//     const updatedEvent = await Event.findByIdAndUpdate(
//       req.params.id,
//       {
//         titre: titre || event.titre,
//         description: description || event.description,
//         date_debut: date_debut ? new Date(date_debut) : event.date_debut,
//         date_fin: date_fin ? new Date(date_fin) : event.date_fin,
//         capacite_max: capacite_max || event.capacite_max,
//       },
//       { new: true },
//     )
//       .populate("boutique", "nom_boutique logo")
//       .populate("user", "email");

//     res.json({
//       success: true,
//       message: "Événement mis à jour avec succès",
//       data: updatedEvent,
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// });

// // Route pour supprimer un événement
// router.delete("/:id", protect, authorize("BOUTIQUE"), async (req, res) => {
//   try {
//     // Vérifier que l'événement existe et appartient à la boutique de l'utilisateur
//     const boutique = await Boutique.findOne({ user: req.user.id });

//     if (!boutique) {
//       return res.status(404).json({
//         success: false,
//         message: "Boutique non trouvée",
//       });
//     }

//     const event = await Event.findOneAndDelete({
//       _id: req.params.id,
//       boutique: boutique._id,
//     });

//     if (!event) {
//       return res.status(404).json({
//         success: false,
//         message: "Événement non trouvé ou non autorisé",
//       });
//     }

//     res.json({
//       success: true,
//       message: "Événement supprimé avec succès",
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// });

// // // Valider un événement (admin)
// // router.put("/:id/valider", protect, authorize("ADMIN"), async (req, res) => {
// //   try {
// //     const event = await Event.findByIdAndUpdate(
// //       req.params.id,
// //       { statut: "valide" },
// //       { new: true },
// //     )
// //       .populate("boutique", "nom_boutique logo")
// //       .populate("user", "email");

// //     if (!event) {
// //       return res.status(404).json({
// //         success: false,
// //         message: "Événement non trouvé",
// //       });
// //     }

// //     res.json({
// //       success: true,
// //       message: "Événement validé avec succès",
// //       data: event,
// //     });
// //   } catch (error) {
// //     res.status(500).json({
// //       success: false,
// //       message: error.message,
// //     });
// //   }
// // });

// // Ajouter un user à un event
// router.post("/:id/register", protect, async (req, res) => {
//   try {
//     const eventId = req.params.id;
//     const userId = req.userId;

//     const event = await Event.findById(eventId);
//     if (!event)
//       return res
//         .status(404)
//         .json({ success: false, message: "Event non trouvé" });

//     // Vérifier si la capacité est atteinte
//     const count = await EventUser.countDocuments({ event: eventId });
//     if (count >= event.capacite_max) {
//       return res
//         .status(400)
//         .json({ success: false, message: "Capacité maximale atteinte" });
//     }

//     // Vérifier si l'utilisateur est déjà inscrit
//     const alreadyRegistered = await EventUser.findOne({
//       event: eventId,
//       user: userId,
//     });
//     if (alreadyRegistered) {
//       return res
//         .status(400)
//         .json({
//           success: false,
//           message: "Vous êtes déjà inscrit à cet event",
//         });
//     }

//     const eventUser = await EventUser.create({ event: eventId, user: userId });

//     res
//       .status(201)
//       .json({ success: true, message: "Inscription réussie", eventUser });
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// });

// // Lister les events d’un user
// router.get("/my-events", protect, async (req, res) => {
//   try {
//     const userId = req.userId;
//     const events = await EventUser.find({ user: userId }).populate("event");
//     res.status(200).json({ success: true, events });
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// });

// // Capacité restante pour un event
// router.get("/:id/capacite-restante", async (req, res) => {
//   try {
//     const eventId = req.params.id;
//     const event = await Event.findById(eventId);
//     if (!event)
//       return res
//         .status(404)
//         .json({ success: false, message: "Event non trouvé" });

//     const count = await EventUser.countDocuments({ event: eventId });
//     const capaciteRestante = event.capacite_max - count;

//     res
//       .status(200)
//       .json({ success: true, capacite_restante: capaciteRestante });
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
//   // Route publique - événements validés
//   router.get("/", async (req, res) => {
//     try {
//       const events = await Event.find({ statut: "valide" })
//         .populate("boutique", "nom_boutique logo description")
//         .populate("user", "email")
//         .sort({ date_debut: 1 });

//       res.json(events);
//     } catch (error) {
//       res.status(500).json({ message: error.message });
//     }
//   });
// });

// // Route pour les événements d'une boutique spécifique
// router.get("/boutique", protect, authorize("BOUTIQUE"), async (req, res) => {
//   try {
//     // Trouver la boutique de l'utilisateur
//     const boutique = await Boutique.findOne({ user: req.user.id });

//     if (!boutique) {
//       return res.status(404).json({
//         success: false,
//         message: "Aucune boutique trouvée pour cet utilisateur",
//       });
//     }

//     // Récupérer les événements de cette boutique
//     const events = await Event.find({ boutique: boutique._id })
//       .populate("user", "email")
//       .sort({ createdAt: -1 });

//     res.json({
//       success: true,
//       data: events,
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// });

// module.exports = router;

const router = require("express").Router();
const Event = require("../models/Event");
const Boutique = require("../models/Boutique");
const { protect, authorize } = require("../middlewares/auth.middleware");
const EventUser = require("../models/EventUser");
const BoutiqueFavori = require("../models/BoutiqueFavori");
const Notification = require("../models/Notification");

// ========== ROUTES PUBLIQUES ==========

// GET tous les événements validés (public)
router.get("/", async (req, res) => {
  try {
    const events = await Event.find({ statut: "valide" })
      .populate("boutique", "nom_boutique logo description telephone email_contact")
      .populate("createdBy", "email")
      .sort({ date_debut: 1 });

    res.json({
      success: true,
      data: events
    });
  } catch (error) {
    console.error("Erreur récupération événements:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// GET événements validés (route spécifique)
router.get("/events_valide", async (req, res) => {
  try {
    const events = await Event.find({ statut: "valide" })
      .populate("boutique", "nom_boutique logo")
      .populate("createdBy", "email")
      .sort({ date_debut: 1 });

    res.json({
      success: true,
      data: events
    });
  } catch (error) {
    console.error("Erreur récupération événements validés:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// GET événements non validés (en attente) - accessible à tous mais utile pour l'admin
router.get("/non_valide", async (req, res) => {
  try {
    const events = await Event.find({ statut: "en_attente" })
      .populate("boutique", "nom_boutique logo")
      .populate("createdBy", "email")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: events
    });
  } catch (error) {
    console.error("Erreur récupération événements en attente:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// GET capacité restante pour un événement
router.get("/:id/capacite-restante", async (req, res) => {
  try {
    const eventId = req.params.id;
    const event = await Event.findById(eventId);
    
    if (!event) {
      return res.status(404).json({ 
        success: false, 
        message: "Événement non trouvé" 
      });
    }

    const count = await EventUser.countDocuments({ event: eventId });
    const capaciteRestante = event.capacite_max - count;

    res.status(200).json({ 
      success: true, 
      capacite_restante: capaciteRestante 
    });
  } catch (error) {
    console.error("Erreur calcul capacité restante:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// GET détails d'un événement avec participants
router.get("/:id/details", async (req, res) => {
  try {
    const eventId = req.params.id;

    const event = await Event.findById(eventId)
      .populate("boutique", "nom_boutique logo description telephone email_contact")
      .populate("createdBy", "email");

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Événement non trouvé"
      });
    }

    const inscriptions = await EventUser.find({ event: eventId })
      .populate("user", "email");

    const nombreParticipants = inscriptions.length;
    const placesRestantes = event.capacite_max - nombreParticipants;

    const participants = inscriptions.map(inscription => ({
      _id: inscription.user._id,
      email: inscription.user.email,
      date_inscription: inscription.createdAt
    }));

    res.json({
      success: true,
      data: {
        event: {
          _id: event._id,
          titre: event.titre,
          description: event.description,
          date_debut: event.date_debut,
          date_fin: event.date_fin,
          statut: event.statut,
          capacite_max: event.capacite_max,
          boutique: event.boutique,
          cree_par: event.createdBy,
          date_creation: event.createdAt
        },
        statistiques: {
          nombre_inscrits: nombreParticipants,
          places_restantes: placesRestantes,
          taux_remplissage: Math.round((nombreParticipants / event.capacite_max) * 100)
        },
        participants: participants
      }
    });

  } catch (error) {
    console.error("Erreur récupération détails événement:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// GET tous les événements validés avec statistiques
router.get("/avec-participants", async (req, res) => {
  try {
    const events = await Event.find({ statut: "valide" })
      .populate("boutique", "nom_boutique logo")
      .populate("createdBy", "email")
      .sort({ date_debut: 1 });

    const eventsAvecParticipants = await Promise.all(events.map(async (event) => {
      const nombreParticipants = await EventUser.countDocuments({ event: event._id });
      
      return {
        ...event.toObject(),
        statistiques: {
          inscrits: nombreParticipants,
          places_restantes: event.capacite_max - nombreParticipants,
          complet: nombreParticipants >= event.capacite_max,
          taux_remplissage: Math.round((nombreParticipants / event.capacite_max) * 100)
        }
      };
    }));

    res.json({
      success: true,
      data: eventsAvecParticipants
    });

  } catch (error) {
    console.error("Erreur récupération événements avec participants:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ========== ROUTES POUR LES BOUTIQUES ==========

// GET événements d'une boutique spécifique (pour la boutique connectée)
router.get("/boutique", protect, authorize("BOUTIQUE"), async (req, res) => {
  try {
    const boutique = await Boutique.findOne({ user: req.user.id });

    if (!boutique) {
      return res.status(404).json({
        success: false,
        message: "Aucune boutique trouvée pour cet utilisateur",
      });
    }

    const events = await Event.find({ boutique: boutique._id })
      .populate("createdBy", "email")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: events,
    });
  } catch (error) {
    console.error("Erreur récupération événements boutique:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// GET événements d'une boutique avec participants
router.get("/boutique/avec-participants", protect, authorize("BOUTIQUE"), async (req, res) => {
  try {
    const boutique = await Boutique.findOne({ user: req.user.id });

    if (!boutique) {
      return res.status(404).json({
        success: false,
        message: "Aucune boutique trouvée pour cet utilisateur",
      });
    }

    const events = await Event.find({ boutique: boutique._id })
      .populate("createdBy", "email")
      .sort({ createdAt: -1 });

    const eventsAvecParticipants = await Promise.all(events.map(async (event) => {
      const inscriptions = await EventUser.find({ event: event._id })
        .populate("user", "email");

      return {
        ...event.toObject(),
        participants: inscriptions.map(ins => ({
          _id: ins.user._id,
          email: ins.user.email,
          date_inscription: ins.createdAt
        })),
        nombre_participants: inscriptions.length,
        places_restantes: event.capacite_max - inscriptions.length,
        taux_remplissage: Math.round((inscriptions.length / event.capacite_max) * 100)
      };
    }));

    res.json({
      success: true,
      data: eventsAvecParticipants
    });

  } catch (error) {
    console.error("Erreur récupération événements boutique avec participants:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// POST créer un événement (BOUTIQUE)
router.post("/", protect, authorize("BOUTIQUE"), async (req, res) => {
  try {
    const { titre, description, date_debut, date_fin, capacite_max } = req.body;

    if (!titre || !description || !date_debut || !date_fin || !capacite_max) {
      return res.status(400).json({
        success: false,
        message: "Tous les champs sont requis",
      });
    }

    const boutique = await Boutique.findOne({ user: req.user.id });

    if (!boutique) {
      return res.status(404).json({
        success: false,
        message: "Aucune boutique trouvée pour cet utilisateur",
      });
    }

    const event = await Event.create({
      boutique: boutique._id,
      createdBy: req.user.id,
      titre,
      description,
      date_debut: new Date(date_debut),
      date_fin: new Date(date_fin),
      capacite_max: parseInt(capacite_max),
      statut: "en_attente",
    });

    const populatedEvent = await Event.findById(event._id)
      .populate("boutique", "nom_boutique logo")
      .populate("createdBy", "email");

    res.status(201).json({
      success: true,
      message: "Événement créé avec succès",
      data: populatedEvent,
    });

  } catch (error) {
    console.error("Erreur création événement:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// PUT mettre à jour un événement (BOUTIQUE)
router.put("/:id", protect, authorize("BOUTIQUE"), async (req, res) => {
  try {
    const { titre, description, date_debut, date_fin, capacite_max } = req.body;

    const boutique = await Boutique.findOne({ user: req.user.id });

    if (!boutique) {
      return res.status(404).json({
        success: false,
        message: "Boutique non trouvée",
      });
    }

    const event = await Event.findOne({
      _id: req.params.id,
      boutique: boutique._id,
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Événement non trouvé ou non autorisé",
      });
    }

    const updatedEvent = await Event.findByIdAndUpdate(
      req.params.id,
      {
        titre: titre || event.titre,
        description: description || event.description,
        date_debut: date_debut ? new Date(date_debut) : event.date_debut,
        date_fin: date_fin ? new Date(date_fin) : event.date_fin,
        capacite_max: capacite_max || event.capacite_max,
      },
      { new: true }
    )
      .populate("boutique", "nom_boutique logo")
      .populate("createdBy", "email");

    res.json({
      success: true,
      message: "Événement mis à jour avec succès",
      data: updatedEvent,
    });
  } catch (error) {
    console.error("Erreur mise à jour événement:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// DELETE supprimer un événement (BOUTIQUE)
router.delete("/:id", protect, authorize("BOUTIQUE"), async (req, res) => {
  try {
    const boutique = await Boutique.findOne({ user: req.user.id });

    if (!boutique) {
      return res.status(404).json({
        success: false,
        message: "Boutique non trouvée",
      });
    }

    const event = await Event.findOneAndDelete({
      _id: req.params.id,
      boutique: boutique._id,
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Événement non trouvé ou non autorisé",
      });
    }

    // Supprimer aussi les inscriptions associées
    await EventUser.deleteMany({ event: req.params.id });

    res.json({
      success: true,
      message: "Événement et inscriptions associées supprimés avec succès",
    });
  } catch (error) {
    console.error("Erreur suppression événement:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ========== ROUTES POUR LES UTILISATEURS (INSCRIPTIONS) ==========

// POST inscrire un utilisateur à un événement
router.post("/:id/register", protect, async (req, res) => {
  try {
    const eventId = req.params.id;
    const userId = req.user.id;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ 
        success: false, 
        message: "Événement non trouvé" 
      });
    }

    // Vérifier si l'événement est validé
    if (event.statut !== "valide") {
      return res.status(400).json({ 
        success: false, 
        message: "Cet événement n'est pas encore validé" 
      });
    }

    // Vérifier si la capacité est atteinte
    const count = await EventUser.countDocuments({ event: eventId });
    if (count >= event.capacite_max) {
      return res.status(400).json({ 
        success: false, 
        message: "Capacité maximale atteinte" 
      });
    }

    // Vérifier si l'utilisateur est déjà inscrit
    const alreadyRegistered = await EventUser.findOne({
      event: eventId,
      user: userId,
    });
    
    if (alreadyRegistered) {
      return res.status(400).json({
        success: false,
        message: "Vous êtes déjà inscrit à cet événement",
      });
    }

    const eventUser = await EventUser.create({ 
      event: eventId, 
      user: userId 
    });

    // Récupérer l'inscription avec les détails
    const inscriptionDetails = await EventUser.findById(eventUser._id)
      .populate("event")
      .populate("user", "email");

    res.status(201).json({ 
      success: true, 
      message: "Inscription réussie", 
      data: inscriptionDetails 
    });
  } catch (error) {
    console.error("Erreur inscription événement:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// GET événements d'un utilisateur (ses inscriptions)
router.get("/mes-inscriptions", protect, async (req, res) => {
  try {
    const userId = req.user.id;

    const inscriptions = await EventUser.find({ user: userId })
      .populate({
        path: 'event',
        populate: [
          { path: 'boutique', select: 'nom_boutique logo' },
          { path: 'createdBy', select: 'email' }
        ]
      })
      .sort({ createdAt: -1 });

    const eventsInscrits = inscriptions.map(inscription => ({
      inscription_id: inscription._id,
      date_inscription: inscription.createdAt,
      event: inscription.event
    }));

    res.json({
      success: true,
      data: eventsInscrits,
      nombre: eventsInscrits.length
    });

  } catch (error) {
    console.error("Erreur récupération inscriptions:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// DELETE désinscrire un utilisateur d'un événement
router.delete("/:id/unregister", protect, async (req, res) => {
  try {
    const eventId = req.params.id;
    const userId = req.user.id;

    const result = await EventUser.findOneAndDelete({
      event: eventId,
      user: userId
    });

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Inscription non trouvée"
      });
    }

    res.json({
      success: true,
      message: "Désinscription réussie"
    });

  } catch (error) {
    console.error("Erreur désinscription:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ========== ROUTES POUR L'ADMIN ==========

// PUT valider un événement (ADMIN)
router.put("/:id/valider", protect, authorize("ADMIN"), async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate("boutique", "nom_boutique logo");

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Événement non trouvé",
      });
    }

    if (event.statut === "valide") {
      return res.status(400).json({
        success: false,
        message: "Cet événement est déjà validé",
      });
    }

    event.statut = "valide";
    await event.save();

    // Notifications aux users qui ont la boutique en favori
    const favoris = await BoutiqueFavori.find({
      boutique: event.boutique._id,
    }).select("acheteur");

    if (favoris.length > 0) {
      const notifications = favoris.map(fav => ({
        destinataire: fav.acheteur,
        type_notification: "EVENT_VALIDE",
        titre: "Nouvel événement disponible 🎉",
        message: `La boutique ${event.boutique.nom_boutique} organise maintenant : ${event.titre}`,
        is_lu: false,
      }));

      await Notification.insertMany(notifications);
    }

    const updatedEvent = await Event.findById(event._id)
      .populate("boutique", "nom_boutique logo")
      .populate("createdBy", "email");

    res.json({
      success: true,
      message: "Événement validé + notifications envoyées",
      data: updatedEvent
    });

  } catch (error) {
    console.error("Erreur validation event:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// PUT rejeter un événement (ADMIN)
router.put("/:id/rejeter", protect, authorize("ADMIN"), async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Événement non trouvé",
      });
    }

    if (event.statut === "rejete") {
      return res.status(400).json({
        success: false,
        message: "Cet événement est déjà rejeté",
      });
    }

    event.statut = "rejete";
    await event.save();

    // Notification à la boutique
    if (event.boutique) {
      await Notification.create({
        destinataire: event.boutique._id,
        type_notification: "EVENT_REJETE",
        titre: "Événement refusé ❌",
        message: `Votre événement "${event.titre}" a été refusé par l'administration.`,
        is_lu: false,
      });
    }

    const updatedEvent = await Event.findById(event._id)
      .populate("boutique", "nom_boutique logo")
      .populate("createdBy", "email");

    res.json({
      success: true,
      message: "Événement rejeté + notification envoyée à la boutique",
      data: updatedEvent
    });

  } catch (error) {
    console.error("Erreur rejet event:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// GET tous les événements pour admin
router.get("/admin/tous", protect, authorize("ADMIN"), async (req, res) => {
  try {
    const events = await Event.find({})
      .populate("boutique", "nom_boutique logo")
      .populate("createdBy", "email")
      .sort({ createdAt: -1 });

    const eventsAvecStats = await Promise.all(events.map(async (event) => {
      const nombreParticipants = await EventUser.countDocuments({ event: event._id });
      
      return {
        ...event.toObject(),
        statistiques: {
          inscrits: nombreParticipants,
          places_restantes: event.capacite_max - nombreParticipants,
          taux_remplissage: Math.round((nombreParticipants / event.capacite_max) * 100)
        }
      };
    }));

    res.json({
      success: true,
      data: eventsAvecStats
    });

  } catch (error) {
    console.error("Erreur récupération tous événements:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;