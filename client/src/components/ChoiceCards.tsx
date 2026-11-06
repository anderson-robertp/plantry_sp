export function Choice<T extends string>({
  name,
  value,
  options,
  onChange,
  disabled,
  columns = 2,
}: {
  columns?: 2 | 3;
  name: string;
  value: T;
  options: { value: T; label: string; hint: string }[];
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label={name} className={`grid gap-2 ${columns === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
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
