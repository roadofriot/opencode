// packages/app/src/lib/panel-utils.ts

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers / insecure contexts
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  }
}

export function sendToChat(message: string) {
  window.dispatchEvent(new CustomEvent("send-to-chat", { detail: { text: message } }))
}

export function formatProblemForCopy(p: {
  severity: string;
  message: string;
  source?: string;
  file?: string;
  line?: number;
  column?: number;
}) {
  const loc = p.file
    ? `${p.file}${p.line ? `:${p.line}${p.column ? `:${p.column}` : ""}` : ""}`
    : "";
  return `[${p.severity.toUpperCase()}]${loc ? ` ${loc}` : ""}${
    p.source ? ` (${p.source})` : ""
  }
${p.message}`;
}

export function formatDebugForCopy(entry: {
  level: string;
  timestamp?: string;
  message: string;
  source?: string;
}) {
  const ts = entry.timestamp ? `[${entry.timestamp}] ` : "";
  const src = entry.source ? ` (${entry.source})` : "";
  return `${ts}[${entry.level.toUpperCase()}]${src} ${entry.message}`;
}
