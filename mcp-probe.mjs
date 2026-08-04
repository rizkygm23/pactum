// Temporary MCP connectivity probe. Safe to delete.
const targets = [
  { name: "arc-docs", url: "https://docs.arc.io/mcp" },
  { name: "circle-mcp", url: "https://api.circle.com/v1/codegen/mcp" },
];

const body = {
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: { name: "probe", version: "1.0.0" },
  },
};

for (const t of targets) {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 20000);
  try {
    const res = await fetch(t.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
      },
      body: JSON.stringify(body),
      signal: ac.signal,
    });
    const text = await res.text();
    console.log(`\n=== ${t.name} (${t.url}) ===`);
    console.log(`HTTP ${res.status} ${res.statusText}`);
    console.log(`content-type: ${res.headers.get("content-type")}`);
    console.log(`body: ${text.slice(0, 600)}`);
  } catch (err) {
    console.log(`\n=== ${t.name} (${t.url}) ===`);
    console.log(`FAILED: ${err.name}: ${err.message}`);
    if (err.cause) console.log(`cause: ${err.cause}`);
  } finally {
    clearTimeout(timer);
  }
}
