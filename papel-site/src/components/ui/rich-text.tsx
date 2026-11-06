import { Fragment } from "react";

/**
 * Rendu sûr d'un texte éditorial simple (sans HTML) :
 *   paragraphes séparés par une ligne vide, « ## Titre », « ### Sous-titre »,
 *   listes « - élément », gras **texte**, liens [texte](https://…).
 */
function inline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g);
  return parts.map((part, i) => {
    const bold = part.match(/^\*\*([^*]+)\*\*$/);
    if (bold) return <strong key={i}>{bold[1]}</strong>;
    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link) {
      const href = link[2];
      const safe = /^(https?:\/\/|\/|mailto:|tel:)/.test(href);
      if (!safe) return <Fragment key={i}>{link[1]}</Fragment>;
      const external = href.startsWith("http");
      return (
        <a
          key={i}
          href={href}
          {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          className="font-medium text-papel-700 underline underline-offset-4"
        >
          {link[1]}
        </a>
      );
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}

export function RichText({ text, className }: { text: string; className?: string }) {
  const blocks = text
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);
  return (
    <div className={className}>
      {blocks.map((block, i) => {
        if (block.startsWith("### "))
          return (
            <h3 key={i} className="mt-8 text-xl font-bold text-papel-950">
              {inline(block.slice(4))}
            </h3>
          );
        if (block.startsWith("## "))
          return (
            <h2 key={i} className="mt-10 text-2xl font-bold text-papel-950">
              {inline(block.slice(3))}
            </h2>
          );
        const lines = block.split("\n");
        if (lines.every((l) => /^[-•]\s+/.test(l))) {
          return (
            <ul key={i} className="mt-5 list-disc space-y-2 pl-5 marker:text-papel-500">
              {lines.map((l, j) => (
                <li key={j}>{inline(l.replace(/^[-•]\s+/, ""))}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} className="mt-5 leading-relaxed first:mt-0">
            {lines.map((l, j) => (
              <Fragment key={j}>
                {j > 0 && <br />}
                {inline(l)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
