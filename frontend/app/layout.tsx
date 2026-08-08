import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PatchPilot AI — Risk-Based Patch Prioritization",
  description:
    "AI-powered vulnerability patch prioritization system for lean IT and security teams. Real-world exploit intelligence beyond CVSS.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#090d16] text-slate-100 antialiased selection:bg-cyan-500 selection:text-white">
        <div className="relative min-h-screen flex flex-col overflow-hidden">
          {/* Background Ambient Glow Gradients */}
          <div className="pointer-events-none absolute top-0 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-600/10 rounded-full blur-[140px]" />
          <div className="pointer-events-none absolute top-1/3 right-0 translate-x-1/3 w-[500px] h-[500px] bg-red-600/10 rounded-full blur-[160px]" />
          <div className="pointer-events-none absolute bottom-0 left-1/3 -translate-x-1/2 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[150px]" />

          {children}
        </div>
      </body>
    </html>
  );
}
