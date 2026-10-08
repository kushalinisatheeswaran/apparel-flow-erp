"use client";

import { signOut } from "next-auth/react";

interface SwitchRoleButtonProps {
  className?: string;
}

export function SwitchRoleButton({ className }: SwitchRoleButtonProps) {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/login" })}
      className={
        className ??
        "px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
      }
    >
      Switch Role / Sign Out
    </button>
  );
}
