/**
 * Who is an admin: the emails listed in the ADMIN_EMAILS environment variable, comma-separated
 * ("me@example.com, partner@example.com"). Nothing in the database grants it, so it can't be
 * handed out from inside the app, and removing an email revokes it on the next request.
 */
export function parseAdminEmails(value: string | undefined): string[] {
  return [...new Set((value ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean))];
}

export function isAdminEmail(email: string | null | undefined, admins: readonly string[]): boolean {
  return typeof email === "string" && email.trim() !== "" && admins.includes(email.trim().toLowerCase());
}
