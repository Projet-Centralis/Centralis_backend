const router = require("express").Router();
const { protect, authorize } = require("../middlewares/auth.middleware");
const Boutique = require("../models/Boutique");
const Contrat = require("../models/ContratLoyer");
const Paiement = require("../models/PaiementLoyer");
const Produit = require("../models/Produit");
const MouvementStock = require("../models/MouvementStock");
// ========== ADMIN : TOP 10 BOUTIQUES PAR VENTES ==========
router.get("/top-ventes", protect, authorize("ADMIN"), async (req, res) => {
  try {
    const { periode } = req.query; // optionnel : "mois", "annee", "tout"
    let matchDate = {};

    if (periode === "mois") {
      const debutMois = new Date();
      debutMois.setDate(1);
      debutMois.setHours(0,0,0,0);
      matchDate = { date_mouvement: { $gte: debutMois } };
    } else if (periode === "annee") {
      const debutAnnee = new Date(new Date().getFullYear(), 0, 1);
      matchDate = { date_mouvement: { $gte: debutAnnee } };
    }

    const topVentes = await MouvementStock.aggregate([
      { $match: { type_mouvement: "sortie", ...matchDate } },
      {
        $lookup: {
          from: "produits",
          localField: "produit",
          foreignField: "_id",
          as: "produitInfo"
        }
      },
      { $unwind: "$produitInfo" },
      {
        $group: {
          _id: "$produitInfo.boutique",
          totalQuantite: { $sum: "$quantite" },
          totalCA: { $sum: { $multiply: ["$quantite", "$produitInfo.prix"] } } // attention : utilise prix normal, on pourrait préférer prix_promotionnel
        }
      },
      {
        $lookup: {
          from: "boutiques",
          localField: "_id",
          foreignField: "_id",
          as: "boutiqueInfo"
        }
      },
      { $unwind: "$boutiqueInfo" },
      {
        $project: {
          boutiqueId: "$_id",
          nom_boutique: "$boutiqueInfo.nom_boutique",
          email: "$boutiqueInfo.email_contact",
          telephone: "$boutiqueInfo.telephone",
          totalQuantite: 1,
          totalCA: 1,
          // Si on veut utiliser le prix promotionnel, on peut recalculer dans un autre pipeline
        }
      },
      { $sort: { totalQuantite: -1 } },
      { $limit: 10 }
    ]);

    // Pour avoir le CA avec les prix promotionnels, on peut faire une seconde passe
    // ou intégrer une jointure plus complexe. Pour simplifier, on garde le prix normal.

    res.json({ success: true, data: topVentes });
  } catch (error) {
    console.error("Erreur top ventes admin:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== ADMIN : BOUTIQUES AVEC LOYERS IMPAYÉS ==========
router.get("/loyers-impayes", protect, authorize("ADMIN"), async (req, res) => {
  try {
    const impayes = await Paiement.aggregate([
      {
        $match: {
          statut: { $in: ["en_attente", "retard"] }
        }
      },
      {
        $group: {
          _id: "$boutique",
          totalImpaye: { $sum: "$montant_du" },
          nombreMoisImpayes: { $sum: 1 },
          moisPlusAncien: { $min: "$mois" },
          dernierMoisImpaye: { $max: "$mois" }
        }
      },
      {
        $lookup: {
          from: "boutiques",
          localField: "_id",
          foreignField: "_id",
          as: "boutiqueInfo"
        }
      },
      { $unwind: "$boutiqueInfo" },
      {
        $lookup: {
          from: "contrats",
          let: { boutiqueId: "$_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$boutique", "$$boutiqueId"] }, is_active: true } },
            { $project: { montant_mensuel: 1, jour_echeance: 1 } }
          ],
          as: "contratActif"
        }
      },
      {
        $project: {
          boutiqueId: "$_id",
          nom_boutique: "$boutiqueInfo.nom_boutique",
          email: "$boutiqueInfo.email_contact",
          telephone: "$boutiqueInfo.telephone",
          totalImpaye: 1,
          nombreMoisImpayes: 1,
          moisPlusAncien: 1,
          dernierMoisImpaye: 1,
          contratActif: { $arrayElemAt: ["$contratActif", 0] }
        }
      },
      { $sort: { totalImpaye: -1 } }
    ]);

    res.json({ success: true, data: impayes });
  } catch (error) {
    console.error("Erreur loyers impayés admin:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== ADMIN : CA GLOBAL ==========
router.get("/ca-global", protect, authorize("ADMIN"), async (req, res) => {
  try {
    const { periode } = req.query; // "mois", "annee", "tout"
    let matchDate = {};
    const now = new Date();

    if (periode === "mois") {
      const debutMois = new Date(now.getFullYear(), now.getMonth(), 1);
      matchDate = { date_mouvement: { $gte: debutMois } };
    } else if (periode === "annee") {
      const debutAnnee = new Date(now.getFullYear(), 0, 1);
      matchDate = { date_mouvement: { $gte: debutAnnee } };
    }

    const result = await MouvementStock.aggregate([
      { $match: { type_mouvement: "sortie", ...matchDate } },
      {
        $lookup: {
          from: "produits",
          localField: "produit",
          foreignField: "_id",
          as: "produit"
        }
      },
      { $unwind: "$produit" },
      {
        $group: {
          _id: null,
          caTotal: { $sum: { $multiply: ["$quantite", "$produit.prix"] } },
          nombreVentes: { $sum: "$quantite" }
        }
      }
    ]);

    const ca = result[0] || { caTotal: 0, nombreVentes: 0 };
    res.json({ success: true, data: ca });
  } catch (error) {
    console.error("Erreur CA global:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});
module.exports = router;
