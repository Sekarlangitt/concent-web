import type { Major } from "@/lib/major";

/**
 * Concentration metadata.
 *
 * Internal values stay aligned with the Prisma `Concentration` enum.
 * Display labels are user-facing only.
 *
 * This file is architectural preparation for the future scoring step.
 * It does NOT implement scoring and is never presented to students as a
 * selection mechanism — the questionnaire is chosen by major only.
 */

export type Concentration =
  | "CYBER_SECURITY"
  | "IOT"
  | "AI"
  | "AI_HEALTHCARE"
  | "GAME_DEVELOPMENT"
  | "DEVOPS"
  | "DATA_SCIENCE"
  | "ERP";

export const CONCENTRATION_IDS: readonly Concentration[] = [
  "CYBER_SECURITY",
  "IOT",
  "AI",
  "AI_HEALTHCARE",
  "GAME_DEVELOPMENT",
  "DEVOPS",
  "DATA_SCIENCE",
  "ERP",
];

export const CONCENTRATION_LABELS: Record<Concentration, string> = {
  CYBER_SECURITY: "Cyber Security",
  IOT: "Internet of Things (IoT)",
  AI: "Artificial Intelligence (AI)",
  AI_HEALTHCARE: "Artificial Intelligence (AI) in Healthcare",
  GAME_DEVELOPMENT: "Game Development",
  DEVOPS: "DevOps",
  DATA_SCIENCE: "Data Science",
  ERP: "Enterprise Resource Planning (ERP)",
};

export const CONCENTRATIONS_BY_MAJOR: Record<Major, readonly Concentration[]> =
  {
    INFORMATICS: [
      "CYBER_SECURITY",
      "IOT",
      "AI",
      "AI_HEALTHCARE",
      "GAME_DEVELOPMENT",
      "DEVOPS",
    ],
    INFORMATION_SYSTEMS: ["DATA_SCIENCE", "ERP"],
  };

export function getConcentrationLabel(concentration: Concentration): string {
  return CONCENTRATION_LABELS[concentration];
}
