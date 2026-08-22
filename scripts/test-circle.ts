#!/usr/bin/env tsx
/**
 * Run: CIRCLE_API_KEY=your_key tsx scripts/test-circle.ts
 * Tests Circle Sandbox API connectivity without printing the key.
 */
const key = process.env.CIRCLE_API_KEY?.trim();
if (!key) {
  console.error("FAIL: CIRCLE_API_KEY not set");
  process.exit(1);
}

async function main() {
  const res = await fetch("https://api-sandbox.circle.com/v1/businessAccount/balances", {
    headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
  });
  const body = await res.text();
  if (res.ok) {
    console.log("OK: Circle Sandbox API authenticated");
    console.log("Status:", res.status);
    try {
      const json = JSON.parse(body);
      console.log("Balances:", JSON.stringify(json.data?.available ?? json, null, 2).slice(0, 500));
    } catch {
      console.log("Response preview:", body.slice(0, 200));
    }
    process.exit(0);
  }
  console.error("FAIL: Circle API returned", res.status);
  console.error(body.slice(0, 300));
  process.exit(1);
}

main();
