import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-3 sm:gap-5 sm:px-6 sm:py-4 lg:px-8">
        <Link
          href="/"
          aria-label="Concentration Recommendation System — President University"
          className="flex min-w-0 items-center gap-3 rounded-lg focus-ring sm:gap-4"
        >
          <Image
            src="/images/presuniv-logo.jpeg"
            alt="President University logo"
            width={285}
            height={320}
            className="h-10 w-auto shrink-0 sm:h-12"
          />
          <span className="min-w-0">
            <span className="block text-sm font-semibold leading-tight text-brand-900 sm:text-lg">
              Concentration Recommendation System
            </span>
            <span className="mt-0.5 hidden text-xs font-medium text-slate-500 sm:block">
              President University
            </span>
          </span>
        </Link>

        <div className="ml-auto flex shrink-0 items-center">
          <Button href="/admin" variant="secondary" size="sm">
            Admin
          </Button>
        </div>
      </div>
    </header>
  );
}
