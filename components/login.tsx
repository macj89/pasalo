"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, LockKey } from "@phosphor-icons/react";

export function Login() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (response.ok) window.location.reload();
    else {
      setError("La contraseña no es correcta.");
      setLoading(false);
    }
  }

  return (
    <form className="login" onSubmit={submit}>
      <LockKey size={30} weight="regular" aria-hidden="true" />
      <div>
        <h2>Hola, entra para subir</h2>
        <p>La descarga no necesita contraseña.</p>
      </div>
      <label htmlFor="password">Contraseña</label>
      <input
        id="password"
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        autoComplete="current-password"
        required
        aria-describedby={error ? "login-error" : undefined}
      />
      {error && <p className="error" id="login-error" role="alert">{error}</p>}
      <button className="primary-button" disabled={loading}>
        {loading ? "Entrando…" : "Entrar"}
        {!loading && <ArrowRight size={20} weight="bold" aria-hidden="true" />}
      </button>
    </form>
  );
}
