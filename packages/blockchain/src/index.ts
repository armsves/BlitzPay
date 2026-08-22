import {
  createPublicClient,
  createWalletClient,
  http,
  parseUnits,
  encodeFunctionData,
  type Hex,
  type TransactionReceipt,
} from "viem";
import { MONAD_TESTNET, USDC_TESTNET } from "@blitzpay/shared";

export const monadTestnet = {
  id: MONAD_TESTNET.id,
  name: MONAD_TESTNET.name,
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  rpcUrls: { default: { http: [MONAD_TESTNET.rpcUrl] } },
} as const;

const erc20Abi = [
  {
    name: "transfer",
    type: "function",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
  {
    name: "balanceOf",
    type: "function",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    name: "decimals",
    type: "function",
    inputs: [],
    outputs: [{ type: "uint8" }],
    stateMutability: "view",
  },
] as const;

export function createMonadClient() {
  return createPublicClient({
    chain: monadTestnet,
    transport: http(MONAD_TESTNET.rpcUrl),
  });
}

export async function getUsdcBalance(address: Hex): Promise<string> {
  const client = createMonadClient();
  const balance = await client.readContract({
    address: USDC_TESTNET.address,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [address],
  });
  return (Number(balance) / 10 ** USDC_TESTNET.decimals).toFixed(2);
}

export async function sendUsdcSync(
  signedTx: Hex,
  timeoutMs = 5000
): Promise<TransactionReceipt> {
  const response = await fetch(MONAD_TESTNET.rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "eth_sendRawTransactionSync",
      params: [signedTx, timeoutMs],
      id: 1,
    }),
  });

  const json = await response.json();

  if (json.error) {
    throw new Error(json.error.message || "Transaction failed");
  }

  return json.result as TransactionReceipt;
}

export function buildUsdcTransferData(to: Hex, amountUsdc: string): Hex {
  const amount = parseUnits(amountUsdc, USDC_TESTNET.decimals);
  return encodeFunctionData({
    abi: erc20Abi,
    functionName: "transfer",
    args: [to, amount],
  });
}

export function createPaymentQrPayload(params: {
  invoiceId: string;
  amountUsdc: string;
  merchantAddress: string;
}): string {
  return JSON.stringify({
    type: "blitzpay",
    version: 1,
    chainId: MONAD_TESTNET.id,
    usdc: USDC_TESTNET.address,
    ...params,
  });
}

export function parsePaymentQrPayload(data: string): {
  invoiceId: string;
  amountUsdc: string;
  merchantAddress: string;
  chainId: number;
  usdc: string;
} | null {
  try {
    const parsed = JSON.parse(data);
    if (parsed.type !== "blitzpay") return null;
    return parsed;
  } catch {
    return null;
  }
}

export { erc20Abi, USDC_TESTNET, MONAD_TESTNET };
