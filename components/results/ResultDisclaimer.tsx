/**
 * Visible but non-alarming academic guidance disclaimer for the result page.
 * The recommendation is guidance only — never a final academic decision.
 */
export function ResultDisclaimer() {
  return (
    <aside className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm leading-relaxed text-slate-600">
      <h2 className="text-sm font-semibold text-slate-800">
        Academic Guidance Disclaimer
      </h2>
      <p className="mt-2">
        This recommendation is intended as academic guidance based on your
        questionnaire responses. It should not be treated as a final academic
        decision. You may also want to consider your course performance,
        long-term interests, career goals, and advice from academic staff
        before choosing a concentration.
      </p>
    </aside>
  );
}
