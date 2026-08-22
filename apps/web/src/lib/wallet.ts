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
  permitTypes,
  MONAD_TESTNET,
} from "@blitzpay/blockchain";

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

/** Re-prompt passkey if session expired — use before any payment signature. */
export async function ensureWalletSession(): Promise<string> {
  if (session) return toViemAccount(session).address;
  return connectWithPasskey();
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
  await new Promise((r) => setTimeout(r, 200));
  return waitForReceiptSync(txHash);
}

async function sendUsdcDirect(to: Hex, amountUsdc: string) {
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

  const receipt = await waitForReceiptSync(hash);
  return { txHash: hash, blockNumber: receipt.blockNumber, status: receipt.status };
}

/** Gas-sponsored USDC payment — passkey signs permit, relayer pays MON gas. */
export async function payUsdcSponsored(
  to: Hex,
  amountUsdc: string
): Promise<{ txHash: string; blockNumber: string; status: string }> {
  const owner = (await ensureWalletSession()) as Address;
  const account = toViemAccount(session!);

  const prepRes = await fetch("/api/payments/sponsor/prepare", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ owner, to, amountUsdc }),
  });
  const prepJson = await prepRes.json();
  if (!prepJson.success) {
    throw new Error(prepJson.error || "Could not prepare sponsored payment");
  }

  const prep = prepJson.data;

  try {
    const signature = await account.signTypedData({
      domain: {
        name: prep.tokenName,
        version: prep.tokenVersion,
        chainId: prep.chainId,
        verifyingContract: prep.tokenAddress as Address,
      },
      types: permitTypes,
      primaryType: "Permit",
      message: {
        owner: prep.owner as Address,
        spender: prep.sponsorAddress as Address,
        value: BigInt(prep.amount),
        nonce: BigInt(prep.nonce),
        deadline: BigInt(prep.deadline),
      },
    });

    const payRes = await fetch("/api/payments/sponsor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        owner: prep.owner,
        to: prep.to,
        amountUsdc: prep.amountUsdc,
        deadline: prep.deadline,
        signature,
      }),
    });
    const payJson = await payRes.json();
    if (payJson.success) {
      return payJson.data;
    }
  } catch {
    // fall through to gas drip + direct transfer
  }

  await fetch("/api/payments/sponsor", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "drip", owner }),
  });

  return sendUsdcDirect(to, amountUsdc);
}

export async function sendUsdcDirectLegacy(to: Hex, amountUsdc: string) {
  await ensureWalletSession();
  return sendUsdcDirect(to, amountUsdc);
}

export function disconnect() {
  session = null;
  localStorage.removeItem(CREDENTIAL_KEY);
}

export { MONAD_TESTNET };
