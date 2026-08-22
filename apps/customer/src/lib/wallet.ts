import {
  createSecp256k1SigningSession,
  getPasskeyPrfOutput,
  createPasskeyWithPrfOutput,
  type Secp256k1SigningSession,
  type PasskeyCredentialMetadata,
} from "@category-labs/mera";
import { toViemAccount } from "@category-labs/mera/viem";
import { createWalletClient, http, parseUnits, type Hex } from "viem";
import { monadTestnet, USDC_TESTNET, erc20Abi, getClientMonadRpcUrl } from "@blitzpay/blockchain";

const CREDENTIAL_KEY = "blitzpay.credential";

function deriveEvmKey(prfOutput: Uint8Array): Uint8Array {
  return prfOutput.slice(0, 32);
}

function loadCredential(): PasskeyCredentialMetadata | undefined {
  const stored = localStorage.getItem(CREDENTIAL_KEY);
  return stored ? JSON.parse(stored) : undefined;
}

function saveCredential(meta: PasskeyCredentialMetadata) {
  localStorage.setItem(CREDENTIAL_KEY, JSON.stringify(meta));
}

let session: Secp256k1SigningSession | null = null;

export async function connectWithPasskey(): Promise<string> {
  const { prfOutput, credentialId } = await getPasskeyPrfOutput({
    rpId: location.hostname,
    credential: loadCredential(),
  });

  saveCredential({ credentialId });

  session = createSecp256k1SigningSession({
    privateKey: deriveEvmKey(prfOutput),
  });

  return toViemAccount(session).address;
}

export async function createNewPasskey(): Promise<string> {
  const { prfOutput, credentialId } = await createPasskeyWithPrfOutput({
    rp: { id: location.hostname, name: "BlitzPay" },
    user: { name: "BlitzPay User", displayName: "BlitzPay User" },
  });

  saveCredential({ credentialId });

  session = createSecp256k1SigningSession({
    privateKey: deriveEvmKey(prfOutput),
  });

  return toViemAccount(session).address;
}

export function getAddress(): string | null {
  if (!session) return null;
  return toViemAccount(session).address;
}

async function waitForReceiptSync(txHash: Hex): Promise<{ blockNumber: string; status: string }> {
  const response = await fetch(getClientMonadRpcUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "eth_getTransactionReceipt",
      params: [txHash],
      id: 1,
    }),
  });
  const json = await response.json();
  if (json.result) {
    return {
      blockNumber: json.result.blockNumber || "0",
      status: json.result.status || "0x1",
    };
  }
  await new Promise(r => setTimeout(r, 200));
  return waitForReceiptSync(txHash);
}

export async function sendUsdcDirect(
  to: Hex,
  amountUsdc: string
): Promise<{ txHash: string; blockNumber: string; status: string }> {
  if (!session) throw new Error("Not connected");

  const account = toViemAccount(session);
  const client = createWalletClient({
    account,
    chain: monadTestnet,
    transport: http(getClientMonadRpcUrl()),
  });

  const amount = parseUnits(amountUsdc, USDC_TESTNET.decimals);

  const hash = await client.writeContract({
    address: USDC_TESTNET.address,
    abi: erc20Abi,
    functionName: "transfer",
    args: [to, amount],
    chain: monadTestnet,
  });

  // Monad confirms in milliseconds — poll for instant receipt
  const receipt = await waitForReceiptSync(hash);

  return {
    txHash: hash,
    blockNumber: receipt.blockNumber,
    status: receipt.status,
  };
}

export function disconnect() {
  session = null;
  localStorage.removeItem(CREDENTIAL_KEY);
}
