// Tiny HTML helpers. Every value from a job ad or a resume is escaped before it reaches a page.

export function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Only http(s) and mailto links are allowed into an href. */
export function safeHref(url) {
  const s = String(url ?? "").trim();
  return /^(https?:\/\/|mailto:)/i.test(s) ? esc(s) : "#";
}

export const list = (items, render = esc) => (items || []).map((i) => `<li>${render(i)}</li>`).join("");

export function page({ title, body, css = "" }) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title><style>${css}</style></head><body>${body}</body></html>
`;
}
