const router = require("express").Router();
const Stock = require("../models/Stock");
const Produit = require("../models/Produit");
const Boutique = require("../models/Boutique");
const MouvementStock = require("../models/MouvementStock");
const { protect, authorize } = require("../middlewares/auth.middleware");

// GET ventes totales et journalières
router.get("/ventes", protect, authorize("BOUTIQUE"), async (req, res) => {
  try {
    const boutique = await Boutique.findOne({ user: req.user.id });
    
    if (!boutique) {
      return res.status(404).json({ 
        success: false,
        message: "Boutique non trouvée" 
      });
    }

    // Récupérer tous les produits de la boutique avec leurs prix ET leurs catégories
    const produits = await Produit.find({ boutique: boutique._id })
      .populate('categorie'); // AJOUTÉ : pour peupler les catégories
    
    const produitIds = produits.map(p => p._id);
    
    // Créer un map des prix pour un accès facile
    const prixMap = new Map();
    produits.forEach(p => {
      // Utiliser le prix promotionnel s'il existe et est > 0, sinon le prix normal
      const prixEffectif = p.prix_promotionnel && p.prix_promotionnel > 0 ? p.prix_promotionnel : p.prix;
      prixMap.set(p._id.toString(), prixEffectif);
    });

    // Date d'aujourd'hui
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Date d'il y a 6 jours (pour avoir 7 jours incluant aujourd'hui)
    const septJoursAvant = new Date(today);
    septJoursAvant.setDate(septJoursAvant.getDate() - 6);
    septJoursAvant.setHours(0, 0, 0, 0);

    console.log('Période de calcul des 7 jours:', {
      debut: septJoursAvant.toISOString().split('T')[0],
      fin: today.toISOString().split('T')[0]
    });

    // Récupérer tous les mouvements de sortie avec les produits et leurs catégories peuplées
    const tousMouvements = await MouvementStock.find({
      produit: { $in: produitIds },
      type_mouvement: 'sortie'
    }).populate({
      path: 'produit',
      populate: { path: 'categorie' } // AJOUTÉ : pour peupler la catégorie dans les mouvements
    });

    console.log('Total mouvements trouvés:', tousMouvements.length);

    // ===== VENTES TOTALES =====
    let ventesTotalesQuantite = 0;
    let ventesTotalesMontant = 0;
    
    tousMouvements.forEach(mvt => {
      const produit = mvt.produit;
      if (produit) {
        const prixEffectif = produit.prix_promotionnel && produit.prix_promotionnel > 0 
          ? produit.prix_promotionnel 
          : produit.prix;
        
        ventesTotalesQuantite += mvt.quantite;
        ventesTotalesMontant += mvt.quantite * prixEffectif;
      }
    });

    // ===== VENTES AUJOURD'HUI =====
    const mouvementsAujourdhui = tousMouvements.filter(mvt => {
      const dateMvt = new Date(mvt.date_mouvement);
      return dateMvt >= today && dateMvt < tomorrow;
    });

    let ventesAujourdhuiQuantite = 0;
    let ventesAujourdhuiMontant = 0;

    mouvementsAujourdhui.forEach(mvt => {
      const produit = mvt.produit;
      if (produit) {
        const prixEffectif = produit.prix_promotionnel && produit.prix_promotionnel > 0 
          ? produit.prix_promotionnel 
          : produit.prix;
        
        ventesAujourdhuiQuantite += mvt.quantite;
        ventesAujourdhuiMontant += mvt.quantite * prixEffectif;
      }
    });

    // ===== VENTES DES 7 DERNIERS JOURS =====
    const mouvements7Jours = tousMouvements.filter(mvt => {
      const dateMvt = new Date(mvt.date_mouvement);
      return dateMvt >= septJoursAvant;
    });

    // Créer un tableau pour les 7 jours (de J-6 à aujourd'hui)
    const ventesJournalieres = [];
    
    for (let i = 0; i < 7; i++) {
      const dateJour = new Date(septJoursAvant);
      dateJour.setDate(septJoursAvant.getDate() + i);
      dateJour.setHours(0, 0, 0, 0);
      
      const dateSuivante = new Date(dateJour);
      dateSuivante.setDate(dateJour.getDate() + 1);
      
      // Filtrer les mouvements de ce jour
      const mouvementsJour = mouvements7Jours.filter(mvt => {
        const dateMvt = new Date(mvt.date_mouvement);
        return dateMvt >= dateJour && dateMvt < dateSuivante;
      });

      // Calculer le montant total du jour
      let montantJour = 0;
      let nombreVentes = 0;

      mouvementsJour.forEach(mvt => {
        const produit = mvt.produit;
        if (produit) {
          const prixEffectif = produit.prix_promotionnel && produit.prix_promotionnel > 0 
            ? produit.prix_promotionnel 
            : produit.prix;
          
          montantJour += mvt.quantite * prixEffectif;
          nombreVentes += mvt.quantite;
        }
      });

      ventesJournalieres.push({
        date: formaterJour(dateJour),
        montant: Math.round(montantJour * 100) / 100,
        nombreVentes: nombreVentes,
        dateComplet: dateJour.toISOString().split('T')[0] // Pour debug
      });
    }

    console.log('Ventes journalières calculées:', ventesJournalieres);

    // ===== PRODUITS LES PLUS VENDUS (AVEC CATÉGORIES CORRIGÉES) =====
    const ventesParProduit = new Map();
    
    tousMouvements.forEach(mvt => {
      const produit = mvt.produit;
      if (!produit) return;
      
      const produitId = produit._id.toString();
      const prixEffectif = produit.prix_promotionnel && produit.prix_promotionnel > 0 
        ? produit.prix_promotionnel 
        : produit.prix;
      
      if (!ventesParProduit.has(produitId)) {
        // Récupérer le nom de la catégorie (maintenant peuplée grâce au populate)
        let categorieNom = 'Non catégorisé';
        
        // La catégorie est maintenant peuplée
        if (produit.categorie) {
          if (typeof produit.categorie === 'object') {
            if (produit.categorie.nom) {
              categorieNom = produit.categorie.nom;
            } else if (produit.categorie._id) {
              categorieNom = 'Catégorie inconnue';
            }
          } else if (typeof produit.categorie === 'string') {
            // Si c'est un string (ID), on pourrait faire une recherche mais on laisse par défaut
            categorieNom = 'Catégorie en attente';
          }
        }

        ventesParProduit.set(produitId, {
          _id: produitId,
          nom: produit.nom_produit,
          categorie: categorieNom,
          ventes: 0,
          revenu: 0,
          tendance: 'up'
        });
      }
      
      const prodData = ventesParProduit.get(produitId);
      prodData.ventes += mvt.quantite;
      prodData.revenu += mvt.quantite * prixEffectif;
    });

    const produitsPopulaires = Array.from(ventesParProduit.values())
      .sort((a, b) => b.ventes - a.ventes)
      .slice(0, 5)
      .map(p => ({
        ...p,
        revenu: Math.round(p.revenu * 100) / 100
      }));

    console.log('Produits populaires avec catégories:', produitsPopulaires);

    // ===== STATISTIQUES CLIENTS =====
    // Nombre de clients uniques
    const clientsUniques = await MouvementStock.distinct('utilisateur', {
      produit: { $in: produitIds },
      type_mouvement: 'sortie'
    });

    // Nouveaux clients (30 derniers jours)
    const trenteJoursAvant = new Date();
    trenteJoursAvant.setDate(trenteJoursAvant.getDate() - 30);

    const nouveauxClients = await MouvementStock.distinct('utilisateur', {
      produit: { $in: produitIds },
      type_mouvement: 'sortie',
      date_mouvement: { $gte: trenteJoursAvant }
    });

    // Taux de conversion (exemple avec des données simulées)
    const visitesTotales = 1000; // À remplacer par des données réelles
    const tauxConversion = clientsUniques.length > 0 && visitesTotales > 0 
      ? Math.round((clientsUniques.length / visitesTotales) * 100 * 10) / 10
      : 0;

    // ===== RÉPONSE FINALE =====
    const response = {
      success: true,
      data: {
        ventesTotales: {
          quantite: ventesTotalesQuantite,
          montant: Math.round(ventesTotalesMontant * 100) / 100
        },
        ventesAujourdhui: {
          quantite: ventesAujourdhuiQuantite,
          montant: Math.round(ventesAujourdhuiMontant * 100) / 100
        },
        ventesJournalieres,
        produitsPopulaires,
        nombreClients: clientsUniques.length,
        nouveauxClients: nouveauxClients.length,
        tauxConversion
      }
    };

    console.log('Réponse envoyée au frontend:', JSON.stringify(response, null, 2));
    res.json(response);

  } catch (error) {
    console.error("Erreur statistiques:", error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
});

// GET détails d'un produit populaire
router.get("/produit/:produitId", protect, authorize("BOUTIQUE"), async (req, res) => {
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
    }).populate('categorie'); // AJOUTÉ : pour avoir la catégorie

    if (!produit) {
      return res.status(404).json({ 
        success: false,
        message: "Produit non trouvé" 
      });
    }

    // Récupérer l'historique des ventes de ce produit
    const mouvements = await MouvementStock.find({
      produit: produit._id,
      type_mouvement: 'sortie'
    }).sort({ date_mouvement: -1 }).limit(10);

    const prixEffectif = produit.prix_promotionnel && produit.prix_promotionnel > 0 
      ? produit.prix_promotionnel 
      : produit.prix;

    const ventesTotales = mouvements.reduce((sum, mvt) => sum + mvt.quantite, 0);
    const revenuTotal = mouvements.reduce((sum, mvt) => sum + (mvt.quantite * prixEffectif), 0);

    res.json({
      success: true,
      data: {
        produit: {
          _id: produit._id,
          nom: produit.nom_produit,
          categorie: produit.categorie ? produit.categorie.nom : 'Non catégorisé',
          prix: produit.prix,
          prix_promotionnel: produit.prix_promotionnel,
          stock: produit.quantite_stock
        },
        statistiques: {
          ventesTotales,
          revenuTotal: Math.round(revenuTotal * 100) / 100,
          nombreMouvements: mouvements.length
        },
        derniersMouvements: mouvements
      }
    });

  } catch (error) {
    console.error("Erreur détails produit:", error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
});

