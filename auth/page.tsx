"use client";

import { useState } from "react";

export default function AuthPage() {
  const [passphrase, setPassphrase] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/dashboard/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passphrase }),
      });
      if (res.ok) {
        window.location.href = "/dashboard";
      } else {
        setError("incorrect");
        setLoading(false);
      }
    } catch {
      setError("error");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#1A1210" }}>
      <div className="w-full max-w-[220px] text-center">
        <svg width="28" height="28" viewBox="0 0 32 32" fill="none" className="inline-block mb-5" style={{ color: "#EF9870" }}>
          <rect x="1"  y="1"  width="13" height="13" rx="3" fill="currentColor" opacity="0.95"/>
          <rect x="18" y="1"  width="13" height="13" rx="3" fill="currentColor" opacity="0.55"/>
          <rect x="1"  y="18" width="13" height="13" rx="3" fill="currentColor" opacity="0.55"/>
          <rect x="18" y="18" width="13" height="13" rx="3" fill="currentColor" opacity="0.25"/>
        </svg>
        <form onSubmit={submit} className="space-y-4">
          <input
            type="password"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            autoFocus
            autoComplete="current-password"
            placeholder="passphrase"
            style={{
              background: "transparent",
              borderBottom: "1px solid rgba(174,100,85,0.3)",
              color: "#F4C9AC",
              caretColor: "#EF9870",
            }}
            className="w-full font-mono text-sm outline-none pb-2 text-center tracking-widest placeholder:text-[#AE645555]"
          />
          {error && (
            <p className="text-xs font-mono" style={{ color: "#EE352E" }}>{error}</p>
          )}
          <button
            type="submit"
            disabled={loading || !passphrase}
            className="w-full text-xs font-mono tracking-widest transition-colors disabled:opacity-30"
            style={{ color: loading ? "#EF9870" : "#AE6455" }}
          >
            {loading ? "·  ·  ·" : "enter →"}
          </button>
        </form>
      </div>
    </div>
  );
}
