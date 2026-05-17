const express = require("express");
const multer = require("multer");
const { Pool } = require("pg");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para JSON
app.use(express.json());

// Servir arquivos estáticos (HTML, CSS, JS, imagens)
app.use(express.static(__dirname));
app.use("/uploads", express.static("uploads"));

// Rota principal para entregar index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Configuração do Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + file.originalname;
    cb(null, uniqueName);
  }
});
const upload = multer({ storage });

// Conexão com Neon/Postgres
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
    const fotoPath = req.file ? `/uploads/${req.file.filename}` : null;

    const result = await pool.query(
      `INSERT INTO pets (nome, tipo, cor, contato, status, latitude, longitude, foto_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [nome, tipo, cor, contato, status, latitude, longitude, fotoPath]
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
