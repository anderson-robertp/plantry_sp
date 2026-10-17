import { AppError } from "../utils/errors.js";

/** The slice of a user the auth logic needs. */
export interface UserRecord {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
}

/** Everything the auth logic touches, passed in so the logic can be tested without a database. */
export interface AuthDeps {
  findByEmail(email: string): Promise<UserRecord | null>;
  findById(id: string): Promise<UserRecord | null>;
  create(data: { username: string; email: string; passwordHash: string }): Promise<UserRecord>;
  hash(password: string): Promise<string>;
  compare(password: string, hash: string): Promise<boolean>;
  signToken(userId: string): string;
  isDuplicateKey(error: unknown): boolean;
  /** A real bcrypt hash of a throwaway string, used so an unknown email takes as long as a wrong password. */
  dummyHash(): Promise<string>;
}

export interface PublicUser {
  id: string;
  name: string;
  email: string;
}

export interface AuthResult {
  token: string;
  user: PublicUser;
}

const toPublic = (u: UserRecord): PublicUser => ({ id: u.id, name: u.username, email: u.email });

const emailTaken = () => new AppError("A user with that email already exists", 409, "email_taken");

export function createAuthService(deps: AuthDeps) {
  async function registerUser(name: string, email: string, password: string): Promise<AuthResult> {
    if (await deps.findByEmail(email)) throw emailTaken();

    const passwordHash = await deps.hash(password);
    let user: UserRecord;
    try {
      user = await deps.create({ username: name, email, passwordHash });
    } catch (error) {
      // Two sign-ups for one email at the same moment: the unique index decides, not our check above.
      if (deps.isDuplicateKey(error)) throw emailTaken();
      throw error;
    }
    return { token: deps.signToken(user.id), user: toPublic(user) };
  }

  /**
   * Wrong password and unknown email give the same error and take the same time (a password is
   * always compared, against a dummy hash if there's no such user), so neither response nor timing
   * reveals which emails have accounts.
   */
  async function loginUser(email: string, password: string): Promise<AuthResult> {
    const user = await deps.findByEmail(email);
    const matches = await deps.compare(password, user ? user.passwordHash : await deps.dummyHash());
    if (!user || !matches) {
      throw new AppError("Invalid email or password", 401, "invalid_credentials");
    }
    return { token: deps.signToken(user.id), user: toPublic(user) };
  }

  /** The signed-in user. A valid token for an account that no longer exists is treated as signed out. */
  async function getUserById(userId: string): Promise<PublicUser> {
    const user = await deps.findById(userId);
    if (!user) throw new AppError("Authentication required", 401, "unauthenticated");
    return toPublic(user);
  }

  return { registerUser, loginUser, getUserById };
}
