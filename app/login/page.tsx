import { redirect } from "next/navigation";
import { AuthForm } from "@/app/login/auth-form";
import { getCurrentUser } from "@/lib/auth";
import { AuthBrandPanel } from "@/app/login/auth-brand-panel";

export default async function LoginPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/");
  }

  return (
    <main className="auth-shell">
      <section className="auth-form-side" aria-labelledby="login-title">
        <div className="auth-panel">
          <div className="brand-lockup" aria-label="Trading Journal">
            <span className="brand-mark">TJ</span>
            <span>Trading Journal</span>
          </div>
          <div className="auth-heading">
            <p className="eyebrow">Welcome back</p>
            <h1 id="login-title">Log in to your trading journal</h1>
            <p>
              Keep your setups and trade history in one lightweight workspace.
            </p>
          </div>
          <AuthForm mode="login" />
        </div>
      </section>
      <AuthBrandPanel />
    </main>
  );
}
