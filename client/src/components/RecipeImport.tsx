import { useState, type FormEvent } from "react";
import { api } from "../lib/client";
import type { ImportPreview } from "../lib/types";
import { Button, ErrorBanner, Field, inputCls } from "./ui";

/** Step one of importing: paste a link, read the page. Nothing is saved here. */
export function RecipeImportStart({
  householdId,
  onPreview,
  onCancel,
}: {
  householdId: string;
  onPreview: (p: ImportPreview) => void;
  onCancel: () => void;
}) {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<unknown>(null);
  const [localError, setLocalError] = useState<string | undefined>();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const text = url.trim();
    if (!/^https?:\/\/\S+\.\S+/i.test(text)) {
      setLocalError("Paste the full web address of the recipe, starting with https://");
      return;
    }
    setLocalError(undefined);
    setProblem(null);
    setBusy(true);
    try {
      onPreview(await api.post<ImportPreview>(`/api/households/${householdId}/recipe-imports/preview`, { url: text }));
    } catch (err) {
      setProblem(err);
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-3" noValidate>
      <Field
        label="Recipe web address"
        htmlFor="import-url"
        hint="Works with most recipe sites. We read the recipe, then you review it before anything is saved."
        error={localError}
      >
        <input
          id="import-url"
          className={inputCls}
          type="url"
          inputMode="url"
          autoCapitalize="none"
          autoCorrect="off"
          placeholder="https://…"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          autoFocus
        />
      </Field>
      {problem ? <ErrorBanner error={problem} /> : null}
      <div className="flex justify-end gap-2 max-sm:[&>button]:flex-1">
        <Button variant="ghost" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" disabled={busy || url.trim() === ""}>
          {busy ? "Reading the page…" : "Get recipe"}
        </Button>
      </div>
      {busy ? (
        <p role="status" className="text-sm text-muted">
          Fetching the page and matching ingredients. This can take a few seconds.
        </p>
      ) : null}
    </form>
  );
}
