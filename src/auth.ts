import crypto from "crypto";

function base32Decode(encoded: string): Buffer {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const char of encoded.toUpperCase()) {
    const val = alphabet.indexOf(char);
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, "0");
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.substring(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

export function generateTOTP(
  secret: string,
  period = 30,
  digits = 6
): string {
  const key = base32Decode(secret);
  const counter = Math.floor(Date.now() / 1000 / period);
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(counter));
  const hmac = crypto.createHmac("sha1", key).update(buffer).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    (hmac.readUInt32BE(offset) & 0x7fffffff) % Math.pow(10, digits);
  return code.toString().padStart(digits, "0");
}

let sessionToken: string | null = null;

export async function getToken(): Promise<string> {
  if (sessionToken) return sessionToken;
  return login();
}

export async function login(): Promise<string> {
  const url = process.env.MM_URL;
  const username = process.env.MM_USERNAME;
  const password = process.env.MM_PASSWORD;
  const totpSecret = process.env.MM_TOTP_SECRET;

  if (!url || !username || !password || !totpSecret) {
    throw new Error(
      "Missing env vars: MM_URL, MM_USERNAME, MM_PASSWORD, MM_TOTP_SECRET"
    );
  }

  const totp = generateTOTP(totpSecret);
  const resp = await fetch(`${url}/api/v4/users/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      login_id: username,
      password: password,
      token: totp,
    }),
  });

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Login failed: ${resp.status} ${body}`);
  }

  const token = resp.headers.get("Token");
  if (!token) throw new Error("No token in login response headers");

  sessionToken = token;
  return token;
}

export function clearToken(): void {
  sessionToken = null;
}
