import type { Metadata } from "next";
import "./globals.css";
import WalletConnect from "../components/WalletConnect";

export const metadata: Metadata = {
  title: "NextMed | Midnight ZK Health",
  description:
    "Validity without visibility using Midnight zero-knowledge proofs.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <header className="topbar">
          <div>
            <p className="eyebrow">Midnight Rational Privacy MVP</p>
            <h1>NextMed Vaccination Attestation</h1>
          </div>
          <WalletConnect />
        </header>
        <nav className="navlinks">
          <a href="/">Home</a>
          <a href="/issue">Issue</a>
          <a href="/passport">Passport</a>
          <a href="/verify">Verify</a>
        </nav>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
