import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BlitzPay Merchant Portal",
  description: "Register your business, complete KYB, and settle to your bank",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
