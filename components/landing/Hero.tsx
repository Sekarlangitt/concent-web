import { StudentInformationForm } from "@/components/student/StudentInformationForm";

export function Hero() {
  return (
    <section className="bg-gradient-to-b from-brand-50 via-white to-white">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-2 lg:items-center lg:gap-14 lg:px-8 lg:py-24">
        <div>
          <p className="inline-flex items-center rounded-full border border-brand-200 bg-white px-3 py-1 text-xs font-semibold tracking-wide text-brand-700">
            President University
          </p>
          <h1 className="mt-4 text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
            Find Your Best-Fit Concentration
          </h1>
          <p className="mt-4 text-base leading-relaxed text-slate-600 sm:text-lg">
            Discover which concentration matches your interests, skills, and
            preferred way of solving problems.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-base">
            This assessment is available to students of Informatics and
            Information Systems. Answer a few questions about how you like to
            learn and work, and explore concentration options that align with
            you.
          </p>
        </div>

        <div className="lg:justify-self-end lg:pl-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg shadow-brand-950/5 sm:p-8">
            <h2 className="text-xl font-semibold tracking-tight text-slate-900">
              Ready to get started?
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">
              Enter your details below to begin the assessment.
            </p>
            <div className="mt-6">
              <StudentInformationForm />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
