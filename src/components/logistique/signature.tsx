"use client";

import { useEffect, useRef, useState } from "react";

/** Zone de signature au doigt (pointeur). Renvoie l'image PNG via `obtenir` ; vide → null. */
export function ZoneSignature({ onChange }: { onChange: (signee: boolean) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const dessine = useRef(false);
  const [signee, setSignee] = useState(false);

  useEffect(() => {
    const c = canvas.current!;
    // Résolution réelle = taille affichée × densité de l'écran (trait net sur téléphone).
    const ratio = window.devicePixelRatio || 1;
    c.width = c.clientWidth * ratio;
    c.height = c.clientHeight * ratio;
    const ctx = c.getContext("2d")!;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#111827";
  }, []);

  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const debut = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dessine.current = true;
    const ctx = e.currentTarget.getContext("2d")!;
    const p = point(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  };
  const trait = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dessine.current) return;
    const ctx = e.currentTarget.getContext("2d")!;
    const p = point(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    if (!signee) {
      setSignee(true);
      onChange(true);
    }
  };
  const effacer = () => {
    const c = canvas.current!;
    c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
    setSignee(false);
    onChange(false);
  };

  return (
    <div>
      <canvas
        ref={canvas}
        id="zone-signature"
        aria-label="Signature du client"
        className="h-40 w-full touch-none rounded border-2 border-dashed border-gray-400 bg-white"
        onPointerDown={debut}
        onPointerMove={trait}
        onPointerUp={() => (dessine.current = false)}
        onPointerLeave={() => (dessine.current = false)}
      />
      <button type="button" onClick={effacer} className="mt-1 min-h-11 font-semibold text-papel-700 underline">
        Effacer la signature
      </button>
    </div>
  );
}

/** Image PNG de la signature affichée dans la zone. */
export function imageSignature(): Promise<Blob | null> {
  const c = document.getElementById("zone-signature") as HTMLCanvasElement | null;
  return new Promise((r) => (c ? c.toBlob((b) => r(b), "image/png") : r(null)));
}
