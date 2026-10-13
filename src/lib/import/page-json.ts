/** Pull a JSON object out of a public playlist HTML page. */

export function extractScriptJson(html: string, scriptId: string): unknown | null {
  const marker = `id="${scriptId}"`;
  const start = html.indexOf(marker);
  if (start === -1) return null;
  const open = html.indexOf(">", start);
  const close = html.indexOf("</script>", open);
  if (open === -1 || close === -1) return null;
  try {
    return JSON.parse(html.slice(open + 1, close));
  } catch {
    return null;
  }
}

export function extractJsonAssignment(html: string, name: string): unknown | null {
  const needle = `${name} = `;
  const start = html.indexOf(needle);
  if (start === -1) return null;
  const brace = html.indexOf("{", start + needle.length);
  if (brace === -1) return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = brace; i < html.length; i += 1) {
    const ch = html[i];
    if (inString) {
      if (escape) escape = false;
      else if (ch === "\\") escape = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === "{") depth += 1;
    if (ch === "}") {
      depth -= 1;
      if (depth === 0) {
        try {
          return JSON.parse(html.slice(brace, i + 1));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

export function walkJson(
  value: unknown,
  visit: (node: Record<string, unknown>) => void,
): void {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    for (const item of value) walkJson(item, visit);
    return;
  }
  const record = value as Record<string, unknown>;
  visit(record);
  for (const child of Object.values(record)) walkJson(child, visit);
}

export function ytText(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value !== "object") return "";
  const record = value as { simpleText?: unknown; runs?: Array<{ text?: unknown }> };
  if (typeof record.simpleText === "string") return record.simpleText.trim();
  if (Array.isArray(record.runs)) {
    return record.runs
      .map((run) => (typeof run.text === "string" ? run.text : ""))
      .join("")
      .trim();
  }
  return "";
}
