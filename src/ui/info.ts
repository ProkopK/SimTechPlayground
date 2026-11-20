/**
 * Renders a simulation's explanation text (Markdown with $inline$ and $$display$$ math).
 * marked and KaTeX are loaded only when a simulation page is opened.
 */
import type { MarkedExtension } from "marked";

let rendererPromise: Promise<(markdown: string) => string> | undefined;

async function loadRenderer(): Promise<(markdown: string) => string> {
  const [{ Marked }, { default: katex }] = await Promise.all([
    import("marked"),
    import("katex"),
    import("katex/dist/katex.min.css"),
  ]);
  const tex = (source: string, displayMode: boolean) =>
    katex.renderToString(source.trim(), { displayMode, throwOnError: false });

  // $$…$$ on its own lines → display formula; $…$ (or $$…$$ inside a paragraph) → inline formula.
  const math: MarkedExtension = {
    extensions: [
      {
        name: "blockMath",
        level: "block",
        start: (src) => src.indexOf("$$"),
        tokenizer(src) {
          const match = /^\$\$([\s\S]+?)\$\$(?:\n|$)/.exec(src);
          if (match) return { type: "blockMath", raw: match[0], text: match[1] };
        },
        renderer: (token) => `<div class="math-display">${tex(token.text, true)}</div>`,
      },
      {
        name: "inlineMath",
        level: "inline",
        start: (src) => src.indexOf("$"),
        tokenizer(src) {
          const match = /^\$\$([\s\S]+?)\$\$|^\$([^$\n]+?)\$/.exec(src);
          if (match) return { type: "inlineMath", raw: match[0], text: match[1] ?? match[2], display: !!match[1] };
        },
        renderer: (token) => tex(token.text, token.display),
      },
    ],
  };
  const marked = new Marked(math);
  return (markdown) => marked.parse(markdown, { async: false });
}

export async function renderMarkdown(markdown: string): Promise<string> {
  rendererPromise ??= loadRenderer();
  return (await rendererPromise)(markdown);
}
