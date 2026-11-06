import { useState, type ReactNode } from "react";
import { useHousehold } from "../auth/HouseholdContext";
import { Card, PageHeader } from "../components/ui";
import { usePrefs } from "../hooks/usePrefs";
import { useAsync } from "../hooks/useAsync";
import { messageOf } from "../lib/api";
import { api } from "../lib/client";
import { displayAmount, type Measure, type UnitSystem } from "../lib/convert";
import type { Member } from "../lib/types";

function Choice<T extends string>({
  name,
  value,
  options,
  onChange,
  disabled,
}: {
  name: string;
  value: T;
  options: { value: T; label: string; hint: string }[];
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label={name} className="grid gap-2 sm:grid-cols-2">
      {options.map((o) => (
        <label
          key={o.value}
          className={`cursor-pointer rounded-xl border p-3 ${value === o.value ? "border-accent bg-soft" : "border-line bg-surface"} ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
        >
          <input type="radio" name={name} className="sr-only" checked={value === o.value} disabled={disabled} onChange={() => onChange(o.value)} />
          <span className="block font-medium">{o.label}</span>
          <span className="block text-sm text-muted">{o.hint}</span>
        </label>
      ))}
    </div>
  );
}

function Section({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <Card className="mb-5 grid gap-3">
      <div>
        <h2 className="font-medium">{title}</h2>
        {note ? <p className="text-sm text-muted">{note}</p> : null}
      </div>
      {children}
    </Card>
  );
}

export function SettingsPage() {
  const { household } = useHousehold();
  const { prefs, householdUnitSystem, savePrefs, saveHouseholdUnitSystem } = usePrefs();
  const members = useAsync(() => api.get<{ items: Member[] }>(`/api/households/${household._id}/members`), [household._id]);
  const isOwner = members.data?.items.find((m) => m.you)?.role === "owner";
  const [status, setStatus] = useState<string | null>(null);

  const save = async (fn: () => Promise<void>) => {
    setStatus("Saving…");
    try {
      await fn();
      setStatus("Saved");
    } catch (e) {
      setStatus(`Couldn't save: ${messageOf(e)}`);
    }
  };

  // a live example, so the effect of a choice is visible
  const flour = { baseUnitType: "mass", gramsPerMl: 0.53 } as const;
  const example = displayAmount({ quantity: 2, unit: "cup" }, flour, prefs).text;

  return (
    <>
      <PageHeader title="Settings" subtitle="How amounts are shown to you." />

      <Section title="Your units" note="Only affects how you see recipes and which unit new ingredients start with. Others in your household choose their own.">
        <Choice<UnitSystem>
          name="Unit system"
          value={prefs.unitSystem}
          onChange={(unitSystem) => save(() => savePrefs({ unitSystem }))}
          options={[
            { value: "us", label: "US", hint: "cups, ounces, pounds" },
            { value: "metric", label: "Metric", hint: "millilitres, grams, kilograms" },
          ]}
        />
        <Choice<Measure>
          name="Dry ingredients"
          value={prefs.measure}
          onChange={(measure) => save(() => savePrefs({ measure }))}
          options={[
            { value: "volume", label: "By volume", hint: "flour, sugar and rice in cups" },
            { value: "weight", label: "By weight", hint: "flour, sugar and rice in grams or ounces" },
          ]}
        />
        <p className="text-sm">
          Example: &ldquo;2 cups of flour&rdquo; reads as <strong>{example}</strong>. Liquids, spoonfuls and counts like eggs stay as they are, and anything that
          can't be converted shows as it was written.
        </p>
      </Section>

      <Section
        title="Household"
        note={`Shopping lists for ${household.name} use one unit system so everyone reads the same list.${isOwner ? "" : " Only the owner can change this."}`}
      >
        <Choice<UnitSystem>
          name="Shopping list units"
          value={householdUnitSystem}
          disabled={!isOwner}
          onChange={(unitSystem) => save(() => saveHouseholdUnitSystem(unitSystem))}
          options={[
            { value: "us", label: "US", hint: "pounds, ounces, cups" },
            { value: "metric", label: "Metric", hint: "kilograms, grams, litres" },
          ]}
        />
      </Section>

      <p role="status" className="text-sm text-muted">
        {status ?? ""}
      </p>
    </>
  );
}
