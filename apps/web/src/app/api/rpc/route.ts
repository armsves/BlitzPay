import { getServerMonadRpcUrl } from "@blitzpay/blockchain";

export async function POST(req: Request) {
  let rpcUrl: string;
  try {
    rpcUrl = getServerMonadRpcUrl();
  } catch {
    return Response.json({ jsonrpc: "2.0", error: { code: -32603, message: "RPC not configured" }, id: null }, { status: 503 });
  }

  const body = await req.text();
  const upstream = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });

  return new Response(await upstream.text(), {
    status: upstream.status,
    headers: { "Content-Type": "application/json" },
  });
}
