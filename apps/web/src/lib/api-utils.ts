import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import type { Merchant } from "@blitzpay/shared";

export function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

export function json<T>(data: T, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Access-Control-Allow-Origin": "*" },
  });
}

export function error(message: string, status = 400) {
  return json({ success: false, error: message }, status);
}

export function ok<T>(data: T) {
  return json({ success: true, data });
}

export function rowToMerchant(row: {
  id: string;
  email: string;
  businessName: string;
  businessType: string;
  taxId: string;
  walletAddress: string;
  kybStatus: string;
  circleAccountId: string | null;
  createdAt: Date;
}): Merchant {
  return {
    id: row.id,
    email: row.email,
    businessName: row.businessName,
    businessType: row.businessType,
    taxId: row.taxId,
    walletAddress: row.walletAddress,
    kybStatus: row.kybStatus as Merchant["kybStatus"],
    circleAccountId: row.circleAccountId ?? undefined,
    createdAt: row.createdAt.toISOString(),
  };
}
