import jwt from "jsonwebtoken";
import { userIdFromPayload } from "./tokenPayload.js";

const ALGORITHM = "HS256" as const;
const EXPIRES_IN = "7d";

/** Signs with an explicit algorithm and puts the user id in the standard `sub` claim. */
export function signToken(userId: string, secret: string): string {
  return jwt.sign({}, secret, { algorithm: ALGORITHM, expiresIn: EXPIRES_IN, subject: userId });
}

/** Returns the user id, or null for anything expired, tampered with, wrongly signed or malformed. */
export function verifyToken(token: string, secret: string): string | null {
  try {
    return userIdFromPayload(jwt.verify(token, secret, { algorithms: [ALGORITHM] }));
  } catch {
    return null;
  }
}
