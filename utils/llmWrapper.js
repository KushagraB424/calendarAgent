/**
 * Unified LLM Wrapper
 * Automatically detects the LLM provider based on the API key prefix
 * and makes the appropriate REST API call, requiring zero extra SDKs.
 */

async function callUnifiedLLM(apiKey, systemPrompt, userPrompt) {
  if (!apiKey) {
    throw new Error("No LLM API key provided.");
  }

  // Detect provider
  if (apiKey.startsWith("sk-ant-")) {
    return callAnthropic(apiKey, systemPrompt, userPrompt);
  } else if (apiKey.startsWith("AIza") || apiKey.startsWith("AQ.")) {
    return callGemini(apiKey, systemPrompt, userPrompt);
  } else if (apiKey.startsWith("gsk_")) {
    return callOpenAICompatible(apiKey, systemPrompt, userPrompt, "https://api.groq.com/openai/v1/chat/completions", "llama-3.3-70b-versatile");
  } else if (apiKey.startsWith("sk-") || apiKey.startsWith("sk-proj-")) {
    return callOpenAICompatible(apiKey, systemPrompt, userPrompt, "https://api.openai.com/v1/chat/completions", "gpt-4o-mini");
  } else {
    throw new Error("Unrecognized API key format. Cannot determine LLM provider.");
  }
}

async function callAnthropic(apiKey, systemPrompt, userPrompt) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(`Anthropic error: ${data.error?.message || response.statusText}`);
  return data.content[0].text;
}

async function callOpenAICompatible(apiKey, systemPrompt, userPrompt, baseUrl, model) {
  const response = await fetch(baseUrl, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: model,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(`OpenAI-compatible error: ${data.error?.message || response.statusText}`);
  return data.choices[0].message.content;
}

async function callGemini(apiKey, systemPrompt, userPrompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ parts: [{ text: userPrompt }] }],
      generationConfig: { responseMimeType: "application/json" },
    }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(`Gemini error: ${data.error?.message || response.statusText}`);
  return data.candidates[0].content.parts[0].text;
}

/**
 * Extracts and cleans JSON from the raw LLM output text.
 */
function parseLLMJson(rawText) {
  let cleaned = rawText.trim();
  // Strip markdown code blocks if present
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(json)?\n?/i, '');
    cleaned = cleaned.replace(/\n?```$/i, '');
  }
  
  const parsed = JSON.parse(cleaned);
  // Ensure we return the holidays array directly
  return parsed.holidays || parsed;
}

module.exports = { callUnifiedLLM, parseLLMJson };
