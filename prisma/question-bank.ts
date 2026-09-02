/**
 * INITIAL QUESTIONNAIRE SEED DATA — the freshman-friendly question bank.
 *
 * This module exists ONLY to seed the database once (prisma/seed-questionnaires.ts
 * reads it). It is NOT the production source of truth: after seeding, PostgreSQL
 * owns all question texts, options, and weights. The runtime never imports this
 * module. It is kept separate from the seed script so future admins can review
 * the original questionnaire easily.
 *
 * Writing principles (documented in README, section "Questionnaire writing guide"):
 *  - questions measure curiosity, preference, interest, and problem-solving style;
 *  - no advanced concentration terminology, no knowledge-testing, no named
 *    concentration giveaways;
 *  - options are preference options, never "correct" answers.
 *
 * Weight scale: 0 = no signal, 1–2 = weak, 3 = moderate, 4–5 = strong.
 * One option may contribute to several concentrations.
 */

import type { Concentration } from "../data/concentrations";
import type { QuestionType } from "../data/questionTypes";
import type { Major } from "../lib/major";

export type SeedOptionWeights = Partial<Record<Concentration, number>>;

export type SeedQuestionOption = {
  label: string;
  /** Ordinal for LIKERT/AGREEMENT/PRIORITY scales (1–5); omitted otherwise. */
  numericValue?: number;
  weights: SeedOptionWeights;
};

export type SeedQuestion = {
  type: QuestionType;
  category: string;
  text: string;
  helpText?: string;
  options: readonly SeedQuestionOption[];
};

export type SeedQuestionnaire = {
  major: Major;
  versionNumber: 1;
  questions: readonly SeedQuestion[];
};

/** Standard five-level agreement scale. */
const AGREEMENT_OPTIONS: readonly SeedQuestionOption[] = [
  { label: "Strongly Disagree", numericValue: 1, weights: {} },
  { label: "Disagree", numericValue: 2, weights: {} },
  { label: "Neutral", numericValue: 3, weights: {} },
  { label: "Agree", numericValue: 4, weights: {} },
  { label: "Strongly Agree", numericValue: 5, weights: {} },
];

/** Standard five-level interest scale. */
const INTEREST_OPTIONS: readonly SeedQuestionOption[] = [
  { label: "Not interested at all", numericValue: 1, weights: {} },
  { label: "Slightly interested", numericValue: 2, weights: {} },
  { label: "Neutral", numericValue: 3, weights: {} },
  { label: "Interested", numericValue: 4, weights: {} },
  { label: "Very interested", numericValue: 5, weights: {} },
];

/** Standard five-level curiosity scale. */
const CURIOSITY_OPTIONS: readonly SeedQuestionOption[] = [
  { label: "Not curious at all", numericValue: 1, weights: {} },
  { label: "A little curious", numericValue: 2, weights: {} },
  { label: "Neutral", numericValue: 3, weights: {} },
  { label: "Curious", numericValue: 4, weights: {} },
  { label: "Very curious", numericValue: 5, weights: {} },
];

/** Standard five-level priority/importance scale. */
const IMPORTANCE_OPTIONS: readonly SeedQuestionOption[] = [
  { label: "Not important at all", numericValue: 1, weights: {} },
  { label: "Slightly important", numericValue: 2, weights: {} },
  { label: "Neutral", numericValue: 3, weights: {} },
  { label: "Important", numericValue: 4, weights: {} },
  { label: "Very important", numericValue: 5, weights: {} },
];

/**
 * Attaches concentration weights to a copy of a standard scale. The signature
 * mirrors the option order of the scale (1 → 5).
 */
function scaleWeights(
  base: readonly SeedQuestionOption[],
  ...rows: SeedOptionWeights[]
): readonly SeedQuestionOption[] {
  if (rows.length !== base.length) {
    throw new Error(
      `scaleWeights expected ${base.length} weight rows, received ${rows.length}.`,
    );
  }
  return base.map((option, index) => ({
    ...option,
    weights: rows[index],
  }));
}

