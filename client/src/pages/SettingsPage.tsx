import { useState, type ReactNode } from "react";
import { useHousehold } from "../auth/HouseholdContext";
import { Button, Card, PageHeader } from "../components/ui";
import { Choice } from "../components/ChoiceCards";
import { HouseholdSize } from "../components/HouseholdSize";
import { usePrefs } from "../hooks/usePrefs";
import { useAsync } from "../hooks/useAsync";
import { messageOf } from "../lib/api";
import { api } from "../lib/client";
import { displayAmount, type Measure, type UnitSystem } from "../lib/convert";
import type { Member } from "../lib/types";
import { useOnboarding } from "../components/Onboarding";
import { useAuth } from "../auth/AuthContext";
import { clearSeen } from "../lib/seen";
import { getTheme, setTheme, type ThemeChoice } from "../lib/theme";

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
  const { prefs, householdUnitSystem, householdSize, savePrefs, saveHouseholdUnitSystem, saveHouseholdSize } = usePrefs();
  const members = useAsync(() => api.get<{ items: Member[] }>(`/api/households/${household._id}/members`), [household._id]);
  const isOwner = members.data?.items.find((m) => m.you)?.role === "owner";
  const { user } = useAuth();
  const { start } = useOnboarding();
  const [tipsReset, setTipsReset] = useState(false);
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
  const [theme, setThemeState] = useState<ThemeChoice>(getTheme);
  const example = displayAmount({ quantity: 2, unit: "cup" }, flour, prefs).text;

  return (
    <>
      <PageHeader title="Settings" subtitle="How Plantry looks and how amounts are shown to you." />

      <Section title="Appearance" note="Saved on this device only, so your phone and laptop can differ.">
        <Choice<ThemeChoice>
          name="Theme"
          columns={3}
          value={theme}
          onChange={(t) => {
            setTheme(t);
            setThemeState(t);
          }}
          options={[
            { value: "system", label: "Match device", hint: "follows your phone or computer" },
            { value: "light", label: "Light", hint: "always light" },
            { value: "dark", label: "Dark", hint: "always dark" },
          ]}
        />
      </Section>

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
        title="Household size"
        note={`How many people usually eat together at ${household.name}. New meal plan entries start with this many servings, and anyone in the household can change it.`}
      >
        <HouseholdSize value={householdSize} onSave={(n) => save(() => saveHouseholdSize(n))} />
      </Section>

      <Section
        title="Shopping list units"
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

      <Section title="Help" note="Saved on this device.">
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={start}>
            Replay the welcome tour
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              if (user) clearSeen(user.id, "tip.");
              setTipsReset(true);
            }}
          >
            Show the page guides again
          </Button>
        </div>
        {tipsReset ? <p role="status" className="text-sm text-muted">Done. The guides will open next time you visit Pantry and Recipes.</p> : null}
      </Section>

      <p role="status" className="text-sm text-muted">
        {status ?? ""}
      </p>
    </>
  );
}
