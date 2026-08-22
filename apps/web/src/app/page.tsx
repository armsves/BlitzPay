import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "BlitzPay API",
};

export default function Page() {
  return (
    <main style={{ fontFamily: "system-ui", padding: 40, maxWidth: 640 }}>
      <h1 style={{ fontSize: 28 }}>BlitzPay API</h1>
      <p style={{ color: "#666", marginTop: 8 }}>
        Serverless Next.js API on Vercel — instant settlement on Monad
      </p>
      <p style={{ marginTop: 24 }}>
        <a href="/api/health">GET /api/health</a>
      </p>
    </main>
  );
}
