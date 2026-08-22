import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BlitzPay Wallet",
  description: "Pay instantly with USDC on Monad — powered by Mera passkeys",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
