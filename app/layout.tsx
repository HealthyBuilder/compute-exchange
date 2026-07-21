import type { Metadata } from "next";
import "./globals.css";
import "./revenue.css";

export const metadata: Metadata = {
  title: "Compute Exchange",
  description: "Buy, trade, hedge compute in one hub.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
  openGraph: {
    title: "Compute Exchange",
    description: "Buy, trade, hedge compute in one hub.",
    images: [{ url: "/og.png", width: 1672, height: 941, alt: "Compute Future buyer trading workspace" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Compute Exchange",
    description: "Buy, trade, hedge compute in one hub.",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
