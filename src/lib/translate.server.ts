// ============= Full file contents =============

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "openai/gpt-6-astra";
// Bump to invalidate cached translations produced with an older prompt/model.
const CACHE_VERSION = "v2";

export type TranslatableEntry = { key: string; name: string; description: string | null };
export type TranslatedEntry = { key: string; name: string; description: string | null };

export function sourceHash(text: string) {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  return `${CACHE_VERSION}-${String(h >>> 0)}`;
}

export async function translateEntries(
  entries: TranslatableEntry[],
  targetLanguage: string,
): Promise<TranslatedEntry[]> {
  if (entries.length === 0) return [];
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");

  const response = await fetch(AI_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are a professional menu translator from Italian. " +
            `Target language: ${targetLanguage}. ` +
            "For EVERY entry you MUST translate both the `name` and the `description` fields into the target language. " +
            "Never leave any sentence in Italian. Only keep proper nouns that have no translation (brand names, beer names, protected Italian terms like 'focaccia' when appropriate). " +
            "Translate descriptions naturally and concisely, as a menu in the target country would read. " +
            "Reply with JSON only, no explanations.",
        },
        {
          role: "user",
          content:
            `Translate all ${entries.length} menu entries into ${targetLanguage}. ` +
            `Return JSON of shape {"items":[{"key":string,"name":string,"description":string|null}]} with exactly ${entries.length} items, keeping the same keys.\n\n` +
            JSON.stringify({ items: entries }),
        },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    console.error(`AI translation failed [${response.status}]: ${body}`);
    throw new Error(`AI translation failed [${response.status}]: ${body}`);
  }

  const payload = (await response.json()) as { choices?: { message?: { content?: string } }[] };
  const content = payload.choices?.[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(content) as { items?: TranslatedEntry[] };
  return parsed.items ?? [];
}
