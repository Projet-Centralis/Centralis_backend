const router = require("express").Router();
const PrevisionVente = require("../models/PrevisionVente");
const Produit = require("../models/Produit");
const Boutique = require("../models/Boutique");
const MouvementStock = require("../models/MouvementStock");
const { protect, authorize } = require("../middlewares/auth.middleware");

// ========== ALGORITHMES DE PRÉVISION ==========

// Fonction pour calculer la moyenne mobile
function calculerMoyenneMobile(donnees, periode = 7) {
    const predictions = [];
    for (let i = periode; i < donnees.length; i++) {
        const somme = donnees.slice(i - periode, i).reduce((acc, val) => acc + val, 0);
        predictions.push(somme / periode);
    }
    return predictions;
}

// Fonction pour calculer la tendance linéaire
function calculerTendanceLineaire(donnees) {
    const n = donnees.length;
    const sommeX = donnees.reduce((acc, _, i) => acc + i, 0);
    const sommeY = donnees.reduce((acc, val) => acc + val, 0);
    const sommeXY = donnees.reduce((acc, val, i) => acc + (i * val), 0);
    const sommeX2 = donnees.reduce((acc, _, i) => acc + (i * i), 0);
    
    const pente = (n * sommeXY - sommeX * sommeY) / (n * sommeX2 - sommeX * sommeX);
    const intercept = (sommeY - pente * sommeX) / n;
    
    return { pente, intercept };
}

// ========== ROUTES PRINCIPALES ==========

// GET toutes les prévisions de la boutique
router.get("/", protect, authorize("BOUTIQUE"), async (req, res) => {
    try {
        const boutique = await Boutique.findOne({ user: req.user.id });
        
        if (!boutique) {
            return res.status(404).json({ 
                success: false,
                message: "Boutique non trouvée" 
            });
        }

        const previsions = await PrevisionVente.find({ boutique: boutique._id })
            .populate("produit_concerne", "nom_produit prix")
            .sort({ date_prevision: -1 });

        res.json({
            success: true,
            data: previsions
        });

    } catch (error) {
        console.error("Erreur récupération prévisions:", error);
        res.status(500).json({ 
            success: false,
            message: error.message 
        });
    }
});

// GET prévisions du jour
router.get("/aujourdhui", protect, authorize("BOUTIQUE"), async (req, res) => {
    try {
        const boutique = await Boutique.findOne({ user: req.user.id });
        
        if (!boutique) {
            return res.status(404).json({ 
                success: false,
                message: "Boutique non trouvée" 
            });
        }

        const aujourdhui = new Date();
        aujourdhui.setHours(0, 0, 0, 0);
        const demain = new Date(aujourdhui);
        demain.setDate(demain.getDate() + 1);

        const previsionJour = await PrevisionVente.findOne({
            boutique: boutique._id,
            date_prevision: { $gte: aujourdhui, $lt: demain },
            type_prevision: 'journaliere'
        }).populate("produit_concerne", "nom_produit prix");

        res.json({
            success: true,
            data: previsionJour || { montant_prevu: 0, probabilite: 0 }
        });

    } catch (error) {
        console.error("Erreur récupération prévision jour:", error);
        res.status(500).json({ 
            success: false,
            message: error.message 
        });
    }
});

// GET prévisions de la semaine
router.get("/semaine", protect, authorize("BOUTIQUE"), async (req, res) => {
    try {
        const boutique = await Boutique.findOne({ user: req.user.id });
        
        if (!boutique) {
            return res.status(404).json({ 
                success: false,
                message: "Boutique non trouvée" 
            });
        }

        const aujourdhui = new Date();
        const debutSemaine = new Date(aujourdhui);
        debutSemaine.setDate(aujourdhui.getDate() - aujourdhui.getDay() + 1); // Lundi
        debutSemaine.setHours(0, 0, 0, 0);
        
        const finSemaine = new Date(debutSemaine);
        finSemaine.setDate(debutSemaine.getDate() + 7);

        const previsionsSemaine = await PrevisionVente.find({
            boutique: boutique._id,
            date_prevision: { $gte: debutSemaine, $lt: finSemaine },
            type_prevision: { $in: ['journaliere', 'hebdomadaire'] }
        }).sort({ date_prevision: 1 });

        res.json({
            success: true,
            data: previsionsSemaine
        });

    } catch (error) {
        console.error("Erreur récupération prévisions semaine:", error);
        res.status(500).json({ 
            success: false,
            message: error.message 
        });
    }
});

