import { Card } from "@/components/ui/Card";

const STEPS = [
  {
    title: "Enter Your Information",
    description: "Provide your name and select your major.",
  },
  {
    title: "Complete the Assessment",
    description: "Answer questions about your interests and preferences.",
  },
  {
    title: "View Your Recommendation",
    description: "See which concentration best matches your responses.",
  },
] as const;

export function HowItWorks() {
  return (
    <section aria-labelledby="how-it-works-heading" className="bg-white">
      <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2
            id="how-it-works-heading"
            className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl"
          >
            How It Works
          </h2>
          <p className="mt-3 text-base leading-relaxed text-slate-600">
            Three simple steps between you and a concentration recommendation
            tailored to your interests.
          </p>
        </div>

        <ol className="mt-10 grid gap-6 sm:mt-14 sm:grid-cols-3">
          {STEPS.map((step, index) => (
            <li key={step.title} className="flex">
              <Card className="flex w-full flex-col p-6 transition-shadow duration-200 hover:shadow-md sm:p-8">
                <span
                  aria-hidden="true"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-600 text-sm font-bold text-white"
                >
                  {index + 1}
                </span>
                <h3 className="mt-5 text-lg font-semibold tracking-tight text-slate-900">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {step.description}
                </p>
              </Card>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
