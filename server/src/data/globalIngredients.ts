import type { IngredientCategory } from "../utils/constants.js";
import type { Unit, UnitType } from "../utils/units.js";

/**
 * The shared ingredient catalog every household can use. Seeded by scripts/seedIngredients.ts.
 *
 * Densities and piece weights are rounded averages (USDA FoodData Central and common baking
 * references). They are good enough to compare "2 cups flour" against a 5 lb bag, not for lab
 * work. Brands, grind and how tightly something is packed all move the numbers a few percent.
 *
 *   baseUnitType: how quantities are stored (mass = g, volume = ml, count = pieces).
 *   gramsPerMl:    lets cups/tbsp/tsp convert to and from grams.
 *   gramsPerPiece: lets "2 onions" convert to and from grams (a medium one unless noted).
 *   isStaple:      assumed to be in the kitchen already; kept off the shopping list.
 */
export interface SeedIngredient {
  name: string;
  category: IngredientCategory;
  baseUnitType: UnitType;
  defaultUnit: Unit;
  gramsPerMl?: number;
  gramsPerPiece?: number;
  aliases?: string[];
  isStaple?: boolean;
}

type Extra = Partial<Pick<SeedIngredient, "gramsPerMl" | "gramsPerPiece" | "aliases" | "isStaple">>;

const vol = (name: string, category: IngredientCategory, defaultUnit: Unit, gramsPerMl: number, x: Extra = {}): SeedIngredient =>
  ({ name, category, baseUnitType: "volume", defaultUnit, gramsPerMl, ...x });
const mass = (name: string, category: IngredientCategory, defaultUnit: Unit, x: Extra = {}): SeedIngredient =>
  ({ name, category, baseUnitType: "mass", defaultUnit, ...x });
const each = (name: string, category: IngredientCategory, gramsPerPiece: number, x: Extra = {}): SeedIngredient =>
  ({ name, category, baseUnitType: "count", defaultUnit: "piece", gramsPerPiece, ...x });

