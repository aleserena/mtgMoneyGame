import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MTG Money Game",
  description: "A game where players take turns naming MTG cards to reach exactly $0",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-slate-900 text-slate-100 font-sans">
        {children}
      </body>
    </html>
  );
}
