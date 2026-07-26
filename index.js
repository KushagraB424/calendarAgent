require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { scrapeTextFromUrl } = require('./utils/webScraper');
const { callUnifiedLLM, parseLLMJson } = require('./utils/llmWrapper');

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

    // Use universal LLM Wrapper
    const systemPrompt = "You are a helpful assistant that extracts holiday dates from school calendar text. Output ONLY a JSON object containing an array of objects under the key 'holidays'. Each object must have 'date' (YYYY-MM-DD) and 'name' (string). Do not include any other text or markdown formatting.";
    const userPrompt = `Extract all holidays from this text:\n\n${rawText}`;

    let holidays = [];
    try {
      // The API key is generic, the wrapper will detect provider from the prefix
      const rawLLMOutput = await callUnifiedLLM(process.env.LLM_API_KEY, systemPrompt, userPrompt);
      holidays = parseLLMJson(rawLLMOutput);
    } catch (llmError) {
      console.error("LLM Extraction failed:", llmError.message);
      throw new Error(`AI processing failed: ${llmError.message}`);
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
