import bcrypt from "bcryptjs";
import User from "../models/user.js";
import { loadConfig } from "../config/env.js";
import { signToken } from "../utils/jwt.js";
import { createAuthService, type UserRecord } from "./authCore.js";

const config = loadConfig();
const COST = 12;

const toRecord = (u: { _id: unknown; username: string; email: string; passwordHash: string }): UserRecord => ({
  id: String(u._id),
  username: u.username,
  email: u.email,
  passwordHash: u.passwordHash,
});

let dummy: Promise<string> | undefined;

export const { registerUser, loginUser, getUserById } = createAuthService({
  findByEmail: async (email) => {
    const u = await User.findOne({ email });
    return u ? toRecord(u) : null;
  },
  findById: async (id) => {
    const u = await User.findById(id);
    return u ? toRecord(u) : null;
  },
  create: async (data) => toRecord(await User.create(data)),
  hash: (password) => bcrypt.hash(password, COST),
  compare: (password, hash) => bcrypt.compare(password, hash),
  signToken: (id) => signToken(id, config.jwtSecret),
  isDuplicateKey: (e) => typeof e === "object" && e !== null && (e as { code?: number }).code === 11000,
  dummyHash: () => (dummy ??= bcrypt.hash("plantry-dummy-password", COST)),
});
