import { afterAll, beforeAll, describe, expect, it } from "@jest/globals";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";


/**
 * The whole product, start to finish, against a real (in-memory) MongoDB and the real Express app:
 * sign up, pantry, recipes, matching, a meal plan, a shopping list you can edit, cooking, undo, and
 * the dashboard. Steps run in order and share state, like a person using the app.
 *
 * Needs: npm i -D supertest @types/supertest mongodb-memory-server
 * Also needs src/app.ts to `export const app` (or default) WITHOUT calling listen/connect. Keep
 * that in server.ts. The first run downloads a MongoDB binary (~100 MB), so allow a minute.
 *
 * Route paths are gathered in P so a mismatch with your app is a one-line fix.
 */
const P = {
  register: "/api/auth/register",
  login: "/api/auth/login",
  me: "/api/auth/me",
  households: "/api/households",
  ingredients: (h: string) => `/api/households/${h}/ingredients`,
  pantry: (h: string) => `/api/households/${h}/pantry`,
  recipes: (h: string) => `/api/households/${h}/recipes`,
  plans: (h: string) => `/api/households/${h}/meal-plans`,
  cooks: (h: string) => `/api/households/${h}/cooks`,
  dashboard: (h: string) => `/api/households/${h}/dashboard`,
};

const TODAY = "2026-10-17";

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

let mongod: MongoMemoryServer;
let api: ReturnType<typeof request>;

const auth = (t: string) => ({ Authorization: `Bearer ${t}` });
const idOf = (o: Json): string => String(o._id ?? o.id);
const asList = (b: Json | Json[]): Json[] => (Array.isArray(b) ? b : (b.items as Json[]));

// shared state
let token = "";
let household = "";
type IngredientKey = "pasta" | "tomato" | "cheese" | "milk";
type RecipeKey = "tomatoPasta" | "cheesyBake";
const ing = {} as Record<IngredientKey, string>;
const recipe = {} as Record<RecipeKey, string>;
let planId = "";
let tomatoPastaEntry = "";
let cookId = "";

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  process.env.NODE_ENV = "test";
  process.env.JWT_SECRET = "e2e-secret-e2e-secret-e2e-secret-1234";
  process.env.MONGODB_URI = mongod.getUri("plantry_e2e");
  await mongoose.connect(process.env.MONGODB_URI);
  await import("../config/zod-extend.js");
  const mod = await import("../app.js"); // after the env is set, because config is read on import
  api = request((mod as Json).app ?? (mod as Json).default);
}, 120_000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

describe("1. account", () => {
  it("registers, logs in, and sees who they are", async () => {
    const reg = await api.post(P.register).send({ name: "Sam", email: "Sam@Example.com", password: "correct horse" });
    expect(reg.status).toBe(201);
    expect(reg.body.user).toMatchObject({ name: "Sam", email: "sam@example.com" });
    expect(JSON.stringify(reg.body)).not.toMatch(/passwordHash|correct horse/);

    const login = await api.post(P.login).send({ email: "sam@example.com", password: "correct horse" });
    expect(login.status).toBe(200);
    token = login.body.token;
    expect(token).toBeTruthy();

    const me = await api.get(P.me).set(auth(token));
    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe("sam@example.com");
  });

  it("rejects bad credentials the same way for a wrong password and an unknown email", async () => {
    const wrong = await api.post(P.login).send({ email: "sam@example.com", password: "nope nope nope" });
    const unknown = await api.post(P.login).send({ email: "ghost@example.com", password: "nope nope nope" });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(unknown.body).toEqual(wrong.body);
  });

  it("refuses duplicates, weak passwords and requests with no or a bad token", async () => {
    expect((await api.post(P.register).send({ name: "Sam 2", email: "sam@example.com", password: "another pass" })).status).toBe(409);
    expect((await api.post(P.register).send({ name: "X", email: "x@example.com", password: "short" })).status).toBe(422);
    expect((await api.get(P.me)).status).toBe(401);
    expect((await api.get(P.me).set(auth("not.a.token"))).status).toBe(401);
  });
});

describe("2. household", () => {
  it("creates a household, and the free plan stops a second one", async () => {
    const res = await api.post(P.households).set(auth(token)).send({ name: "Home" });
    expect(res.status).toBe(201);
    household = idOf(res.body);

    const second = await api.post(P.households).set(auth(token)).send({ name: "Cabin" });
    expect(second.status).toBe(403);
    expect(second.body.error.code).toBe("plan_limit_reached");
  });

  it("keeps other people out", async () => {
    const reg = await api.post(P.register).send({ name: "Eve", email: "eve@example.com", password: "eve password" });
    const eve = reg.body.token as string;
    expect([403, 404]).toContain((await api.get(P.pantry(household)).set(auth(eve))).status);
    expect([403, 404]).toContain((await api.get(P.recipes(household)).set(auth(eve))).status);
    expect((await api.get(P.pantry(household))).status).toBe(401);
  });
});

