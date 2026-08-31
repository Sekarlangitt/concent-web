export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-1 px-4 py-8 text-center sm:px-6 lg:px-8">
        <p className="text-sm font-semibold text-brand-900">
          President University
        </p>
        <p className="text-sm text-slate-600">
          Concentration Recommendation System
        </p>
        <p className="mt-2 text-xs text-slate-400">
          © {currentYear} President University
        </p>
      </div>
    </footer>
  );
}