// GET générer des prévisions automatiques
router.get("/generer", protect, authorize("BOUTIQUE"), async (req, res) => {
    try {
        const boutique = await Boutique.findOne({ user: req.user.id });
        
        if (!boutique) {
            return res.status(404).json({ 
                success: false,
                message: "Boutique non trouvée" 
            });
        }

        // Récupérer tous les produits de la boutique
        const produits = await Produit.find({ boutique: boutique._id });
        const produitIds = produits.map(p => p._id);

        // Récupérer l'historique des ventes des 90 derniers jours
        const quatreVingtDixJoursAvant = new Date();
        quatreVingtDixJoursAvant.setDate(quatreVingtDixJoursAvant.getDate() - 90);

        const ventesHistorique = await MouvementStock.find({
            produit: { $in: produitIds },
            type_mouvement: 'sortie',
            date_mouvement: { $gte: quatreVingtDixJoursAvant }
        }).populate('produit');

        // Agréger les ventes par jour
        const ventesParJour = new Map();
        const ventesParProduit = new Map();

        ventesHistorique.forEach(mvt => {
            const date = new Date(mvt.date_mouvement);
            const dateStr = date.toISOString().split('T')[0];
            const produit = mvt.produit;
            const prixEffectif = produit.prix_promotionnel && produit.prix_promotionnel > 0 
                ? produit.prix_promotionnel 
                : produit.prix;
            const montant = mvt.quantite * prixEffectif;

            // Par jour
            if (!ventesParJour.has(dateStr)) {
                ventesParJour.set(dateStr, {
                    date: dateStr,
                    montant: 0,
                    quantite: 0
                });
            }
            const jourData = ventesParJour.get(dateStr);
            jourData.montant += montant;
            jourData.quantite += mvt.quantite;

            // Par produit
            const produitId = produit._id.toString();
            if (!ventesParProduit.has(produitId)) {
                ventesParProduit.set(produitId, {
                    produitId,
                    nom: produit.nom_produit,
                    prix: prixEffectif,
                    ventes: []
                });
            }
            ventesParProduit.get(produitId).ventes.push({
                date: dateStr,
                quantite: mvt.quantite,
                montant
            });
        });

        // Convertir en tableau et trier par date
        const ventesJournalieres = Array.from(ventesParJour.values())
            .sort((a, b) => a.date.localeCompare(b.date));

        // Extraire les montants pour les calculs
        const montantsJournaliers = ventesJournalieres.map(v => v.montant);

        // Calculer les prévisions
        const previsions = [];

        // 1. Prévision pour demain (moyenne mobile sur 7 jours)
        if (montantsJournaliers.length >= 7) {
            const moyenneMobile = calculerMoyenneMobile(montantsJournaliers, 7);
            const previsionDemain = moyenneMobile[moyenneMobile.length - 1] || 0;
            
            const demain = new Date();
            demain.setDate(demain.getDate() + 1);
            demain.setHours(0, 0, 0, 0);

            previsions.push({
                date: demain,
                montant: Math.round(previsionDemain * 100) / 100,
                probabilite: 70,
                type: 'journaliere',
                methode: 'Moyenne mobile (7 jours)'
            });
        }

        // 2. Prévision pour la semaine prochaine (tendance linéaire)
        if (montantsJournaliers.length >= 30) {
            const { pente, intercept } = calculerTendanceLineaire(montantsJournaliers.slice(-30));
            
            const semaineProchaine = [];
            for (let i = 1; i <= 7; i++) {
                const jourIndex = montantsJournaliers.length + i;
                const prevision = pente * jourIndex + intercept;
                semaineProchaine.push(Math.max(0, prevision));
            }

            const totalSemaine = semaineProchaine.reduce((a, b) => a + b, 0);
            
            const debutSemaineProchaine = new Date();
            debutSemaineProchaine.setDate(debutSemaineProchaine.getDate() + 7 - debutSemaineProchaine.getDay() + 1);

            previsions.push({
                date: debutSemaineProchaine,
                montant: Math.round(totalSemaine * 100) / 100,
                probabilite: 60,
                type: 'hebdomadaire',
                detail: semaineProchaine.map(m => Math.round(m * 100) / 100),
                methode: 'Régression linéaire'
            });
        }

        // 3. Prévision mensuelle
        if (montantsJournaliers.length >= 60) {
            const moyenneMensuelle = montantsJournaliers.slice(-30).reduce((a, b) => a + b, 0) * 30 / 30;
            const previsionMois = moyenneMensuelle * 30;
            
            const debutMoisProchain = new Date();
            debutMoisProchain.setMonth(debutMoisProchain.getMonth() + 1);
            debutMoisProchain.setDate(1);

            previsions.push({
                date: debutMoisProchain,
                montant: Math.round(previsionMois * 100) / 100,
                probabilite: 50,
                type: 'mensuelle',
                methode: 'Moyenne mensuelle'
            });
        }

        // 4. Produits les plus prometteurs
        const produitsPrometteurs = [];
        for (const [produitId, data] of ventesParProduit) {
            if (data.ventes.length >= 5) {
                const ventesRecentes = data.ventes.slice(-5).map(v => v.quantite);
                const tendance = calculerTendanceLineaire(ventesRecentes);
                
                if (tendance.pente > 0) {
                    const previsionVentes = Math.round((tendance.pente * 5 + tendance.intercept) * 100) / 100;
                    produitsPrometteurs.push({
                        produitId,
                        nom: data.nom,
                        prix: data.prix,
                        ventesPrevues: Math.max(0, previsionVentes),
                        tendance: 'hausse',
                        croissance: Math.round(tendance.pente * 100) / 100
                    });
                }
            }
        }

        // Trier par croissance
        produitsPrometteurs.sort((a, b) => b.croissance - a.croissance);

        res.json({
            success: true,
            data: {
                previsions: previsions.slice(0, 3), // Top 3 prévisions
                produitsPrometteurs: produitsPrometteurs.slice(0, 5),
                statistiques: {
                    joursAnalyse: ventesJournalieres.length,
                    moyenneJournaliere: montantsJournaliers.length > 0 
                        ? Math.round((montantsJournaliers.reduce((a, b) => a + b, 0) / montantsJournaliers.length) * 100) / 100
                        : 0,
                    meilleurJour: ventesJournalieres.length > 0
                        ? ventesJournalieres.reduce((max, v) => v.montant > max.montant ? v : max)
                        : { date: 'N/A', montant: 0 }
                }
            }
        });

    } catch (error) {
        console.error("Erreur génération prévisions:", error);
        res.status(500).json({ 
            success: false,
            message: error.message 
        });
    }
});

