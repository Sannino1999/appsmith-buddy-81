const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

export type TranslatableEntry = { key: string; name: string; description: string | null };
export type TranslatedEntry = { key: string; name: string; description: string | null };

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
      model: "google/gemini-3.8-flash",
      messages: [
        {
          role: "system",
          content:
            "You translate restaurant menus from Italian. Keep proper names of dishes, beers and brands untranslated. Translate descriptions naturally and concisely. Reply with JSON only.",
        },
        {
          role: "user",
          content:
            `Translate the following menu entries into ${targetLanguage}. ` +
            `Return JSON of shape {"items":[{"key":string,"name":string,"description":string|null}]} keeping the same keys.\n\n` +
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
