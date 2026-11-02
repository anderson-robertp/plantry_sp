import type { PackageDef } from "../utils/packages.js";
import type { Unit } from "../utils/units.js";
import { GLOBAL_INGREDIENTS, type SeedIngredient } from "./globalIngredients.js";

/**
 * How each shared catalog ingredient is usually sold, so shopping lists can say "3 cans".
 *
 * Typical US grocery sizes, one per ingredient. Real stores vary (a bag of rice can be 1, 2 or
 * 5 lb), so treat these as sensible defaults, not facts. Where a product is sold by weight but
 * the ingredient is measured by volume (honey, yogurt, ketchup), the size is the label weight
 * divided by the density, rounded.
 *
 * Left out on purpose: loose produce and cuts sold by the pound (the list already shows pounds
 * or pieces) and water.
 *
 * Keys must match catalog names exactly. catalogPackages.test.ts fails on a typo.
 */
const pkg = (label: string, size: number, unit: Unit): PackageDef => ({ label, size, unit });

export const CATALOG_PACKAGES: Readonly<Record<string, PackageDef>> = {
  // produce
  "Garlic clove": pkg("head", 10, "piece"),
  "Green onion": pkg("bunch", 6, "piece"),
  "Celery stalk": pkg("bunch", 8, "piece"),
  Carrot: pkg("bag", 15, "piece"), // a 2 lb bag
  "Russet potato": pkg("bag", 13, "piece"), // a 5 lb bag
  "Cherry tomato": pkg("pint", 16, "piece"),
  Banana: pkg("bunch", 5, "piece"),
  Mushrooms: pkg("pack", 8, "oz"),
  "Baby spinach": pkg("bag", 5, "oz"),
  Kale: pkg("bag", 12, "oz"),
  "Fresh cilantro": pkg("bunch", 2, "oz"),
  "Fresh parsley": pkg("bunch", 2, "oz"),
  "Fresh basil": pkg("pack", 0.75, "oz"),

  // meat and fish
  "Chicken breast": pkg("pack", 1.5, "lb"),
  "Chicken thighs": pkg("pack", 1.5, "lb"),
  "Ground beef": pkg("pack", 1, "lb"),
  "Ground turkey": pkg("pack", 1, "lb"),
  "Ground pork": pkg("pack", 1, "lb"),
  "Beef steak": pkg("pack", 1, "lb"),
  "Pork chops": pkg("pack", 1.5, "lb"),
  Bacon: pkg("pack", 12, "oz"),
  "Italian sausage": pkg("pack", 1, "lb"),
  "Salmon fillet": pkg("pack", 1, "lb"),
  Shrimp: pkg("bag", 1, "lb"),
  "Canned tuna": pkg("can", 5, "oz"),

  // dairy and eggs
  Egg: pkg("carton", 12, "piece"),
  Milk: pkg("carton", 64, "fl_oz"), // half gallon
  Buttermilk: pkg("carton", 32, "fl_oz"),
  "Heavy cream": pkg("carton", 16, "fl_oz"),
  "Half-and-half": pkg("carton", 16, "fl_oz"),
  "Plain yogurt": pkg("tub", 880, "ml"), // 32 oz
  "Sour cream": pkg("tub", 470, "ml"), // 16 oz
  Butter: pkg("box", 1, "lb"), // four sticks
  "Cream cheese": pkg("block", 8, "oz"),
  "Cheddar cheese": pkg("bag", 8, "oz"),
  "Mozzarella cheese": pkg("bag", 8, "oz"),
  "Parmesan cheese": pkg("container", 5, "oz"),
  "Feta cheese": pkg("tub", 6, "oz"),

  // grains, pasta, bread
  "White rice": pkg("bag", 2, "lb"),
  "Brown rice": pkg("bag", 2, "lb"),
  Pasta: pkg("box", 1, "lb"),
  Quinoa: pkg("bag", 12, "oz"),
  Couscous: pkg("box", 10, "oz"),
  "Rolled oats": pkg("canister", 18, "oz"),
  "Dried lentils": pkg("bag", 1, "lb"),
  "Sandwich bread": pkg("loaf", 20, "piece"), // slices
  "Flour tortilla": pkg("pack", 10, "piece"),

  // baking
  "All-purpose flour": pkg("bag", 5, "lb"),
  "Bread flour": pkg("bag", 5, "lb"),
  "Whole wheat flour": pkg("bag", 5, "lb"),
  "Granulated sugar": pkg("bag", 4, "lb"),
  "Brown sugar": pkg("bag", 2, "lb"),
  "Powdered sugar": pkg("bag", 2, "lb"),
  "Baking powder": pkg("can", 8, "oz"),
  "Baking soda": pkg("box", 16, "oz"),
  Cornstarch: pkg("box", 16, "oz"),
  "Cocoa powder": pkg("can", 8, "oz"),
  "Chocolate chips": pkg("bag", 12, "oz"),
  "Active dry yeast": pkg("jar", 4, "oz"),
  Breadcrumbs: pkg("canister", 15, "oz"),
  "Vanilla extract": pkg("bottle", 2, "fl_oz"),
  Honey: pkg("bottle", 240, "ml"), // 12 oz
  "Maple syrup": pkg("bottle", 12, "fl_oz"),
  Almonds: pkg("bag", 16, "oz"),
  Walnuts: pkg("bag", 16, "oz"),

  // oils, sauces, condiments
  "Olive oil": pkg("bottle", 500, "ml"),
  "Vegetable oil": pkg("bottle", 48, "fl_oz"),
  "Sesame oil": pkg("bottle", 5, "fl_oz"),
  "Soy sauce": pkg("bottle", 10, "fl_oz"),
  Ketchup: pkg("bottle", 490, "ml"), // 20 oz
  Mayonnaise: pkg("jar", 30, "fl_oz"),
  "Yellow mustard": pkg("bottle", 215, "ml"), // 8 oz
  "Dijon mustard": pkg("jar", 325, "ml"), // 12 oz
  "Hot sauce": pkg("bottle", 5, "fl_oz"),
  "White vinegar": pkg("bottle", 32, "fl_oz"),
  "Apple cider vinegar": pkg("bottle", 16, "fl_oz"),
  "Balsamic vinegar": pkg("bottle", 500, "ml"),
  "Worcestershire sauce": pkg("bottle", 10, "fl_oz"),
  "Barbecue sauce": pkg("bottle", 425, "ml"), // 18 oz
  Salsa: pkg("jar", 16, "fl_oz"),
  "Tomato paste": pkg("can", 155, "ml"), // 6 oz
  "Peanut butter": pkg("jar", 415, "ml"), // 16 oz
  "Lemon juice": pkg("bottle", 8, "fl_oz"),
  "Lime juice": pkg("bottle", 8, "fl_oz"),

  // spices and seasonings
  Salt: pkg("container", 26, "oz"),
  "Black pepper": pkg("jar", 3, "oz"),
  "Garlic powder": pkg("jar", 3, "oz"),
  "Onion powder": pkg("jar", 2.6, "oz"),
  Paprika: pkg("jar", 2.5, "oz"),
  "Ground cumin": pkg("jar", 2, "oz"),
  "Chili powder": pkg("jar", 2.5, "oz"),
  "Ground cinnamon": pkg("jar", 2.4, "oz"),
  "Dried oregano": pkg("jar", 0.75, "oz"),
  "Dried thyme": pkg("jar", 0.75, "oz"),
  "Dried basil": pkg("jar", 0.6, "oz"),
  "Red pepper flakes": pkg("jar", 1.5, "oz"),
  "Ground turmeric": pkg("jar", 2, "oz"),
  "Ground ginger": pkg("jar", 1.5, "oz"),
  "Ground nutmeg": pkg("jar", 1.1, "oz"),
  "Curry powder": pkg("jar", 2, "oz"),
  "Bay leaf": pkg("jar", 20, "piece"),

  // canned and jarred
  "Diced tomatoes": pkg("can", 410, "ml"), // 14.5 oz
  "Crushed tomatoes": pkg("can", 765, "ml"), // 28 oz
  "Tomato sauce": pkg("can", 410, "ml"), // 15 oz
  "Chicken broth": pkg("carton", 32, "fl_oz"),
  "Vegetable broth": pkg("carton", 32, "fl_oz"),
  "Beef broth": pkg("carton", 32, "fl_oz"),
  "Coconut milk": pkg("can", 13.5, "fl_oz"),
  "Black beans": pkg("can", 15, "oz"),
  Chickpeas: pkg("can", 15, "oz"),
  "Kidney beans": pkg("can", 15, "oz"),
  "Canned corn": pkg("can", 15, "oz"),

  // frozen
  "Frozen peas": pkg("bag", 12, "oz"),
  "Frozen corn": pkg("bag", 12, "oz"),
  "Frozen mixed vegetables": pkg("bag", 12, "oz"),
  "Frozen berries": pkg("bag", 12, "oz"),

  // beverages and other
  "Orange juice": pkg("carton", 52, "fl_oz"),
  "White wine": pkg("bottle", 750, "ml"),
  "Red wine": pkg("bottle", 750, "ml"),
  Tofu: pkg("block", 14, "oz"),
};

export type SeedWithPackage = SeedIngredient & { package?: PackageDef | undefined };

/** The catalog entries with their package sizes attached, ready for the seed. */
export function withPackages(items: readonly SeedIngredient[] = GLOBAL_INGREDIENTS): SeedWithPackage[] {
  return items.map((item) => {
    const p = CATALOG_PACKAGES[item.name];
    return p ? { ...item, package: p } : item;
  });
}
