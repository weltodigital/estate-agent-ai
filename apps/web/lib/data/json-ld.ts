/** JSON-LD drafts are checked before we show them (docs/ux-spec.md section 7). */
export function validateJsonLd(text: string): boolean {
  const body = text.match(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/i)?.[1] ?? text;
  try {
    const parsed = JSON.parse(body) as unknown;
    return typeof parsed === "object" && parsed !== null && ("@type" in parsed || "@graph" in parsed);
  } catch {
    return false;
  }
}
