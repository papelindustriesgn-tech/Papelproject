/**
 * Composants d'interface de base, au style d'Odoo : sobres et denses sur ordinateur,
 * zones tactiles confortables (≥ 44 px) sur téléphone.
 */
import Link from "next/link";
import { Children, cloneElement, isValidElement } from "react";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactElement, ReactNode, SelectHTMLAttributes } from "react";

export function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

type VarianteBouton = "principal" | "secondaire" | "danger" | "discret";

const STYLES_BOUTON: Record<VarianteBouton, string> = {
  principal: "bg-papel-700 text-white shadow-sm hover:bg-papel-800 disabled:bg-papel-300",
  secondaire: "bg-white text-gray-900 ring-1 ring-gray-200 hover:bg-gray-50",
  danger: "bg-red-700 text-white hover:bg-red-800",
  discret: "text-papel-700 hover:bg-papel-50",
};

/** Classes d'un bouton : aussi utilisables sur un lien (`<Link className={classesBouton()}>`). */
export function classesBouton(variante: VarianteBouton = "principal", className?: string) {
  return cx(
    "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-4 py-1.5 text-[0.95rem] font-medium transition disabled:cursor-not-allowed md:min-h-10",
    STYLES_BOUTON[variante],
    className,
  );
}

export function Bouton({
  variante = "principal",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: VarianteBouton }) {
  return <button className={classesBouton(variante, className)} {...props} />;
}

