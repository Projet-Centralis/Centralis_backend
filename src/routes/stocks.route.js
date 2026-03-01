const router = require("express").Router();
const Stock = require("../models/Stock");
const Produit = require("../models/Produit");
const Boutique = require("../models/Boutique");
const emplacement = require("../models/EmplacementStock");
const MouvementStock = require("../models/MouvementStock");
const { protect, authorize } = require("../middlewares/auth.middleware");
const PDFDocument = require('pdfkit');

// GET stocks d'un produit
router.get("/produit/:produitId", protect, authorize("BOUTIQUE"), async (req, res) => {
  try {
    // Vérifier que le produit appartient à la boutique de l'utilisateur
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
    });

    if (!produit) {
      return res.status(404).json({ 
        success: false,
        message: "Produit non trouvé ou non autorisé" 
      });
    }

    const stocks = await Stock.find({ produit: req.params.produitId })
      .populate("produit", "nom_produit")
      .populate("emplacement", "nom description");

    res.json({
      success: true,
      data: stocks
    });
    
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
});


// POST ajouter/modifier stock (modifié pour enregistrer l'historique)
router.post("/produit/:produitId", protect, authorize("BOUTIQUE"), async (req, res) => {
  try {
    const { emplacement, quantite, operation = 'entree', motif = '' } = req.body;
    
    if (!emplacement || quantite === undefined) {
      return res.status(400).json({ 
        success: false,
        message: "Emplacement et quantité requis" 
      });
    }

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
    });

    if (!produit) {
      return res.status(404).json({ 
        success: false,
        message: "Produit non trouvé ou non autorisé" 
      });
    }

    // Chercher l'emplacement
    let emplacementId = emplacement;
    // let emplacementDoc;
    
    // if (!emplacement.match(/^[0-9a-fA-F]{24}$/)) {
    //   emplacementDoc = await Emplacement.findOne({ 
    //     boutique: boutique._id,
    //     nom_emplacement: emplacement 
    //   });
      
    //   if (!emplacementDoc) {
    //     return res.status(404).json({ 
    //       success: false,
    //       message: "Emplacement non trouvé" 
    //     });
    //   }
      
    //   emplacementId = emplacementDoc._id;
    // } else {
    //   emplacementDoc = await Emplacement.findById(emplacementId);
    // }

    // Chercher un stock existant pour cet emplacement
    let stock = await Stock.findOne({
      produit: req.params.produitId,
      emplacement: emplacement
    });

    const now = new Date();
    let quantiteAvant = stock ? stock.quantite : 0;
    let quantiteApres;
    
    if (stock) {
      // Mettre à jour le stock existant
      quantiteApres = operation === 'entree' 
        ? stock.quantite + parseInt(quantite) 
        : Math.max(0, stock.quantite - parseInt(quantite));
      
      stock.quantite = quantiteApres;
      
      if (operation === 'entree') {
        stock.date_derniere_entree = now;
      } else {
        stock.date_deriere_sortie = now;
      }
      
      await stock.save();
    } else {
      // Créer un nouveau stock
      if (operation !== 'entree') {
        return res.status(400).json({ 
          success: false,
          message: "Impossible de sortir du stock d'un emplacement vide" 
        });
      }
      
      quantiteApres = parseInt(quantite);
      
      stock = await Stock.create({
        produit: req.params.produitId,
        emplacement: emplacementId,
        quantite: quantiteApres,
        date_derniere_entree: now
      });
    }

    // Mettre à jour la quantité totale du produit
    const stocks = await Stock.find({ produit: req.params.produitId });
    const totalQuantite = stocks.reduce((sum, s) => sum + s.quantite, 0);
    
    await Produit.findByIdAndUpdate(req.params.produitId, {
      quantite_stock: totalQuantite
    });

    // Enregistrer le mouvement dans l'historique
    await MouvementStock.create({
      produit: req.params.produitId,
      emplacement: emplacementId,
      type_mouvement: operation,
      quantite: parseInt(quantite),
      quantite_avant: quantiteAvant,
      quantite_apres: quantiteApres,
      motif: motif || (operation === 'entree' ? 'Entrée de stock' : 'Sortie de stock'),
      utilisateur: req.user.id,
      date_mouvement: now
    });

    const populatedStock = await Stock.findById(stock._id)
      .populate("produit", "nom_produit")
      .populate("emplacement", "nom_emplacement description");

    res.status(201).json({
      success: true,
      message: `Stock ${operation === 'entree' ? 'ajouté' : 'retiré'} avec succès`,
      data: populatedStock
    });
    
  } catch (error) {
    console.error("Erreur détaillée:", error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
});

