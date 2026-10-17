import type { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { loginInput, registerInput } from "../validation/auth.js";

type Security = Record<string, string[]>[];

/**
 * Mounted at /api/auth (change `base` if your app.use() differs). Use POST /login, copy the token
 * from the response, then click Authorize at the top of Swagger and paste it (no "Bearer " prefix).
 */
const base = "/api/auth";

export function registerAuthPaths(registry: OpenAPIRegistry, security: Security): void {
  const Register = registry.register("Register", registerInput);
  const Login = registry.register("Login", loginInput);
  const tags = ["Auth"];

  registry.registerPath({
    method: "post", path: `${base}/register`, summary: "Create an account", tags,
    request: { body: { content: { "application/json": { schema: Register } } } },
    responses: {
      201: { description: "Account created" },
      409: { description: "Email already registered" },
      422: { description: "Validation failed" },
      429: { description: "Too many attempts" },
    },
  });
  registry.registerPath({
    method: "post", path: `${base}/login`, summary: "Log in and receive a JWT", tags,
    request: { body: { content: { "application/json": { schema: Login } } } },
    responses: {
      200: { description: "Logged in; the response contains the token to paste into Authorize" },
      401: { description: "Invalid email or password" },
      422: { description: "Validation failed" },
    },
  });
  registry.registerPath({
    method: "get", path: `${base}/me`, summary: "The signed-in user", tags, security,
    responses: {
      200: { description: "Current user" },
      401: { description: "Authentication required" },
    },
  });
}
