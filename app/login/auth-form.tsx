"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

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
      <div className="segmented" aria-label="Auth mode">
        <button
          aria-pressed={mode === "login"}
          onClick={() => {
            setMode("login");
            setError("");
          }}
          type="button"
        >
          Log in
        </button>
        <button
          aria-pressed={mode === "signup"}
          onClick={() => {
            setMode("signup");
            setError("");
          }}
          type="button"
        >
          Sign up
        </button>
      </div>

      {mode === "signup" ? (
        <label>
          Name
          <input autoComplete="name" name="name" required />
        </label>
      ) : null}

      <label>
        Email
        <input autoComplete="email" name="email" required type="email" />
      </label>

      <label>
        Password
        <input
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          minLength={8}
          name="password"
          required
          type="password"
        />
      </label>

      {error ? <p className="form-error">{error}</p> : null}

      <button className="primary-button" disabled={pending} type="submit">
        {pending ? "Working" : mode === "signup" ? "Create account" : "Log in"}
      </button>
    </form>
  );
}
