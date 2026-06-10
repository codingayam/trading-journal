import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

const keyLength = 64;
const params = {
  N: 16384,
  r: 8,
  p: 1,
};

function scryptKey(password: string, salt: Buffer, length: number, options = params) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, length, options, (error, key) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(key);
    });
  });
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const key = await scryptKey(password, salt, keyLength);

  return [
    "scrypt",
    String(params.N),
    String(params.r),
    String(params.p),
    salt.toString("base64url"),
    key.toString("base64url"),
  ].join("$");
}

export async function verifyPassword(password: string, storedHash: string) {
  const parts = storedHash.split("$");

  if (parts.length !== 6 || parts[0] !== "scrypt") {
    return false;
  }

  const [, n, r, p, salt, hash] = parts;
  const expected = Buffer.from(hash, "base64url");
  const key = await scryptKey(
    password,
    Buffer.from(salt, "base64url"),
    expected.length,
    {
      N: Number(n),
      r: Number(r),
      p: Number(p),
    },
  );

  if (key.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(key, expected);
}
