import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BlitzPay POS",
  description: "Point of Sale — manage products and create invoices",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
