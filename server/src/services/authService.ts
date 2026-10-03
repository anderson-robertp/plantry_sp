import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/userModel.js";

interface AuthResult {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

export async function registerUser(
  name: string,
  email: string,
  password: string
): Promise<AuthResult> {
  const existingUser = await User.findOne({
    email: email.toLowerCase(),
  });

  if (existingUser) {
    throw new Error("A user with that email already exists");
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await User.create({
    username: name,
    email: email.toLowerCase(),
    passwordHash,
  });

  const token = createToken(user.id);

  return {
    token,
    user: {
      id: user.id,
      name: user.username,
      email: user.email,
    },
  };
}

export async function loginUser(
  email: string,
  password: string
): Promise<AuthResult> {
  const user = await User.findOne({
    email: email.toLowerCase(),
  });

  if (!user) {
    throw new Error("Invalid email or password");
  }

  const passwordMatches = await bcrypt.compare(
    password,
    user.passwordHash
  );

  if (!passwordMatches) {
    throw new Error("Invalid email or password");
  }

  const token = createToken(user.id);

  return {
    token,
    user: {
      id: user.id,
      name: user.username,
      email: user.email,
    },
  };
}

function createToken(userId: string): string {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is not defined");
  }

  return jwt.sign(
    { userId },
    secret,
    {
      expiresIn: "7d",
    }
  );
}

export async function getUserById(userId: string) {
  const user = await User.findById(userId).select(
    "-passwordHash"
  );

  if (!user) {
    throw new Error("User not found");
  }

  return user;
}