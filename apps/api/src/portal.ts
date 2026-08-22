import type { Settlement } from "@blitzpay/shared";

/**
 * Portal HQ integration for KYB and bank settlement.
 * In production, set PORTAL_API_KEY and call the Portal REST API.
 *
 * Docs: https://docs.portalhq.io/integrations/On-Off-Ramp/noah-payouts
 */

const PORTAL_BASE = "https://api.portalhq.io";

export async function getPayoutChannels(cryptoCurrency = "USDC_TEST") {
  // GET /clients/me/integrations/noah/payouts/channels?cryptoCurrency=USDC_TEST
  return {
    endpoint: `${PORTAL_BASE}/clients/me/integrations/noah/payouts/channels`,
    params: { cryptoCurrency },
    note: "Discover available payout rails for stablecoin-to-bank conversion",
  };
}

export async function quotePayout(params: {
  channelId: string;
  cryptoAmount: string;
  paymentMethodId?: string;
}) {
  // POST /clients/me/integrations/noah/payouts/quote
  return {
    endpoint: `${PORTAL_BASE}/clients/me/integrations/noah/payouts/quote`,
    body: { ...params, cryptoCurrency: "USDC_TEST", quoted: true },
    note: "Get fee estimate and signed quote for payout",
  };
}

export async function initiatePayout(params: {
  payoutId: string;
  nonce: string;
}) {
  // POST /clients/me/integrations/noah/payouts
  return {
    endpoint: `${PORTAL_BASE}/clients/me/integrations/noah/payouts`,
    body: params,
    note: "Initiate payout — returns deposit address for USDC transfer",
  };
}

export async function submitKyb(customerData: {
  businessName: string;
  taxId: string;
  country: string;
}) {
  // POST /clients/me/customers — Portal customer onboarding
  return {
    endpoint: `${PORTAL_BASE}/clients/me/customers`,
    body: customerData,
    note: "Submit KYB data to Portal for business verification",
  };
}

export function formatSettlementResponse(data: Record<string, unknown>): Partial<Settlement> {
  return {
    portalPayoutId: data.payoutId as string,
    status: "processing",
    fiatAmount: data.fiatAmount as string,
  };
}
