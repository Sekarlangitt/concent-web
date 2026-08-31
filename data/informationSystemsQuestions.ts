import "server-only";

import type { Concentration } from "@/data/concentrations";
import type {
  QuestionnaireAnswerOption,
  QuestionnaireQuestion,
  QuestionType,
} from "@/data/questionTypes";

/**
 * Information Systems questionnaire configuration (STEP 5).
 *
 * SERVER-ONLY (STEP 12 security refactor): this file contains the
 * authoritative per-option scoring weights, so it imports "server-only".
 * Client Components must never import it — they use the weight-free public
 * metadata from data/publicQuestions.ts instead. See
 * lib/scoring/server/informationSystemsWeights.ts for the derived weight map.
 *
 * Exactly 20 questions measuring suitability between the two Information
 * Systems concentrations:
 *
 *   DATA_SCIENCE  — analytics, statistics, prediction, visualization,
 *                   data preparation, experimentation, evidence-based
 *                   decisions.
 *   ERP           — business processes, integrated enterprise systems,
 *                   procurement/inventory/finance/HR/operations, system
 *                   configuration, implementation, cross-department
 *                   integration, organizational change.
 *
 * Students never pick a concentration here — suitability is inferred from
 * their answers using the per-option weights below.
 *
 * Weight scale (applies to every weight in this file):
 *   0 = no meaningful relationship   1 = weak relationship
 *   2 = mild relationship            3 = moderate relationship
 *   4 = strong relationship          5 = very strong relationship
 *
 * A single answer may contribute to both concentrations. Interdisciplinary
 * answers (for example "build a dashboard that combines data from several
 * departments") intentionally weight DATA_SCIENCE and ERP differently.
 *
 * Question IDs are stable (IS_Q01 … IS_Q20) and option IDs are stable
 * (IS_Q01_A …). These IDs will later be stored in the database, so they must
 * never be generated at runtime or changed casually.
 *
 * Question data lives in TypeScript only — it is NOT stored in the database.
 * Later AssessmentAnswer rows will store (questionId, answerKey) and resolve
 * back to this configuration. The browser never submits numeric scores; the
 * server-side scoring step will look up each answer's weights from this
 * trusted source.
 */

/** The two concentrations that belong to the Information Systems major only. */
export const INFORMATION_SYSTEMS_CONCENTRATIONS = [
  "DATA_SCIENCE",
  "ERP",
] as const satisfies readonly Concentration[];

export type InformationSystemsConcentration =
  (typeof INFORMATION_SYSTEMS_CONCENTRATIONS)[number];

export type InformationSystemsQuestionType = QuestionType;

/**
 * Weights contributed by one answer. An absent concentration means weight 0.
 * Only DATA_SCIENCE and ERP may appear as keys.
 */
export type InformationSystemsQuestionWeights = Partial<
  Record<InformationSystemsConcentration, number>
>;

export type InformationSystemsAnswerOption =
  QuestionnaireAnswerOption<InformationSystemsConcentration>;

export type InformationSystemsQuestion =
  QuestionnaireQuestion<InformationSystemsConcentration, "INFORMATION_SYSTEMS">;

