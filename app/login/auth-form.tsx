"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type AuthMode = "login" | "signup";

type AuthFormProps = {
  mode: AuthMode;
};

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const isSignup = mode === "signup";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);

    const formData = new FormData(event.currentTarget);
    const payload = {
      name: String(formData.get("name") ?? ""),
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
    };
    const response = await fetch(
      mode === "signup" ? "/api/auth/register" : "/api/auth/login",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      },
    );

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.error ?? "Unable to continue.");
      setPending(false);
      return;
    }

    router.replace("/");
    router.refresh();
  }

  return (
    <form className="auth-form" onSubmit={submit}>
      {isSignup ? (
        <label>
          Name
          <input autoComplete="name" name="name" placeholder="Alex Morgan" required />
        </label>
      ) : null}

      <label>
        Email
        <input
          autoComplete="email"
          name="email"
          placeholder="you@example.com"
          required
          type="email"
        />
      </label>

      <label>
        Password
        <input
          autoComplete={isSignup ? "new-password" : "current-password"}
          minLength={8}
          name="password"
          placeholder="At least 8 characters"
          required
          type="password"
        />
      </label>

      {error ? <p className="form-error">{error}</p> : null}

      <button className="primary-button" disabled={pending} type="submit">
        {pending ? "Working" : isSignup ? "Create free account" : "Log in"}
      </button>

      <p className="auth-switch">
        {isSignup ? "Already have an account?" : "New to Trading Journal?"}{" "}
        <Link href={isSignup ? "/login" : "/signup"}>
          {isSignup ? "Log in" : "Create a free account"}
        </Link>
      </p>
    </form>
  );
}