describe("3. pantry", () => {
  it("creates ingredients and stocks the pantry", async () => {
    const make = async (key: IngredientKey, body: Json) => {
      const res = await api.post(P.ingredients(household)).set(auth(token)).send(body);
      expect(res.status).toBe(201);
      ing[key] = idOf(res.body);
    };
    await make("pasta", { name: "Pasta", category: "grains", baseUnitType: "mass" });
    await make("tomato", { name: "Tomato", category: "produce", baseUnitType: "count" });
    await make("cheese", { name: "Cheese", category: "dairy", baseUnitType: "mass" });
    await make("milk", { name: "Milk", category: "dairy", baseUnitType: "volume", gramsPerMl: 1.03 });

    const stock = [
      { ingredientId: ing.pasta, quantity: 500, unit: "g" },
      { ingredientId: ing.tomato, quantity: 3, unit: "piece" },
      { ingredientId: ing.cheese, quantity: 100, unit: "g", expirationDate: "2026-10-19", location: "fridge" },
      { ingredientId: ing.milk, quantity: 1, unit: "l", expirationDate: "2026-10-10", location: "fridge" },
    ];
    for (const item of stock) {
      expect((await api.post(P.pantry(household)).set(auth(token)).send(item)).status).toBe(201);
    }
    const list = await api.get(P.pantry(household)).set(auth(token));
    expect(list.status).toBe(200);
    expect(asList(list.body)).toHaveLength(4);
  });

  it("rejects a bad item", async () => {
    const res = await api.post(P.pantry(household)).set(auth(token)).send({ ingredientId: ing.pasta, quantity: -5, unit: "g" });
    expect(res.status).toBe(422);
  });
});

describe("4. recipes and matching", () => {
  it("creates two recipes", async () => {
    const make = async (key: RecipeKey, body: Json) => {
      const res = await api.post(P.recipes(household)).set(auth(token)).send(body);
      expect(res.status).toBe(201);
      recipe[key] = idOf(res.body);
    };
    await make("tomatoPasta", {
      name: "Tomato pasta", servings: 2,
      ingredients: [
        { ingredientId: ing.pasta, quantity: 200, unit: "g" },
        { ingredientId: ing.tomato, quantity: 2, unit: "piece" },
        { ingredientId: ing.cheese, quantity: 50, unit: "g" },
      ],
    });
    await make("cheesyBake", {
      name: "Cheesy bake", servings: 2,
      ingredients: [
        { ingredientId: ing.pasta, quantity: 300, unit: "g" },
        { ingredientId: ing.cheese, quantity: 150, unit: "g" },
      ],
    });
  });

  it("ranks what the pantry can make and says what's missing", async () => {
    const res = await api.get(`${P.recipes(household)}/match`).query({ today: TODAY }).set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.cookableCount).toBe(1);
    const matches = res.body.matches as Json[];
    const first = matches[0]!;
    const second = matches[1]!;
    expect(first).toMatchObject({ name: "Tomato pasta", canCook: true, coverage: 1 });
    expect(second).toMatchObject({ name: "Cheesy bake", canCook: false, coverage: 0.5 });
    expect(second.missing).toHaveLength(1);
    expect(second.missing[0]).toMatchObject({ name: "Cheese", missing: 50 });
  });

  it("answers for a single recipe, and can filter to cookable ones", async () => {
    const one = await api.get(`${P.recipes(household)}/${recipe.cheesyBake}/availability`).query({ today: TODAY }).set(auth(token));
    expect(one.status).toBe(200);
    expect(one.body).toMatchObject({ canCook: false });
    expect(one.body.missing[0].name).toBe("Cheese");

    const only = await api.get(`${P.recipes(household)}/match`).query({ today: TODAY, canCookOnly: "true" }).set(auth(token));
    expect((only.body.matches as Json[]).map((m) => m.name)).toEqual(["Tomato pasta"]);
  });
});

