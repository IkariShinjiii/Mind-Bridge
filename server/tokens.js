import crypto from "crypto";

export function generateToken() {
  return crypto.randomBytes(24).toString("hex");
}

export function expiresInHours(hours) {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

export function isExpired(isoString) {
  if (!isoString) return true;
  return new Date(isoString).getTime() < Date.now();
}
