/**
 * Streaming loading state for /admin/assessments — a lightweight table
 * skeleton so navigations feel responsive. The page is server-rendered and
 * dynamic; this file never fetches data itself.
 */
export default function AdminAssessmentsLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading assessment records">
      <div className="space-y-1">
        <div className="h-8 w-56 animate-pulse rounded-lg bg-slate-200" />
        <div className="h-4 w-80 animate-pulse rounded bg-slate-100" />
      </div>

      <div className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="h-14 animate-pulse rounded-lg bg-slate-100" />
        ))}
      </div>

      <div className="h-64 animate-pulse rounded-2xl border border-slate-200 bg-white" />
    </div>
  );
}
