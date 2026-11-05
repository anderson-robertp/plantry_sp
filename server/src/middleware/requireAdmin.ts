import { getUserById } from "../services/auth.js";
import { isAdminEmail, parseAdminEmails } from "../utils/admin.js";
import { createRequireAdmin } from "./adminGuard.js";

export const requireAdmin = createRequireAdmin({
  emailOf: async (id) => (await getUserById(id)).email,
  admins: () => parseAdminEmails(process.env.ADMIN_EMAILS),
});

/** For the front end to decide whether to show the Admin tab. Not a guard; admins and others both get an answer. */
export async function isAdminUser(userId: string): Promise<boolean> {
  try {
    return isAdminEmail((await getUserById(userId)).email, parseAdminEmails(process.env.ADMIN_EMAILS));
  } catch {
    return false;
  }
}
