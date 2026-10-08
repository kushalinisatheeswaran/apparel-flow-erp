"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

const DEMO_ACCOUNTS = [
  {
    roleName: "Cutting Supervisor",
    email: "supervisor@apparelflow.demo",
    roleKey: "cutting_supervisor",
  },
  {
    roleName: "Cutting Verifier",
    email: "verifier@apparelflow.demo",
    roleKey: "cutting_verifier",
  },
  {
    roleName: "Sewing Supervisor",
    email: "sewing@apparelflow.demo",
    roleKey: "sewing_supervisor",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const demoPassword = process.env.NEXT_PUBLIC_DEMO_PASSWORD;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSelectDemoAccount = (demoEmail: string) => {
    setEmail(demoEmail);
    if (demoPassword) {
      setPassword(demoPassword);
    }
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) {
      setError("Please fill in both email and password.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await signIn("credentials", {
        email: normalizedEmail,
        password,
        redirect: false,
      });

      if (res?.error) {
        setError("Invalid email or password.");
        setIsLoading(false);
      } else {
        router.push("/");
        router.refresh();
      }
    } catch {
      setError("An unexpected error occurred during sign in.");
      setIsLoading(false);
    }
  };

  return (
    <main
      className="min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8"
      style={{ backgroundColor: "#F8FAFC", color: "#0F172A" }}
    >
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight" style={{ color: "#0F172A" }}>
            ApparelFlow ERP
          </h1>
          <p className="text-sm font-medium" style={{ color: "#475569" }}>
            Sign in to access your role dashboard
          </p>
        </div>

        {/* Login Card */}
        <div
          className="p-6 sm:p-8 rounded-xl shadow-sm border"
          style={{ backgroundColor: "#FFFFFF", borderColor: "#CBD5E1" }}
        >
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {error && (
              <div
                role="alert"
                aria-live="polite"
                className="p-3 text-sm rounded-md border font-medium"
                style={{
                  color: "#B91C1C",
                  backgroundColor: "#FEF2F2",
                  borderColor: "#FCA5A5",
                }}
              >
                {error}
              </div>
            )}

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-semibold mb-1"
                style={{ color: "#0F172A" }}
              >
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@apparelflow.demo"
                className="w-full px-3 py-2 text-sm rounded-md border focus:outline-none focus:ring-2 focus:ring-blue-600"
                style={{
                  backgroundColor: "#FFFFFF",
                  color: "#0F172A",
                  borderColor: "#CBD5E1",
                }}
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-semibold mb-1"
                style={{ color: "#0F172A" }}
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 text-sm rounded-md border focus:outline-none focus:ring-2 focus:ring-blue-600"
                style={{
                  backgroundColor: "#FFFFFF",
                  color: "#0F172A",
                  borderColor: "#CBD5E1",
                }}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 font-semibold text-white rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 disabled:opacity-50"
              style={{
                backgroundColor: isLoading ? "#1D4ED8" : "#2563EB",
              }}
            >
              {isLoading ? "Signing In..." : "Sign In"}
            </button>
          </form>
        </div>

        {/* Demo Credential Panel */}
        <div
          className="p-5 rounded-xl border space-y-4"
          style={{ backgroundColor: "#FFFFFF", borderColor: "#CBD5E1" }}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: "#0F172A" }}>
              Demo Accounts Panel
            </h2>
            <span className="text-xs px-2 py-0.5 rounded font-medium bg-blue-50 text-blue-700 border border-blue-200">
              Quick Select
            </span>
          </div>

          <div className="space-y-2">
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                key={acc.email}
                type="button"
                onClick={() => handleSelectDemoAccount(acc.email)}
                className="w-full text-left p-3 rounded-lg border transition-colors flex items-center justify-between hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ borderColor: "#CBD5E1", backgroundColor: "#FFFFFF" }}
              >
                <div>
                  <div className="text-sm font-semibold" style={{ color: "#0F172A" }}>
                    {acc.roleName}
                  </div>
                  <div className="text-xs" style={{ color: "#475569" }}>
                    {acc.email}
                  </div>
                </div>
                <span className="text-xs font-medium text-blue-600">Select →</span>
              </button>
            ))}
          </div>

          <div className="pt-2 border-t text-xs space-y-1" style={{ borderColor: "#CBD5E1", color: "#475569" }}>
            <div>
              <span className="font-semibold text-slate-900">Demo Password: </span>
              {demoPassword ? (
                <code className="px-1.5 py-0.5 rounded font-mono bg-slate-100 text-slate-800 border border-slate-200">
                  {demoPassword}
                </code>
              ) : (
                <span className="text-amber-700 font-medium">
                  NEXT_PUBLIC_DEMO_PASSWORD variable is not configured. Please enter the demo password manually.
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
