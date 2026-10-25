import type { Metadata } from "next";
import "./globals.css";
import { StaffNav } from "@/components/StaffNav";

export const metadata: Metadata = {
  title: "Velho Room",
  description: "Hackathon prototype: acquisition tools for Velho.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="banner">Hackathon prototype — not published by Velho. Outreach messages are drafts; no outreach is sent.</div>
        <StaffNav />
        {children}
      </body>
    </html>
  );
}
