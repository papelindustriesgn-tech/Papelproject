import { NextResponse } from "next/server";
import { z } from "zod";
import { hasServiceRole } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/service";

const schema = z.object({
  type: z.enum(["whatsapp_click", "cta_click", "phone_click", "email_click"]),
  label: z.string().max(80).optional(),
  path: z.string().max(200).optional(),
});

/** Compte un clic de conversion (anonyme). Répond toujours 204 pour ne rien révéler. */
export async function POST(request: Request) {
  try {
    const body = schema.safeParse(JSON.parse(await request.text()));
    if (body.success && hasServiceRole()) {
      await createServiceClient()
        .from("conversion_events")
        .insert({
          event_type: body.data.type,
          label: body.data.label ?? null,
          path: body.data.path ?? null,
        });
    }
  } catch {
    // mesure facultative
  }
  return new NextResponse(null, { status: 204 });
}
