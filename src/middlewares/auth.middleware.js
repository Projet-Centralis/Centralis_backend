// const jwt = require("jsonwebtoken");
// const User = require("../models/User");

// exports.protect = async (req, res, next) => {
//   let token;

//   if (
//     req.headers.authorization &&
//     req.headers.authorization.startsWith("Bearer")
//   ) {
//     token = req.headers.authorization.split(" ")[1];
//   }

//   if (!token) {
//     return res.status(401).json({ message: "Non autorisé, token manquant" });
//   }

//   try {
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     req.user = await User.findById(decoded.id).select("-password");
//     next();
//   } catch (error) {
//     res.status(401).json({ message: "Token invalide" });
//   }
// };

// exports.authorize = (...roles) => {
//   return (req, res, next) => {
//     if (!roles.includes(req.user.type_user)) {
//       return res.status(403).json({ message: "Accès refusé" });
//     }
//     next();
//   };
// };
const jwt = require("jsonwebtoken");
const User = require("../models/User");

exports.protect = async (req, res, next) => {
  try {
    let token;

    // 1. Récupérer le token depuis le header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // 2. Vérifier si le token existe
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Accès non autorisé. Token manquant."
      });
    }

    // 3. Vérifier et décoder le token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 4. Vérifier que le type_user est dans le token
    if (!decoded.type_user) {
      return res.status(401).json({
        success: false,
        message: "Token invalide : informations incomplètes"
      });
    }

    // 5. Récupérer l'utilisateur depuis la base de données
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Utilisateur non trouvé"
      });
    }

    // 6. Attacher les informations à la requête
    req.user = user;
    req.userId = decoded.id;
    req.userType = decoded.type_user; // Le type depuis le token
    req.userEmail = decoded.email;

    next();
    
  } catch (error) {
    console.error("Erreur middleware protect:", error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: "Token invalide"
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: "Token expiré"
      });
    }
    
    res.status(500).json({
      success: false,
      message: "Erreur d'authentification"
    });
  }
};

exports.authorize = (...allowedRoles) => {
  return (req, res, next) => {
    // 1. Vérifier si userType est défini
    if (!req.userType) {
      return res.status(403).json({
        success: false,
        message: "Accès refusé : type d'utilisateur non défini"
      });
    }

    // 2. Vérifier si le type de l'utilisateur est autorisé
    if (!allowedRoles.includes(req.userType)) {
      return res.status(403).json({
        success: false,
        message: `Accès refusé. Rôles autorisés : ${allowedRoles.join(', ')}`,
        yourRole: req.userType
      });
    }

    next();
  };
};