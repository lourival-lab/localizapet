const express = require("express");
const multer = require("multer");
const { Pool } = require("pg");
const path = require("path");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// 🔹 Configuração do CORS
app.use(cors({
  origin: [
    "https://ajudeumpetperdido.com.br",   // seu domínio
    "https://lourival-lab.github.io",    // GitHub Pages
    "http://localhost:3000"              // ambiente local
  ],
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type"]
}));

// Middleware para JSON
app.use(express.json());

// Servir arquivos estáticos (CSS, JS, imagens locais)
app.use(express.static(__dirname));

// Rotas para páginas HTML
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});
app.get("/cadastro", (req, res) => {
  res.sendFile(path.join(__dirname, "cadastro.html"));
});
app.get("/detalhe", (req, res) => {
  res.sendFile(path.join(__dirname, "detalhe.html"));
});
app.get("/lista", (req, res) => {
  res.sendFile(path.join(__dirname, "lista.html"));
});
app.get("/mapa", (req, res) => {
  res.sendFile(path.join(__dirname, "mapa.html"));
});

// 🔹 Configuração do Cloudinary
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "pets", // pasta no Cloudinary
    allowed_formats: ["jpg", "png", "jpeg"]
  }
});

const upload = multer({ storage });

// 🔹 Conexão com Neon/Postgres
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Rotas da API
app.get("/pets", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM pets ORDER BY id DESC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/pets/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("SELECT * FROM pets WHERE id = $1", [id]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/pets", upload.single("foto"), async (req, res) => {
  try {
    const { nome, tipo, cor, contato, status, latitude, longitude } = req.body;
    const fotoUrl = req.file ? req.file.path : null; // URL pública do Cloudinary

    const result = await pool.query(
      `INSERT INTO pets (nome, tipo, cor, contato, status, latitude, longitude, foto_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [nome, tipo, cor, contato, status, latitude, longitude, fotoUrl]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/pets/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { status, latitude, longitude } = req.body;
    await pool.query(
      "UPDATE pets SET status=$1, latitude=$2, longitude=$3 WHERE id=$4",
      [status, latitude, longitude, id]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
