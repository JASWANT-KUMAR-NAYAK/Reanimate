import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Reanimate — revive inactive open-source repositories",
  description:
    "Analyze a public GitHub repository, see why it may have gone quiet, and get an evidence-backed revival roadmap.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
