import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { MotionProvider } from "@/components/providers/motion-provider";
import { QaWebVitals } from "@/components/providers/qa-web-vitals";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Exposition Career Fair",
    template: "%s | Exposition Career Fair",
  },
  description:
    "Exposition Career Fair — connecting university talent with the professional world.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`dark ${inter.variable}`}
    >
      <body className="min-h-screen antialiased">
        <a
          href="#main-content"
          className="sr-only fixed top-3 left-3 z-50 rounded-lg bg-primary px-5 py-3 text-primary-foreground focus:not-sr-only"
        >
          Skip to content
        </a>
        <MotionProvider>{children}</MotionProvider>
        {process.env.NODE_ENV === "development" &&
          process.env.EXPOSITION_QA === "true" && <QaWebVitals />}
      </body>
    </html>
  );
}
