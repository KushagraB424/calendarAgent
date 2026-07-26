require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Anthropic = require('@anthropic-ai/sdk');
const { scrapeTextFromUrl } = require('./utils/webScraper');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

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

    // Call Anthropic to extract holidays
    const msg = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1024,
      system: "You are a helpful assistant that extracts holiday dates from school calendar text. Output ONLY a JSON object containing an array of objects under the key 'holidays'. Each object must have 'date' (YYYY-MM-DD) and 'name' (string). Do not include any other text or markdown formatting.",
      messages: [
        {
          role: "user",
          content: `Extract all holidays from this text:\n\n${rawText}`
        }
      ]
    });
    
    let holidays = [];
    try {
      const resultText = msg.content[0].text.trim();
      const parsed = JSON.parse(resultText);
      if (parsed.holidays) {
        holidays = parsed.holidays;
      } else {
        holidays = parsed; // In case it returns just the array
      }
    } catch (parseError) {
      console.error("Failed to parse JSON from Anthropic:", msg.content[0].text);
      throw new Error("AI returned invalid JSON formatting.");
    }

    res.json({ data: { rawText, holidays, message: "Scraped and parsed successfully." } });
  } catch (error) {
    console.error("[POST /extract-holidays] Error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`calendarAgent microservice listening on port ${PORT}`);
});
