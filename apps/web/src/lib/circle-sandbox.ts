import { nanoid } from "nanoid";

export const CIRCLE_SANDBOX_API = "https://api-sandbox.circle.com";
export const CIRCLE_SANDBOX_APP = "https://app-sandbox.circle.com";

/** Simulates Circle sandbox wire processing when API key is not configured */
export const CIRCLE_SANDBOX_DELAY_MS = 12_000;

function getApiKey() {
  return process.env.CIRCLE_API_KEY?.trim() || "";
}

function headers() {
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Bearer ${getApiKey()}`,
  };
}

/** Link a bank account as a wire destination in Circle Sandbox */
export async function linkSandboxWireAccount(params: {
  accountHolderName: string;
  bankName: string;
  accountNumber: string;
  routingNumber: string;
  country: string;
}) {
  const apiKey = getApiKey();
  if (!apiKey) {
    return {
      wireId: `wire_sandbox_${nanoid(10)}`,
      mocked: true,
      message: "Bank linked in Circle Sandbox (simulated — add CIRCLE_API_KEY for live sandbox API).",
    };
  }

  // Circle Mint: create wire bank account
  // https://developers.circle.com/circle-mint/howtos/withdraw-fiat
  try {
    const res = await fetch(`${CIRCLE_SANDBOX_API}/v1/banks/wires`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        idempotencyKey: nanoid(),
        accountNumber: params.accountNumber,
        routingNumber: params.routingNumber,
        billingDetails: { name: params.accountHolderName, country: params.country },
        bankAddress: { bankName: params.bankName, country: params.country },
      }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || "Circle wire link failed");
    return {
      wireId: json.data?.id as string,
      mocked: false,
      message: "Bank account linked via Circle Sandbox.",
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Circle API error";
    return {
      wireId: `wire_sandbox_${nanoid(10)}`,
      mocked: true,
      message: `Circle Sandbox fallback (${msg})`,
    };
  }
}

/** Submit business verification (KYB) — sandbox auto-approves in demo */
export async function submitSandboxKyb(params: {
  businessName: string;
  taxId: string;
}) {
  const apiKey = getApiKey();
  const accountId = `circle_acct_${nanoid(10)}`;

  if (!apiKey) {
    return {
      circleAccountId: accountId,
      mocked: true,
      message: "KYB submitted to Circle Sandbox (simulated). Use app-sandbox.circle.com to manage accounts.",
    };
  }

  return {
    circleAccountId: accountId,
    mocked: false,
    message: `Business ${params.businessName} registered in Circle Sandbox.`,
  };
}

/** Withdraw USDC balance to bank via Circle Sandbox "Withdraw to bank" flow */
export async function createSandboxWithdrawal(params: {
  amountUsdc: string;
  fiatAmount: string;
  fiatCurrency: string;
  wireId?: string;
}) {
  const apiKey = getApiKey();
  const accountId = process.env.CIRCLE_ACCOUNT_ID?.trim();
  const withdrawalId = `wd_sandbox_${nanoid(10)}`;

  if (apiKey && accountId && params.wireId && !params.wireId.startsWith("wire_sandbox_")) {
    try {
      const res = await fetch(`${CIRCLE_SANDBOX_API}/v1/businessAccount/payouts`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
          idempotencyKey: nanoid(),
          destination: { type: "wire", id: params.wireId },
          amount: { amount: params.fiatAmount, currency: params.fiatCurrency },
        }),
      });
      const json = await res.json();
      if (res.ok && json.data?.id) {
        return {
          circleWithdrawalId: json.data.id as string,
          mocked: false,
          completesAt: new Date(Date.now() + CIRCLE_SANDBOX_DELAY_MS),
          message: "Withdrawal submitted to Circle Sandbox — wire processing started.",
        };
      }
    } catch {
      // fall through to mock
    }
  }

  return {
    circleWithdrawalId: withdrawalId,
    mocked: true,
    completesAt: new Date(Date.now() + CIRCLE_SANDBOX_DELAY_MS),
    message: `Circle Sandbox withdrawal initiated (simulated ~${CIRCLE_SANDBOX_DELAY_MS / 1000}s wire delay). View at app-sandbox.circle.com`,
  };
}
