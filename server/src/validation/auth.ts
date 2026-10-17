import { z } from "zod";

/** bcrypt only reads the first 72 bytes, so a longer password would silently be cut short. */
const MAX_PASSWORD_BYTES = 72;

const email = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .email("Enter a valid email address");

export const registerInput = z.object({
  name: z.string().trim().min(1, "Name is required").max(50),
  email,
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .refine((p) => Buffer.byteLength(p, "utf8") <= MAX_PASSWORD_BYTES, {
      message: `Password must be at most ${MAX_PASSWORD_BYTES} bytes`,
    }),
});

/** Login only checks the shape. The strength rules apply when a password is created. */
export const loginInput = z.object({
  email,
  password: z.string().min(1, "Password is required").max(1024),
});

export type RegisterInput = z.infer<typeof registerInput>;
export type LoginInput = z.infer<typeof loginInput>;
