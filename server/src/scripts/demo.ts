/**
 * A narrated run of the whole workflow against a RUNNING server, for showing the app off.
 *
 *   npm run dev            (in one terminal: the API, with a real MongoDB)
 *   BASE_URL=http://localhost:3000 npx tsx src/scripts/demo.ts
 *
 * Safe to run repeatedly: each run signs up a fresh user (demo-<timestamp>@example.com) with its
 * own household. Auth routes are rate limited to 10 attempts per 15 minutes per IP, and a run
 * uses 2. Needs Node 18+ (built-in fetch).
 */
const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const TODAY = new Date().toISOString().slice(0, 10);

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
let token = "";

async function call(method: string, path: string, body?: unknown, expect: number[] = [200, 201, 204]): Promise<Json> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  const json = text ? (JSON.parse(text) as Json) : {};
  if (!expect.includes(res.status)) {
    throw new Error(`${method} ${path} -> ${res.status}\n${JSON.stringify(json, null, 2)}`);
  }
  return json;
}

const say = (s: string) => console.log(`\n== ${s}`);
const idOf = (o: Json) => String(o._id ?? o.id);
const day = (offset: number) => new Date(Date.parse(`${TODAY}T00:00:00Z`) + offset * 86_400_000).toISOString().slice(0, 10);
const rowsOf = (b: Json | Json[]): Json[] => (Array.isArray(b) ? b : b.items);

async function main() {
  say("1. Create an account and log in");
  const email = `demo-${Date.now()}@example.com`;
  await call("POST", "/api/auth/register", { name: "Demo Cook", email, password: "demo password 123" });
  token = (await call("POST", "/api/auth/login", { email, password: "demo password 123" })).token;
  console.log(`   signed in as ${email}`);

  say("2. Create a household");
  const h = idOf(await call("POST", "/api/households", { name: "Demo Kitchen" }));
  const base = `/api/households/${h}`;

  say("3. Stock the pantry");
  const make = async (b: Json) => idOf(await call("POST", `${base}/ingredients`, b));
  const pasta = await make({ name: "Pasta", category: "grains", baseUnitType: "mass" });
  const tomato = await make({ name: "Tomato", category: "produce", baseUnitType: "count" });
  const cheese = await make({ name: "Cheese", category: "dairy", baseUnitType: "mass" });
  await call("POST", `${base}/pantry`, { ingredientId: pasta, quantity: 500, unit: "g" });
  await call("POST", `${base}/pantry`, { ingredientId: tomato, quantity: 3, unit: "piece" });
  await call("POST", `${base}/pantry`, { ingredientId: cheese, quantity: 100, unit: "g", expirationDate: day(2), location: "fridge" });
  console.log(`   ${rowsOf(await call("GET", `${base}/pantry`)).length} items in the pantry`);

  say("4. Add recipes and see what can be cooked");
  const tp = idOf(await call("POST", `${base}/recipes`, { name: "Tomato pasta", servings: 2, ingredients: [
    { ingredientId: pasta, quantity: 200, unit: "g" }, { ingredientId: tomato, quantity: 2, unit: "piece" }, { ingredientId: cheese, quantity: 50, unit: "g" }] }));
  const bake = idOf(await call("POST", `${base}/recipes`, { name: "Cheesy bake", servings: 2, ingredients: [
    { ingredientId: pasta, quantity: 300, unit: "g" }, { ingredientId: cheese, quantity: 150, unit: "g" }] }));
  const match = await call("GET", `${base}/recipes/match?today=${TODAY}`);
  for (const m of match.matches as Json[]) {
    const miss = (m.missing as Json[]).map((x) => `${x.display.toBuy} ${x.display.unit} ${x.name}`).join(", ");
    console.log(`   ${m.canCook ? "can cook" : "missing "}  ${m.name}${miss ? `  (need: ${miss})` : ""}`);
  }

  say("5. Plan the week");
  const plan = await call("POST", `${base}/meal-plans`, { name: "Demo week", startDate: day(0), endDate: day(6), entries: [
    { date: day(0), slot: "dinner", recipeId: tp, servings: 4 },
    { date: day(2), slot: "dinner", recipeId: bake, servings: 2 }] });
  const planId = idOf(plan);

  say("6. Generate and tweak the shopping list");
  const url = `${base}/meal-plans/${planId}/shopping-list`;
  let list = await call("POST", url, { fromDate: TODAY });
  await call("POST", `${url}/custom-items`, { name: "Paper towels", quantity: 2 });
  list = await call("PATCH", `${url}/items/${String(list.items[0].ingredientId)}`, { checked: true });
  for (const i of list.items as Json[]) console.log(`   [${i.checked ? "x" : " "}] ${i.display.toBuy} ${i.display.unit} ${i.name}`);
  console.log("   [ ] 2 Paper towels (added by hand)");

  say("7. Cook tonight's dinner from the plan");
  const entry = idOf((plan.entries as Json[]).find((e) => String(e.recipeId) === tp) ?? {});
  const cook = await call("POST", `${base}/recipes/${tp}/cook`, { planId, entryId: entry, today: TODAY });
  const short = (cook.cookLog.shortfalls as Json[]).map((s) => s.name).join(", ");
  console.log(`   cooked ${cook.cookLog.servings} servings${short ? `; ran short of: ${short}` : ""}`);

  say("8. The dashboard");
  const d = await call("GET", `${base}/dashboard?today=${TODAY}`);
  console.log(`   pantry items: ${d.pantry.itemCount}, expiring soon: ${d.pantry.expiringSoon.count}, expired: ${d.pantry.expired.count}`);
  console.log(`   meals this week: ${d.upcomingMeals.plannedCount} to cook, ${d.upcomingMeals.cookedCount} cooked`);
  console.log(`   shopping list: ${d.shoppingList?.checked}/${d.shoppingList?.total} done (${d.shoppingList?.percentDone}%)`);
  console.log(`   recently cooked: ${(d.recentCooks as Json[]).map((c) => c.recipeName).join(", ") || "nothing"}`);
  console.log(`   recipes you can make right now: ${d.recipes.cookableNow} of ${d.recipes.count}`);

  say("Done. Pantry, recipes, plan, shopping list, cooking and dashboard all work end to end.");
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
