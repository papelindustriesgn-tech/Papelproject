"use client";

import { useState, useTransition } from "react";
import { Avatar } from "@/components/ui/avatar";
import { formatGNF, timeAgo } from "@/lib/format";
import { giftLoyalty } from "./actions";

export type Customer = {
  card_id: string;
  first_name: string;
  last_initial: string;
  avatar_url: string | null;
  uny_id: string;
  total_visits: number;
  total_spent_gnf: number;
  stamps: number;
  rewards_available: number;
  rewards_used: number;
  last_visit_at: string | null;
};

function Row({ c, required, canGift }: { c: Customer; required: number | null; canGift: boolean }) {
  const [row, setRow] = useState(c);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const gift = (kind: "stamp" | "reward") =>
    start(async () => {
      const r = await giftLoyalty(row.card_id, kind);
      if (r.status) setRow((x) => ({ ...x, stamps: r.status!.stamps, rewards_available: r.status!.rewards_available }));
      setMessage(r.message ?? r.error ?? null);
    });
  return (
    <li className="py-3" data-testid="customer-row">
      <div className="flex items-center gap-3">
        <Avatar src={row.avatar_url} first={row.first_name} last={row.last_initial} size={40} />
        <div className="min-w-0 flex-1 text-sm">
          <p className="font-bold">
            {row.first_name} {row.last_initial}.
          </p>
          <p className="text-muted text-xs">
            {row.total_visits} passage{row.total_visits > 1 ? "s" : ""}
            {row.total_spent_gnf > 0 && ` · ${formatGNF(row.total_spent_gnf)}`}
            {row.last_visit_at && ` · ${timeAgo(row.last_visit_at)}`}
          </p>
          {required && (
            <p className="text-brand-700 text-xs font-semibold">
              {row.stamps}/{required} tampons
              {row.rewards_available > 0 && ` · 🎁 ${row.rewards_available} à utiliser`}
            </p>
          )}
        </div>
      </div>
      {canGift && (
        <div className="mt-2 flex flex-wrap gap-2 pl-[52px]">
          <button
            type="button"
            disabled={pending}
            onClick={() => gift("stamp")}
            className="ring-line hover:bg-canvas rounded-full px-3 py-1.5 text-xs font-bold ring-1 disabled:opacity-60"
          >
            ⭐ Offrir un tampon
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => gift("reward")}
            className="bg-brand-600 rounded-full px-3 py-1.5 text-xs font-bold text-white disabled:opacity-60"
          >
            🎁 Offrir la récompense
          </button>
        </div>
      )}
      {message && <p className="mt-1 pl-[52px] text-xs font-semibold">{message}</p>}
    </li>
  );
}

export function CustomerList({ customers, required }: { customers: Customer[]; required: number | null }) {
  return (
    <ul className="divide-line divide-y">
      {customers.map((c) => (
        <Row key={c.card_id} c={c} required={required} canGift={required != null} />
      ))}
    </ul>
  );
}
