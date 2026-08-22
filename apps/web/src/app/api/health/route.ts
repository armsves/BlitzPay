import { ok } from "@/lib/api-utils";

export async function GET() {
  return ok({ status: "ok", service: "blitzpay-api", runtime: "vercel-serverless" });
}
