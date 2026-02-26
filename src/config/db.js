const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    console.log("🔄 Tentative de connexion à MongoDB...");

    if (!process.env.MONGO_URL) {
      console.error("❌ MONGO_URL non défini dans les variables d'environnement");
      process.exit(1);
    }

    console.log("📡 URL Mongo détectée :", process.env.MONGO_URL);

    const conn = await mongoose.connect(process.env.MONGO_URL, {
      serverSelectionTimeoutMS: 5000
    });

    console.log("✅ MongoDB connecté avec succès !");
    console.log(`📂 Database : ${conn.connection.name}`);
    console.log(`🌍 Host : ${conn.connection.host}`);
    console.log(`🔌 Port : ${conn.connection.port}`);

  } catch (error) {
    console.error("❌ Erreur connexion MongoDB");
    console.error(error.message);
    process.exit(1);
  }
};

// Logs runtime Mongo
mongoose.connection.on("connected", () => {
  console.log("🟢 Mongoose connected");
});

mongoose.connection.on("error", (err) => {
  console.error("🔴 Mongoose error :", err);
});

mongoose.connection.on("disconnected", () => {
  console.warn("🟡 Mongoose disconnected");
});

module.exports = connectDB;