import { redirect } from "next/navigation";
import { AuthForm } from "@/app/login/auth-form";
import { getCurrentUser } from "@/lib/auth";

export default async function LoginPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/");
  }

  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <p className="eyebrow">Trading Journal</p>
        <h1>Access your journal</h1>
        <AuthForm />
      </section>
    </main>
  );
}
