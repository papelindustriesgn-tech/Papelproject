import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, after, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendEmail, welcomeEmail } from "@/lib/email";
import { safeNext } from "@/lib/url";

/** Point d'arrivée des liens envoyés par email (confirmation, réinitialisation, changement d'email). */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));
  const supabase = await createClient();

  let ok = false;
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    ok = !error;
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
  }

  if (!ok) return NextResponse.redirect(new URL("/connexion?erreur=lien", request.url));

  if (type === "email" || type === "signup") {
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (user?.email) {
      const first = (user.user_metadata?.first_name as string | undefined) ?? "";
      after(() => sendEmail({ to: user.email!, ...welcomeEmail(first) }));
    }
    return NextResponse.redirect(new URL(`${next}${next.includes("?") ? "&" : "?"}bienvenue=1`, request.url));
  }

  return NextResponse.redirect(new URL(next, request.url));
}
