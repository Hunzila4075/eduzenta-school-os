import dotenv from 'dotenv';
import crypto from 'node:crypto';

dotenv.config();

// SECURITY — the JWT signing secret must never be a publicly-known default.
// Previously a hardcoded fallback ('eduzenta-super-secret-jwt-key-2026-production')
// was used when the env var was missing, which effectively made the secret public
// knowledge and allowed forged tokens. Now:
//   • Production fails FAST (no start) if JWT_SECRET is not set.
//   • Non-production falls back to an EPHEMERAL random secret (sessions do not
//     survive restarts, but the secret is never guessable).
const providedSecret = process.env.JWT_SECRET;

if (process.env.NODE_ENV === 'production' && !providedSecret) {
  throw new Error('JWT_SECRET environment variable is required in production mode. Set a strong random value and restart the server.');
}

const JWT_SECRET = providedSecret || crypto.randomBytes(48).toString('hex');

export { JWT_SECRET };
export default JWT_SECRET;
