const http = require('http');

// ==========================================
// PACTUM API TEST SCRIPT
// ==========================================
// 1. Ganti 'YOUR_API_KEY_HERE' dengan API Key yang Anda buat di Dashboard Pactum
const API_KEY = "pactum_fb3facc27834a2efed84fbd02aa5bc0966e1eafa";
// ==========================================

const payload = JSON.stringify({
  model: "gpt-4o",
  prompt_tokens: 250,
  completion_tokens: 100,
  prompt_price_per_token: 0.000005, // $5 per 1M tokens
  completion_price_per_token: 0.000015, // $15 per 1M tokens
  idempotency_key: `test-req-${Date.now()}`,
  user_address: "0x3813cB42a4376e4FaCB4b7F0fA3492CC0A5F727a", // Replace with actual user address
  metadata: {
    user_id: "test_user_001",
    environment: "testing"
  }
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/v1/usage/track',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': API_KEY,
    'Content-Length': Buffer.byteLength(payload)
  }
};

console.log("Mengirim test pemakaian (0.00275 USDC) ke Pactum...");
console.log(`Endpoint: POST http://${options.hostname}:${options.port}${options.path}`);
console.log("Idempotency Key:", `test-req-${Date.now()}`);
console.log("--------------------------------------------------");

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log(`STATUS CODE: ${res.statusCode}`);
    
    try {
      const json = JSON.parse(data);
      console.log("RESPONSE JSON:", JSON.stringify(json, null, 2));
      
      if (res.statusCode === 200) {
        console.log("\n✅ BERHASIL! Data pemakaian Anda sudah tercatat.");
        console.log("Silakan cek halaman Usage / Overview di Dashboard Pactum.");
      } else if (res.statusCode === 429) {
        console.log("\n⚠️ LIMIT TERCAPAI! Request ditolak oleh sistem kebijakan (Policy).");
      } else if (res.statusCode === 401 || res.statusCode === 403) {
        console.log("\n❌ UNAUTHORIZED! API Key Anda salah atau tidak terdaftar. Pastikan Anda sudah mengganti 'YOUR_API_KEY_HERE' di script ini.");
      } else {
        console.log("\n❌ GAGAL! Terjadi kesalahan pada server.");
      }
    } catch (e) {
      console.log("Raw Response:", data);
    }
  });
});

req.on('error', (error) => {
  console.error("Gagal koneksi ke server Pactum. Apakah server Next.js (npm run dev) sudah menyala?", error.message);
});

req.write(payload);
req.end();
