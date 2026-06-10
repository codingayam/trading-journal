import { redirect } from "next/navigation";
import { AuthBrandPanel } from "@/app/login/auth-brand-panel";
import { AuthForm } from "@/app/login/auth-form";
import { getCurrentUser } from "@/lib/auth";

export default async function SignupPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/");
  }

  return (
    <main className="auth-shell">
      <section className="auth-form-side" aria-labelledby="signup-title">
        <div className="auth-panel">
          <div className="brand-lockup" aria-label="Trading Journal">
            <span className="brand-mark">TJ</span>
            <span>Trading Journal</span>
          </div>
          <div className="auth-heading">
            <p className="eyebrow">Start free</p>
            <h1 id="signup-title">Create your trading journal</h1>
            <p>
              Lightweight trade tracking with privacy-friendly defaults and no
              social account requirement.
            </p>
          </div>
          <AuthForm mode="signup" />
        </div>
      </section>
      <AuthBrandPanel />
    </main>
  );
}
