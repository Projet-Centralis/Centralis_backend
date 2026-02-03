// const router = require("express").Router();
// const bcrypt = require("bcryptjs");
// const jwt = require("jsonwebtoken");
// const User = require("../models/User");
// const TypeUser = require("../models/TypeUser"); // Ajoutez cette ligne

// // REGISTER
// router.post("/register", async (req, res) => {
//   const { email, password, type_user } = req.body;

//   const hashed = await bcrypt.hash(password, 10);

//   const user = await User.create({
//     email,
//     password: hashed,
//     type_user
//   });

//   res.status(201).json(user);
// });

// // LOGIN - VERSION CORRIGÉE
// router.post("/login", async (req, res) => {
//   const { email, password } = req.body;

//   // 1. Trouver l'utilisateur ET peupler type_user
//   const user = await User.findOne({ email })
//     .populate("type_user"); // ← C'est essentiel !
  
//   if (!user) return res.status(401).json({ message: "Identifiants invalides" });

//   const match = await bcrypt.compare(password, user.password);
//   if (!match) return res.status(401).json({ message: "Identifiants invalides" });

//   // 2. Vérifier que type_user est peuplé
//   if (!user.type_user) {
//     return res.status(500).json({ 
//       message: "Erreur: type d'utilisateur non trouvé",
//       details: "Assurez-vous que le type_user existe dans la collection TypeUser"
//     });
//   }

//   // 3. Créer le token avec le type d'utilisateur réel
//   const token = jwt.sign(
//     { 
//       id: user._id, 
//       type_user: user.type_user.type_user // ← Le type réel, pas l'ObjectId
//     },
//     process.env.JWT_SECRET,
//     { expiresIn: "1d" }
//   );

//   // 4. Retourner la réponse avec les infos peuplées
//   res.json({ 
//     token, 
//     user: {
//       _id: user._id,
//       email: user.email,
//       type_user: user.type_user.type_user, // ← Type réel
//       type_user_id: user.type_user._id // ← Optionnel: garder l'ID
//     }
//   });
// });

// module.exports = router;

const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const TypeUser = require("../models/TypeUser"); // Important !

// REGISTER - Création d'un nouveau compte
router.post("/register", async (req, res) => {
  try {
    const { email, password, type_user } = req.body;

    // 1. Validation des données
    if (!email || !password || !type_user) {
      return res.status(400).json({ 
        success: false,
        message: "Tous les champs sont requis: email, password, type_user" 
      });
    }

    // Valider le type d'utilisateur
    const validTypes = ["ADMIN", "BOUTIQUE", "ACHETEUR"];
    if (!validTypes.includes(type_user.toUpperCase())) {
      return res.status(400).json({ 
        success: false,
        message: "Type d'utilisateur invalide. Options: ADMIN, BOUTIQUE, ACHETEUR",
        validTypes: validTypes
      });
    }

    // 2. Vérifier si l'email existe déjà
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(400).json({ 
        success: false,
        message: "Un utilisateur avec cet email existe déjà" 
      });
    }

    // 3. Trouver l'ObjectId correspondant au type_user
    const typeUserDoc = await TypeUser.findOne({ 
      type_user: type_user.toUpperCase() 
    });

    if (!typeUserDoc) {
      return res.status(400).json({ 
        success: false,
        message: `Type d'utilisateur "${type_user}" non trouvé dans la base de données`,
        suggestion: "Assurez-vous que les types sont initialisés (ADMIN, BOUTIQUE, ACHETEUR)"
      });
    }

    // 4. Hasher le mot de passe
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 5. Créer l'utilisateur
    const user = await User.create({
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      type_user: typeUserDoc._id // ObjectId du TypeUser
    });

    // 6. Peupler pour obtenir le type en string
    const populatedUser = await User.findById(user._id)
      .populate("type_user", "type_user")
      .select("-password"); // Exclure le mot de passe

    // 7. Générer un token automatiquement après l'inscription
    const tokenPayload = {
      id: populatedUser._id,
      email: populatedUser.email,
      type_user: populatedUser.type_user.type_user
    };

    const token = jwt.sign(
      tokenPayload,
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // 8. Préparer la réponse
    const userResponse = {
      _id: populatedUser._id,
      email: populatedUser.email,
      type_user: populatedUser.type_user.type_user,
      createdAt: populatedUser.createdAt,
      updatedAt: populatedUser.updatedAt
    };

    // 9. Envoyer la réponse
    res.status(201).json({
      success: true,
      message: "Compte créé avec succès",
      token, // Token généré automatiquement
      user: userResponse
    });

  } catch (error) {
    console.error("Erreur dans /register:", error);
    
    // Gestion des erreurs MongoDB
    if (error.code === 11000) {
      return res.status(400).json({ 
        success: false,
        message: "Cet email est déjà utilisé" 
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: "Erreur lors de la création du compte",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// LOGIN - Version corrigée
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        message: "Email et mot de passe requis" 
      });
    }

    // Chercher l'utilisateur avec populate
    const user = await User.findOne({ email: email.toLowerCase().trim() })
      .populate({
        path: 'type_user',
        select: 'type_user'
      });

    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: "Identifiants incorrects" 
      });
    }

    // Vérifier le mot de passe
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false,
        message: "Identifiants incorrects" 
      });
    }

    // Vérifier que type_user est défini
    if (!user.type_user) {
      return res.status(500).json({ 
        success: false,
        message: "Erreur de configuration : type d'utilisateur non défini"
      });
    }

    // Préparer les données pour le token
    const userType = user.type_user.type_user;
    
    const tokenPayload = {
      id: user._id,
      email: user.email,
      type_user: userType
    };

    // Générer le token
    const token = jwt.sign(
      tokenPayload,
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Préparer la réponse utilisateur
    const userResponse = {
      _id: user._id,
      email: user.email,
      type_user: userType,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    // Envoyer la réponse
    res.json({
      success: true,
      message: "Connexion réussie",
      token,
      user: userResponse
    });

  } catch (error) {
    console.error("Erreur dans /login:", error);
    res.status(500).json({ 
      success: false,
      message: "Erreur serveur lors de l'authentification",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;