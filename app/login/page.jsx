"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "./login.module.css";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Błąd logowania");
      return;
    }

    const from = params.get("from") || "/";
    router.push(from);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <input
        type="password"
        className={styles.input}
        placeholder="Hasło"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoFocus
        required
      />
      {error && <p className={styles.error}>{error}</p>}
      <button type="submit" className={styles.btn} disabled={loading}>
        {loading ? "Logowanie…" : "Zaloguj się"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}>
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7z" />
          </svg>
        </div>
        <h1 className={styles.title}>Inspirio</h1>
        <p className={styles.subtitle}>Panel zatwierdzania</p>
        <Suspense fallback={<div className={styles.form} />}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
