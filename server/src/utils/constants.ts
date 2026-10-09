/** Shared by the Mongoose models and the zod schemas so they can't drift apart. */
export const LOCATIONS = ["pantry", "fridge", "freezer"] as const;
export type Location = (typeof LOCATIONS)[number];
