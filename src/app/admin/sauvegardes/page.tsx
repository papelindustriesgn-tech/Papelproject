import { Download, ShieldCheck } from "lucide-react";
import { PageTitle } from "@/components/ui/section-header";
import { requireAdmin } from "@/lib/auth";
import { BACKUP_KEEP, listBackups } from "@/lib/backup";
import { formatDate } from "@/lib/format";
import { BackupButton } from "./backup-button";

export const metadata = { title: "Sauvegardes" };
export const dynamic = "force-dynamic";

function label(name: string) {
  const m = name.match(/^uny-(\d{4})-(\d{2})-(\d{2})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]} à ${m[4]}h${m[5]} (UTC)` : name;
}

export default async function BackupsAdmin() {
  await requireAdmin();
  const files = await listBackups();
  const latest = files[0];

  return (
    <div className="space-y-5">
      <PageTitle
        title="Sauvegardes"
        subtitle={`Une sauvegarde complète de la base est faite chaque nuit. Les ${BACKUP_KEEP} dernières sont conservées.`}
      />

      <section className="rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]">
        <div className="flex items-start gap-3">
          <ShieldCheck className="text-mint-600 size-6 shrink-0" aria-hidden />
          <div className="min-w-0 flex-1 space-y-1 text-sm">
            <p className="font-bold">
              {latest ? `Dernière sauvegarde : ${label(latest.name)}` : "Aucune sauvegarde pour le moment"}
            </p>
            <p className="text-muted">
              Contenu : comptes, profils, cartes, offres, codes promo, notifications, questionnaires… (les photos restent dans le
              stockage Supabase).
            </p>
            <p className="text-muted">
              <strong className="text-ink">Conseil :</strong> une fois par semaine, télécharge la dernière sauvegarde et garde-la
              sur ton ordinateur ou ton Google Drive. C&apos;est ta copie indépendante de Supabase. Ce fichier contient des
              données personnelles : ne le partage pas.
            </p>
          </div>
        </div>
        <div className="mt-4">
          <BackupButton />
        </div>
      </section>

      <section className="rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]">
        <h2 className="mb-3 font-bold">Sauvegardes disponibles ({files.length})</h2>
        {files.length === 0 ? (
          <p className="text-muted text-sm">La première sauvegarde automatique sera faite cette nuit.</p>
        ) : (
          <ul className="divide-line divide-y">
            {files.map((f) => (
              <li key={f.name} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <div className="min-w-0">
                  <p className="font-semibold">{label(f.name)}</p>
                  <p className="text-muted text-xs">
                    {Math.max(1, Math.round(f.size / 1024))} Ko{f.createdAt ? ` · ${formatDate(f.createdAt)}` : ""}
                  </p>
                </div>
                <a
                  href={`/admin/sauvegardes/telecharger?f=${encodeURIComponent(f.name)}`}
                  className="text-brand-600 hover:bg-brand-50 flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 font-semibold"
                >
                  <Download className="size-4" aria-hidden /> Télécharger
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