// PUT mettre à jour stock (ajustement)
router.put("/:id", protect, authorize("BOUTIQUE"), async (req, res) => {
  try {
    const { quantite, emplacement, motif = 'Ajustement manuel' } = req.body;
    
    const stock = await Stock.findById(req.params.id)
      .populate("produit");
    
    if (!stock) {
      return res.status(404).json({ 
        success: false,
        message: "Stock non trouvé" 
      });
    }

    // Vérifier que le produit appartient à la boutique de l'utilisateur
    const boutique = await Boutique.findOne({ user: req.user.id });
    
    if (!boutique) {
      return res.status(404).json({ 
        success: false,
        message: "Boutique non trouvée" 
      });
    }

    const produit = await Produit.findOne({
      _id: stock.produit._id,
      boutique: boutique._id
    });

    if (!produit) {
      return res.status(403).json({ 
        success: false,
        message: "Non autorisé" 
      });
    }

    const quantiteAvant = stock.quantite;
    
    const updatedStock = await Stock.findByIdAndUpdate(
      req.params.id,
      {
        quantite: quantite !== undefined ? quantite : stock.quantite,
        emplacement: emplacement || stock.emplacement
      },
      { new: true }
    ).populate("produit", "nom_produit")
     .populate("emplacement", "nom_emplacement description");

    // Enregistrer l'ajustement
    if (quantite !== undefined && quantite !== quantiteAvant) {
      await MouvementStock.create({
        produit: stock.produit._id,
        emplacement: updatedStock.emplacement,
        type_mouvement: 'ajustement',
        quantite: Math.abs(quantite - quantiteAvant),
        quantite_avant: quantiteAvant,
        quantite_apres: quantite,
        motif: motif,
        utilisateur: req.user.id
      });
    }

    // Mettre à jour la quantité totale du produit
    const stocks = await Stock.find({ produit: stock.produit._id });
    const totalQuantite = stocks.reduce((sum, s) => sum + s.quantite, 0);
    
    await Produit.findByIdAndUpdate(stock.produit._id, {
      quantite_stock: totalQuantite
    });

    res.json({
      success: true,
      message: "Stock mis à jour avec succès",
      data: updatedStock
    });
    
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
});

// DELETE supprimer stock
router.delete("/:id", protect, authorize("BOUTIQUE"), async (req, res) => {
  try {
    const stock = await Stock.findById(req.params.id)
      .populate("produit");
    
    if (!stock) {
      return res.status(404).json({ 
        success: false,
        message: "Stock non trouvé" 
      });
    }

    // Vérifier que le produit appartient à la boutique de l'utilisateur
    const boutique = await Boutique.findOne({ user: req.user.id });
    
    if (!boutique) {
      return res.status(404).json({ 
        success: false,
        message: "Boutique non trouvée" 
      });
    }

    const produit = await Produit.findOne({
      _id: stock.produit._id,
      boutique: boutique._id
    });

    if (!produit) {
      return res.status(403).json({ 
        success: false,
        message: "Non autorisé" 
      });
    }

    await Stock.findByIdAndDelete(req.params.id);

    // Mettre à jour la quantité totale du produit
    const stocks = await Stock.find({ produit: stock.produit._id });
    const totalQuantite = stocks.reduce((sum, s) => sum + s.quantite, 0);
    
    await Produit.findByIdAndUpdate(stock.produit._id, {
      quantite_stock: totalQuantite
    });

    res.json({
      success: true,
      message: "Stock supprimé avec succès"
    });
    
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
});

// GET historique des mouvements d'un produit
router.get("/produit/:produitId/mouvements", protect, authorize("BOUTIQUE"), async (req, res) => {
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
    });

    if (!produit) {
      return res.status(404).json({ 
        success: false,
        message: "Produit non trouvé ou non autorisé" 
      });
    }

    const mouvements = await MouvementStock.find({ produit: req.params.produitId })
      .populate("produit", "nom_produit")
      .populate("emplacement", "nom_emplacement")
      .populate("utilisateur", "nom email")
      .sort({ date_mouvement: -1 });

    res.json({
      success: true,
      data: mouvements
    });
    
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
});