export const GLOBAL_INGREDIENTS: readonly SeedIngredient[] = [
  // ---- produce -------------------------------------------------------------------------------
  each("Yellow onion", "produce", 150, { gramsPerMl: 0.68, aliases: ["onion"] }),
  each("Red onion", "produce", 150, { gramsPerMl: 0.68 }),
  each("Green onion", "produce", 15, { aliases: ["scallion", "spring onion"] }),
  each("Garlic clove", "produce", 3, { gramsPerMl: 0.6, aliases: ["garlic", "clove of garlic"] }),
  mass("Fresh ginger", "produce", "tbsp", { gramsPerMl: 0.4, aliases: ["ginger", "ginger root"] }),
  each("Carrot", "produce", 61, { gramsPerMl: 0.54 }),
  each("Celery stalk", "produce", 40, { gramsPerMl: 0.43, aliases: ["celery", "stalk of celery"] }),
  each("Russet potato", "produce", 170, { gramsPerMl: 0.65, aliases: ["potato", "baking potato"] }),
  each("Sweet potato", "produce", 130, { gramsPerMl: 0.65 }),
  each("Tomato", "produce", 123, { gramsPerMl: 0.76 }),
  each("Cherry tomato", "produce", 17, { gramsPerMl: 0.63 }),
  each("Bell pepper", "produce", 120, { gramsPerMl: 0.63, aliases: ["sweet pepper", "red bell pepper", "green bell pepper"] }),
  each("Jalapeño", "produce", 14, { aliases: ["jalapeno pepper"] }),
  each("Cucumber", "produce", 300, { gramsPerMl: 0.5 }),
  each("Zucchini", "produce", 200, { gramsPerMl: 0.5, aliases: ["courgette"] }),
  each("Lemon", "produce", 85),
  each("Lime", "produce", 67),
  each("Apple", "produce", 182, { gramsPerMl: 0.5 }),
  each("Banana", "produce", 120),
  each("Orange", "produce", 130),
  each("Avocado", "produce", 170, { gramsPerMl: 0.9 }),
  mass("Broccoli", "produce", "g", { gramsPerMl: 0.38, aliases: ["broccoli florets"] }),
  mass("Cauliflower", "produce", "g", { gramsPerMl: 0.42 }),
  mass("Baby spinach", "produce", "cup", { gramsPerMl: 0.13, aliases: ["spinach", "fresh spinach"] }),
  mass("Kale", "produce", "cup", { gramsPerMl: 0.09 }),
  mass("Romaine lettuce", "produce", "cup", { gramsPerMl: 0.2, aliases: ["lettuce", "romaine"] }),
  mass("Mushrooms", "produce", "g", { gramsPerMl: 0.3, aliases: ["button mushrooms", "cremini mushrooms"] }),
  mass("Fresh cilantro", "produce", "cup", { gramsPerMl: 0.07, aliases: ["cilantro", "coriander leaves"] }),
  mass("Fresh parsley", "produce", "cup", { gramsPerMl: 0.25, aliases: ["parsley"] }),
  mass("Fresh basil", "produce", "cup", { gramsPerMl: 0.1, aliases: ["basil"] }),

  // ---- meat and fish -------------------------------------------------------------------------
  mass("Chicken breast", "meat", "lb", { aliases: ["boneless skinless chicken breast"] }),
  mass("Chicken thighs", "meat", "lb", { aliases: ["boneless chicken thighs"] }),
  mass("Ground beef", "meat", "lb", { aliases: ["minced beef"] }),
  mass("Ground turkey", "meat", "lb"),
  mass("Ground pork", "meat", "lb"),
  mass("Beef steak", "meat", "lb", { aliases: ["steak"] }),
  mass("Pork chops", "meat", "lb"),
  mass("Bacon", "meat", "lb"),
  mass("Italian sausage", "meat", "lb", { aliases: ["sausage"] }),
  mass("Salmon fillet", "seafood", "lb", { aliases: ["salmon"] }),
  mass("Shrimp", "seafood", "lb"),
  mass("Canned tuna", "canned", "oz", { aliases: ["tuna"] }),

  // ---- dairy and eggs ------------------------------------------------------------------------
  each("Egg", "dairy", 50, { aliases: ["eggs", "large egg"] }),
  vol("Milk", "dairy", "cup", 1.03, { aliases: ["whole milk"] }),
  vol("Buttermilk", "dairy", "cup", 1.03),
  vol("Heavy cream", "dairy", "cup", 1.0, { aliases: ["heavy whipping cream", "whipping cream"] }),
  vol("Half-and-half", "dairy", "cup", 1.02, { aliases: ["half and half"] }),
  vol("Plain yogurt", "dairy", "cup", 1.03, { aliases: ["yogurt", "greek yogurt"] }),
  vol("Sour cream", "dairy", "cup", 0.97),
  mass("Butter", "dairy", "tbsp", { gramsPerMl: 0.96, aliases: ["unsalted butter", "salted butter"] }),
  mass("Cream cheese", "dairy", "oz", { gramsPerMl: 0.98 }),
  mass("Cheddar cheese", "dairy", "cup", { gramsPerMl: 0.48, aliases: ["cheddar", "shredded cheddar"] }),
  mass("Mozzarella cheese", "dairy", "cup", { gramsPerMl: 0.47, aliases: ["mozzarella", "shredded mozzarella"] }),
  mass("Parmesan cheese", "dairy", "cup", { gramsPerMl: 0.42, aliases: ["parmesan", "grated parmesan"] }),
  mass("Feta cheese", "dairy", "cup", { gramsPerMl: 0.63, aliases: ["feta"] }),

  // ---- grains, pasta, bread ------------------------------------------------------------------
  mass("White rice", "grains", "cup", { gramsPerMl: 0.78, aliases: ["rice", "long grain rice", "jasmine rice"] }),
  mass("Brown rice", "grains", "cup", { gramsPerMl: 0.8 }),
  mass("Pasta", "grains", "lb", { aliases: ["spaghetti", "penne", "macaroni", "dry pasta"] }),
  mass("Quinoa", "grains", "cup", { gramsPerMl: 0.72 }),
  mass("Couscous", "grains", "cup", { gramsPerMl: 0.73 }),
  mass("Rolled oats", "grains", "cup", { gramsPerMl: 0.34, aliases: ["oats", "old fashioned oats"] }),
  mass("Dried lentils", "grains", "cup", { gramsPerMl: 0.81, aliases: ["lentils"] }),
  each("Sandwich bread", "grains", 28, { aliases: ["bread", "bread slice", "slice of bread"] }),
  each("Flour tortilla", "grains", 45, { aliases: ["tortilla", "tortillas"] }),

  // ---- baking --------------------------------------------------------------------------------
  mass("All-purpose flour", "baking", "cup", { gramsPerMl: 0.53, aliases: ["flour", "plain flour"] }),
  mass("Bread flour", "baking", "cup", { gramsPerMl: 0.54 }),
  mass("Whole wheat flour", "baking", "cup", { gramsPerMl: 0.51 }),
  mass("Granulated sugar", "baking", "cup", { gramsPerMl: 0.85, aliases: ["sugar", "white sugar"] }),
  mass("Brown sugar", "baking", "cup", { gramsPerMl: 0.93 }),
  mass("Powdered sugar", "baking", "cup", { gramsPerMl: 0.5, aliases: ["confectioners sugar", "icing sugar"] }),
  mass("Baking powder", "baking", "tsp", { gramsPerMl: 0.9 }),
  mass("Baking soda", "baking", "tsp", { gramsPerMl: 0.9, aliases: ["bicarbonate of soda"] }),
  mass("Cornstarch", "baking", "tbsp", { gramsPerMl: 0.54, aliases: ["corn starch"] }),
  mass("Cocoa powder", "baking", "cup", { gramsPerMl: 0.42, aliases: ["unsweetened cocoa powder"] }),
  mass("Chocolate chips", "baking", "cup", { gramsPerMl: 0.72 }),
  mass("Active dry yeast", "baking", "tsp", { gramsPerMl: 0.6, aliases: ["yeast"] }),
  mass("Breadcrumbs", "baking", "cup", { gramsPerMl: 0.45, aliases: ["bread crumbs", "panko"] }),
  vol("Vanilla extract", "baking", "tsp", 0.88, { aliases: ["vanilla"] }),
  vol("Honey", "baking", "tbsp", 1.42),
  vol("Maple syrup", "baking", "tbsp", 1.33),
  mass("Almonds", "baking", "cup", { gramsPerMl: 0.6, aliases: ["whole almonds"] }),
  mass("Walnuts", "baking", "cup", { gramsPerMl: 0.5, aliases: ["chopped walnuts"] }),

  // ---- oils, sauces, condiments --------------------------------------------------------------
  vol("Olive oil", "condiments", "tbsp", 0.91, { isStaple: true, aliases: ["extra virgin olive oil"] }),
  vol("Vegetable oil", "condiments", "tbsp", 0.92, { isStaple: true, aliases: ["canola oil", "cooking oil"] }),
  vol("Sesame oil", "condiments", "tsp", 0.92),
  vol("Soy sauce", "condiments", "tbsp", 1.15),
  vol("Ketchup", "condiments", "tbsp", 1.15, { aliases: ["tomato ketchup"] }),
  vol("Mayonnaise", "condiments", "tbsp", 0.96, { aliases: ["mayo"] }),
  vol("Yellow mustard", "condiments", "tsp", 1.05, { aliases: ["mustard"] }),
  vol("Dijon mustard", "condiments", "tsp", 1.05),
  vol("Hot sauce", "condiments", "tsp", 1.0),
  vol("White vinegar", "condiments", "tbsp", 1.01, { aliases: ["distilled white vinegar"] }),
  vol("Apple cider vinegar", "condiments", "tbsp", 1.01),
  vol("Balsamic vinegar", "condiments", "tbsp", 1.05),
  vol("Worcestershire sauce", "condiments", "tsp", 1.15),
  vol("Barbecue sauce", "condiments", "tbsp", 1.2, { aliases: ["bbq sauce"] }),
  vol("Salsa", "condiments", "cup", 1.1),
  vol("Tomato paste", "condiments", "tbsp", 1.08),
  vol("Peanut butter", "condiments", "tbsp", 1.09),
  vol("Lemon juice", "condiments", "tbsp", 1.03),
  vol("Lime juice", "condiments", "tbsp", 1.03),

  // ---- spices and seasonings -----------------------------------------------------------------
  mass("Salt", "spices", "tsp", { gramsPerMl: 1.2, isStaple: true, aliases: ["table salt", "sea salt"] }),
  mass("Black pepper", "spices", "tsp", { gramsPerMl: 0.5, isStaple: true, aliases: ["ground black pepper", "pepper"] }),
  mass("Garlic powder", "spices", "tsp", { gramsPerMl: 0.63 }),
  mass("Onion powder", "spices", "tsp", { gramsPerMl: 0.5 }),
  mass("Paprika", "spices", "tsp", { gramsPerMl: 0.46, aliases: ["sweet paprika", "smoked paprika"] }),
  mass("Ground cumin", "spices", "tsp", { gramsPerMl: 0.43, aliases: ["cumin"] }),
  mass("Chili powder", "spices", "tsp", { gramsPerMl: 0.55 }),
  mass("Ground cinnamon", "spices", "tsp", { gramsPerMl: 0.56, aliases: ["cinnamon"] }),
  mass("Dried oregano", "spices", "tsp", { gramsPerMl: 0.2, aliases: ["oregano"] }),
  mass("Dried thyme", "spices", "tsp", { gramsPerMl: 0.2, aliases: ["thyme"] }),
  mass("Dried basil", "spices", "tsp", { gramsPerMl: 0.14 }),
  mass("Red pepper flakes", "spices", "tsp", { gramsPerMl: 0.36, aliases: ["crushed red pepper"] }),
  mass("Ground turmeric", "spices", "tsp", { gramsPerMl: 0.6, aliases: ["turmeric"] }),
  mass("Ground ginger", "spices", "tsp", { gramsPerMl: 0.36 }),
  mass("Ground nutmeg", "spices", "tsp", { gramsPerMl: 0.45, aliases: ["nutmeg"] }),
  mass("Curry powder", "spices", "tsp", { gramsPerMl: 0.4 }),
  each("Bay leaf", "spices", 0.2, { aliases: ["bay leaves"] }),

  // ---- canned and jarred ---------------------------------------------------------------------
  vol("Diced tomatoes", "canned", "cup", 1.01, { aliases: ["canned diced tomatoes"] }),
  vol("Crushed tomatoes", "canned", "cup", 1.04),
  vol("Tomato sauce", "canned", "cup", 1.04),
  vol("Chicken broth", "canned", "cup", 1.01, { aliases: ["chicken stock"] }),
  vol("Vegetable broth", "canned", "cup", 1.01, { aliases: ["vegetable stock"] }),
  vol("Beef broth", "canned", "cup", 1.01, { aliases: ["beef stock"] }),
  vol("Coconut milk", "canned", "cup", 0.96),
  mass("Black beans", "canned", "cup", { gramsPerMl: 0.73, aliases: ["canned black beans"] }),
  mass("Chickpeas", "canned", "cup", { gramsPerMl: 0.69, aliases: ["garbanzo beans"] }),
  mass("Kidney beans", "canned", "cup", { gramsPerMl: 0.73 }),
  mass("Canned corn", "canned", "cup", { gramsPerMl: 0.69 }),

  // ---- frozen --------------------------------------------------------------------------------
  mass("Frozen peas", "frozen", "cup", { gramsPerMl: 0.61 }),
  mass("Frozen corn", "frozen", "cup", { gramsPerMl: 0.6 }),
  mass("Frozen mixed vegetables", "frozen", "cup", { gramsPerMl: 0.6 }),
  mass("Frozen berries", "frozen", "cup", { gramsPerMl: 0.59, aliases: ["mixed berries"] }),

  // ---- beverages and other -------------------------------------------------------------------
  vol("Water", "beverages", "cup", 1.0, { isStaple: true }),
  vol("Orange juice", "beverages", "cup", 1.04),
  vol("White wine", "beverages", "cup", 0.99, { aliases: ["dry white wine"] }),
  vol("Red wine", "beverages", "cup", 0.99, { aliases: ["dry red wine"] }),
  mass("Tofu", "other", "oz", { aliases: ["firm tofu", "extra firm tofu"] }),
];