// GET tendances des ventes (comparaison mois précédent)
router.get("/tendances", protect, authorize("BOUTIQUE"), async (req, res) => {
  try {
    const boutique = await Boutique.findOne({ user: req.user.id });
    
    if (!boutique) {
      return res.status(404).json({ 
        success: false,
        message: "Boutique non trouvée" 
      });
    }

    const produitIds = await Produit.find({ boutique: boutique._id }).distinct('_id');

    const aujourdhui = new Date();
    const debutMois = new Date(aujourdhui.getFullYear(), aujourdhui.getMonth(), 1);
    const debutMoisPrecedent = new Date(aujourdhui.getFullYear(), aujourdhui.getMonth() - 1, 1);
    const finMoisPrecedent = new Date(aujourdhui.getFullYear(), aujourdhui.getMonth(), 0);

    // Récupérer les produits avec leurs prix pour calculer les montants
    const produits = await Produit.find({ _id: { $in: produitIds } });
    const prixMap = new Map();
    produits.forEach(p => {
      const prixEffectif = p.prix_promotionnel && p.prix_promotionnel > 0 ? p.prix_promotionnel : p.prix;
      prixMap.set(p._id.toString(), prixEffectif);
    });

    // Ventes du mois en cours
    const mouvementsMoisEnCours = await MouvementStock.find({
      produit: { $in: produitIds },
      type_mouvement: 'sortie',
      date_mouvement: { $gte: debutMois }
    });

    let quantiteMoisEnCours = 0;
    let montantMoisEnCours = 0;

    mouvementsMoisEnCours.forEach(mvt => {
      const prix = prixMap.get(mvt.produit.toString()) || 0;
      quantiteMoisEnCours += mvt.quantite;
      montantMoisEnCours += mvt.quantite * prix;
    });

    // Ventes du mois précédent
    const mouvementsMoisPrecedent = await MouvementStock.find({
      produit: { $in: produitIds },
      type_mouvement: 'sortie',
      date_mouvement: { $gte: debutMoisPrecedent, $lt: debutMois }
    });

    let quantiteMoisPrecedent = 0;
    let montantMoisPrecedent = 0;

    mouvementsMoisPrecedent.forEach(mvt => {
      const prix = prixMap.get(mvt.produit.toString()) || 0;
      quantiteMoisPrecedent += mvt.quantite;
      montantMoisPrecedent += mvt.quantite * prix;
    });

    const evolution = {
      quantite: 0,
      montant: 0,
      pourcentage: 0
    };

    if (quantiteMoisPrecedent > 0) {
      evolution.quantite = quantiteMoisEnCours - quantiteMoisPrecedent;
      evolution.montant = Math.round((montantMoisEnCours - montantMoisPrecedent) * 100) / 100;
      evolution.pourcentage = Math.round((quantiteMoisEnCours / quantiteMoisPrecedent) * 100 - 100);
    }

    res.json({
      success: true,
      data: {
        moisEnCours: {
          quantite: quantiteMoisEnCours,
          montant: Math.round(montantMoisEnCours * 100) / 100
        },
        moisPrecedent: {
          quantite: quantiteMoisPrecedent,
          montant: Math.round(montantMoisPrecedent * 100) / 100
        },
        evolution
      }
    });

  } catch (error) {
    console.error("Erreur tendances:", error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
});

// Fonction utilitaire pour formater les dates en jours de semaine
function formaterJour(date) {
  const jours = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
  const jourIndex = date.getDay(); // 0 = Dim, 1 = Lun, ...
  return jours[jourIndex];
}

module.exports = router;