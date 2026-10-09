"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

const DEMO_ACCOUNTS = [
  {
    roleName: "Cutting Supervisor",
    email: "supervisor@apparelflow.demo",
    roleKey: "cutting_supervisor",
    description: "Create draft orders & manage cutting floor batch submissions",
  },
  {
    roleName: "Cutting Verifier",
    email: "verifier@apparelflow.demo",
    roleKey: "cutting_verifier",
    description: "Count cut pieces, verify component quantities & issue approvals/rejections",
  },
  {
    roleName: "Sewing Supervisor",
    email: "sewing@apparelflow.demo",
    roleKey: "sewing_supervisor",
    description: "Access verified batch queue & initiate garment assembly operations",
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
    <main className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      {/* Subtle Manufacturing Weave Fabric Grid Background Pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage: `radial-gradient(#cbd5e1 1px, transparent 1px), radial-gradient(#cbd5e1 1px, #f8fafc 1px)`,
          backgroundSize: "24px 24px",
          backgroundPosition: "0 0, 12px 12px",
        }}
      />

      <div className="w-full max-w-xl space-y-6 relative z-10">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-bold border border-blue-200 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
            <span>Garment Manufacturing ERP System</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            ApparelFlow ERP
          </h1>
          <p className="text-sm text-slate-600 font-medium max-w-md mx-auto">
            Authorized Role-Based Workspace Portal
          </p>
        </div>

        {/* Form & Demo Credentials Grid */}
        <div className="grid grid-cols-1 gap-6">
          {/* Main Sign-In Card */}
          <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200 space-y-6">
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              {error && (
                <div
                  role="alert"
                  aria-live="polite"
                  className="p-3.5 text-xs rounded-lg border font-semibold flex items-center gap-2 bg-rose-50 border-rose-200 text-rose-800"
                >
                  <svg className="w-4 h-4 text-rose-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label
                  htmlFor="email"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
                >
                  Work Email Address
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
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-shadow"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
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
                  placeholder="••••••••••••"
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-shadow"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 font-bold text-sm text-white rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 disabled:opacity-50 shadow-xs flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>Signing In...</span>
                  </>
                ) : (
                  <span>Sign In to Dashboard</span>
                )}
              </button>
            </form>
          </div>

          {/* Quick Select Demo Accounts Panel */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Demo Accounts Quick Select
              </h2>
              <span className="text-[11px] px-2 py-0.5 rounded font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                Select to Pre-fill
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => handleSelectDemoAccount(acc.email)}
                  className="text-left p-3.5 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all flex flex-col justify-between space-y-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white group"
                >
                  <div>
                    <div className="text-xs font-bold text-slate-900 group-hover:text-blue-700">
                      {acc.roleName}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono mt-0.5 truncate">
                      {acc.email}
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-blue-600 group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                    Select Credentials →
                  </span>
                </button>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-100 text-xs text-slate-600 flex items-center justify-between">
              <span className="font-medium">Configured Demo Password:</span>
              {demoPassword ? (
                <code className="px-2 py-0.5 rounded font-mono bg-slate-100 text-slate-900 border border-slate-200 text-xs font-bold">
                  {demoPassword}
                </code>
              ) : (
                <span className="text-amber-700 font-semibold text-[11px]">
                  NEXT_PUBLIC_DEMO_PASSWORD not set in env
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
