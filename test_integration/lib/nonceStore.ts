// In-memory store for nonces. 
// Note: In a production serverless environment (like Vercel), this should be replaced with Redis or a database (e.g. Vercel KV).
export const nonces = new Map<string, number>();