const CYBER_SECURITY = "CYBER_SECURITY" as const;
const IOT = "IOT" as const;
const AI = "AI" as const;
const AI_HEALTHCARE = "AI_HEALTHCARE" as const;
const GAME_DEVELOPMENT = "GAME_DEVELOPMENT" as const;
const DEVOPS = "DEVOPS" as const;
const DATA_SCIENCE = "DATA_SCIENCE" as const;
const ERP = "ERP" as const;

// ---------------------------------------------------------------------------
// Informatics (20 questions, six concentrations)
// ---------------------------------------------------------------------------

const informaticsQuestions: readonly SeedQuestion[] = [

  {
    type: "LIKERT",
    category: "security",
    text: "When something unusual happens, are you curious to investigate what caused it?",
    options: scaleWeights(
      CURIOSITY_OPTIONS,
      { [CYBER_SECURITY]: 0 },
      { [CYBER_SECURITY]: 1 },
      { [CYBER_SECURITY]: 2 },
      { [CYBER_SECURITY]: 4, [AI]: 1 },
      { [CYBER_SECURITY]: 5, [AI]: 2 },
    ),
  },
  {
    type: "AGREEMENT",
    category: "security",
    text: "Do you enjoy looking for small clues that other people might overlook?",
    options: scaleWeights(
      AGREEMENT_OPTIONS,
      { [CYBER_SECURITY]: 0 },
      { [CYBER_SECURITY]: 1 },
      { [CYBER_SECURITY]: 2 },
      { [CYBER_SECURITY]: 4 },
      { [CYBER_SECURITY]: 5 },
    ),
  },
  {
    type: "AGREEMENT",
    category: "security",
    text: "Would you enjoy thinking about how to keep private information from reaching the wrong people?",
    options: scaleWeights(
      AGREEMENT_OPTIONS,
      { [CYBER_SECURITY]: 0 },
      { [CYBER_SECURITY]: 1 },
      { [CYBER_SECURITY]: 2 },
      { [CYBER_SECURITY]: 4, [DEVOPS]: 1 },
      { [CYBER_SECURITY]: 5, [DEVOPS]: 2 },
    ),
  },
  {
    type: "LIKERT",
    category: "hardware",
    text: "How curious are you about devices around you (such as smart watches, sensors, or home appliances) collecting information from the real world?",
    options: scaleWeights(
      CURIOSITY_OPTIONS,
      { [IOT]: 0 },
      { [IOT]: 1 },
      { [IOT]: 2 },
      { [IOT]: 4, [AI]: 1 },
      { [IOT]: 5, [AI]: 2 },
    ),
  },
  {
    type: "LIKERT",
    category: "hardware",
    text: "How interested are you in making everyday objects respond automatically to what is happening around them?",
    options: scaleWeights(
      INTEREST_OPTIONS,
      { [IOT]: 0 },
      { [IOT]: 1 },
      { [IOT]: 2 },
      { [IOT]: 4 },
      { [IOT]: 5 },
    ),
  },
  {
    type: "AGREEMENT",
    category: "machine-learning",
    text: "Are you curious about how computers can recognize patterns from many examples?",
    options: scaleWeights(
      AGREEMENT_OPTIONS,
      { [AI]: 0 },
      { [AI]: 1 },
      { [AI]: 2 },
      { [AI]: 4 },
      { [AI]: 5 },
    ),
  },
  {
    type: "LIKERT",
    category: "machine-learning",
    text: "How interested are you in experimenting with different approaches to help a computer make better predictions?",
    options: scaleWeights(
      INTEREST_OPTIONS,
      { [AI]: 0 },
      { [AI]: 1 },
      { [AI]: 2 },
      { [AI]: 4, [DEVOPS]: 1 },
      { [AI]: 5, [DEVOPS]: 2 },
    ),
  },
  {
    type: "AGREEMENT",
    category: "data-analysis",
    text: "When you see a lot of information, do you enjoy looking for patterns in it?",
    options: scaleWeights(
      AGREEMENT_OPTIONS,
      { [AI]: 0 },
      { [AI]: 1 },
      { [AI]: 2 },
      { [AI]: 4 },
      { [AI]: 5 },
    ),
  },
  {
    type: "AGREEMENT",
    category: "healthcare",
    text: "Would you be interested in using technology to help doctors or patients make better decisions?",
    options: scaleWeights(
      AGREEMENT_OPTIONS,
      { [AI_HEALTHCARE]: 0 },
      { [AI_HEALTHCARE]: 1 },
      { [AI_HEALTHCARE]: 2 },
      { [AI_HEALTHCARE]: 4, [AI]: 1 },
      { [AI_HEALTHCARE]: 5, [AI]: 2 },
    ),
  },
  {
    type: "LIKERT",
    category: "healthcare",
    text: "How interested are you in creating technology that helps people monitor their health, such as apps that track activity or sleep?",
    options: scaleWeights(
      INTEREST_OPTIONS,
      { [AI_HEALTHCARE]: 0 },
      { [AI_HEALTHCARE]: 1 },
      { [AI_HEALTHCARE]: 2 },
      { [AI_HEALTHCARE]: 4, [IOT]: 1 },
      { [AI_HEALTHCARE]: 5, [IOT]: 3 },
    ),
  },
  {
    type: "AGREEMENT",
    category: "healthcare",
    text: "Are you curious about how health information could be used to notice possible health problems earlier?",
    options: scaleWeights(
      AGREEMENT_OPTIONS,
      { [AI_HEALTHCARE]: 0 },
      { [AI_HEALTHCARE]: 1 },
      { [AI_HEALTHCARE]: 2, [AI]: 1 },
      { [AI_HEALTHCARE]: 4, [AI]: 2 },
      { [AI_HEALTHCARE]: 5, [AI]: 3 },
    ),
  },
  {
    type: "AGREEMENT",
    category: "creative-development",
    text: "Would you enjoy creating an interactive world where people can explore and make choices?",
    options: scaleWeights(
      AGREEMENT_OPTIONS,
      { [GAME_DEVELOPMENT]: 0 },
      { [GAME_DEVELOPMENT]: 1 },
      { [GAME_DEVELOPMENT]: 2 },
      { [GAME_DEVELOPMENT]: 4 },
      { [GAME_DEVELOPMENT]: 5 },
    ),
  },
  {
    type: "AGREEMENT",
    category: "creative-development",
    text: "When playing a game, do you sometimes think about how you would design the experience differently?",
    options: scaleWeights(
      AGREEMENT_OPTIONS,
      { [GAME_DEVELOPMENT]: 0 },
      { [GAME_DEVELOPMENT]: 1 },
      { [GAME_DEVELOPMENT]: 2 },
      { [GAME_DEVELOPMENT]: 4 },
      { [GAME_DEVELOPMENT]: 5 },
    ),
  },
  {
    type: "LIKERT",
    category: "creative-development",
    text: "How interested are you in creating experiences that combine visuals, interaction, sound, and storytelling?",
    options: scaleWeights(
      INTEREST_OPTIONS,
      { [GAME_DEVELOPMENT]: 0 },
      { [GAME_DEVELOPMENT]: 1 },
      { [GAME_DEVELOPMENT]: 2 },
      { [GAME_DEVELOPMENT]: 4 },
      { [GAME_DEVELOPMENT]: 5 },
    ),
  },
  {
    type: "AGREEMENT",
    category: "automation",
    text: "Would you enjoy finding ways to automate repetitive tasks?",
    options: scaleWeights(
      AGREEMENT_OPTIONS,
      { [DEVOPS]: 0 },
      { [DEVOPS]: 1 },
      { [DEVOPS]: 2 },
      { [DEVOPS]: 4 },
      { [DEVOPS]: 5 },
    ),
  },
  {
    type: "AGREEMENT",
    category: "automation",
    text: "Would you feel satisfied creating a process that helps a system run reliably every day?",
    options: scaleWeights(
      AGREEMENT_OPTIONS,
      { [DEVOPS]: 0 },
      { [DEVOPS]: 1 },
      { [DEVOPS]: 2 },
      { [DEVOPS]: 4 },
      { [DEVOPS]: 5 },
    ),
  },
  {
    type: "SCENARIO",
    category: "healthcare",
    text: "A hospital wants to improve patient care with technology. Which project would you most enjoy?",
    helpText:
      "Read the projects and choose the one that sounds most interesting to you. There is no wrong answer.",
    options: [
      {
        label: "An app that reminds patients to take their medicine on time",
        weights: { [AI_HEALTHCARE]: 4 },
      },
      {
        label: "A wristband that measures patients' activity and heart rate",
        weights: { [IOT]: 4, [AI_HEALTHCARE]: 3 },
      },
      {
        label: "A system that predicts which patients may need extra help",
        weights: { [AI]: 4, [AI_HEALTHCARE]: 3 },
      },
      {
        label: "A system that keeps patient records safe and private",
        weights: { [CYBER_SECURITY]: 4 },
      },
      {
        label: "A training simulation that lets nurses practice in a 3D hospital",
        weights: { [GAME_DEVELOPMENT]: 4 },
      },
    ],
  },
  {
    type: "SCENARIO",
    category: "infrastructure",
    text: "A university wants to host a large online event. Which role would you find most interesting?",
    helpText:
      "Each role is a different part of making the event successful. Choose the one that appeals to you most.",
    options: [
      {
        label: "Building a virtual campus where students can explore and meet",
        weights: { [GAME_DEVELOPMENT]: 5 },
      },
      {
        label: "Setting up the servers so thousands of students can join without the system breaking",
        weights: { [DEVOPS]: 5 },
      },
      {
        label: "Creating a chatbot that answers students' questions automatically",
        weights: { [AI]: 4 },
      },
      {
        label: "Protecting student accounts and personal data",
        weights: { [CYBER_SECURITY]: 4 },
      },
      {
        label: "Building a smart badge that records attendance automatically",
        weights: { [IOT]: 4 },
      },
    ],
  },
  {
    type: "PRIORITY",
    category: "creative-development",
    text: "How important is it to you that your future work creates experiences people can see, explore, and enjoy?",
    options: scaleWeights(
      IMPORTANCE_OPTIONS,
      { [GAME_DEVELOPMENT]: 0 },
      { [GAME_DEVELOPMENT]: 1 },
      { [GAME_DEVELOPMENT]: 2 },
      { [GAME_DEVELOPMENT]: 4 },
      { [GAME_DEVELOPMENT]: 5 },
    ),
  },
  {
    type: "MULTIPLE_CHOICE",
    category: "automation",
    text: "Which of these tasks would you most enjoy doing regularly?",
    helpText:
      "Think about a task you would actually look forward to doing. Choose the closest match.",
    options: [
      {
        label: "Investigating why a system stopped working and finding the exact cause",
        weights: { [CYBER_SECURITY]: 4, [DEVOPS]: 2 },
      },
      {
        label: "Connecting sensors and devices so they work together automatically",
        weights: { [IOT]: 4 },
      },
      {
        label: "Improving a system that predicts busy times so it can prepare in advance",
        weights: { [AI]: 4 },
      },
      {
        label: "Automating a repetitive task so nobody has to do it by hand",
        weights: { [DEVOPS]: 5 },
      },
      {
        label: "Designing a short animated guide that explains what to do next",
        weights: { [GAME_DEVELOPMENT]: 4 },
      },
    ],
  },
];


