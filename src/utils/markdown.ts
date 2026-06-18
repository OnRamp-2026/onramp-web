import DOMPurify from "dompurify";
import { marked } from "marked";

/**
 * 마크다운 → 살균된 HTML. v-html 주입 전 반드시 거친다(XSS 방지).
 * freeform answer_text 렌더용 (#44 후속) — 불릿·표·코드·강조를 표시.
 */
export function renderMarkdown(src: string): string {
  if (!src) return "";
  const html = marked.parse(src, { async: false, gfm: true, breaks: true }) as string;
  return DOMPurify.sanitize(html);
}
