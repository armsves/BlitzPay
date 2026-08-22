import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "BlitzPay API",
  description: "Serverless API for BlitzPay on Vercel",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
