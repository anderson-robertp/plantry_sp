import { useState } from "react";
import { primeIngredientDetail } from "../hooks/useIngredientDetails";
import { messageOf } from "../lib/api";
import { api } from "../lib/client";
import { unitLabel } from "../lib/format";
import type { Ingredient, Unit } from "../lib/types";
import { describeNeed, gramsPerMlFromCup, typicalCupGrams, type WeightField } from "../lib/weights";
import { Button, Field, inputCls } from "./ui";

/**
 * Shown under a recipe line when its unit can't be converted for that ingredient yet. Asks for the
 * missing weight right there, once, instead of failing with an error when the recipe is saved.
 */
export function WeightPrompt({
  householdId,
  ingredient,
  unit,
  needs,
  alternative,
  onUseAlternative,
  onSaved,
}: {
  householdId: string;
  ingredient: { id: string; name: string; shared: boolean | undefined };
  unit: Unit;
  needs: WeightField[];
  /** a unit that always works for this ingredient, offered as the easy way out */
  alternative: Unit;
  onUseAlternative: () => void;
  onSaved: (updated: Ingredient) => void;
}) {
  const [cupG, setCupG] = useState("");
  const [pieceG, setPieceG] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const needCup = needs.includes("gramsPerMl");
  const needPiece = needs.includes("gramsPerPiece");
  const typical = needCup ? typicalCupGrams(ingredient.name) : null;

  const save = async () => {
    const cup = Number(cupG);
    const piece = Number(pieceG);
    if ((needCup && !(cup > 0)) || (needPiece && !(piece > 0))) {
      setProblem("Enter the weight in grams, as a number above zero.");
      return;
    }
    setProblem(null);
    setBusy(true);
    try {
      const updated = await api.patch<Ingredient>(`/api/households/${householdId}/ingredients/${ingredient.id}`, {
        ...(needCup ? { gramsPerMl: Math.round(gramsPerMlFromCup(cup) * 10_000) / 10_000 } : {}),
        ...(needPiece ? { gramsPerPiece: piece } : {}),
      });
      primeIngredientDetail(householdId, updated);
      onSaved(updated);
    } catch (e) {
      setProblem(messageOf(e));
    } finally {
      setBusy(false);
    }
  };

  // The shared catalog can't be edited from a household, so the way forward is a different unit.
  if (ingredient.shared) {
    return (
      <div role="note" className="col-span-full rounded-md bg-warn-bg px-3 py-2 text-sm text-warn">
        <p>
          Plantry doesn&rsquo;t know {describeNeed(needs)} for <strong>{ingredient.name}</strong>, so it can&rsquo;t use {unitLabel(unit)} here. Use {unitLabel(alternative)} instead.
        </p>
        <div className="mt-2">
          <Button variant="secondary" onClick={onUseAlternative}>
            Use {unitLabel(alternative)}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div role="group" aria-label={`Weight for ${ingredient.name}`} className="col-span-full rounded-md border border-accent/40 bg-soft px-3 py-3 text-sm text-ink">
      <p>
        To use {unitLabel(unit)} with <strong>{ingredient.name}</strong>, Plantry needs {describeNeed(needs)}. It only asks once.
      </p>
      <div className="mt-2 grid gap-3 sm:grid-cols-2">
        {needCup ? (
          <Field label="1 cup weighs (g)" hint={typical ? `Typical: about ${typical} g` : "Flour about 120, sugar about 200, milk about 245"}>
            <input className={inputCls} inputMode="decimal" value={cupG} onChange={(e) => setCupG(e.target.value)} />
            {typical && cupG.trim() === "" ? (
              <button type="button" className="min-h-9 text-left text-sm font-medium text-accent hover:underline" onClick={() => setCupG(String(typical))}>
                Use {typical} g
              </button>
            ) : null}
          </Field>
        ) : null}
        {needPiece ? (
          <Field label="One piece weighs (g)" hint="A can of pork and beans is about 430">
            <input className={inputCls} inputMode="decimal" value={pieceG} onChange={(e) => setPieceG(e.target.value)} />
          </Field>
        ) : null}
      </div>
      {problem ? (
        <p role="alert" className="mt-2 text-bad">
          {problem}
        </p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2 max-sm:[&>button]:flex-1">
        <Button onClick={save} disabled={busy}>
          {busy ? "Saving…" : "Save weight"}
        </Button>
        <Button variant="ghost" onClick={onUseAlternative}>
          Use {unitLabel(alternative)} instead
        </Button>
      </div>
    </div>
  );
}
