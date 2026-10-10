/**
 * Composants d'interface de base, au style d'Odoo : sobres et denses sur ordinateur,
 * zones tactiles confortables (≥ 44 px) sur téléphone.
 */
import Link from "next/link";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";

export function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

type VarianteBouton = "principal" | "secondaire" | "danger" | "discret";

const STYLES_BOUTON: Record<VarianteBouton, string> = {
  principal: "bg-papel-700 text-white hover:bg-papel-800 disabled:bg-papel-300",
  secondaire: "bg-[#e7e9ed] text-gray-900 hover:bg-[#d8dadd]",
  danger: "bg-red-700 text-white hover:bg-red-800",
  discret: "text-papel-700 hover:bg-papel-50",
};

/** Classes d'un bouton : aussi utilisables sur un lien (`<Link className={classesBouton()}>`). */
export function classesBouton(variante: VarianteBouton = "principal", className?: string) {
  return cx(
    "inline-flex min-h-11 items-center justify-center gap-1.5 rounded px-3.5 py-1.5 text-[0.95rem] font-medium transition disabled:cursor-not-allowed md:min-h-9",
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

/** Bloc blanc (« feuille » Odoo) avec titre facultatif. */
export function Carte({ titre, action, children, className }: { titre?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cx("min-w-0 rounded-md border border-gray-200 bg-white p-4", className)}>
      {(titre || action) && (
        <header className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-2">
          {titre && <h2 className="text-[1.05rem] font-semibold text-gray-900">{titre}</h2>}
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

const CLASSES_SAISIE = "min-h-11 w-full min-w-0 rounded border bg-white px-2.5 py-1.5 text-base md:min-h-9 md:text-[0.95rem]";

export function Champ({
  libelle,
  erreur,
  aide,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { libelle: string; erreur?: string; aide?: string }) {
  const id = props.id ?? props.name;
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
    <div role={ton === "erreur" ? "alert" : "status"} className={cx("rounded border px-3 py-2", STYLES_MESSAGE[ton])}>
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

/** Vue liste : en-têtes collants, lignes compactes avec survol ; défile horizontalement sur téléphone. */
export function Tableau({ entetes, children }: { entetes: ReactNode[]; children: ReactNode }) {
  return (
    <div className="-mx-4 overflow-x-auto">
      <table className="w-full min-w-max border-collapse text-left text-[0.95rem]">
        <thead>
          <tr className="border-y border-gray-200 bg-gray-50 text-gray-800">
            {entetes.map((e, i) => (
              <th key={i} scope="col" className="whitespace-nowrap px-3 py-2 font-semibold first:pl-4 last:pr-4">
                {e}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 [&>tr:hover]:bg-[#f2f7f6]">{children}</tbody>
      </table>
    </div>
  );
}

export function Cellule({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={cx("px-3 py-2 align-top first:pl-4 last:pr-4", className)}>{children}</td>;
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
    <div className="-mx-3 -mt-3 mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-gray-200 bg-white px-3 py-2.5 md:-mx-5 md:px-5 print:hidden">
      <div className="min-w-0">
        <h1 className="flex flex-wrap items-baseline gap-x-1.5 text-[1.2rem] leading-snug">
          {fil?.map((f) => (
            <span key={f.libelle} className="flex items-baseline gap-1.5">
              {f.href ? (
                <Link href={f.href} className="text-papel-700 hover:underline">
                  {f.libelle}
                </Link>
              ) : (
                <span className="text-gray-600">{f.libelle}</span>
              )}
              <span className="text-gray-400">/</span>
            </span>
          ))}
          <span className="font-semibold text-gray-900">{titre}</span>
        </h1>
        {sousTitre && <p className="text-sm text-gray-600">{sousTitre}</p>}
      </div>
      {action && <div className="flex flex-wrap items-center gap-2">{action}</div>}
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
