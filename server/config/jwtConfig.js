import dotenv from 'dotenv';
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'eduzenta-super-secret-jwt-key-2026-production';

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  console.warn('⚠️ WARNING: JWT_SECRET environment variable is missing in production mode!');
}

export { JWT_SECRET };
export default JWT_SECRET;