const informationSystemsQuestionConfig = [
  {
    id: "IS_Q01",
    major: "INFORMATION_SYSTEMS",
    type: "LIKERT",
    category: "analytics",
    text: "How interested are you in exploring large collections of business data to find patterns that are not obvious at first glance?",
    options: [
      { id: "IS_Q01_A", label: "Not interested at all", weights: {} },
      { id: "IS_Q01_B", label: "Slightly interested", weights: { DATA_SCIENCE: 1 } },
      { id: "IS_Q01_C", label: "Neutral", weights: { DATA_SCIENCE: 2 } },
      { id: "IS_Q01_D", label: "Interested", weights: { DATA_SCIENCE: 4 } },
      { id: "IS_Q01_E", label: "Very interested", weights: { DATA_SCIENCE: 5 } },
    ],
  },
  {
    id: "IS_Q02",
    major: "INFORMATION_SYSTEMS",
    type: "LIKERT",
    category: "business-process",
    text: "How interested are you in understanding how finance, procurement, inventory, and operations are connected inside one enterprise system?",
    options: [
      { id: "IS_Q02_A", label: "Not interested at all", weights: {} },
      { id: "IS_Q02_B", label: "Slightly interested", weights: { ERP: 1 } },
      { id: "IS_Q02_C", label: "Neutral", weights: { ERP: 2 } },
      { id: "IS_Q02_D", label: "Interested", weights: { ERP: 4 } },
      { id: "IS_Q02_E", label: "Very interested", weights: { ERP: 5 } },
    ],
  },
  {
    id: "IS_Q03",
    major: "INFORMATION_SYSTEMS",
    type: "LIKERT",
    category: "prediction",
    text: "How interested are you in building forecasts that help organizations prepare for the future using historical data?",
    options: [
      { id: "IS_Q03_A", label: "Not interested at all", weights: {} },
      { id: "IS_Q03_B", label: "Slightly interested", weights: { DATA_SCIENCE: 1 } },
      { id: "IS_Q03_C", label: "Neutral", weights: { DATA_SCIENCE: 2 } },
      { id: "IS_Q03_D", label: "Interested", weights: { DATA_SCIENCE: 4 } },
      { id: "IS_Q03_E", label: "Very interested", weights: { DATA_SCIENCE: 5 } },
    ],
  },
  {
    id: "IS_Q04",
    major: "INFORMATION_SYSTEMS",
    type: "LIKERT",
    category: "system-configuration",
    text: "How interested are you in configuring enterprise software so different departments work from the same, consistent records?",
    options: [
      { id: "IS_Q04_A", label: "Not interested at all", weights: {} },
      { id: "IS_Q04_B", label: "Slightly interested", weights: { ERP: 1 } },
      { id: "IS_Q04_C", label: "Neutral", weights: { ERP: 2 } },
      { id: "IS_Q04_D", label: "Interested", weights: { ERP: 4 } },
      { id: "IS_Q04_E", label: "Very interested", weights: { ERP: 5 } },
    ],
  },
  {
    id: "IS_Q05",
    major: "INFORMATION_SYSTEMS",
    type: "LIKERT",
    category: "data-preparation",
    text: "How interested are you in cleaning and combining data from several departments before it can be analyzed reliably?",
    options: [
      { id: "IS_Q05_A", label: "Not interested at all", weights: {} },
      { id: "IS_Q05_B", label: "Slightly interested", weights: { DATA_SCIENCE: 1 } },
      { id: "IS_Q05_C", label: "Neutral", weights: { DATA_SCIENCE: 2 } },
      {
        id: "IS_Q05_D",
        label: "Interested",
        weights: { DATA_SCIENCE: 4, ERP: 1 },
      },
      {
        id: "IS_Q05_E",
        label: "Very interested",
        weights: { DATA_SCIENCE: 5, ERP: 1 },
      },
    ],
  },
  {
    id: "IS_Q06",
    major: "INFORMATION_SYSTEMS",
    type: "AGREEMENT",
    category: "analytics",
    text: "I prefer decisions that are supported by quantitative evidence over decisions based only on intuition.",
    options: [
      { id: "IS_Q06_A", label: "Strongly Disagree", weights: {} },
      { id: "IS_Q06_B", label: "Disagree", weights: { DATA_SCIENCE: 1 } },
      { id: "IS_Q06_C", label: "Neutral", weights: { DATA_SCIENCE: 2 } },
      { id: "IS_Q06_D", label: "Agree", weights: { DATA_SCIENCE: 4 } },
      { id: "IS_Q06_E", label: "Strongly Agree", weights: { DATA_SCIENCE: 5 } },
    ],
  },
  {
    id: "IS_Q07",
    major: "INFORMATION_SYSTEMS",
    type: "AGREEMENT",
    category: "business-process",
    text: "I feel comfortable working within clearly defined processes and standardized workflows.",
    options: [
      { id: "IS_Q07_A", label: "Strongly Disagree", weights: {} },
      { id: "IS_Q07_B", label: "Disagree", weights: { ERP: 1 } },
      { id: "IS_Q07_C", label: "Neutral", weights: { ERP: 2 } },
      { id: "IS_Q07_D", label: "Agree", weights: { ERP: 4 } },
      { id: "IS_Q07_E", label: "Strongly Agree", weights: { ERP: 5 } },
    ],
  },
  {
    id: "IS_Q08",
    major: "INFORMATION_SYSTEMS",
    type: "AGREEMENT",
    category: "experimentation",
    text: "I enjoy running experiments and comparing outcomes to see which approach actually works better.",
    options: [
      { id: "IS_Q08_A", label: "Strongly Disagree", weights: {} },
      { id: "IS_Q08_B", label: "Disagree", weights: { DATA_SCIENCE: 1 } },
      { id: "IS_Q08_C", label: "Neutral", weights: { DATA_SCIENCE: 2 } },
      { id: "IS_Q08_D", label: "Agree", weights: { DATA_SCIENCE: 4 } },
      { id: "IS_Q08_E", label: "Strongly Agree", weights: { DATA_SCIENCE: 5 } },
    ],
  },
  {
    id: "IS_Q09",
    major: "INFORMATION_SYSTEMS",
    type: "AGREEMENT",
    category: "organizational-change",
    text: "I enjoy coordinating across departments so everyone works from the same information and follows the same procedures.",
    options: [
      { id: "IS_Q09_A", label: "Strongly Disagree", weights: {} },
      { id: "IS_Q09_B", label: "Disagree", weights: { ERP: 1 } },
      { id: "IS_Q09_C", label: "Neutral", weights: { ERP: 2 } },
      { id: "IS_Q09_D", label: "Agree", weights: { ERP: 4 } },
      { id: "IS_Q09_E", label: "Strongly Agree", weights: { ERP: 5 } },
    ],
  },
  {
    id: "IS_Q10",
    major: "INFORMATION_SYSTEMS",
    type: "MULTIPLE_CHOICE",
    category: "analytics",
    tieBreakerPriority: 1,
    text: "A retail company has sales, inventory, and customer data from several branches. Which part of solving its problem sounds most interesting to you?",
    options: [
      {
        id: "IS_Q10_A",
        label: "Studying purchasing patterns across branches to understand customer behavior",
        weights: { DATA_SCIENCE: 4 },
      },
      {
        id: "IS_Q10_B",
        label: "Building demand forecasts for each branch",
        weights: { DATA_SCIENCE: 5 },
      },
      {
        id: "IS_Q10_C",
        label: "Creating dashboards that show how each branch is performing",
        weights: { DATA_SCIENCE: 4, ERP: 1 },
      },
      {
        id: "IS_Q10_D",
        label: "Integrating inventory and sales processes so branches stay in sync",
        weights: { ERP: 4 },
      },
      {
        id: "IS_Q10_E",
        label: "Configuring one centralized business system used by every branch",
        weights: { ERP: 5 },
      },
    ],
  },
  {
    id: "IS_Q11",
    major: "INFORMATION_SYSTEMS",
    type: "MULTIPLE_CHOICE",
    category: "operations",
    text: "A company frequently finds that stock levels differ between departments. Which responsibility would you prefer?",
    options: [
      {
        id: "IS_Q11_A",
        label: "Analyzing historical data to identify why the differences keep appearing",
        weights: { DATA_SCIENCE: 5 },
      },
      {
        id: "IS_Q11_B",
        label: "Predicting future demand so purchases better match real needs",
        weights: { DATA_SCIENCE: 4, ERP: 1 },
      },
      {
        id: "IS_Q11_C",
        label: "Redesigning the process so every stock movement is recorded consistently",
        weights: { ERP: 5 },
      },
      {
        id: "IS_Q11_D",
        label: "Integrating the inventory and purchasing modules so records update together",
        weights: { ERP: 4, DATA_SCIENCE: 1 },
      },
    ],
  },
  {
    id: "IS_Q12",
    major: "INFORMATION_SYSTEMS",
    type: "MULTIPLE_CHOICE",
    category: "analytics",
    tieBreakerPriority: 1,
    text: "Which task would you find most satisfying?",
    options: [
      {
        id: "IS_Q12_A",
        label: "Digging into a messy dataset to find the reason behind a surprising result",
        weights: { DATA_SCIENCE: 5 },
      },
      {
        id: "IS_Q12_B",
        label: "Building a model that predicts an outcome better than the current approach",
        weights: { DATA_SCIENCE: 4, ERP: 1 },
      },
      {
        id: "IS_Q12_C",
        label: "Designing the screens and approval rules a team uses for its daily work",
        weights: { ERP: 5 },
      },
      {
        id: "IS_Q12_D",
        label: "Preparing an enterprise system so new users can start working with it",
        weights: { ERP: 4, DATA_SCIENCE: 1 },
      },
      {
        id: "IS_Q12_E",
        label: "Turning a complicated data question into a clear visual explanation",
        weights: { DATA_SCIENCE: 4, ERP: 1 },
      },
    ],
  },
  {
    id: "IS_Q13",
    major: "INFORMATION_SYSTEMS",
    type: "MULTIPLE_CHOICE",
    category: "operations",
    text: "A logistics company wants to reduce late deliveries. Which angle would you most want to work on?",
    options: [
      {
        id: "IS_Q13_A",
        label: "Analyzing delivery data to find which routes are consistently late",
        weights: { DATA_SCIENCE: 5 },
      },
      {
        id: "IS_Q13_B",
        label: "Building a model that flags shipments likely to be delayed",
        weights: { DATA_SCIENCE: 4, ERP: 1 },
      },
      {
        id: "IS_Q13_C",
        label: "Redesigning the delivery planning workflow across warehouses and drivers",
        weights: { ERP: 5 },
      },
      {
        id: "IS_Q13_D",
        label: "Integrating order, warehouse, and transport systems so information flows automatically",
        weights: { ERP: 4, DATA_SCIENCE: 1 },
      },
    ],
  },
  {
    id: "IS_Q14",
    major: "INFORMATION_SYSTEMS",
    type: "MULTIPLE_CHOICE",
    category: "business-process",
    text: "A company's HR team and department managers keep separate records of employee leave and attendance. Which fix would you most want to work on?",
    options: [
      {
        id: "IS_Q14_A",
        label: "Analyzing the two sets of records to find where they disagree",
        weights: { DATA_SCIENCE: 5, ERP: 1 },
      },
      {
        id: "IS_Q14_B",
        label: "Building a dashboard that shows leave and attendance trends across departments",
        weights: { DATA_SCIENCE: 4, ERP: 2 },
      },
      {
        id: "IS_Q14_C",
        label: "Redesigning the leave approval workflow so records update once and stay consistent",
        weights: { ERP: 5 },
      },
      {
        id: "IS_Q14_D",
        label: "Integrating the HR and payroll modules so managers and HR see the same data",
        weights: { ERP: 5 },
      },
      {
        id: "IS_Q14_E",
        label: "Coordinating the rollout so managers and HR adopt the new process together",
        weights: { ERP: 4, DATA_SCIENCE: 1 },
      },
    ],
  },
  {
    id: "IS_Q15",
    major: "INFORMATION_SYSTEMS",
    type: "MULTIPLE_CHOICE",
    category: "analytics",
    text: "During an annual planning exercise, which activity would you most want to own?",
    options: [
      {
        id: "IS_Q15_A",
        label: "Analyzing last year's data to understand what drove the results",
        weights: { DATA_SCIENCE: 5 },
      },
      {
        id: "IS_Q15_B",
        label: "Building the forecast that shapes next year's targets",
        weights: { DATA_SCIENCE: 4, ERP: 1 },
      },
      {
        id: "IS_Q15_C",
        label: "Aligning the planning process so every department submits consistent numbers",
        weights: { ERP: 5 },
      },
      {
        id: "IS_Q15_D",
        label: "Configuring the planning system to support the new process",
        weights: { ERP: 4, DATA_SCIENCE: 1 },
      },
      {
        id: "IS_Q15_E",
        label: "Preparing the summary dashboards that leadership reviews",
        weights: { DATA_SCIENCE: 4, ERP: 1 },
      },
      {
        id: "IS_Q15_F",
        label: "Training each department on the new planning process",
        weights: { ERP: 5, DATA_SCIENCE: 1 },
      },
    ],
  },
  {
    id: "IS_Q16",
    major: "INFORMATION_SYSTEMS",
    type: "SCENARIO",
    category: "enterprise-integration",
    tieBreakerPriority: 2,
    text: "A hospital wants to reduce how long patients wait for test results. Which part of the solution would you most enjoy?",
    options: [
      {
        id: "IS_Q16_A",
        label: "Analyzing historical test data to identify the most important bottlenecks",
        weights: { DATA_SCIENCE: 5, ERP: 1 },
      },
      {
        id: "IS_Q16_B",
        label: "Building a model that predicts daily testing demand",
        weights: { DATA_SCIENCE: 4, ERP: 1 },
      },
      {
        id: "IS_Q16_C",
        label: "Integrating the laboratory, pharmacy, and patient registration systems",
        weights: { ERP: 5 },
      },
      {
        id: "IS_Q16_D",
        label: "Standardizing the sample-handling workflow across departments",
        weights: { ERP: 5 },
      },
    ],
  },
  {
    id: "IS_Q17",
    major: "INFORMATION_SYSTEMS",
    type: "SCENARIO",
    category: "operations",
    text: "A manufacturing company wants to reduce unplanned machine downtime. Which responsibility would you prefer?",
    options: [
      {
        id: "IS_Q17_A",
        label: "Analyzing maintenance and production records to find patterns that precede failures",
        weights: { DATA_SCIENCE: 5, ERP: 1 },
      },
      {
        id: "IS_Q17_B",
        label: "Building a dashboard that shows maintenance teams which machines need attention",
        weights: { DATA_SCIENCE: 4, ERP: 1 },
      },
      {
        id: "IS_Q17_C",
        label: "Integrating the maintenance, production, and purchasing modules",
        weights: { ERP: 5 },
      },
      {
        id: "IS_Q17_D",
        label: "Redesigning the maintenance workflow and its approval rules",
        weights: { ERP: 5 },
      },
    ],
  },
  {
    id: "IS_Q18",
    major: "INFORMATION_SYSTEMS",
    type: "SCENARIO",
    category: "business-process",
    text: "A financial services firm struggles to close its monthly books on time. Which part of the fix interests you most?",
    options: [
      {
        id: "IS_Q18_A",
        label: "Analyzing the reporting data to find why closing tasks take so long",
        weights: { DATA_SCIENCE: 4, ERP: 1 },
      },
      {
        id: "IS_Q18_B",
        label: "Building a forecast of monthly revenue and expenses",
        weights: { DATA_SCIENCE: 5, ERP: 1 },
      },
      {
        id: "IS_Q18_C",
        label: "Configuring the finance and accounting system to automate closing steps",
        weights: { ERP: 5 },
      },
      {
        id: "IS_Q18_D",
        label: "Coordinating finance, operations, and sales around one shared calendar",
        weights: { ERP: 4, DATA_SCIENCE: 1 },
      },
    ],
  },
  {
    id: "IS_Q19",
    major: "INFORMATION_SYSTEMS",
    type: "PRIORITY",
    category: "analytics",
    text: "How important is it to you that decisions are supported by quantitative evidence?",
    options: [
      { id: "IS_Q19_A", label: "Not important at all", weights: {} },
      { id: "IS_Q19_B", label: "Slightly important", weights: { DATA_SCIENCE: 1 } },
      { id: "IS_Q19_C", label: "Neutral", weights: { DATA_SCIENCE: 2 } },
      { id: "IS_Q19_D", label: "Important", weights: { DATA_SCIENCE: 4 } },
      { id: "IS_Q19_E", label: "Very important", weights: { DATA_SCIENCE: 5 } },
    ],
  },
  {
    id: "IS_Q20",
    major: "INFORMATION_SYSTEMS",
    type: "PRIORITY",
    category: "organizational-change",
    text: "How important is it to you that your work helps different departments work together more smoothly?",
    options: [
      { id: "IS_Q20_A", label: "Not important at all", weights: {} },
      { id: "IS_Q20_B", label: "Slightly important", weights: { ERP: 1 } },
      { id: "IS_Q20_C", label: "Neutral", weights: { ERP: 2 } },
      { id: "IS_Q20_D", label: "Important", weights: { ERP: 4 } },
      { id: "IS_Q20_E", label: "Very important", weights: { ERP: 5 } },
    ],
  },
] as const satisfies readonly InformationSystemsQuestion[];

/** The complete Information Systems questionnaire: exactly 20 questions. */
export const informationSystemsQuestions: readonly InformationSystemsQuestion[] =
  informationSystemsQuestionConfig;

