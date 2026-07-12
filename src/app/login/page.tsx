"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const params = useSearchParams();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setLoading(false);
    if (res.ok) {
      const next = params.get("next") || "/dashboard";
      router.push(next);
      router.refresh();
    } else {
      setError("Incorrect password");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card p-8 w-full max-w-sm space-y-4">
      <div className="flex flex-col items-center text-center">
        <Image
          src="/logo.png"
          alt="National Glass House Logo"
          width={180}
          height={54}
          className="object-contain mb-3"
          unoptimized
        />
        <h1 className="text-xl font-semibold">National Glass House</h1>
        <p className="text-sm text-gray-500">Sign in to manage invoices</p>
      </div>
      <div>
        <label className="label">Password</label>
        <input
          type="password"
          className="input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
          required
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
