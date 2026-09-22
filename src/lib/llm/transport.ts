export interface JsonCallOptions {
  temperature?: number;
  timeoutMs?: number;
}

export async function generateJsonGemini(
  config: { apiKey: string; model: string },
  prompt: string,
  opts?: JsonCallOptions,
): Promise<unknown> {
  const temperature = opts?.temperature ?? 0.1; // extraction, not creative writing — keep it literal
  const timeoutMs = opts?.timeoutMs ?? 30_000;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature,
        // Literal field-splitting needs no reasoning, and thinking tokens
        // push this well past the timeout below on models that think by
        // default (e.g. gemini-3.6-flash, unlike its 2.5 predecessor).
        thinkingConfig: { thinkingBudget: 0 },
      },
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${detail.slice(0, 500)}`);
  }

  const data = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof text !== "string") {
    throw new Error("Gemini response had no text content — check the API response shape hasn't changed.");
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Gemini did not return valid JSON: ${text.slice(0, 200)}`);
  }
}

export async function generateJsonOllama(
  config: { baseUrl: string; model: string },
  prompt: string,
  opts?: JsonCallOptions,
): Promise<unknown> {
  // temperature isn't wired into the Ollama request body — the original
  // implementation never set it either, so we don't invent new behavior here.
  // It's accepted for interface parity with generateJsonGemini.
  void (opts?.temperature ?? 0.1);
  const timeoutMs = opts?.timeoutMs ?? 60_000;

  let response: Response;
  try {
    response = await fetch(`${config.baseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: config.model, prompt, format: "json", stream: false }),
      signal: AbortSignal.timeout(timeoutMs), // local models can be slow, especially on first load
    });
  } catch (err) {
    throw new Error(
      `Could not reach Ollama at ${config.baseUrl}. Is it running? (\`ollama serve\`, and \`ollama pull ${config.model}\` if you haven't) — ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Ollama error (${response.status}): ${detail.slice(0, 500)}`);
  }

  const data = (await response.json()) as { response?: string };
  if (typeof data.response !== "string") {
    throw new Error("Ollama response had no text content — check the API response shape hasn't changed.");
  }

  try {
    return JSON.parse(data.response);
  } catch {
    throw new Error(`Ollama did not return valid JSON: ${data.response.slice(0, 200)}`);
  }
}
