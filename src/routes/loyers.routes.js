const router = require("express").Router();
const Contrat = require("../models/ContratLoyer");
const Paiement = require("../models/PaiementLoyer");
const Boutique = require("../models/Boutique");
const { protect, authorize } = require("../middlewares/auth.middleware");
const PDFDocument = require('pdfkit');

// ========== MIDDLEWARE ==========
// Récupérer l'ID de la boutique de l'utilisateur connecté
const getBoutiqueId = async (req, res, next) => {
  try {
    // Si l'utilisateur est ADMIN, il peut spécifier une boutique ou voir tout
    if (req.userType === 'ADMIN') {
      if (req.query.boutiqueId) {
        req.boutiqueId = req.query.boutiqueId;
      }
      return next();
    }
    
    // Pour les utilisateurs de type BOUTIQUE, récupérer leur boutique
    const boutique = await Boutique.findOne({ user: req.userId });
    if (!boutique) {
      return res.status(404).json({ 
        success: false,
        message: "Aucune boutique trouvée pour cet utilisateur" 
      });
    }
    req.boutiqueId = boutique._id;
    next();
  } catch (error) {
    console.error("Erreur getBoutiqueId:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========== CONTRATS ==========

// GET tous les contrats (admin voit tout, boutique voit ses contrats)
router.get("/contrats", protect, getBoutiqueId, async (req, res) => {
  try {
    let query = {};
    
    // Si c'est une boutique (pas admin), filtrer par sa boutique
    if (req.userType !== 'ADMIN') {
      query.boutique = req.boutiqueId;
    } else if (req.query.boutiqueId) {
      // Admin peut filtrer par boutique si spécifié
      query.boutique = req.query.boutiqueId;
    }
    
    const contrats = await Contrat.find(query)
      .populate("boutique", "nom_boutique email_contact telephone")
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: contrats
    });
  } catch (error) {
    console.error("Erreur récupération contrats:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET contrat actif de la boutique connectée
router.get("/contrat/actif", protect,authorize("ADMIN", "BOUTIQUE"), getBoutiqueId, async (req, res) => {
  try {
    const contrat = await Contrat.findOne({
      boutique: req.boutiqueId,
      is_active: true
    }).populate("boutique", "nom_boutique email_contact telephone");
    
    res.json({
      success: true,
      data: contrat || null
    });
  } catch (error) {
    console.error("Erreur récupération contrat actif:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET contrat par ID (avec vérification des droits)
router.get("/contrats/:id", protect, getBoutiqueId, async (req, res) => {
  try {
    const contrat = await Contrat.findById(req.params.id)
      .populate("boutique", "nom_boutique email_contact telephone");
    
    if (!contrat) {
      return res.status(404).json({ 
        success: false,
        message: "Contrat non trouvé" 
      });
    }
    
    // Vérifier les droits d'accès
    if (req.userType !== 'ADMIN' && contrat.boutique.toString() !== req.boutiqueId.toString()) {
      return res.status(403).json({ 
        success: false,
        message: "Accès refusé à ce contrat" 
      });
    }
    
    res.json({
      success: true,
      data: contrat
    });
  } catch (error) {
    console.error("Erreur récupération contrat:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST créer un contrat (admin seulement)
router.post("/contrats", protect, authorize("ADMIN"), async (req, res) => {
  try {
    const { boutique, montant_mensuel, jour_echeance, date_debut, date_fin } = req.body;
    
    // Vérifier si la boutique existe
    const boutiqueExist = await Boutique.findById(boutique);
    if (!boutiqueExist) {
      return res.status(404).json({ 
        success: false,
        message: "Boutique non trouvée" 
      });
    }
    
    // Désactiver les anciens contrats de cette boutique
    await Contrat.updateMany(
      { boutique, is_active: true },
      { is_active: false }
    );
    
    const contrat = await Contrat.create({
      boutique,
      montant_mensuel,
      jour_echeance,
      date_debut,
      date_fin,
      is_active: true
    });
    
    const populatedContrat = await Contrat.findById(contrat._id)
      .populate("boutique", "nom_boutique email_contact");
    
    res.status(201).json({
      success: true,
      message: "Contrat créé avec succès",
      data: populatedContrat
    });
  } catch (error) {
    console.error("Erreur création contrat:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT mettre à jour un contrat (admin seulement)
router.put("/contrats/:id", protect, authorize("ADMIN"), async (req, res) => {
  try {
    const contrat = await Contrat.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    ).populate("boutique", "nom_boutique");
    
    if (!contrat) {
      return res.status(404).json({ 
        success: false,
        message: "Contrat non trouvé" 
      });
    }
    
    res.json({
      success: true,
      message: "Contrat mis à jour avec succès",
      data: contrat
    });
  } catch (error) {
    console.error("Erreur mise à jour contrat:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE supprimer un contrat (admin seulement)
router.delete("/contrats/:id", protect, authorize("ADMIN"), async (req, res) => {
  try {
    const contrat = await Contrat.findByIdAndDelete(req.params.id);
    
    if (!contrat) {
      return res.status(404).json({ 
        success: false,
        message: "Contrat non trouvé" 
      });
    }
    
    // Supprimer aussi les paiements associés
    await Paiement.deleteMany({ contrat: req.params.id });
    
    res.json({
      success: true,
      message: "Contrat et paiements associés supprimés avec succès"
    });
  } catch (error) {
    console.error("Erreur suppression contrat:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== PAIEMENTS ==========

// GET tous les paiements
router.get("/paiements", protect, getBoutiqueId, async (req, res) => {
  try {
    let query = {};
    
    // Si c'est une boutique, filtrer par sa boutique
    if (req.userType !== 'ADMIN') {
      query.boutique = req.boutiqueId;
    } else if (req.query.boutiqueId) {
      // Admin peut filtrer par boutique
      query.boutique = req.query.boutiqueId;
    }
    
    const paiements = await Paiement.find(query)
      .populate("contrat")
      .populate("boutique", "nom_boutique")
      .sort({ mois: -1, createdAt: -1 });
    
    res.json({
      success: true,
      data: paiements
    });
  } catch (error) {
    console.error("Erreur récupération paiements:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET paiements d'un contrat
router.get("/paiements/contrat/:contratId", protect, getBoutiqueId, async (req, res) => {
  try {
    // Vérifier d'abord que le contrat existe et est accessible
    const contrat = await Contrat.findById(req.params.contratId);
    
    if (!contrat) {
      return res.status(404).json({ 
        success: false,
        message: "Contrat non trouvé" 
      });
    }
    
    // Vérifier les droits d'accès
    if (req.userType !== 'ADMIN' && contrat.boutique.toString() !== req.boutiqueId.toString()) {
      return res.status(403).json({ 
        success: false,
        message: "Accès refusé à ce contrat" 
      });
    }
    
    const paiements = await Paiement.find({ contrat: req.params.contratId })
      .populate("contrat")
      .populate("boutique", "nom_boutique")
      .sort({ mois: -1 });
    
    res.json({
      success: true,
      data: paiements
    });
  } catch (error) {
    console.error("Erreur récupération paiements contrat:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET paiement par ID
router.get("/paiements/:id", protect, getBoutiqueId, async (req, res) => {
  try {
    const paiement = await Paiement.findById(req.params.id)
      .populate({
        path: 'contrat',
        populate: { path: 'boutique' }
      })
      .populate('boutique', 'nom_boutique email_contact telephone');
    
    if (!paiement) {
      return res.status(404).json({ 
        success: false,
        message: "Paiement non trouvé" 
      });
    }
    
    // Vérifier les droits d'accès
    if (req.userType !== 'ADMIN' && paiement.boutique.toString() !== req.boutiqueId.toString()) {
      return res.status(403).json({ 
        success: false,
        message: "Accès refusé à ce paiement" 
      });
    }
    
    res.json({
      success: true,
      data: paiement
    });
  } catch (error) {
    console.error("Erreur récupération paiement:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST créer un paiement (boutique ou admin)
router.post("/paiements", protect, getBoutiqueId, async (req, res) => {
  try {
    const { contrat, mois, montant_du, montant_paye, statut } = req.body;
    
    // Vérifier que le contrat existe
    const contratExist = await Contrat.findById(contrat);
    if (!contratExist) {
      return res.status(404).json({ 
        success: false,
        message: "Contrat non trouvé" 
      });
    }
    
    // Déterminer l'ID de la boutique
    let boutiqueId;
    if (req.userType === 'ADMIN') {
      // Admin peut spécifier une boutique ou utiliser celle du contrat
      boutiqueId = req.body.boutique || contratExist.boutique;
    } else {
      // Boutique utilise sa propre boutique
      boutiqueId = req.boutiqueId;
      
      // Vérifier que le contrat appartient bien à cette boutique
      if (contratExist.boutique.toString() !== boutiqueId.toString()) {
        return res.status(403).json({ 
          success: false,
          message: "Ce contrat ne vous appartient pas" 
        });
      }
    }
    
    // Vérifier qu'un paiement pour ce mois n'existe pas déjà
    const debutMois = new Date(mois);
    debutMois.setDate(1);
    debutMois.setHours(0, 0, 0, 0);
    
    const finMois = new Date(debutMois);
    finMois.setMonth(finMois.getMonth() + 1);
    
    const paiementExistant = await Paiement.findOne({
      contrat,
      mois: { $gte: debutMois, $lt: finMois }
    });
    
    if (paiementExistant) {
      return res.status(400).json({
        success: false,
        message: "Un paiement pour ce mois existe déjà"
      });
    }
    
    const paiement = await Paiement.create({
      contrat,
      boutique: boutiqueId,
      mois,
      montant_du,
      montant_paye,
      statut: statut || (montant_paye >= montant_du ? 'paye' : 'en_attente')
    });
    
    const populatedPaiement = await Paiement.findById(paiement._id)
      .populate("contrat")
      .populate("boutique", "nom_boutique");
    
    res.status(201).json({
      success: true,
      message: "Paiement enregistré avec succès",
      data: populatedPaiement
    });
  } catch (error) {
    console.error("Erreur création paiement:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT mettre à jour un paiement (admin seulement)
router.put("/paiements/:id", protect, authorize("ADMIN"), async (req, res) => {
  try {
    const paiement = await Paiement.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    ).populate("contrat")
     .populate("boutique", "nom_boutique");
    
    if (!paiement) {
      return res.status(404).json({ 
        success: false,
        message: "Paiement non trouvé" 
      });
    }
    
    res.json({
      success: true,
      message: "Paiement mis à jour avec succès",
      data: paiement
    });
  } catch (error) {
    console.error("Erreur mise à jour paiement:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE supprimer un paiement (admin seulement)
router.delete("/paiements/:id", protect, authorize("ADMIN"), async (req, res) => {
  try {
    const paiement = await Paiement.findByIdAndDelete(req.params.id);
    
    if (!paiement) {
      return res.status(404).json({ 
        success: false,
        message: "Paiement non trouvé" 
      });
    }
    
    res.json({
      success: true,
      message: "Paiement supprimé avec succès"
    });
  } catch (error) {
    console.error("Erreur suppression paiement:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== STATISTIQUES ==========

// GET statistiques des loyers
router.get("/statistiques", protect, getBoutiqueId, async (req, res) => {
  try {
    let matchStage = {};
    
    // Filtrer par boutique si nécessaire
    if (req.userType !== 'ADMIN') {
      matchStage.boutique = req.boutiqueId;
    } else if (req.query.boutiqueId) {
      matchStage.boutique = req.query.boutiqueId;
    }
    
    // Contrat actif
    const contratActif = await Contrat.findOne({ 
      ...matchStage,
      is_active: true 
    }).populate("boutique", "nom_boutique");
    
    // Total des loyers payés
    const paiementsEffectues = await Paiement.aggregate([
      { $match: { ...matchStage, statut: 'paye' } },
      { $group: { _id: null, total: { $sum: "$montant_paye" } } }
    ]);
    
    // Total des loyers en attente
    const paiementsEnAttente = await Paiement.aggregate([
      { $match: { ...matchStage, statut: 'en_attente' } },
      { $group: { _id: null, total: { $sum: "$montant_du" } } }
    ]);
    
    // Paiements en retard (mois précédents non payés)
    const aujourdhui = new Date();
    const debutMois = new Date(aujourdhui.getFullYear(), aujourdhui.getMonth(), 1);
    
    const paiementsEnRetard = await Paiement.countDocuments({
      ...matchStage,
      statut: { $in: ['en_attente', 'retard'] },
      mois: { $lt: debutMois }
    });
    
    // Historique des paiements par mois
    const historiqueMensuel = await Paiement.aggregate([
      { $match: { ...matchStage, statut: 'paye' } },
      {
        $group: {
          _id: {
            annee: { $year: "$mois" },
            mois: { $month: "$mois" }
          },
          total: { $sum: "$montant_paye" },
          nombre: { $sum: 1 }
        }
      },
      { $sort: { "_id.annee": -1, "_id.mois": -1 } },
      { $limit: 12 }
    ]);
    
    res.json({
      success: true,
      data: {
        contratActif,
        totalPaye: paiementsEffectues[0]?.total || 0,
        totalAttente: paiementsEnAttente[0]?.total || 0,
        paiementsEnRetard,
        historiqueMensuel
      }
    });
  } catch (error) {
    console.error("Erreur statistiques:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== GÉNÉRATION DE FACTURE PDF ==========

// GET générer facture PDF
router.get("/facture/:paiementId", protect, getBoutiqueId, async (req, res) => {
  try {
    const paiement = await Paiement.findById(req.params.paiementId)
      .populate({
        path: 'contrat',
        populate: { path: 'boutique' }
      })
      .populate('boutique');
    
    if (!paiement) {
      return res.status(404).json({ 
        success: false,
        message: "Paiement non trouvé" 
      });
    }
    
    // Vérifier les droits d'accès
    if (req.userType !== 'ADMIN' && paiement.boutique._id.toString() !== req.boutiqueId.toString()) {
      return res.status(403).json({ 
        success: false,
        message: "Accès refusé à ce paiement" 
      });
    }
    
    // Créer le document PDF
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    
    // Définir les en-têtes de réponse
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=facture-loyer-${paiement._id}.pdf`);
    
    // Pipe le PDF vers la réponse
    doc.pipe(res);
    
    // En-tête
    doc.fontSize(20).font('Helvetica-Bold').text('FACTURE DE LOYER', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).font('Helvetica').text(`N° Facture: ${paiement._id}`, { align: 'right' });
    doc.text(`Date d'émission: ${new Date().toLocaleDateString('fr-FR')}`, { align: 'right' });
    doc.moveDown(2);
    
    // Informations boutique
    doc.fontSize(14).font('Helvetica-Bold').text('Informations de la boutique');
    doc.fontSize(12).font('Helvetica');
    doc.text(`Nom: ${paiement.boutique.nom_boutique}`);
    doc.text(`Email: ${paiement.boutique.email_contact || 'Non renseigné'}`);
    doc.text(`Téléphone: ${paiement.boutique.telephone || 'Non renseigné'}`);
    doc.moveDown();
    
    // Informations contrat
    doc.fontSize(14).font('Helvetica-Bold').text('Détails du contrat');
    doc.fontSize(12).font('Helvetica');
    doc.text(`Montant mensuel: ${paiement.contrat.montant_mensuel.toLocaleString('fr-FR')} €`);
    doc.text(`Période: ${new Date(paiement.contrat.date_debut).toLocaleDateString('fr-FR')} - ${new Date(paiement.contrat.date_fin).toLocaleDateString('fr-FR')}`);
    doc.text(`Jour d'échéance: le ${paiement.contrat.jour_echeance} de chaque mois`);
    doc.moveDown();
    
    // Détails du paiement
    doc.fontSize(14).font('Helvetica-Bold').text('Détails du paiement');
    doc.fontSize(12).font('Helvetica');
    doc.text(`Mois concerné: ${new Date(paiement.mois).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`);
    doc.text(`Montant dû: ${paiement.montant_du.toLocaleString('fr-FR')} €`);
    doc.text(`Montant payé: ${paiement.montant_paye.toLocaleString('fr-FR')} €`);
    doc.text(`Statut: ${paiement.statut === 'paye' ? 'Payé' : (paiement.statut === 'en_attente' ? 'En attente' : 'En retard')}`);
    doc.text(`Date de paiement: ${new Date(paiement.createdAt).toLocaleDateString('fr-FR')}`);
    doc.moveDown(2);
    
    // Tableau récapitulatif
    const tableTop = doc.y;
    doc.fontSize(12).font('Helvetica-Bold');
    doc.text('Description', 50, tableTop);
    doc.text('Montant', 400, tableTop);
    
    doc.fontSize(12).font('Helvetica');
    doc.text(`Loyer du ${new Date(paiement.mois).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`, 50, tableTop + 25);
    doc.text(`${paiement.montant_du.toLocaleString('fr-FR')} €`, 400, tableTop + 25);
    
    if (paiement.montant_paye > paiement.montant_du) {
      doc.text('Rappel', 50, tableTop + 50);
      doc.text(`${(paiement.montant_paye - paiement.montant_du).toLocaleString('fr-FR')} €`, 400, tableTop + 50);
    }
    
    // Total
    doc.moveDown(4);
    doc.fontSize(14).font('Helvetica-Bold');
    doc.text(`TOTAL: ${paiement.montant_paye.toLocaleString('fr-FR')} €`, { align: 'right' });
    
    // Pied de page
    doc.fontSize(10).font('Helvetica');
    doc.text('Merci de votre confiance', 50, 700, { align: 'center' });
    doc.text('Ce document fait office de facture officielle', 50, 720, { align: 'center' });
    
    // Finaliser le PDF
    doc.end();
    
  } catch (error) {
    console.error("Erreur génération PDF:", error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
});

// ========== ALERTES ET ÉCHÉANCES ==========

// GET échéances à venir
router.get("/echeances", protect, getBoutiqueId, async (req, res) => {
  try {
    let query = {};
    
    // Filtrer par boutique si nécessaire
    if (req.userType !== 'ADMIN') {
      query.boutique = req.boutiqueId;
    } else if (req.query.boutiqueId) {
      query.boutique = req.query.boutiqueId;
    }
    
    const aujourdhui = new Date();
    aujourdhui.setHours(0, 0, 0, 0);
    
    const contratsActifs = await Contrat.find({ 
      ...query,
      is_active: true 
    }).populate("boutique", "nom_boutique");
    
    const echeances = [];
    
    for (const contrat of contratsActifs) {
      // Calculer la prochaine échéance
      let prochaineEcheance = new Date(
        aujourdhui.getFullYear(),
        aujourdhui.getMonth(),
        contrat.jour_echeance
      );
      
      // Si l'échéance est déjà passée ce mois-ci, prendre le mois prochain
      if (prochaineEcheance < aujourdhui) {
        prochaineEcheance = new Date(
          aujourdhui.getFullYear(),
          aujourdhui.getMonth() + 1,
          contrat.jour_echeance
        );
      }
      
      // Vérifier si le paiement pour cette échéance existe
      const debutMois = new Date(prochaineEcheance.getFullYear(), prochaineEcheance.getMonth(), 1);
      const finMois = new Date(prochaineEcheance.getFullYear(), prochaineEcheance.getMonth() + 1, 1);
      
      const paiementExistant = await Paiement.findOne({
        contrat: contrat._id,
        mois: { $gte: debutMois, $lt: finMois }
      });
      
      if (!paiementExistant) {
        const joursRestants = Math.ceil((prochaineEcheance - aujourdhui) / (1000 * 60 * 60 * 24));
        
        echeances.push({
          contrat: contrat._id,
          boutique: contrat.boutique,
          montant: contrat.montant_mensuel,
          date_echeance: prochaineEcheance,
          jours_restants: joursRestants,
          statut: joursRestants < 0 ? 'en_retard' : (joursRestants <= 3 ? 'urgent' : 'a_venir')
        });
      }
    }
    
    // Trier par date d'échéance
    echeances.sort((a, b) => a.date_echeance - b.date_echeance);
    
    res.json({
      success: true,
      data: echeances
    });
  } catch (error) {
    console.error("Erreur récupération échéances:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Ajoutez ces routes dans votre fichier existant

// ========== ROUTES ADMIN ==========

// GET tous les contrats avec statistiques (admin seulement)
router.get("/admin/contrats", protect, authorize("ADMIN"), async (req, res) => {
  try {
    const contrats = await Contrat.find()
      .populate("boutique", "nom_boutique email_contact telephone")
      .sort({ createdAt: -1 });

    const contratsAvecStats = await Promise.all(contrats.map(async (contrat) => {
      // Calculer le total payé pour ce contrat
      const paiements = await Paiement.find({ 
        contrat: contrat._id,
        statut: 'paye'
      });

      const totalPaye = paiements.reduce((sum, p) => sum + p.montant_paye, 0);
      const moisPayes = paiements.length;

      // Calculer le nombre total de mois du contrat
      const dateDebut = new Date(contrat.date_debut);
      const dateFin = new Date(contrat.date_fin);
      const moisTotal = (dateFin.getFullYear() - dateDebut.getFullYear()) * 12 + 
                        (dateFin.getMonth() - dateDebut.getMonth());

      return {
        ...contrat.toObject(),
        statistiques: {
          totalPaye,
          moisPayes,
          moisTotal,
          progression: Math.round((moisPayes / moisTotal) * 100) || 0
        }
      };
    }));

    res.json({
      success: true,
      data: contratsAvecStats
    });
  } catch (error) {
    console.error("Erreur récupération contrats admin:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET détails d'une boutique pour l'admin
router.get("/admin/boutique/:boutiqueId", protect, authorize("ADMIN"), async (req, res) => {
  try {
    const boutique = await Boutique.findById(req.params.boutiqueId);
    if (!boutique) {
      return res.status(404).json({ success: false, message: "Boutique non trouvée" });
    }

    const contrats = await Contrat.find({ boutique: req.params.boutiqueId })
      .populate("boutique", "nom_boutique");

    const paiements = await Paiement.find({ boutique: req.params.boutiqueId })
      .populate("contrat")
      .sort({ mois: -1 });

    // Calculer les statistiques
    const totalPaye = paiements
      .filter(p => p.statut === 'paye')
      .reduce((sum, p) => sum + p.montant_paye, 0);

    const paiementsEnAttente = paiements
      .filter(p => p.statut === 'en_attente')
      .length;

    const contratActif = contrats.find(c => c.is_active);

    res.json({
      success: true,
      data: {
        boutique,
        contrats,
        paiements,
        statistiques: {
          totalPaye,
          paiementsEnAttente,
          contratActif
        }
      }
    });
  } catch (error) {
    console.error("Erreur récupération boutique:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT valider un paiement (admin seulement)
router.put("/paiements/:id/valider", protect, authorize("ADMIN"), async (req, res) => {
  try {
    const paiement = await Paiement.findByIdAndUpdate(
      req.params.id,
      { 
        statut: 'paye',
        updatedAt: new Date()
      },
      { new: true }
    ).populate("contrat")
     .populate("boutique", "nom_boutique");

    if (!paiement) {
      return res.status(404).json({ 
        success: false,
        message: "Paiement non trouvé" 
      });
    }

    res.json({
      success: true,
      message: "Paiement validé avec succès",
      data: paiement
    });
  } catch (error) {
    console.error("Erreur validation paiement:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST paiement par admin (directement payé)
router.post("/admin/paiements", protect, authorize("ADMIN"), async (req, res) => {
  try {
    const { contrat, boutique, mois, montant_du, montant_paye } = req.body;

    // Vérifier que le contrat existe
    const contratExist = await Contrat.findById(contrat);
    if (!contratExist) {
      return res.status(404).json({ 
        success: false,
        message: "Contrat non trouvé" 
      });
    }

    // Vérifier qu'un paiement pour ce mois n'existe pas déjà
    const debutMois = new Date(mois);
    debutMois.setDate(1);
    debutMois.setHours(0, 0, 0, 0);
    
    const finMois = new Date(debutMois);
    finMois.setMonth(finMois.getMonth() + 1);

    const paiementExistant = await Paiement.findOne({
      contrat,
      mois: { $gte: debutMois, $lt: finMois }
    });

    if (paiementExistant) {
      return res.status(400).json({
        success: false,
        message: "Un paiement pour ce mois existe déjà"
      });
    }

    const paiement = await Paiement.create({
      contrat,
      boutique,
      mois,
      montant_du,
      montant_paye,
      statut: 'paye' // Directement payé
    });

    const populatedPaiement = await Paiement.findById(paiement._id)
      .populate("contrat")
      .populate("boutique", "nom_boutique");

    res.status(201).json({
      success: true,
      message: "Paiement enregistré avec succès",
      data: populatedPaiement
    });
  } catch (error) {
    console.error("Erreur création paiement admin:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;