// ---------------------------------------------------------------------------
// Information Systems (20 questions, two concentrations)
// ---------------------------------------------------------------------------

const informationSystemsQuestions: readonly SeedQuestion[] = [
  {
    type: "AGREEMENT",
    category: "analytics",
    text: "When you see a table or chart, are you curious about what story the data is telling?",
    options: scaleWeights(
      AGREEMENT_OPTIONS,
      { [DATA_SCIENCE]: 0 },
      { [DATA_SCIENCE]: 1 },
      { [DATA_SCIENCE]: 2 },
      { [DATA_SCIENCE]: 4 },
      { [DATA_SCIENCE]: 5 },
    ),
  },
  {
    type: "AGREEMENT",
    category: "analytics",
    text: "Do you enjoy comparing information to find patterns or trends?",
    options: scaleWeights(
      AGREEMENT_OPTIONS,
      { [DATA_SCIENCE]: 0 },
      { [DATA_SCIENCE]: 1 },
      { [DATA_SCIENCE]: 2 },
      { [DATA_SCIENCE]: 4 },
      { [DATA_SCIENCE]: 5 },
    ),
  },
  {
    type: "AGREEMENT",
    category: "analytics",
    text: "When making a decision, do you prefer having evidence or data to support it?",
    options: scaleWeights(
      AGREEMENT_OPTIONS,
      { [DATA_SCIENCE]: 0 },
      { [DATA_SCIENCE]: 1 },
      { [DATA_SCIENCE]: 2 },
      { [DATA_SCIENCE]: 4 },
      { [DATA_SCIENCE]: 5 },
    ),
  },
  {
    type: "LIKERT",
    category: "data-preparation",
    text: "How interested are you in turning a large amount of information into something easier to understand?",
    options: scaleWeights(
      INTEREST_OPTIONS,
      { [DATA_SCIENCE]: 0 },
      { [DATA_SCIENCE]: 1 },
      { [DATA_SCIENCE]: 2 },
      { [DATA_SCIENCE]: 4 },
      { [DATA_SCIENCE]: 5 },
    ),
  },
  {
    type: "AGREEMENT",
    category: "business-process",
    text: "Do you enjoy organizing a complicated process into clear steps?",
    options: scaleWeights(
      AGREEMENT_OPTIONS,
      { [ERP]: 0 },
      { [ERP]: 1 },
      { [ERP]: 2 },
      { [ERP]: 4 },
      { [ERP]: 5 },
    ),
  },
  {
    type: "LIKERT",
    category: "business-process",
    text: "How interested are you in how different departments in a company work together?",
    options: scaleWeights(
      INTEREST_OPTIONS,
      { [ERP]: 0 },
      { [ERP]: 1 },
      { [ERP]: 2 },
      { [ERP]: 4 },
      { [ERP]: 5 },
    ),
  },
  {
    type: "AGREEMENT",
    category: "business-process",
    text: "If several teams used different methods for the same task, would you enjoy finding a more organized way for them to work together?",
    options: scaleWeights(
      AGREEMENT_OPTIONS,
      { [ERP]: 0 },
      { [ERP]: 1 },
      { [ERP]: 2 },
      { [ERP]: 4 },
      { [ERP]: 5 },
    ),
  },
  {
    type: "AGREEMENT",
    category: "business-process",
    text: "Would you enjoy improving a process so information only needs to be entered once and can be shared by different teams?",
    options: scaleWeights(
      AGREEMENT_OPTIONS,
      { [ERP]: 0 },
      { [ERP]: 1 },
      { [ERP]: 2 },
      { [ERP]: 4 },
      { [ERP]: 5 },
    ),
  },
  {
    type: "LIKERT",
    category: "analytics",
    text: "How interested are you in using numbers and data to help a business make better decisions?",
    options: scaleWeights(
      INTEREST_OPTIONS,
      { [DATA_SCIENCE]: 0 },
      { [DATA_SCIENCE]: 1 },
      { [DATA_SCIENCE]: 2 },
      { [DATA_SCIENCE]: 4, [ERP]: 1 },
      { [DATA_SCIENCE]: 5, [ERP]: 2 },
    ),
  },
  {
    type: "MULTIPLE_CHOICE",
    category: "visualization",
    text: "Which of these projects would you most enjoy working on?",
    helpText:
      "All of these are real, valuable projects. Choose the one that sounds most appealing to you.",
    options: [
      {
        label: "Digging into a large amount of data to find a hidden pattern",
        weights: { [DATA_SCIENCE]: 5 },
      },
      {
        label: "Building a clear dashboard that makes complex data easy to understand",
        weights: { [DATA_SCIENCE]: 4 },
      },
      {
        label: "Helping different teams agree on one standard way of working",
        weights: { [ERP]: 4 },
      },
      {
        label: "Designing the steps a company follows when it processes an order",
        weights: { [ERP]: 5 },
      },
    ],
  },
  {
    type: "SCENARIO",
    category: "analytics",
    text: "A clothing store wants to know which products customers will want next season. Which task would you most enjoy?",
    helpText:
      "Each task is a different way of helping the store plan ahead. Choose the one that fits you best.",
    options: [
      {
        label: "Analyzing past sales to find what is trending",
        weights: { [DATA_SCIENCE]: 5 },
      },
      {
        label: "Building a clear chart the store manager can read at a glance",
        weights: { [DATA_SCIENCE]: 4 },
      },
      {
        label: "Coordinating with suppliers so popular products are restocked in time",
        weights: { [ERP]: 4 },
      },
      {
        label: "Designing one standard ordering process used by every store",
        weights: { [ERP]: 5 },
      },
    ],
  },
  {
    type: "SCENARIO",
    category: "enterprise-integration",
    text: "A company's departments each keep their own version of customer information. Which part of the solution would you most enjoy?",
    helpText:
      "The company needs both analysis and coordination. Choose the part you would find most interesting.",
    options: [
      {
        label: "Finding out why the departments' records disagree",
        weights: { [DATA_SCIENCE]: 3, [ERP]: 2 },
      },
      {
        label: "Designing a single shared system all departments use",
        weights: { [ERP]: 5 },
      },
      {
        label: "Training employees on the new way of working",
        weights: { [ERP]: 3 },
      },
      {
        label: "Building reports that compare information across departments",
        weights: { [DATA_SCIENCE]: 4, [ERP]: 1 },
      },
    ],
  },
  {
    type: "SCENARIO",
    category: "operations",
    text: "A hospital wants to reduce how long patients wait. Which part would you most enjoy?",
    helpText:
      "Fixing the problem requires both insight and coordination. Choose the part that appeals to you.",
    options: [
      {
        label: "Analyzing records to find the biggest bottlenecks",
        weights: { [DATA_SCIENCE]: 5 },
      },
      {
        label: "Building a model that predicts how many patients will arrive each day",
        weights: { [DATA_SCIENCE]: 4 },
      },
      {
        label: "Coordinating registration, labs, and pharmacy into one smoother workflow",
        weights: { [ERP]: 5 },
      },
      {
        label: "Standardizing how departments hand off patients between teams",
        weights: { [ERP]: 4 },
      },
    ],
  },
  {
    type: "PRIORITY",
    category: "business-process",
    text: "How important is it that your work helps a business run more efficiently?",
    options: scaleWeights(
      IMPORTANCE_OPTIONS,
      { [ERP]: 0 },
      { [ERP]: 1 },
      { [ERP]: 2 },
      { [ERP]: 4 },
      { [ERP]: 5 },
    ),
  },
  {
    type: "PRIORITY",
    category: "analytics",
    text: "How important is it to you that decisions are backed by numbers and evidence?",
    options: scaleWeights(
      IMPORTANCE_OPTIONS,
      { [DATA_SCIENCE]: 0 },
      { [DATA_SCIENCE]: 1 },
      { [DATA_SCIENCE]: 2 },
      { [DATA_SCIENCE]: 4 },
      { [DATA_SCIENCE]: 5 },
    ),
  },
  {
    type: "AGREEMENT",
    category: "enterprise-integration",
    text: "Would you enjoy making sure different parts of an organization use the same system and the same information?",
    options: scaleWeights(
      AGREEMENT_OPTIONS,
      { [ERP]: 0 },
      { [ERP]: 1 },
      { [ERP]: 2 },
      { [ERP]: 4 },
      { [ERP]: 5 },
    ),
  },
  {
    type: "AGREEMENT",
    category: "business-process",
    text: "Do you naturally notice when a process could be done in fewer steps?",
    options: scaleWeights(
      AGREEMENT_OPTIONS,
      { [ERP]: 0 },
      { [ERP]: 1 },
      { [ERP]: 2 },
      { [ERP]: 4, [DATA_SCIENCE]: 1 },
      { [ERP]: 5, [DATA_SCIENCE]: 2 },
    ),
  },
  {
    type: "LIKERT",
    category: "analytics",
    text: "How interested are you in discovering insights that other people miss by looking at data carefully?",
    options: scaleWeights(
      INTEREST_OPTIONS,
      { [DATA_SCIENCE]: 0 },
      { [DATA_SCIENCE]: 1 },
      { [DATA_SCIENCE]: 2 },
      { [DATA_SCIENCE]: 4 },
      { [DATA_SCIENCE]: 5 },
    ),
  },
  {
    type: "SCENARIO",
    category: "operations",
    text: "A delivery company wants to improve its service. Which responsibility would you prefer?",
    helpText:
      "Each responsibility contributes to a better service. Choose the one you would find most engaging.",
    options: [
      {
        label: "Analyzing delivery times and complaints to find patterns",
        weights: { [DATA_SCIENCE]: 5 },
      },
      {
        label: "Building a forecast of which days will be busiest",
        weights: { [DATA_SCIENCE]: 4 },
      },
      {
        label: "Coordinating drivers, warehouses, and customer service through one system",
        weights: { [ERP]: 5 },
      },
      {
        label: "Designing a standard procedure for handling late deliveries",
        weights: { [ERP]: 4 },
      },
    ],
  },
  {
    type: "SCENARIO",
    category: "organizational-change",
    text: "A school wants to understand why enrollment is falling. Which role would you most enjoy?",
    helpText:
      "The school needs both data and coordination. Choose the role that sounds most interesting to you.",
    options: [
      {
        label: "Gathering and analyzing enrollment data",
        weights: { [DATA_SCIENCE]: 5 },
      },
      {
        label: "Creating charts that explain the findings clearly",
        weights: { [DATA_SCIENCE]: 4 },
      },
      {
        label: "Coordinating admissions, finance, and marketing to work on the problem together",
        weights: { [ERP]: 5 },
      },
      {
        label: "Redesigning the enrollment process to make it simpler",
        weights: { [ERP]: 4 },
      },
    ],
  },
];

if (informaticsQuestions.length !== 20) {
  throw new Error(
    `Informatics question bank must contain exactly 20 questions (found ${informaticsQuestions.length}).`,
  );
}
if (informationSystemsQuestions.length !== 20) {
  throw new Error(
    `Information Systems question bank must contain exactly 20 questions (found ${informationSystemsQuestions.length}).`,
  );
}

export const INITIAL_QUESTIONNAIRES: readonly SeedQuestionnaire[] = [
  {
    major: "INFORMATICS",
    versionNumber: 1,
    questions: informaticsQuestions,
  },
  {
    major: "INFORMATION_SYSTEMS",
    versionNumber: 1,
    questions: informationSystemsQuestions,
  },
];