describe("5. meal plan and shopping list", () => {
  it("creates a plan for the week", async () => {
    const res = await api.post(P.plans(household)).set(auth(token)).send({
      name: "This week", startDate: TODAY, endDate: "2026-10-23",
      entries: [
        { date: TODAY, slot: "dinner", recipeId: recipe.tomatoPasta, servings: 4 },
        { date: "2026-10-19", slot: "dinner", recipeId: recipe.cheesyBake, servings: 2 },
      ],
    });
    expect(res.status).toBe(201);
    planId = idOf(res.body);
    const entries = res.body.entries as Json[];
    tomatoPastaEntry = idOf(entries.find((e) => String(e.recipeId) === recipe.tomatoPasta)!);
  });

  const listUrl = () => `${P.plans(household)}/${planId}/shopping-list`;
  const generate = () => api.post(listUrl()).set(auth(token)).send({ fromDate: TODAY });
  const find = (list: Json, name: string) => (list.items as Json[]).find((i) => i.name === name)!;

  it("generates a list of only what's missing, in aisle order", async () => {
    const res = await generate();
    expect(res.status).toBe(200);
    const items = res.body.items as Json[];
    expect(items.map((i) => i.name)).toEqual(["Tomato", "Cheese", "Pasta"]); // produce, dairy, grains
    expect(find(res.body, "Pasta").display).toMatchObject({ unit: "g", toBuy: 200 });
    expect(find(res.body, "Tomato").display).toMatchObject({ unit: "piece", toBuy: 1 });
    expect(find(res.body, "Cheese").display).toMatchObject({ unit: "g", toBuy: 150 });
  });

  it("lets you add, edit, check and remove items", async () => {
    const add = await api.post(`${listUrl()}/custom-items`).set(auth(token)).send({ name: "Paper towels", quantity: 2 });
    expect(add.status).toBe(201);
    expect(add.body.extraItems).toHaveLength(1);
    const towelsId = idOf(add.body.extraItems[0]);

    const tomatoId = String(find(add.body, "Tomato").ingredientId);
    expect((await api.patch(`${listUrl()}/items/${tomatoId}`).set(auth(token)).send({ checked: true })).status).toBe(200);
    const adjusted = await api.patch(`${listUrl()}/items/${String(find(add.body, "Pasta").ingredientId)}`).set(auth(token)).send({ quantity: 1, unit: "kg" });
    expect(find(adjusted.body, "Pasta")).toMatchObject({ adjusted: true, display: { unit: "kg", toBuy: 1 } });

    expect((await api.patch(`${listUrl()}/custom-items/${towelsId}`).set(auth(token)).send({ checked: true })).status).toBe(200);

    const candles = await api.post(`${listUrl()}/custom-items`).set(auth(token)).send({ name: "Candles" });
    const candlesId = idOf(candles.body.extraItems[1]);
    const removed = await api.delete(`${listUrl()}/custom-items/${candlesId}`).set(auth(token));
    expect(removed.status).toBe(200);
    expect(removed.body.extraItems).toHaveLength(1);

    expect((await api.patch(`${listUrl()}/custom-items/${candlesId}`).set(auth(token)).send({ checked: true })).status).toBe(404);
    expect((await api.post(`${listUrl()}/custom-items`).set(auth(token)).send({ name: "  " })).status).toBe(422);
  });

  it("regenerating recomputes the plan's items but keeps added items and check marks", async () => {
    const cheeseId = String(find((await api.get(listUrl()).set(auth(token))).body, "Cheese").ingredientId);
    const del = await api.delete(`${listUrl()}/items/${cheeseId}`).set(auth(token));
    expect((del.body.items as Json[]).map((i) => i.name)).toEqual(["Tomato", "Pasta"]);

    const res = await generate();
    expect((res.body.items as Json[]).map((i) => i.name)).toEqual(["Tomato", "Cheese", "Pasta"]); // cheese is back
    expect(find(res.body, "Pasta").display).toMatchObject({ unit: "g", toBuy: 200 }); // the hand edit is gone
    expect(find(res.body, "Tomato").checked).toBe(true); // kept
    expect(res.body.extraItems).toHaveLength(1); // kept
    expect(res.body.extraItems[0]).toMatchObject({ name: "Paper towels", checked: true });
  });
});

describe("6. dashboard", () => {
  it("summarizes the household", async () => {
    const res = await api.get(P.dashboard(household)).query({ today: TODAY }).set(auth(token));
    expect(res.status).toBe(200);
    const d = res.body as Json;
    expect(d.pantry.itemCount).toBe(4);
    expect(d.pantry.expiringSoon.items.map((i: Json) => [i.name, i.daysLeft])).toEqual([["Cheese", 2]]);
    expect(d.pantry.expired.items.map((i: Json) => [i.name, i.daysLeft])).toEqual([["Milk", -7]]);
    expect(d.upcomingMeals).toMatchObject({ plannedCount: 2, cookedCount: 0 });
    expect(d.upcomingMeals.meals.map((m: Json) => m.recipeName)).toEqual(["Tomato pasta", "Cheesy bake"]);
    expect(d.shoppingList).toMatchObject({ planId, total: 4, checked: 2, remaining: 2, percentDone: 50 });
    expect(d.recentCooks).toEqual([]);
    expect(d.recipes).toEqual({ count: 2, cookableNow: 1 });
  });
});