// GET tous les mouvements de la boutique
router.get("/mouvements", protect, authorize("BOUTIQUE"), async (req, res) => {
  try {
    const boutique = await Boutique.findOne({ user: req.user.id });
    
    if (!boutique) {
      return res.status(404).json({ 
        success: false,
        message: "Boutique non trouvée" 
      });
    }

    // Récupérer tous les produits de la boutique
    const produits = await Produit.find({ boutique: boutique._id }).select('_id');
    const produitIds = produits.map(p => p._id);

    const mouvements = await MouvementStock.find({ produit: { $in: produitIds } })
      .populate("produit", "nom_produit")
      .populate("emplacement", "nom_emplacement")
      .populate("utilisateur", "nom email")
      .sort({ date_mouvement: -1 })
      .limit(100); // Limiter aux 100 derniers mouvements

    res.json({
      success: true,
      data: mouvements
    });
    
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
});

/// ========== GÉNÉRATION DE FACTURE PDF POUR SORTIE DE PRODUIT ==========

// GET générer facture pour une sortie de produit
router.get("/facture/:mouvementId", protect, async (req, res) => {
  try {
    const mouvementId = req.params.mouvementId;
    
    // Récupérer le mouvement avec toutes les informations nécessaires
    const mouvement = await MouvementStock.findById(mouvementId)
      .populate({
        path: 'produit',
        populate: [
          { path: 'boutique', model: 'Boutique' },
          { path: 'categorie', model: 'Categorie' }
        ]
      })
      .populate('emplacement')
      .populate('utilisateur', 'nom email');

    if (!mouvement) {
      return res.status(404).json({ 
        success: false,
        message: "Mouvement non trouvé" 
      });
    }

    // Vérifier que c'est bien une sortie (pour une facture)
    if (mouvement.type_mouvement !== 'sortie') {
      return res.status(400).json({ 
        success: false,
        message: "Ce mouvement n'est pas une sortie de stock" 
      });
    }

    // Récupérer la boutique
    const boutique = mouvement.produit.boutique;

    // Créer le document PDF avec des marges réduites pour tenir sur une page
    const doc = new PDFDocument({ 
      margin: 40, 
      size: 'A4',
      info: {
        Title: `Facture - ${mouvement.produit.nom_produit}`,
        Author: 'Centralis',
        Subject: 'Facture de vente',
        Keywords: 'facture, vente, boutique'
      }
    });

    // Définir les en-têtes de réponse
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=facture-${mouvement._id}.pdf`);

    // Pipe le PDF vers la réponse
    doc.pipe(res);

    // ========== STYLES ET COULEURS ==========
    const colors = {
      primary: '#32bcae',      // Turquoise
      secondary: '#13514b',    // Vert foncé
      dark: '#101324',         // Fond très sombre (bleu marine)
      card: '#1a1d2e',         // Fond des cartes (bleu un peu plus clair)
      border: '#13514b',       // Bordures
      text: '#333333',         // Texte gris foncé (pour fond clair)
      textLight: '#666666',    // Texte gris clair
      textWhite: '#ffffff',    // Texte blanc (pour fond sombre)
      lightBg: '#f8f9fa',      // Fond gris très clair
      white: '#ffffff'         // Blanc pur
    };

    // ========== EN-TÊTE (STYLE BLEU MARINE) ==========
    // Bandeau d'en-tête (hauteur réduite à 90px)
    doc.rect(0, 0, doc.page.width, 90).fill(colors.dark);
    
    // Ligne décorative turquoise
    doc.rect(0, 85, doc.page.width, 5).fill(colors.primary);
    
    // Nom de la boutique en TURQUOISE (comme demandé)
    doc.fillColor(colors.primary).fontSize(14).font('Helvetica-Bold')
      .text(boutique.nom_boutique, 40, 20);
    
    // Autres infos en blanc
    doc.fillColor(colors.textWhite).fontSize(9).font('Helvetica')
      .text(boutique.email_contact || 'Email non renseigné', 40, 45)
      .text(boutique.telephone || 'Téléphone non renseigné', 40, 60);
    
    // Numéro de facture et date (encadré plus petit)
    doc.rect(400, 15, 150, 50).fill(colors.dark).stroke(colors.primary);
    doc.fillColor(colors.primary).fontSize(12).font('Helvetica-Bold')
      .text('FACTURE', 420, 25);
    doc.fillColor(colors.textWhite).fontSize(7).font('Helvetica')
      .text(`N°: ${mouvement._id.toString().slice(-8).toUpperCase()}`, 420, 45)
      .text(`Date: ${new Date().toLocaleDateString('fr-FR')}`, 420, 57);

    // ========== CORPS DE LA FACTURE (FOND CLAIR) ==========
    // Fond blanc pour le contenu principal
    doc.rect(0, 90, doc.page.width, doc.page.height - 160).fill(colors.white);
    
    // Titre FACTURE avec style (plus petit)
    doc.fillColor(colors.secondary).fontSize(20).font('Helvetica-Bold')
      .text('FACTURE DE VENTE', 40, 105);
    
    // Ligne de séparation turquoise (plus courte)
    doc.strokeColor(colors.primary).lineWidth(1.5)
      .moveTo(40, 130)
      .lineTo(550, 130)
      .stroke();

    // ========== INFORMATIONS BOUTIQUE ET CLIENT (2 COLONNES) ==========
    const infoY = 145;
    
    // Colonne VENDEUR
    doc.fillColor(colors.primary).fontSize(11).font('Helvetica-Bold')
      .text('VENDEUR', 40, infoY);
    doc.fillColor(colors.text).fontSize(9).font('Helvetica')
      .text(boutique.nom_boutique, 40, infoY + 15)
      .text(boutique.email_contact || 'Email non renseigné', 40, infoY + 27)
      .text(boutique.telephone || 'Téléphone non renseigné', 40, infoY + 39);
    
    // Colonne CLIENT
    doc.fillColor(colors.primary).fontSize(11).font('Helvetica-Bold')
      .text('CLIENT', 320, infoY);
    
    if (mouvement.utilisateur) {
      doc.fillColor(colors.text).fontSize(9).font('Helvetica')
        .text(mouvement.utilisateur.nom || 'Client', 320, infoY + 15)
        .text(mouvement.utilisateur.email || 'Email non renseigné', 320, infoY + 27);
    } else {
      doc.fillColor(colors.text).fontSize(9).font('Helvetica')
        .text('Client particulier', 320, infoY + 15)
        .text('Non enregistré', 320, infoY + 27);
    }

    // ========== DÉTAILS DE LA VENTE ==========
    const produitY = 205;
    
    doc.fillColor(colors.secondary).fontSize(12).font('Helvetica-Bold')
      .text('DÉTAILS DE LA VENTE', 40, produitY);
    
    // Tableau des produits (positions ajustées)
    const tableauY = produitY + 20;
    
    // En-têtes du tableau
    doc.rect(40, tableauY - 5, 520, 20).fill(colors.lightBg);
    doc.fillColor(colors.primary).fontSize(9).font('Helvetica-Bold')
      .text('Description', 45, tableauY)
      .text('Qté', 230, tableauY)
      .text('Prix unitaire', 300, tableauY)
      .text('Total', 450, tableauY);
    
    // Ligne du produit
    const prixUnitaire = mouvement.produit.prix_promotionnel && mouvement.produit.prix_promotionnel > 0 
      ? mouvement.produit.prix_promotionnel 
      : mouvement.produit.prix;
    
    const total = mouvement.quantite * prixUnitaire;
    
    doc.fillColor(colors.text).fontSize(9).font('Helvetica')
      .text(mouvement.produit.nom_produit, 45, tableauY + 18)
      .text(mouvement.quantite.toString(), 240, tableauY + 18)
      .text(`${prixUnitaire.toFixed(2)} €`, 315, tableauY + 18)
      .text(`${total.toFixed(2)} €`, 460, tableauY + 18);
    
    // Catégorie en petit
    if (mouvement.produit.categorie) {
      doc.fillColor(colors.textLight).fontSize(7).font('Helvetica-Oblique')
        .text(`Catégorie: ${mouvement.produit.categorie.nom || 'Non catégorisé'}`, 45, tableauY + 35);
    }

    // ========== RÉCAPITULATIF FINANCIER ==========
    const recapY = 295;
    
    // Titre récapitulatif
    doc.fillColor(colors.primary).fontSize(12).font('Helvetica-Bold')
      .text('RÉCAPITULATIF', 320, recapY);
    
    // Lignes de récapitulatif (plus compactes)
    doc.fillColor(colors.text).fontSize(10).font('Helvetica')
      .text('Sous-total:', 320, recapY + 18)
      .text(`${total.toFixed(2)} €`, 500, recapY + 18, { align: 'right' })
      .text('TVA (0%):', 320, recapY + 33)
      .text('0.00 €', 500, recapY + 33, { align: 'right' });
    
    // Ligne de séparation
    doc.strokeColor(colors.primary).lineWidth(1)
      .moveTo(320, recapY + 48)
      .lineTo(520, recapY + 48)
      .stroke();
    
    doc.fontSize(12).font('Helvetica-Bold')
      .text('TOTAL TTC:', 320, recapY + 53)
      .fillColor(colors.primary).text(`${total.toFixed(2)} €`, 500, recapY + 53, { align: 'right' });

    // ========== INFORMATIONS COMPLÉMENTAIRES ==========
    let noteY = 360;
    if (mouvement.motif) {
      doc.fillColor(colors.text).fontSize(8).font('Helvetica')
        .text(`Note: ${mouvement.motif}`, 40, noteY);
      noteY += 15;
    }

    // ========== PIED DE PAGE (STYLE BLEU MARINE, LISIBLE) ==========
    const footerY = 750; // Position fixe pour tenir sur une page
    
    // Bandeau de pied (moins haut)
    doc.rect(0, footerY, doc.page.width, 100).fill(colors.dark);
    
    // Ligne décorative turquoise
    doc.rect(0, footerY, doc.page.width, 3).fill(colors.primary);
    
    // Message de remerciement en blanc (plus gros et lisible)
    doc.fillColor(colors.textWhite).fontSize(11).font('Helvetica-Bold')
      .text('MERCI DE VOTRE CONFIANCE !', 0, footerY + 12, { align: 'center' });
    
    // Texte plus clair et plus gros
    doc.fillColor(colors.textWhite).fontSize(8).font('Helvetica')
      .text('Cette facture est générée automatiquement et fait office de document officiel.', 0, footerY + 27, { align: 'center' });
    
    // Powered by Centralis (plus visible mais toujours discret)
    doc.fillColor(colors.primary).fontSize(7).font('Helvetica-Oblique')
      .text('Powered by Centralis', 0, footerY + 38, { align: 'center' });

    // ========== FINALISER LE PDF ==========
    doc.end();

  } catch (error) {
    console.error("Erreur génération facture:", error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
});

module.exports = router;