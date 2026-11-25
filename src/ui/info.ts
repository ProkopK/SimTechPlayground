/**
 * Renders a simulation's explanation text (Markdown with $inline$ and $$display$$ math).
 * marked and KaTeX are loaded only when a simulation page is opened.
 */
import type { MarkedExtension } from "marked";

type Renderer = (markdown: string, resolveUrl: (href: string) => string) => string;

let rendererPromise: Promise<Renderer> | undefined;

async function loadRenderer(): Promise<Renderer> {
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
  return (markdown, resolveUrl) =>
    new Marked(math, {
      walkTokens(token) {
        if (token.type === "link" || token.type === "image") token.href = resolveUrl(token.href);
      },
    }).parse(markdown, { async: false });
}

/** `resolveUrl` rewrites link and image URLs, e.g. relative paths to bundled assets. */
export async function renderMarkdown(markdown: string, resolveUrl: (href: string) => string): Promise<string> {
  rendererPromise ??= loadRenderer();
  return (await rendererPromise)(markdown, resolveUrl);
}