/** Carte blanche arrondie (ombre douce, sans bordure) avec titre facultatif. */
export function Carte({ titre, action, children, className }: { titre?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cx("ombre-carte min-w-0 rounded-2xl bg-white p-4 md:p-5", className)}>
      {(titre || action) && (
        <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
          {titre && <h2 className="text-[1.08rem] font-semibold text-gray-900">{titre}</h2>}
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

const CLASSES_SAISIE = "min-h-11 w-full min-w-0 rounded-xl border bg-white px-3 py-1.5 text-base md:min-h-10 md:text-[0.95rem]";

/** Champs de nombres (montants, quantités, poids…) : clavier numérique sur téléphone, sans changer la saisie à la française. */
const NOMS_NUMERIQUES = /(montant|quantite|prix|colis|paquets|_kg|_mm|_gnf|_pct|^km_|^taux|plis|mouchoirs|seuil|valeur|duree|visites|nouveaux_pva|cout)/;

export function Champ({
  libelle,
  erreur,
  aide,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { libelle: string; erreur?: string; aide?: string }) {
  const id = props.id ?? props.name;
  const numerique = !props.inputMode && (props.type ?? "text") === "text" && NOMS_NUMERIQUES.test(props.name ?? "");
  return (
    <div className={cx("flex min-w-0 flex-col gap-1", className)}>
      <label htmlFor={id} className="text-sm font-semibold text-gray-700">
        {libelle}
        {props.required && <span className="text-red-700"> *</span>}
      </label>
      <input
        id={id}
        aria-invalid={erreur ? true : undefined}
        aria-describedby={erreur ? `${id}-erreur` : undefined}
        className={cx(CLASSES_SAISIE, erreur ? "border-red-600" : "border-gray-300 hover:border-gray-400 focus:border-papel-600")}
        inputMode={numerique ? "decimal" : undefined}
        {...props}
      />
      {aide && !erreur && <p className="text-sm text-gray-500">{aide}</p>}
      {erreur && (
        <p id={`${id}-erreur`} className="text-sm font-medium text-red-700">
          {erreur}
        </p>
      )}
    </div>
  );
}

export function Selection({
  libelle,
  erreur,
  children,
  className,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { libelle: string; erreur?: string }) {
  const id = props.id ?? props.name;
  return (
    <div className={cx("flex min-w-0 flex-col gap-1", className)}>
      <label htmlFor={id} className="text-sm font-semibold text-gray-700">
        {libelle}
      </label>
      <select
        // Liste non contrôlée : React ne réapplique pas `defaultValue` après le rechargement du formulaire
        // (erreur de validation) ; la clé la recrée avec la valeur saisie.
        key={props.value === undefined ? String(props.defaultValue ?? "") : undefined}
        id={id}
        aria-invalid={erreur ? true : undefined}
        className={cx(CLASSES_SAISIE, erreur ? "border-red-600" : "border-gray-300 hover:border-gray-400")}
        {...props}
      >
        {children}
      </select>
      {erreur && <p className="text-sm font-medium text-red-700">{erreur}</p>}
    </div>
  );
}

type TonMessage = "succes" | "erreur" | "info" | "alerte";
const STYLES_MESSAGE: Record<TonMessage, string> = {
  succes: "border-green-200 bg-green-50 text-green-900",
  erreur: "border-red-200 bg-red-50 text-red-900",
  info: "border-sky-200 bg-sky-50 text-sky-900",
  alerte: "border-amber-200 bg-amber-50 text-amber-900",
};

export function Message({ ton = "info", children }: { ton?: TonMessage; children: ReactNode }) {
  return (
    <div role={ton === "erreur" ? "alert" : "status"} className={cx("rounded-xl border px-3.5 py-2.5", STYLES_MESSAGE[ton])}>
      {children}
    </div>
  );
}

const STYLES_BADGE: Record<TonMessage | "neutre", string> = {
  succes: "bg-green-100 text-green-800",
  erreur: "bg-red-100 text-red-800",
  info: "bg-sky-100 text-sky-800",
  alerte: "bg-amber-100 text-amber-900",
  neutre: "bg-gray-200 text-gray-700",
};

/** Étiquette de statut (pastille arrondie, à la Odoo). */
export function Badge({ children, ton = "info" }: { children: ReactNode; ton?: TonMessage | "neutre" }) {
  return <span className={cx("inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-[0.8rem] font-medium", STYLES_BADGE[ton])}>{children}</span>;
}

/** Texte simple d'un en-tête (pour l'étiquette affichée devant chaque valeur sur téléphone). */
function texteEntete(e: ReactNode): string {
  return typeof e === "string" || typeof e === "number" ? String(e) : "";
}

/**
 * Vue liste. Sur ordinateur : tableau dense (en-têtes, survol). Sur téléphone : chaque ligne devient une fiche
 * empilée, chaque valeur précédée du nom de sa colonne — plus de défilement horizontal.
 */
export function Tableau({ entetes, children }: { entetes: ReactNode[]; children: ReactNode }) {
  const libelles = entetes.map(texteEntete);
  const lignes = Children.map(children, (ligne) => {
    if (!isValidElement<{ children?: ReactNode }>(ligne) || ligne.type !== "tr") return ligne;
    const cellules = Children.toArray(ligne.props.children).map((c, i) =>
      isValidElement(c) ? cloneElement(c as ReactElement<{ "data-label"?: string }>, { "data-label": libelles[i] ?? "" }) : c,
    );
    return cloneElement(ligne, undefined, ...cellules);
  });
  return (
    <div className="-mx-4 md:-mx-5 md:overflow-x-auto">
      <table className="tableau-liste w-full border-collapse text-left text-[0.95rem] md:min-w-max">
        <thead className="max-md:sr-only">
          <tr className="bg-gray-50/80 text-[0.82rem] uppercase tracking-wide text-gray-500">
            {entetes.map((e, i) => (
              <th key={i} scope="col" className="whitespace-nowrap px-3 py-2.5 font-semibold first:pl-4 last:pr-4 md:first:pl-5 md:last:pr-5">
                {e}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="md:divide-y md:divide-gray-100 md:[&>tr:hover]:bg-papel-50/60">{lignes}</tbody>
      </table>
    </div>
  );
}

export function Cellule({ children, className, ...props }: { children: ReactNode; className?: string; "data-label"?: string }) {
  return (
    <td className={cx("px-3 py-2.5 align-top first:pl-4 last:pr-4 md:first:pl-5 md:last:pr-5", className)} {...props}>
      {children}
    </td>
  );
}

export interface ElementFil {
  libelle: string;
  href?: string;
}

/**
 * Barre de contrôle (en-tête de page à la Odoo) : fil d'Ariane, titre, boutons d'action.
 * `fil` = pages parentes (ex. Factures › FA-2026-00012).
 */
export function TitrePage({ titre, sousTitre, action, fil }: { titre: string; sousTitre?: string; action?: ReactNode; fil?: ElementFil[] }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-x-4 gap-y-3 print:hidden">
      <div className="min-w-0">
        {fil && fil.length > 0 && (
          <nav aria-label="Fil d'Ariane" className="mb-1 flex flex-wrap items-center gap-1.5 text-sm">
            {fil.map((f) => (
              <span key={f.libelle} className="flex items-center gap-1.5">
                {f.href ? (
                  <Link href={f.href} className="font-medium text-papel-700 hover:underline">
                    {f.libelle}
                  </Link>
                ) : (
                  <span className="text-gray-500">{f.libelle}</span>
                )}
                <span className="text-gray-300">/</span>
              </span>
            ))}
          </nav>
        )}
        <h1 className="text-[1.6rem] font-bold leading-tight tracking-tight text-gray-900 md:text-[1.75rem]">{titre}</h1>
        {sousTitre && <p className="mt-0.5 text-[0.95rem] text-gray-500">{sousTitre}</p>}
      </div>
      {action && <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">{action}</div>}
    </div>
  );
}

export interface Etape {
  code: string;
  libelle: string;
}

/**
 * Barre d'étapes d'un document (à la Odoo : Brouillon › Validé › Payé…).
 * L'étape courante est mise en valeur ; les étapes « hors chemin » (annulé…) s'ajoutent seulement si elles sont courantes.
 */
export function BarreEtapes({ etapes, courante }: { etapes: Etape[]; courante: string }) {
  const index = etapes.findIndex((e) => e.code === courante);
  return (
    <ol className="flex overflow-x-auto text-sm" aria-label="Étapes">
      {etapes.map((e, i) => {
        const etat = i === index ? "courante" : index >= 0 && i < index ? "faite" : "a-venir";
        return (
          <li
            key={e.code}
            aria-current={etat === "courante" ? "step" : undefined}
            className={cx(
              "relative -ml-2 flex items-center whitespace-nowrap py-1.5 pl-5 pr-3 first:ml-0 first:rounded-l first:pl-3 last:rounded-r",
              "[clip-path:polygon(0_0,calc(100%-10px)_0,100%_50%,calc(100%-10px)_100%,0_100%,10px_50%)] first:[clip-path:polygon(0_0,calc(100%-10px)_0,100%_50%,calc(100%-10px)_100%,0_100%)]",
              etat === "courante" ? "bg-papel-700 font-semibold text-white" : etat === "faite" ? "bg-papel-100 text-papel-900" : "bg-gray-100 text-gray-600",
            )}
          >
            {e.libelle}
          </li>
        );
      })}
    </ol>
  );
}

/** Étapes d'une barre à partir d'une table de statuts : le chemin normal, plus le statut courant s'il est hors chemin (annulé…). */
export function etapesStatut(statuts: Record<string, { libelle: string }>, chemin: string[], courant: string): Etape[] {
  const codes = chemin.includes(courant) ? chemin : [...chemin, courant];
  return codes.map((code) => ({ code, libelle: statuts[code]?.libelle ?? code }));
}
