import {
  getConcentrationLabel,
  type Concentration,
} from "@/data/concentrations";
import type { Major } from "@/lib/major";
import { getInformaticsScoringConfig } from "@/lib/scoring/server/informaticsWeights";
import { getInformationSystemsScoringConfig } from "@/lib/scoring/server/informationSystemsWeights";
import type { ScoreQuestion, ScoreQuestionSet } from "@/lib/scoring/types";
import {
  CONFIDENCE_HIGH_GAP,
  CONFIDENCE_MODERATE_GAP,
} from "@/lib/scoring/confidence";
import { roundScore } from "@/lib/scoring/normalization";

/**
 * Server-only helper: returns the authoritative weighted question set for the
 * major from the LEGACY question bank. Used for pre-versioning assessments
 * that have no questionnaireVersionId. New assessments resolve through the
 * question set of the version they referenced instead (passed in the input).
 */
function getLegacyScoringQuestions(major: Major) {
  if (major === "INFORMATICS") {
    return getInformaticsScoringConfig().questions;
  }
  return getInformationSystemsScoringConfig().questions;
}

/**
 * Deterministic recommendation explanation (STEP 8, version-aware edition).
 *
 * The result page regenerates this from the STORED AssessmentAnswer rows
 * (questionId + optionId) resolved against the trusted question set of the
 * questionnaire version the student answered (or the legacy bank for
 * pre-versioning assessments). It never uses sessionStorage, query
 * parameters, or an external AI service, and it never shows raw weights to
 * students.
 *
 * Determinism guarantees:
 *  - No randomness, timestamps, or external calls.
 *  - The same stored assessment always produces the identical explanation.
 *
 * The explanation uses actual result data where available:
 *  - the top (recommended) concentration,
 *  - the second-highest concentration and the rounded score gap,
 *  - the strongest response themes (question categories) that contributed to
 *    the recommended concentration.
 */

/** One stored AssessmentAnswer row. */
export type StoredAnswer = { questionId: string; answerKey: string };

/** One stored ConcentrationScore row (normalized value only). */
export type StoredScore = { concentration: Concentration; normalizedScore: number };

export type ExplanationInput = {
  major: Major;
  recommendedConcentration: Concentration;
  /** Stored recommendedScore from the Assessment record (authoritative). */
  recommendedScore: number;
  /** Stored confidence label ("High" | "Moderate" | "Close Match"), or null. */
  confidenceLabel: string | null;
  /** All concentration scores for the major (any order; sorted internally). */
  scores: readonly StoredScore[];
  /** Stored answer rows, resolved against the trusted question set. */
  answers: readonly StoredAnswer[];
  /**
   * The trusted question set of the questionnaire version the assessment
   * referenced. When omitted (legacy pre-versioning assessments) the legacy
   * question bank is used instead.
   */
  questionSet?: ScoreQuestionSet | null;
};

export type ResultExplanation = {
  /** One concise paragraph explaining the recommendation. */
  summary: string;
  /** 2-4 human-readable strongest response themes (no raw weights). */
  strengths: string[];
  /** Optional second-concentration context (only when useful). */
  secondaryNote?: string;
  /** True when the top two normalized scores are very close. */
  closeMatch: boolean;
  /** Close-match guidance note (present only when closeMatch is true). */
  closeMatchNote?: string;
};

/** Base theme vocabulary for each concentration's summary opening. */
const CONCENTRATION_SUMMARY_THEMES: Record<Concentration, string> = {
  CYBER_SECURITY:
    "protecting systems, investigating suspicious activity, and managing security risk",
  IOT: "sensors, connected devices, and the integration of hardware and software",
  AI: "intelligent models, prediction, pattern recognition, and experimenting with learning algorithms",
  AI_HEALTHCARE:
    "healthcare applications, medical data, patient monitoring, and clinical decision support",
  GAME_DEVELOPMENT:
    "interactive systems, game mechanics, creativity, and immersive experiences",
  DEVOPS: "automation, infrastructure, deployment, and reliable cloud operations",
  DATA_SCIENCE: "data analysis, prediction, visualization, and evidence-based decisions",
  ERP: "business processes, integrated enterprise systems, and organizational workflows",
};

