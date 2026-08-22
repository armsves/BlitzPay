import {
  createSecp256k1SigningSession,
  getPasskeyPrfOutput,
  createPasskeyWithPrfOutput,
  type Secp256k1SigningSession,
  type PasskeyCredentialMetadata,
} from "@category-labs/mera";
import { toViemAccount } from "@category-labs/mera/viem";
import { createWalletClient, http, parseUnits, type Hex, type Address } from "viem";
import {
  monadTestnet,
  USDC_TESTNET,
  erc20Abi,
  getClientMonadRpcUrl,
  MONAD_TESTNET,
} from "@blitzpay/blockchain";

const CREDENTIAL_KEY = "blitzpay.credential";
const MIN_GAS_WEI = BigInt(5e15); // 0.005 MON

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

/** Always re-prompt passkey before signing a payment. */
export async function requirePasskeyForPayment(): Promise<string> {
  return connectWithPasskey();
}

export function getAddress(): string | null {
  if (!session) return null;
  return toViemAccount(session).address;
}

async function rpcCall(method: string, params: unknown[]) {
  const response = await fetch(getClientMonadRpcUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", method, params, id: 1 }),
  });
  const json = await response.json();
  if (json.error) throw new Error(json.error.message || "RPC error");
  return json.result;
}

async function getMonBalance(address: Address): Promise<bigint> {
  const result = await rpcCall("eth_getBalance", [address, "latest"]);
  return BigInt(result);
}

async function waitForMonBalance(address: Address): Promise<void> {
  for (let i = 0; i < 50; i++) {
    if ((await getMonBalance(address)) >= MIN_GAS_WEI) return;
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error("Gas sponsorship timed out — sponsor wallet may be empty");
}

async function waitForReceiptSync(txHash: Hex): Promise<{ blockNumber: string; status: string }> {
  const result = await rpcCall("eth_getTransactionReceipt", [txHash]);
  if (result) {
    return {
      blockNumber: result.blockNumber || "0",
      status: result.status || "0x1",
    };
  }
  await new Promise((r) => setTimeout(r, 200));
  return waitForReceiptSync(txHash);
}

async function sendUsdcDirect(to: Hex, amountUsdc: string) {
  if (!session) throw new Error("Wallet session expired");

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

  const receipt = await waitForReceiptSync(hash);
  return { txHash: hash, blockNumber: receipt.blockNumber, status: receipt.status };
}

/** Sponsor gas (MON drip) then customer signs USDC transfer with passkey. */
export async function payUsdcSponsored(
  to: Hex,
  amountUsdc: string
): Promise<{ txHash: string; blockNumber: string; status: string }> {
  const owner = (await requirePasskeyForPayment()) as Address;

  const fundRes = await fetch("/api/payments/sponsor", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ owner }),
  });
  const fundJson = await fundRes.json();
  if (!fundJson.success) {
    throw new Error(fundJson.error || "Gas sponsorship failed — fund the sponsor wallet with MON");
  }

  if (!fundJson.data.alreadyFunded) {
    await waitForMonBalance(owner);
  }

  return sendUsdcDirect(to, amountUsdc);
}

export function disconnect() {
  session = null;
  localStorage.removeItem(CREDENTIAL_KEY);
}

export { MONAD_TESTNET };
