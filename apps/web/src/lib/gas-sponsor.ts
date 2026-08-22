import {
  createPublicClient,
  createWalletClient,
  http,
  parseUnits,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
  monadTestnet,
  USDC_TESTNET,
  getServerMonadRpcUrl,
  usdcExtendedAbi,
} from "@blitzpay/blockchain";

const GAS_TOP_UP_WEI = parseUnits("0.05", 18);
const MIN_MON_WEI = parseUnits("0.01", 18);
const MIN_SPONSOR_WEI = parseUnits("0.1", 18);

function getSponsorAccount() {
  const key = process.env.GAS_SPONSOR_PRIVATE_KEY?.trim();
  if (!key) throw new Error("GAS_SPONSOR_PRIVATE_KEY not configured on server");
  return privateKeyToAccount(key.startsWith("0x") ? (key as Hex) : (`0x${key}` as Hex));
}

function createClients() {
  const transport = http(getServerMonadRpcUrl());
  return {
    public: createPublicClient({ chain: monadTestnet, transport }),
    transport,
  };
}

export function getSponsorInfo() {
  const sponsor = getSponsorAccount();
  return { address: sponsor.address };
}

export async function getSponsorBalance(): Promise<bigint> {
  const { public: client } = createClients();
  const sponsor = getSponsorAccount();
  return client.getBalance({ address: sponsor.address });
}

export async function ensureSponsorFunded() {
  const balance = await getSponsorBalance();
  if (balance < MIN_SPONSOR_WEI) {
    throw new Error(
      `Gas sponsor wallet (${getSponsorAccount().address}) needs MON — balance too low`
    );
  }
}

/** Send MON to customer wallet for gas — Monad testnet USDC has no permit support. */
export async function fundCustomerGas(owner: Address): Promise<{ dripTxHash?: Hex; alreadyFunded: boolean }> {
  await ensureSponsorFunded();

  const sponsor = getSponsorAccount();
  const { public: client, transport } = createClients();
  const balance = await client.getBalance({ address: owner });

  if (balance >= MIN_MON_WEI) {
    return { alreadyFunded: true };
  }

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

  for (let i = 0; i < 50; i++) {
    const receipt = await client.getTransactionReceipt({ hash });
    if (receipt?.status === "success") {
      return { dripTxHash: hash, alreadyFunded: false };
    }
    await new Promise((r) => setTimeout(r, 200));
  }

  throw new Error("Gas drip transaction did not confirm in time");
}

export { getSponsorAccount, MIN_MON_WEI };
