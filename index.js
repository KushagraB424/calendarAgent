require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { scrapeTextFromUrl } = require('./utils/webScraper');
const { callUnifiedLLM, parseLLMJson } = require('./utils/llmWrapper');

const app = express();
const PORT = process.env.PORT || 5005;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'calendarAgent' });
});

app.post('/extract-holidays', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL is required' });

    const scraperResult = await scrapeTextFromUrl(url);
    const rawText = scraperResult.text || '';
    const images = scraperResult.images || [];

    // Use universal LLM Wrapper
    const systemPrompt = "You are a helpful assistant that extracts holiday dates from school calendar text or images. Output ONLY a JSON object containing an array of objects under the key 'holidays'. Each object must have 'date' (YYYY-MM-DD) and 'name' (string). Do not include any other text or markdown formatting.";
    const userPrompt = `Extract all holidays from this content:\n\n${rawText}`;

    let holidays = [];
    try {
      const rawLLMOutput = await callUnifiedLLM(process.env.LLM_API_KEY, systemPrompt, userPrompt, images);
      holidays = parseLLMJson(rawLLMOutput);
    } catch (llmError) {
      console.warn(`Primary LLM failed: ${llmError.message}. Trying LLM_API_KEY2 fallback...`);
      if (process.env.LLM_API_KEY2) {
        try {
          const fallbackOutput = await callUnifiedLLM(process.env.LLM_API_KEY2, systemPrompt, userPrompt, images);
          holidays = parseLLMJson(fallbackOutput);
        } catch (fallbackError) {
          console.error('Fallback LLM also failed:', fallbackError);
          throw fallbackError;
        }
      } else {
        throw llmError;
      }
    }

    res.json({ data: { rawText, holidays, message: "Scraped and parsed successfully." } });
  } catch (error) {
    console.error("[POST /extract-holidays] Error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post('/generate-yearly-plan', async (req, res) => {
  try {
    const { year, city, state } = req.body;
    if (!year || !city) return res.status(400).json({ error: 'Year and city are required' });

    const systemPrompt = `You are an expert marketing planner for a trampoline park. Output ONLY a JSON object representing a yearly marketing plan. The JSON must match this structure exactly, with no markdown or extra text:
{
  "plan": {
    "name": "string",
    "description": "string",
    "startDate": "YYYY-MM-DD",
    "endDate": "YYYY-MM-DD",
    "rules": [
      { "title": "string", "type": "planning_campaign", "description": "Broad, long-running programs or themes (e.g., Summer Camp Program, Year-Long Revenue Growth). These apply generally." }
    ],
    "overrides": [
      { "title": "string", "type": "planning_offer" | "planning_event" | "planning_holiday" | "planning_schedule" | "planning_closed" | "planning_campaign", "startDate": "YYYY-MM-DD", "endDate": "YYYY-MM-DD", "description": "Specific, short-term seasonal campaigns, promos, holidays, and events. Must be under 14 days." }
    ]
  }
}`;
    const userPrompt = `Generate a full marketing plan for the year ${year} for a trampoline park located in ${city}, ${state || 'Canada'}.
Include major holidays (e.g., Thanksgiving, Christmas Break, Spring Break), likely student PA Days, and short-term seasonal promotional offers or events. 
CRITICAL: Ensure that all dates are historically and factually accurate (e.g. Valentine's Day is in February).
Put all general, long-running programs or overarching themes (like 2-month Summer Camps or year-long initiatives) into the 'rules' array.
Put ONLY short-term, specific events (e.g. Launch weekends, 3-day promos, 1-day holidays) into the 'overrides' array with proper startDate and endDate.
DO NOT make any override event longer than 14 days. 
Set the plan startDate to ${year}-01-01 and endDate to ${year}-12-31.
Return ONLY the raw JSON.`;

    let planData = null;
    try {
      const rawLLMOutput = await callUnifiedLLM(process.env.LLM_API_KEY, systemPrompt, userPrompt, []);
      planData = parseLLMJson(rawLLMOutput);
    } catch (llmError) {
      console.warn(`Primary LLM failed: ${llmError.message}. Trying LLM_API_KEY2 fallback...`);
      if (process.env.LLM_API_KEY2) {
        const fallbackOutput = await callUnifiedLLM(process.env.LLM_API_KEY2, systemPrompt, userPrompt, []);
        planData = parseLLMJson(fallbackOutput);
      } else {
        throw llmError;
      }
    }

    // No longer moving extra rules to overrides, since rules is intended to hold all long-running programs
    const actualPlan = planData?.plan || planData;

    // Force the wrapper so CRM doesn't crash
    const finalResponse = planData?.plan ? planData : { plan: actualPlan };
    res.json(finalResponse);
  } catch (error) {
    console.error("[POST /generate-yearly-plan] Error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`calendarAgent microservice listening on port ${PORT}`);
});
