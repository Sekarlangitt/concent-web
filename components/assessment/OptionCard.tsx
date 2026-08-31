type OptionCardProps = {
  optionId: string;
  label: string;
  /** Radio group name — shared by every option of one question. */
  name: string;
  selected: boolean;
  onSelect: (optionId: string) => void;
};

/**
 * A single selectable answer option rendered as a large tap-target card.
 *
 * Every option uses a real (visually hidden) `<input type="radio">` so the
 * group keeps native radio semantics: screen readers announce the selected
 * state, and arrow keys move between the options of one question. The whole
 * card is a `<label>`, so clicking anywhere — not just a small radio dot —
 * selects the option. The selected state is conveyed with more than color:
 * a filled radio with a check mark, a stronger border, and a tinted
 * background. Keyboard focus lights up the whole card via the `option-card`
 * utility.
 *
 * Used by every question type (LIKERT, AGREEMENT, MULTIPLE_CHOICE, SCENARIO,
 * PRIORITY) through QuestionRenderer.
 */
export function OptionCard({
  optionId,
  label,
  name,
  selected,
  onSelect,
}: OptionCardProps) {
  return (
    <label
      className={[
        "flex min-h-[44px] w-full cursor-pointer select-none items-center gap-3 rounded-xl border bg-white px-4 py-3 text-left transition-colors",
        "option-card",
        selected
          ? "border-brand-600 bg-brand-50 shadow-sm"
          : "border-slate-300 hover:border-brand-300 hover:bg-brand-50/40",
      ].join(" ")}
    >
      <input
        type="radio"
        name={name}
        value={optionId}
        checked={selected}
        onChange={() => onSelect(optionId)}
        className="sr-only"
      />
      <span
        aria-hidden="true"
        className={[
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
          selected ? "border-brand-600 bg-brand-600" : "border-slate-400 bg-white",
        ].join(" ")}
      >
        {selected ? (
          <svg
            viewBox="0 0 12 12"
            className="h-3 w-3 text-white"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M2 6.5 4.5 9 10 3" />
          </svg>
        ) : null}
      </span>
      <span
        className={[
          "min-w-0 flex-1 text-sm leading-snug sm:text-base",
          selected ? "font-semibold text-brand-900" : "font-medium text-slate-800",
        ].join(" ")}
      >
        {label}
      </span>
    </label>
  );
}