// POST créer une prévision manuelle
router.post("/", protect, authorize("BOUTIQUE"), async (req, res) => {
    try {
        const { 
            date_prevision, 
            montant_prevu, 
            probabilite, 
            produit_concerne,
            type_prevision,
            facteurs 
        } = req.body;

        const boutique = await Boutique.findOne({ user: req.user.id });
        
        if (!boutique) {
            return res.status(404).json({ 
                success: false,
                message: "Boutique non trouvée" 
            });
        }

        const prevision = await PrevisionVente.create({
            boutique: boutique._id,
            date_prevision,
            montant_prevu,
            probabilite: probabilite || 70,
            produit_concerne,
            type_prevision: type_prevision || 'journaliere',
            facteurs: facteurs || {},
            createdBy: req.user.id
        });

        const populatedPrevision = await PrevisionVente.findById(prevision._id)
            .populate("produit_concerne", "nom_produit prix");

        res.status(201).json({
            success: true,
            message: "Prévision créée avec succès",
            data: populatedPrevision
        });

    } catch (error) {
        console.error("Erreur création prévision:", error);
        res.status(500).json({ 
            success: false,
            message: error.message 
        });
    }
});

// PUT mettre à jour une prévision
router.put("/:id", protect, authorize("BOUTIQUE"), async (req, res) => {
    try {
        const boutique = await Boutique.findOne({ user: req.user.id });
        
        if (!boutique) {
            return res.status(404).json({ 
                success: false,
                message: "Boutique non trouvée" 
            });
        }

        const prevision = await PrevisionVente.findOne({
            _id: req.params.id,
            boutique: boutique._id
        });

        if (!prevision) {
            return res.status(404).json({ 
                success: false,
                message: "Prévision non trouvée" 
            });
        }

        const updatedPrevision = await PrevisionVente.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        ).populate("produit_concerne", "nom_produit prix");

        res.json({
            success: true,
            message: "Prévision mise à jour avec succès",
            data: updatedPrevision
        });

    } catch (error) {
        console.error("Erreur mise à jour prévision:", error);
        res.status(500).json({ 
            success: false,
            message: error.message 
        });
    }
});

// DELETE supprimer une prévision
router.delete("/:id", protect, authorize("BOUTIQUE"), async (req, res) => {
    try {
        const boutique = await Boutique.findOne({ user: req.user.id });
        
        if (!boutique) {
            return res.status(404).json({ 
                success: false,
                message: "Boutique non trouvée" 
            });
        }

        const prevision = await PrevisionVente.findOneAndDelete({
            _id: req.params.id,
            boutique: boutique._id
        });

        if (!prevision) {
            return res.status(404).json({ 
                success: false,
                message: "Prévision non trouvée" 
            });
        }

        res.json({
            success: true,
            message: "Prévision supprimée avec succès"
        });

    } catch (error) {
        console.error("Erreur suppression prévision:", error);
        res.status(500).json({ 
            success: false,
            message: error.message 
        });
    }
});

