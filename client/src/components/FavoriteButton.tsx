import { useFavorites } from "../hooks/useFavorites";

/** A heart for one recipe. Shows how many people in the household love it when more than just you. */
export function FavoriteButton({ recipeId, name }: { recipeId: string; name: string }) {
  const { available, isFavorite, lovedBy, toggle } = useFavorites();
  if (!available) return null;
  const on = isFavorite(recipeId);
  const n = lovedBy(recipeId);
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={`Favorite ${name}`}
      title={n > 1 ? `Loved by ${n} people in your household` : on ? "Remove from favorites" : "Add to favorites"}
      onClick={() => void toggle(recipeId)}
      className={`inline-flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-md px-2 text-lg sm:min-h-9 sm:min-w-9 ${on ? "text-accent" : "text-muted hover:text-ink"}`}
    >
      <span aria-hidden="true">{on ? "♥" : "♡"}</span>
      {n > 1 ? <span className="text-xs font-medium">{n}</span> : null}
    </button>
  );
}
