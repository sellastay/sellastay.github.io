require("dotenv").config();
const express = require("express");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;
const UPLOAD_DIR = path.join(__dirname, "uploads", "propostas");

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Guardar as notícias em memória
let cachedNews = [];

// ====== FONTE DE NOTÍCIAS ======
const NEWS_API_KEY = process.env.NEWS_API_KEY;

// Palavras-chave moedas 
const QUERY_TERMS = [
  "dólar",
  "euro",
  "bitcoin",
  "ethereum",
  "câmbio",
  "forex",
  "moedas",
  "crypto"
];

//  URL de busca
function buildNewsUrl() {
  const query = QUERY_TERMS.join(" OR "); // "dólar OR euro OR bitcoin..."
  return `https://newsapi.org/v2/everything?q=${encodeURIComponent(
    query
  )}&language=pt&sortBy=publishedAt&pageSize=50&apiKey=${NEWS_API_KEY}`;
}

// ======  BUSCAR NOTÍCIAS ======
async function fetchCurrencyNews() {
  if (!NEWS_API_KEY) {
    console.warn("⚠️ NEWS_API_KEY não configurada no .env. Nenhuma notícia será buscada.");
    return;
  }

  try {
    console.log("🔄 Buscando notícias de moedas...");
    const url = buildNewsUrl();
    const response = await axios.get(url);

    const articles = response.data.articles || [];

    // Normaliza as notícias para um formato padrão
    cachedNews = articles.map((a, index) => ({
      id: `${Date.now()}-${index}`,
      title: a.title,
      description: a.description,
      url: a.url,
      source: a.source?.name,
      publishedAt: a.publishedAt
    }));

    console.log(`✅ ${cachedNews.length} notícias atualizadas em cache.`);
  } catch (err) {
    console.error("❌ Erro ao buscar notícias:", err.message);
  }
}

// Retorna uma notícia aleatória do cache
function getRandomNews() {
  if (!cachedNews.length) return null;
  const index = Math.floor(Math.random() * cachedNews.length);
  return cachedNews[index];
}

// ====== MIDDLEWARES ======
app.use(cors());           // permite que outro sistema/front consuma a API
app.use(express.json());
app.use(express.static("uploads"));

// ======  API ======

// Ver todas as notícias em cache 
app.get("/news", (req, res) => {
  res.json({
    total: cachedNews.length,
    data: cachedNews
  });
});

// Pega uma notícia aleatória
app.get("/news/random", (req, res) => {
  const article = getRandomNews();
  if (!article) {
    return res.status(503).json({
      error: "Nenhuma notícia disponível no momento. Tente novamente em instantes."
    });
  }
  res.json(article);
});

// Status simples da API
app.get("/health", (req, res) => {
  res.json({ status: "ok", newsCount: cachedNews.length });
});

// Recebe PDF (base64) e grava em uploads/propostas
app.post("/api/propostas/pdf", (req, res) => {
  try {
    const { proposalId, fileName, data } = req.body || {};
    if (!proposalId || !data) {
      return res.status(400).json({ error: "proposalId e data s\u00e3o obrigat\u00f3rios" });
    }
    const safeName = (fileName || `${proposalId}-${Date.now()}.pdf`).replace(/[^a-zA-Z0-9._-]/g, "_");
    const dest = path.join(UPLOAD_DIR, safeName);
    const base64 = data.replace(/^data:application\/pdf;base64,/, "");
    fs.writeFileSync(dest, base64, "base64");
    const publicUrl = `/propostas/${safeName}`;
    res.json({ status: "ok", url: publicUrl });
  } catch (error) {
    console.error("Erro ao salvar PDF:", error);
    res.status(500).json({ error: "Falha ao salvar PDF" });
  }
});

// ====== INICIALIZAÇÃO DO SERVIDOR ======
app.listen(PORT, () => {
  console.log(`🚀 Backend rodando em http://localhost:${PORT}`);
});

// Busca inicial ao subir
fetchCurrencyNews();

// Atualiza as notícias a cada 10 minutos
setInterval(fetchCurrencyNews, 10 * 60 * 1000);