/** Human-readable theme phrase for each question category (both majors). */
const CATEGORY_THEMES: Record<string, string> = {
  // Informatics
  security: "protecting systems and investigating security incidents",
  hardware: "working with physical devices, sensors, and wearables",
  "machine-learning": "building intelligent models and experimenting with algorithms",
  healthcare: "healthcare technology and patient-centered applications",
  "creative-development": "combining creativity with interactive software",
  infrastructure: "automating infrastructure, deployment, and reliable operations",
  "immersive-tech": "immersive and interactive experiences",
  "data-analysis": "analyzing data and discovering patterns",
  automation: "automating workflows and improving reliability",
  // Information Systems
  analytics: "analyzing business data and finding patterns",
  "data-preparation": "cleaning and combining data for reliable analysis",
  visualization: "turning information into clear visuals and dashboards",
  prediction: "building forecasts and predictive models",
  experimentation: "running experiments and comparing outcomes",
  "business-process": "understanding and improving business processes",
  "system-configuration": "configuring and customizing enterprise systems",
  "enterprise-integration": "integrating systems across departments",
  operations: "improving operational workflows",
  "organizational-change": "coordinating change across departments",
};


/**
 * Options that explicitly describe VR / immersive work. A Game Development
 * recommendation only mentions VR when one of these contributed, so VR is
 * never claimed for every Game Development student.
 */
const VR_IMMERSIVE_ANSWER_IDS: ReadonlySet<string> = new Set([
  "INF_Q15_C", // A VR level where the player moves through a 3D space
  "INF_Q17_A", // Creating the VR world, 3D equipment models, and interaction
  "INF_Q17_F", // Building a VR rehabilitation module
]);

/**
 * Options that explicitly describe wearable / motion-sensor work. An IoT
 * recommendation only mentions them when one of these contributed, so
 * connected-device language stays grounded in the student's answers.
 */
const WEARABLE_MOTION_ANSWER_IDS: ReadonlySet<string> = new Set([
  "INF_Q17_B", // Motion sensors and haptic wearable devices
  "INF_Q10_A", // Wearable device collecting health signals
  "INF_Q16_D", // Patient wearable devices
  "INF_Q18_E", // Wearable safety device
]);

/** Human-readable second-concentration context (only shown when useful). */
const SECOND_CONCENTRATION_THEMES: Record<Concentration, string> = {
  CYBER_SECURITY:
    "investigating suspicious activity, access control, and incident response",
  IOT: "projects involving connected devices and physical-digital systems",
  AI: "projects involving intelligent models, prediction, and pattern recognition",
  AI_HEALTHCARE:
    "projects involving healthcare technology, health data, and patient monitoring",
  GAME_DEVELOPMENT:
    "projects involving interactive systems, creativity, and immersive experiences",
  DEVOPS: "projects involving automation, infrastructure, and reliable deployments",
  DATA_SCIENCE: "projects involving data analysis, prediction, and visualization",
  ERP: "projects involving business processes and integrated enterprise systems",
};

const GENERIC_IMMERSIVE_THEME = "immersive and interactive experiences";
const GENERIC_HARDWARE_THEME = "working with physical devices, sensors, and wearables";
const VR_THEME = "immersive VR and 3D environments";
const WEARABLE_THEME = "motion tracking, wearable sensors, and connected devices";

const CLOSE_MATCH_NOTE =
  "Your top two results were quite close. This suggests you may have interests that span both areas, so reviewing both concentration curricula could be helpful before making a final decision.";

const BALANCED_SUMMARY =
  "Your questionnaire responses were evenly balanced, so no single concentration stood out as a stronger match. You may want to review the concentration descriptions and discuss your options with academic staff.";


/**
 * Resolves the stored answers against the trusted configuration and measures
 * which categories contributed to the recommended concentration, plus whether
 * any contextual VR/wearable signals fired. Answers that no longer resolve to
 * a real option are skipped defensively (never crash, never invent data).
 */
