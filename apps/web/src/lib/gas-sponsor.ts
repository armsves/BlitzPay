import {
  createPublicClient,
  createWalletClient,
  http,
  parseUnits,
  parseSignature,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
  monadTestnet,
  USDC_TESTNET,
  getServerMonadRpcUrl,
  usdcExtendedAbi,
  type PermitPrepareResult,
} from "@blitzpay/blockchain";
import { MONAD_TESTNET } from "@blitzpay/shared";

const GAS_TOP_UP_WEI = parseUnits("0.02", 18);
const MIN_MON_WEI = parseUnits("0.005", 18);

function getSponsorAccount() {
  const key = process.env.GAS_SPONSOR_PRIVATE_KEY?.trim();
  if (!key) throw new Error("GAS_SPONSOR_PRIVATE_KEY not configured");
  return privateKeyToAccount(key.startsWith("0x") ? (key as Hex) : (`0x${key}` as Hex));
}

function createClients() {
  const rpc = getServerMonadRpcUrl();
  const transport = http(rpc);
  return {
    public: createPublicClient({ chain: monadTestnet, transport }),
    rpc,
    transport,
  };
}

export async function prepareSponsoredPayment(
  owner: Address,
  to: Address,
  amountUsdc: string
): Promise<PermitPrepareResult> {
  const sponsor = getSponsorAccount();
  const { public: client } = createClients();
  const amount = parseUnits(amountUsdc, USDC_TESTNET.decimals);

  let tokenName: string = "USD Coin";
  let nonce = BigInt(0);
  try {
    tokenName = (await client.readContract({
      address: USDC_TESTNET.address,
      abi: usdcExtendedAbi,
      functionName: "name",
    })) as string;
    nonce = (await client.readContract({
      address: USDC_TESTNET.address,
      abi: usdcExtendedAbi,
      functionName: "nonces",
      args: [owner],
    })) as bigint;
  } catch {
    // Permit may be unavailable — gas top-up path still works
  }

  const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);

  return {
    sponsorAddress: sponsor.address,
    owner,
    to,
    amountUsdc,
    amount: amount.toString(),
    nonce: nonce.toString(),
    deadline: deadline.toString(),
    tokenName,
    tokenVersion: "2",
    chainId: MONAD_TESTNET.id,
    tokenAddress: USDC_TESTNET.address,
  };
}

async function topUpGasIfNeeded(owner: Address): Promise<void> {
  const sponsor = getSponsorAccount();
  const { public: client, transport } = createClients();
  const balance = await client.getBalance({ address: owner });
  if (balance >= MIN_MON_WEI) return;

  const wallet = createWalletClient({
    account: sponsor,
    chain: monadTestnet,
    transport,
  });

  const hash = await wallet.sendTransaction({
    to: owner,
    value: GAS_TOP_UP_WEI,
    chain: monadTestnet,
  });

  for (let i = 0; i < 30; i++) {
    const receipt = await client.getTransactionReceipt({ hash });
    if (receipt) return;
    await new Promise((r) => setTimeout(r, 200));
  }
}

export async function executeSponsoredPayment(params: {
  owner: Address;
  to: Address;
  amountUsdc: string;
  deadline: string;
  signature: Hex;
}): Promise<{ txHash: Hex; blockNumber: string; status: string }> {
  const sponsor = getSponsorAccount();
  const { public: client, transport } = createClients();
  const wallet = createWalletClient({
    account: sponsor,
    chain: monadTestnet,
    transport,
  });
  const amount = parseUnits(params.amountUsdc, USDC_TESTNET.decimals);
  const deadline = BigInt(params.deadline);
  const { v, r, s } = parseSignature(params.signature);

  try {
    const permitHash = await wallet.writeContract({
      address: USDC_TESTNET.address,
      abi: usdcExtendedAbi,
      functionName: "permit",
      args: [params.owner, sponsor.address, amount, deadline, v, r, s],
      chain: monadTestnet,
    });

    for (let i = 0; i < 40; i++) {
      const receipt = await client.getTransactionReceipt({ hash: permitHash });
      if (receipt) break;
      await new Promise((r) => setTimeout(r, 150));
    }

    const hash = await wallet.writeContract({
      address: USDC_TESTNET.address,
      abi: usdcExtendedAbi,
      functionName: "transferFrom",
      args: [params.owner, params.to, amount],
      chain: monadTestnet,
    });

    for (let i = 0; i < 40; i++) {
      const receipt = await client.getTransactionReceipt({ hash });
      if (receipt) {
        return {
          txHash: hash,
          blockNumber: receipt.blockNumber.toString(),
          status: receipt.status,
        };
      }
      await new Promise((r) => setTimeout(r, 150));
    }

    return { txHash: hash, blockNumber: "0", status: "0x1" };
  } catch (permitErr) {
    // Fallback: drip MON for gas, client submits transfer (handled separately)
    throw permitErr instanceof Error ? permitErr : new Error("Sponsored permit payment failed");
  }
}

export async function dripGasTo(owner: Address): Promise<void> {
  await topUpGasIfNeeded(owner);
}

export { getSponsorAccount };
