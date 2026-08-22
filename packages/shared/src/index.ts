export const MONAD_TESTNET = {
  id: 10143,
  name: "Monad Testnet",
  blockExplorer: "https://testnet.monadexplorer.com",
} as const;

export const USDC_TESTNET = {
  address: "0x534b2f3A21130d7a60830c2Df862319e593943A3" as const,
  decimals: 6,
  symbol: "USDC",
} as const;

export const CIRCLE_FAUCET_URL = "https://faucet.circle.com/";
export const CIRCLE_SANDBOX_APP_URL = "https://app-sandbox.circle.com/";

export const APP_PORTS = {
  api: 3001,
  merchant: 3002,
  pos: 3003,
  customer: 3004,
} as const;

export type KybStatus = "pending" | "submitted" | "approved" | "rejected";
export type InvoiceStatus = "draft" | "pending" | "paid" | "expired" | "cancelled";
export type SettlementStatus = "pending" | "quoted" | "processing" | "completed" | "failed";

export interface Merchant {
  id: string;
  email: string;
  businessName: string;
  businessType: string;
  taxId: string;
  walletAddress: string;
  kybStatus: KybStatus;
  circleAccountId?: string;
  createdAt: string;
}

export interface BankDetails {
  id: string;
  merchantId: string;
  accountHolderName: string;
  bankName: string;
  accountNumber: string;
  routingNumber: string;
  iban?: string;
  swift?: string;
  country: string;
  currency: string;
  circleWireId?: string;
  createdAt: string;
}

export interface Product {
  id: string;
  merchantId: string;
  name: string;
  description: string;
  priceUsdc: string;
  quantity: number;
  imageUrl?: string;
  sku?: string;
  active: boolean;
  createdAt: string;
}

export interface InvoiceItem {
  productId: string;
  name: string;
  quantity: number;
  unitPriceUsdc: string;
  lineTotalUsdc: string;
}

export interface Invoice {
  id: string;
  merchantId: string;
  invoiceNumber: string;
  items: InvoiceItem[];
  subtotalUsdc: string;
  totalUsdc: string;
  status: InvoiceStatus;
  merchantWalletAddress: string;
  paymentQrData: string;
  txHash?: string;
  paidAt?: string;
  expiresAt: string;
  createdAt: string;
}

export interface PaymentRequest {
  invoiceId: string;
  amountUsdc: string;
  merchantAddress: string;
  chainId: number;
  usdcAddress: string;
}

export interface PaymentResult {
  success: boolean;
  txHash: string;
  blockNumber: string;
  status: "0x0" | "0x1";
  invoiceId: string;
}

export interface Settlement {
  id: string;
  merchantId: string;
  amountUsdc: string;
  fiatAmount: string;
  fiatCurrency: string;
  status: SettlementStatus;
  circleWithdrawalId?: string;
  txHash?: string;
  completesAt?: string;
  completedAt?: string;
  createdAt: string;
}

export interface MerchantBalanceInfo {
  merchantId: string;
  balanceUsdc: string;
  updatedAt: string;
}

export interface BalanceLedgerEntry {
  id: string;
  merchantId: string;
  type: "credit" | "debit";
  amountUsdc: string;
  balanceAfter: string;
  referenceType: string;
  referenceId: string;
  description: string;
  createdAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
