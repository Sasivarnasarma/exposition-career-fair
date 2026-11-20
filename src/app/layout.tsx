import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Exposition Career Fair",
  description:
    "Exposition Career Fair — connecting university talent with the professional world.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
