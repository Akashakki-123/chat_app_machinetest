import bcrypt from "bcrypt";
import dotenv from "dotenv";
dotenv.config();

const SALT = parseInt(process.env.BCRYPT_SALT_ROUNDS || "10", 10);

export function encryptPassword(password) {
  return bcrypt.hashSync(password, SALT);
}

export function verifyPassword(plain, hashed) {
  return bcrypt.compareSync(plain, hashed);
}
