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
      model: "openai/gpt-6-astra",
      messages: [
        {
          role: "system",
          content:
            "You translate Italian restaurant menus. Translate every non-empty description fully into the requested language. Keep only genuine dish names, beer names and brands untranslated; never copy an Italian description into the output. Preserve meaning, ingredients, quantities and allergen wording. Return every input key exactly once and reply with JSON only.",
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
    await response.text();
    console.error(`AI translation failed [${response.status}]`);
    throw new Error(`AI translation failed [${response.status}]`);
  }

  const payload = (await response.json()) as { choices?: { message?: { content?: string } }[] };
  const content = payload.choices?.[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(content) as { items?: TranslatedEntry[] };
  const sourceKeys = new Set(entries.map((entry) => entry.key));
  return (parsed.items ?? []).filter(
    (item) =>
      sourceKeys.has(item.key) &&
      typeof item.name === "string" &&
      item.name.trim().length > 0 &&
      (item.description === null || typeof item.description === "string"),
  );
}