function resolveStoredAnswers(input: ExplanationInput): {
  categoryTotals: Record<string, number>;
  vrContributed: boolean;
  wearableContributed: boolean;
} {
  const recommended = input.recommendedConcentration;
  const questions: readonly ScoreQuestion[] = input.questionSet?.questions.length
    ? input.questionSet.questions
    : (getLegacyScoringQuestions(input.major) as unknown as ScoreQuestion[]);

  const optionIdByQuestion = new Map<string, string>();
  for (const answer of input.answers) {
    optionIdByQuestion.set(answer.questionId, answer.answerKey);
  }

  const categoryTotals: Record<string, number> = {};
  let vrContributed = false;
  let wearableContributed = false;

  for (const question of questions) {
    const optionId = optionIdByQuestion.get(question.id);
    if (!optionId) {
      continue;
    }
    const option = question.options.find((candidate) => candidate.id === optionId);
    if (!option) {
      continue;
    }
    const weights = option.weights as Partial<Record<Concentration, number>>;
    const weight = weights[recommended] ?? 0;
    if (weight > 0 && question.category) {
      categoryTotals[question.category] =
        (categoryTotals[question.category] ?? 0) + weight;
    }
    if (recommended === "GAME_DEVELOPMENT" && VR_IMMERSIVE_ANSWER_IDS.has(optionId)) {
      vrContributed = true;
    }
    if (recommended === "IOT" && WEARABLE_MOTION_ANSWER_IDS.has(optionId)) {
      wearableContributed = true;
    }
  }

  return { categoryTotals, vrContributed, wearableContributed };
}


/**
 * Strongest response themes for the recommended concentration, ranked by
 * contribution and capped at 4 distinct themes. Special VR/wearable themes are
 * inserted only when the student's answers support them, replacing their
 * generic category equivalent to avoid duplicate bullets.
 */
function buildStrengths(
  input: ExplanationInput,
  resolved: ReturnType<typeof resolveStoredAnswers>,
): string[] {
  const ranked = Object.entries(resolved.categoryTotals)
    .map(([category, total]) => ({
      phrase: CATEGORY_THEMES[category],
      total,
    }))
    .filter((entry): entry is { phrase: string; total: number } =>
      typeof entry.phrase === "string",
    )
    .sort((a, b) => b.total - a.total || a.phrase.localeCompare(b.phrase));

  let themes = ranked.map((entry) => entry.phrase);

  if (resolved.vrContributed) {
    themes = themes.filter((theme) => theme !== GENERIC_IMMERSIVE_THEME);
    themes.unshift(VR_THEME);
  }
  if (resolved.wearableContributed) {
    themes = themes.filter((theme) => theme !== GENERIC_HARDWARE_THEME);
    themes.unshift(WEARABLE_THEME);
  }

  return [...new Set(themes)].slice(0, 4);
}

/**
 * Generates the deterministic explanation for a stored assessment.
 *
 * The same input always returns the same output. No randomness, no external
 * services, and no raw scoring weights are ever exposed.
 */
export function generateResultExplanation(input: ExplanationInput): ResultExplanation {
  const recommended = input.recommendedConcentration;

  const sorted = [...input.scores].sort(
    (a, b) =>
      b.normalizedScore - a.normalizedScore ||
      getConcentrationLabel(a.concentration).localeCompare(
        getConcentrationLabel(b.concentration),
      ),
  );
  const top = sorted[0] ?? null;
  const second = sorted[1] ?? null;

  // Defensive: a perfectly balanced (all-zero) result has no fit to claim.
  if (!top || top.normalizedScore <= 0) {
    return {
      summary: BALANCED_SUMMARY,
      strengths: [],
      closeMatch: false,
    };
  }

  const gap = second ? roundScore(top.normalizedScore - second.normalizedScore) : null;
  const resolved = resolveStoredAnswers(input);
  const strengths = buildStrengths(input, resolved);

  const summary = `Your responses showed the strongest alignment with ${getConcentrationLabel(
    recommended,
  )}, particularly in areas involving ${CONCENTRATION_SUMMARY_THEMES[recommended]}.`;

  // Second-concentration context is useful when the runner-up is not far
  // behind (the student may also enjoy adjacent work). It is omitted when the
  // winner has a commanding lead, where it would only add noise.
  let secondaryNote: string | undefined;
  if (second && gap !== null && gap < CONFIDENCE_HIGH_GAP) {
    secondaryNote = `Your second-strongest match was ${getConcentrationLabel(
      second.concentration,
    )}, suggesting you may also enjoy ${SECOND_CONCENTRATION_THEMES[second.concentration]}.`;
  }

  // Close-match uses the same threshold as the STEP 7 confidence label, and
  // also honors a stored "Close Match" label even if stored scores disagree.
  const closeMatch =
    input.confidenceLabel === "Close Match" ||
    (gap !== null && gap < CONFIDENCE_MODERATE_GAP);

  return {
    summary,
    strengths,
    secondaryNote,
    closeMatch,
    closeMatchNote: closeMatch ? CLOSE_MATCH_NOTE : undefined,
  };
}

