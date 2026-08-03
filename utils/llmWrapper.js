/**
 * Unified LLM Wrapper
 * Automatically detects the LLM provider based on the API key prefix
 * and makes the appropriate REST API call, requiring zero extra SDKs.
 */

async function callUnifiedLLM(apiKey, systemPrompt, userPrompt, images = []) {
  if (!apiKey) {
    throw new Error("No LLM API key provided.");
  }

  // Detect provider
  if (apiKey.startsWith("sk-ant-")) {
    return callAnthropic(apiKey, systemPrompt, userPrompt, images);
  } else if (apiKey.startsWith("AIza") || apiKey.startsWith("AQ.")) {
    return callGemini(apiKey, systemPrompt, userPrompt, images);
  } else if (apiKey.startsWith("gsk_")) {
    return callOpenAICompatible(apiKey, systemPrompt, userPrompt, "https://api.groq.com/openai/v1/chat/completions", "llama-3.3-70b-versatile", images);
  } else if (apiKey.startsWith("sk-or-v1-")) {
    return callOpenAICompatible(apiKey, systemPrompt, userPrompt, "https://openrouter.ai/api/v1/chat/completions", "nvidia/nemotron-nano-12b-v2-vl:free", images);
  } else if (apiKey.startsWith("sk-") || apiKey.startsWith("sk-proj-")) {
    return callOpenAICompatible(apiKey, systemPrompt, userPrompt, "https://api.openai.com/v1/chat/completions", "gpt-4o-mini", images);
  } else {
    throw new Error("Unrecognized API key format. Cannot determine LLM provider.");
  }
}

async function callAnthropic(apiKey, systemPrompt, userPrompt, images = []) {
  const content = [{ type: "text", text: userPrompt }];
  for (const img of images) {
    content.push({
      type: "image",
      source: {
        type: "base64",
        media_type: img.mimeType,
        data: img.data,
      },
    });
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: "user", content }],
    }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(`Anthropic error: ${data.error?.message || response.statusText}`);
  return data.content[0].text;
}

async function callOpenAICompatible(apiKey, systemPrompt, userPrompt, baseUrl, model, images = []) {
  const content = [{ type: "text", text: userPrompt }];
  for (const img of images) {
    content.push({
      type: "image_url",
      image_url: {
        url: `data:${img.mimeType};base64,${img.data}`
      }
    });
  }

  const response = await fetch(baseUrl, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: model,
      max_tokens: 4096,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: typeof content[0] === "object" ? content : userPrompt },
      ],
    }),
  });

  const data = await response.json();
  if (!response.ok || data.error) throw new Error(`OpenAI-compatible error: ${data.error?.message || data.error || response.statusText}`);
  if (!data.choices || !data.choices[0] || !data.choices[0].message) {
    throw new Error(`OpenAI-compatible error: Invalid response format: ${JSON.stringify(data)}`);
  }
  return data.choices[0].message.content;
}

async function callGemini(apiKey, systemPrompt, userPrompt, images = []) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  
  const parts = [{ text: userPrompt }];
  for (const img of images) {
    parts.push({
      inlineData: {
        mimeType: img.mimeType,
        data: img.data
      }
    });
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ parts }],
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
  
  // Extract JSON block in case LLM added conversational text
  const jsonMatch = cleaned.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (jsonMatch) {
    cleaned = jsonMatch[0];
  }
  
  // Strip markdown code blocks if present
  cleaned = cleaned.replace(/^```(json)?\n?/i, "");
  cleaned = cleaned.replace(/\n?```$/i, "");
  
  // Remove trailing commas before closing braces/brackets to prevent JSON parse errors
  cleaned = cleaned.replace(/,\s*([\]}])/g, '$1');
  
  const parsed = JSON.parse(cleaned);
  // Ensure we return the holidays array directly
  return parsed.holidays || parsed;
}

module.exports = { callUnifiedLLM, parseLLMJson };
