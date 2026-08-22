/** Server-side only — never import from client components. */
export function getServerMonadRpcUrl(): string {
  const url = process.env.MONAD_RPC_URL?.trim();
  if (!url) {
    throw new Error("MONAD_RPC_URL is not configured");
  }
  return url;
}

/** Browser-safe proxy path on the same origin as the app. */
export function getClientMonadRpcUrl(): string {
  if (typeof window === "undefined") {
    return getServerMonadRpcUrl();
  }
  return `${window.location.origin}/api/rpc`;
}
