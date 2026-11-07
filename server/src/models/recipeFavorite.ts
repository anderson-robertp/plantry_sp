import mongoose, { Document, Schema, Types } from "mongoose";

/** One person hearting one recipe. Per person, so household members can like different things. */
export interface IRecipeFavorite extends Document {
  userId: Types.ObjectId;
  householdId: Types.ObjectId;
  recipeId: Types.ObjectId;
}

const schema = new Schema<IRecipeFavorite>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    householdId: { type: Schema.Types.ObjectId, ref: "Household", required: true, index: true },
    recipeId: { type: Schema.Types.ObjectId, ref: "Recipe", required: true },
  },
  { timestamps: true }
);

// one heart per person per recipe
schema.index({ userId: 1, recipeId: 1 }, { unique: true });

export const RecipeFavorite = mongoose.model<IRecipeFavorite>("RecipeFavorite", schema);
