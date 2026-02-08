require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./src/config/db");

const app = express();
connectDB();

app.use(cors());
app.use(express.json());

// ROUTES
app.use("/api/auth", require("./src/routes/auth.routes"));
app.use("/api/users", require("./src/routes/users.routes"));
app.use("/api/boutiques", require("./src/routes/boutiques.routes"));
app.use("/api/categories", require("./src/routes/categories.routes"));
app.use("/api/produits", require("./src/routes/produits.routes"));
app.use("/api/promotions", require("./src/routes/promotions.routes"));
// app.use("/api/forums", require("./src/routes/forums.routes"));
app.use("/api/events", require("./src/routes/events.routes"));
app.use("/api/loyers", require("./src/routes/loyers.routes"));
app.use("/api/notifications", require("./src/routes/notifications.routes"));

app.get("/", (req, res) => {
  res.send("Centralis API opérationnelle 🚀");
});

app.listen(process.env.PORT, () =>
  console.log(`🚀 Serveur sur http://localhost:${process.env.PORT}`)
);

  app.use(cors({
  origin: 'http://localhost:4200',
  credentials: true
}));
