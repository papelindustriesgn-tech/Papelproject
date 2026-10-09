/**
 * Composants d'interface de base : simples, gros boutons, contrastes forts,
 * pensés pour des utilisateurs peu habitués à l'informatique et des écrans de téléphone.
 */
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";

function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

type VarianteBouton = "principal" | "secondaire" | "danger" | "discret";

const STYLES_BOUTON: Record<VarianteBouton, string> = {
  principal: "bg-papel-700 text-white hover:bg-papel-800 disabled:bg-papel-300",
  secondaire: "bg-white text-papel-800 border border-papel-300 hover:bg-papel-50",
  danger: "bg-red-700 text-white hover:bg-red-800",
  discret: "text-papel-700 hover:bg-papel-50",
};

export function Bouton({
  variante = "principal",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: VarianteBouton }) {
  return (
    <button
      className={cx(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2 font-semibold transition disabled:cursor-not-allowed",
        STYLES_BOUTON[variante],
        className,
      )}
      {...props}
    />
  );
}

export function Carte({ titre, action, children, className }: { titre?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cx("min-w-0 rounded-xl border border-gray-200 bg-white p-4 shadow-sm", className)}>
      {(titre || action) && (
        <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
          {titre && <h2 className="text-lg font-bold text-papel-900">{titre}</h2>}
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

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
      <label htmlFor={id} className="font-medium text-gray-800">
        {libelle}
        {props.required && <span className="text-red-700"> *</span>}
      </label>
      <input
        id={id}
        aria-invalid={erreur ? true : undefined}
        aria-describedby={erreur ? `${id}-erreur` : undefined}
        className={cx(
          "min-h-11 w-full min-w-0 rounded-lg border bg-white px-3 py-2 text-base",
          erreur ? "border-red-600" : "border-gray-300 focus:border-papel-500",
        )}
        {...props}
      />
      {aide && !erreur && <p className="text-sm text-gray-600">{aide}</p>}
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
      <label htmlFor={id} className="font-medium text-gray-800">
        {libelle}
      </label>
      <select
        // Liste non contrôlée : React ne réapplique pas `defaultValue` après le rechargement du formulaire
        // (erreur de validation) ; la clé la recrée avec la valeur saisie.
        key={props.value === undefined ? String(props.defaultValue ?? "") : undefined}
        id={id}
        aria-invalid={erreur ? true : undefined}
        className={cx("min-h-11 w-full min-w-0 rounded-lg border bg-white px-3 py-2 text-base", erreur ? "border-red-600" : "border-gray-300")}
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
  succes: "border-green-300 bg-green-50 text-green-900",
  erreur: "border-red-300 bg-red-50 text-red-900",
  info: "border-papel-200 bg-papel-50 text-papel-900",
  alerte: "border-amber-300 bg-amber-50 text-amber-900",
};

export function Message({ ton = "info", children }: { ton?: TonMessage; children: ReactNode }) {
  return (
    <div role={ton === "erreur" ? "alert" : "status"} className={cx("rounded-lg border px-3 py-2", STYLES_MESSAGE[ton])}>
      {children}
    </div>
  );
}

export function Badge({ children, ton = "info" }: { children: ReactNode; ton?: TonMessage | "neutre" }) {
  const styles = ton === "neutre" ? "bg-gray-100 text-gray-800" : STYLES_MESSAGE[ton];
  return <span className={cx("inline-block rounded-full border px-2 py-0.5 text-sm font-medium", styles)}>{children}</span>;
}

/** Tableau défilant horizontalement sur mobile. */
export function Tableau({ entetes, children }: { entetes: ReactNode[]; children: ReactNode }) {
  return (
    <div className="-mx-4 overflow-x-auto px-4">
      <table className="w-full min-w-max border-collapse text-left">
        <thead>
          <tr className="border-b-2 border-papel-200 text-sm text-gray-700">
            {entetes.map((e, i) => (
              <th key={i} scope="col" className="px-2 py-2 font-semibold">
                {e}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">{children}</tbody>
      </table>
    </div>
  );
}

export function Cellule({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={cx("px-2 py-2 align-top", className)}>{children}</td>;
}

export function TitrePage({ titre, sousTitre, action }: { titre: string; sousTitre?: string; action?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
      <div>
        <h1 className="text-2xl font-bold text-papel-900">{titre}</h1>
        {sousTitre && <p className="text-gray-600">{sousTitre}</p>}
      </div>
      {action}
    </div>
  );
}
