import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ApparelFlow ERP — Garment Manufacturing System",
  description: "Enterprise Apparel & Cut-Piece Quality Management System",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 font-sans">
        {children}
      </body>
    </html>
  );
}
