"use client";

import type { ComponentProps } from "react";
import { track, type TrackedEvent } from "@/lib/track";

export function ContactLink({ kind, onClick, ...props }: ComponentProps<"a"> & { kind: TrackedEvent }) {
  return (
    <a
      {...props}
      onClick={(e) => {
        track(kind);
        onClick?.(e);
      }}
    />
  );
}