describe("7. cooking and undo", () => {
  it("cooks the planned meal: uses the pantry, reports a shortfall, marks the plan", async () => {
    const res = await api.post(`${P.recipes(household)}/${recipe.tomatoPasta}/cook`).set(auth(token)).send({ planId, entryId: tomatoPastaEntry, today: TODAY });
    expect(res.status).toBe(201);
    cookId = idOf(res.body.cookLog);
    expect(res.body.cookLog.servings).toBe(4);
    expect(res.body.cookLog.shortfalls).toHaveLength(1); // 4 tomatoes needed, 3 on hand
    expect(res.body.cookLog.shortfalls[0]).toMatchObject({ name: "Tomato", baseQuantity: 1 });

    const rows = asList((await api.get(P.pantry(household)).set(auth(token))).body);
    const byIngredient = new Map(rows.map((r) => [String(r.ingredientId), r]));
    expect(byIngredient.get(ing.pasta)).toMatchObject({ quantity: 100 });
    expect(byIngredient.has(ing.tomato)).toBe(false); // used up completely
    expect(byIngredient.has(ing.cheese)).toBe(false);
    expect(rows).toHaveLength(2); // pasta and the old milk

    const plan = await api.get(`${P.plans(household)}/${planId}`).set(auth(token));
    const entry = (plan.body.entries as Json[]).find((e) => idOf(e) === tomatoPastaEntry)!;
    expect(entry.cookedAt).toBeTruthy();
  });

  it("won't cook the same planned meal twice", async () => {
    const again = await api.post(`${P.recipes(household)}/${recipe.tomatoPasta}/cook`).set(auth(token)).send({ planId, entryId: tomatoPastaEntry, today: TODAY });
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe("already_cooked");
  });

  it("the dashboard follows along", async () => {
    const d = (await api.get(P.dashboard(household)).query({ today: TODAY }).set(auth(token))).body as Json;
    expect(d.upcomingMeals).toMatchObject({ plannedCount: 1, cookedCount: 1 });
    expect(d.recentCooks.map((c: Json) => c.recipeName)).toEqual(["Tomato pasta"]);
  });

  it("lets you cook on a whim, without a plan", async () => {
    const res = await api.post(`${P.recipes(household)}/${recipe.cheesyBake}/cook`).set(auth(token)).send({ today: TODAY, servings: 1 });
    expect(res.status).toBe(201); // the pantry is nearly bare now: still recorded, with shortfalls
    expect(res.body.cookLog.shortfalls.map((s: Json) => s.name).sort()).toEqual(["Cheese", "Pasta"]);
    const undo = await api.post(`${P.cooks(household)}/${idOf(res.body.cookLog)}/undo`).set(auth(token));
    expect(undo.status).toBe(200);
  });

  it("undoes the planned cook: pantry and plan go back as they were", async () => {
    const undo = await api.post(`${P.cooks(household)}/${cookId}/undo`).set(auth(token));
    expect(undo.status).toBe(200);

    const rows = asList((await api.get(P.pantry(household)).set(auth(token))).body);
    expect(rows).toHaveLength(4);
    const by = new Map(rows.map((r) => [String(r.ingredientId), r]));
    expect(by.get(ing.pasta)).toMatchObject({ quantity: 500 });
    expect(by.get(ing.tomato)).toMatchObject({ quantity: 3 });
    expect(by.get(ing.cheese)).toMatchObject({ quantity: 100 });
    expect(String(by.get(ing.cheese)!.expirationDate).slice(0, 10)).toBe("2026-10-19"); // expiry kept

    const plan = await api.get(`${P.plans(household)}/${planId}`).set(auth(token));
    expect((plan.body.entries as Json[]).every((e) => !e.cookedAt)).toBe(true);

    const d = (await api.get(P.dashboard(household)).query({ today: TODAY }).set(auth(token))).body as Json;
    expect(d.recentCooks).toEqual([]);
    expect(d.pantry.expiringSoon.items.map((i: Json) => i.name)).toEqual(["Cheese"]);

    const twice = await api.post(`${P.cooks(household)}/${cookId}/undo`).set(auth(token));
    expect(twice.status).toBe(409);
    expect(twice.body.error.code).toBe("already_undone");
  });
});
