import { useState, type FormEvent } from "react";
import { useAuth } from "../auth/AuthContext";
import { Button, Field, inputCls } from "../components/ui";
import { fieldErrors, messageOf } from "../lib/api";

export function AuthPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<unknown>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setProblem(null);
    try {
      if (mode === "login") await login(email, password);
      else await register(name, email, password);
    } catch (err) {
      setProblem(err);
      setBusy(false);
    }
  };

  const fe = fieldErrors(problem);
  const general = problem && Object.keys(fe).length === 0 ? messageOf(problem) : null;

  return (
    <div className="mx-auto grid min-h-screen max-w-sm content-center gap-6 px-4 py-10">
      <div>
        <h1 className="font-display text-4xl text-ink">Plantry</h1>
        <p className="mt-1 text-sm text-muted">Know what's in the kitchen. Plan the week. Shop for only what's missing.</p>
      </div>

      <form onSubmit={submit} className="grid gap-4 rounded-xl border border-line bg-surface p-5" noValidate>
        <h2 className="text-lg font-semibold">{mode === "login" ? "Sign in" : "Create your account"}</h2>
        {mode === "register" ? (
          <Field label="Name" htmlFor="name" error={fe.name}>
            <input id="name" className={inputCls} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
          </Field>
        ) : null}
        <Field label="Email" htmlFor="email" error={fe.email}>
          <input id="email" type="email" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </Field>
        <Field
          label="Password"
          htmlFor="password"
          error={fe.password}
          hint={mode === "register" ? "At least 8 characters." : undefined}
        >
          <input
            id="password"
            type="password"
            className={inputCls}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
          />
        </Field>
        {general ? (
          <p role="alert" className="text-sm text-bad">
            {general}
          </p>
        ) : null}
        <Button type="submit" disabled={busy}>
          {busy ? "One moment…" : mode === "login" ? "Sign in" : "Create account"}
        </Button>
      </form>

      <p className="text-center text-sm text-muted">
        {mode === "login" ? "New here?" : "Already have an account?"}{" "}
        <button
          type="button"
          className="font-medium text-accent underline underline-offset-2"
          onClick={() => {
            setMode(mode === "login" ? "register" : "login");
            setProblem(null);
          }}
        >
          {mode === "login" ? "Create an account" : "Sign in"}
        </button>
      </p>
    </div>
  );
}
