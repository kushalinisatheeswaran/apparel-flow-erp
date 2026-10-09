"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserRole, ROLE_LABELS } from "@/lib/roles";
import { SwitchRoleButton } from "@/components/SwitchRoleButton";

export interface SidebarNavProps {
  user: {
    fullName: string;
    email: string;
    role: UserRole;
  };
}

export function SidebarNav({ user }: SidebarNavProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Navigation tabs allowed specifically for this user's authorized role
  const navItems = [
    {
      name: ROLE_LABELS[user.role],
      href: user.role === "cutting_supervisor" ? "/supervisor" : user.role === "cutting_verifier" ? "/verifier" : "/sewing",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
    },
  ];

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Top Header Bar */}
      <div className="md:hidden bg-slate-900 text-white px-4 py-3 flex items-center justify-between border-b border-slate-800 shrink-0 sticky top-0 z-30">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow-xs">
            AF
          </div>
          <div>
            <span className="font-bold text-sm text-white tracking-wide">ApparelFlow</span>
            <span className="text-[10px] text-slate-400 block font-mono">ERP v1.0</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition-colors focus:outline-none"
          aria-label="Toggle Navigation Menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={mobileOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
          </svg>
        </button>
      </div>

      {/* Sidebar Navigation Drawer */}
      <aside
        className={`fixed md:sticky top-0 inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 h-screen transition-transform duration-200 ease-in-out shrink-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-base shadow-sm">
              AF
            </div>
            <div>
              <h1 className="text-base font-bold text-white tracking-tight leading-none">
                ApparelFlow ERP
              </h1>
              <p className="text-[11px] text-slate-400 font-medium mt-1">
                Garment Operations
              </p>
            </div>
          </div>
        </div>

        {/* Active Role Badge Indicator */}
        <div className="px-5 py-3 bg-slate-800/50 border-b border-slate-800/80">
          <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">
            Current Active Workspace
          </p>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            {ROLE_LABELS[user.role]}
          </div>
        </div>

        {/* Navigation Section */}
        <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
            Navigation Menu
          </p>
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  isActive
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                }`}
              >
                {item.icon}
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>

        {/* User Profile Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40 space-y-3">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-200">
              {user.fullName ? user.fullName.charAt(0).toUpperCase() : "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate">{user.fullName}</p>
              <p className="text-[11px] text-slate-400 truncate font-mono">{user.email}</p>
            </div>
          </div>

          <SwitchRoleButton className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-lg border border-slate-700 transition-colors flex items-center justify-center gap-2" />
        </div>
      </aside>
    </>
  );
}
