require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { scrapeTextFromUrl } = require('./utils/webScraper');

const app = express();
const PORT = process.env.PORT || 5173;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'calendarAgent' });
});

app.post('/extract-holidays', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL is required' });

    const rawText = await scrapeTextFromUrl(url);

    // AI Logic will be added in Day 2
    res.json({ data: { rawText, message: "Scraped successfully, AI parsing pending." } });
  } catch (error) {
    console.error("[POST /extract-holidays] Error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`calendarAgent microservice listening on port ${PORT}`);
});
