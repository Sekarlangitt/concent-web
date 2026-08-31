import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

/**
 * Result not-found page (STEP 8).
 *
 * Rendered when /assessment/result/[id] receives an id that does not exist in
 * the database (the page calls notFound()). Purely user-facing language — no
 * Prisma errors or stack traces are ever exposed.
 */
export default function ResultNotFound() {
  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
      <Card className="p-6 text-center sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent-600">
          President University
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Result Not Found
        </h1>
        <p className="mx-auto mt-3 max-w-md text-base leading-relaxed text-slate-700">
          We could not find this assessment result.
        </p>
        <div className="mt-8 flex justify-center">
          <Button href="/" size="lg">
            Start New Assessment
          </Button>
        </div>
      </Card>
    </section>
  );
}
