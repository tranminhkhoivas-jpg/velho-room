import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Velho Room",
  description: "Hackathon prototype: acquisition tools for Velho.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="banner">Hackathon prototype — not published by Velho. Every message here is a draft; nothing is sent.</div>
        {children}
      </body>
    </html>
  );
}