// GET chiffre d'affaires avec prévisions
router.get("/chiffre-affaires", protect, authorize("BOUTIQUE"), async (req, res) => {
    try {
        const boutique = await Boutique.findOne({ user: req.user.id });
        
        if (!boutique) {
            return res.status(404).json({ 
                success: false,
                message: "Boutique non trouvée" 
            });
        }

        const produitIds = await Produit.find({ boutique: boutique._id }).distinct('_id');

        // Date d'aujourd'hui
        const aujourdhui = new Date();
        aujourdhui.setHours(0, 0, 0, 0);

        // Date du début du mois
        const debutMois = new Date(aujourdhui.getFullYear(), aujourdhui.getMonth(), 1);
        
        // Date du début de l'année
        const debutAnnee = new Date(aujourdhui.getFullYear(), 0, 1);

        // Récupérer tous les mouvements
        const tousMouvements = await MouvementStock.find({
            produit: { $in: produitIds },
            type_mouvement: 'sortie'
        }).populate('produit');

        // Calculer les chiffres d'affaires
        let caAujourdhui = 0;
        let caSemaine = 0;
        let caMois = 0;
        let caAnnee = 0;
        let caTotal = 0;

        const debutSemaine = new Date(aujourdhui);
        debutSemaine.setDate(aujourdhui.getDate() - aujourdhui.getDay() + 1); // Lundi

        tousMouvements.forEach(mvt => {
            const produit = mvt.produit;
            if (!produit) return;

            const prixEffectif = produit.prix_promotionnel && produit.prix_promotionnel > 0 
                ? produit.prix_promotionnel 
                : produit.prix;
            const montant = mvt.quantite * prixEffectif;
            const dateMvt = new Date(mvt.date_mouvement);

            caTotal += montant;

            if (dateMvt >= debutAnnee) caAnnee += montant;
            if (dateMvt >= debutMois) caMois += montant;
            if (dateMvt >= debutSemaine) caSemaine += montant;
            
            const debutJour = new Date(dateMvt);
            debutJour.setHours(0, 0, 0, 0);
            if (debutJour.getTime() === aujourdhui.getTime()) {
                caAujourdhui += montant;
            }
        });

        // Calculer les prévisions
        const ventesJournalieres = [];
        const ventesParJour = new Map();

        tousMouvements.forEach(mvt => {
            const date = new Date(mvt.date_mouvement);
            const dateStr = date.toISOString().split('T')[0];
            const produit = mvt.produit;
            const prixEffectif = produit.prix_promotionnel && produit.prix_promotionnel > 0 
                ? produit.prix_promotionnel 
                : produit.prix;
            const montant = mvt.quantite * prixEffectif;

            if (!ventesParJour.has(dateStr)) {
                ventesParJour.set(dateStr, { montant: 0, quantite: 0 });
            }
            const jourData = ventesParJour.get(dateStr);
            jourData.montant += montant;
            jourData.quantite += mvt.quantite;
        });

        const montantsJournaliers = Array.from(ventesParJour.values()).map(v => v.montant);
        
        // Prévision pour les 30 prochains jours
        let prevision30Jours = 0;
        if (montantsJournaliers.length >= 7) {
            const moyenneMobile = calculerMoyenneMobile(montantsJournaliers, 7);
            const derniereMoyenne = moyenneMobile[moyenneMobile.length - 1] || 0;
            prevision30Jours = derniereMoyenne * 30;
        }

        res.json({
            success: true,
            data: {
                actuel: {
                    aujourdhui: Math.round(caAujourdhui * 100) / 100,
                    semaine: Math.round(caSemaine * 100) / 100,
                    mois: Math.round(caMois * 100) / 100,
                    annee: Math.round(caAnnee * 100) / 100,
                    total: Math.round(caTotal * 100) / 100
                },
                prevision: {
                    "30jours": Math.round(prevision30Jours * 100) / 100,
                    croissance: montantsJournaliers.length > 0 
                        ? Math.round(((prevision30Jours / 30) / (caTotal / montantsJournaliers.length)) * 100 - 100)
                        : 0
                },
                objectifs: {
                    journalier: Math.round(caMois / 30 * 100) / 100,
                    hebdomadaire: Math.round(caMois / 4 * 100) / 100,
                    mensuel: Math.round(caMois * 1.1 * 100) / 100 // Objectif +10%
                }
            }
        });

    } catch (error) {
        console.error("Erreur calcul chiffre d'affaires:", error);
        res.status(500).json({ 
            success: false,
            message: error.message 
        });
    }
});

module.exports = router;