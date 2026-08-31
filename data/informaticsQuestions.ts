import "server-only";

import type { Concentration } from "@/data/concentrations";

/**
 * Informatics questionnaire configuration (STEP 4).
 *
 * SERVER-ONLY (STEP 12 security refactor): this file contains the
 * authoritative per-option scoring weights, so it imports "server-only".
 * Client Components must never import it — they use the weight-free public
 * metadata from data/publicQuestions.ts instead. See
 * lib/scoring/server/informaticsWeights.ts for the derived weight map.
 *
 * Exactly 20 questions measuring suitability across the six Informatics
 * concentrations: CYBER_SECURITY, IOT, AI, AI_HEALTHCARE,
 * GAME_DEVELOPMENT, DEVOPS.
 *
 * Students never pick a concentration here — suitability is inferred from
 * their answers using the per-option weights below.
 *
 * Weight scale (applies to every weight in this file):
 *   0 = no meaningful relationship   1 = weak relationship
 *   2 = mild relationship            3 = moderate relationship
 *   4 = strong relationship          5 = very strong relationship
 *
 * A single answer may contribute to several concentrations. This is
 * especially useful for interdisciplinary interests such as VR, where
 * immersive gameplay strongly points to GAME_DEVELOPMENT while motion
 * sensors / wearables strongly point to IOT.
 *
 * Question IDs are stable (INF_Q01 … INF_Q20) and option IDs are stable
 * (INF_Q01_A …). These IDs will later be stored in the database, so they
 * must never be generated at runtime or changed casually.
 *
 * Question data lives in TypeScript only — it is NOT stored in the
 * database. Later AssessmentAnswer rows will store (questionId, answerKey)
 * and resolve back to this configuration.
 */

/** The six concentrations that belong to the Informatics major only. */
export const INFORMATICS_CONCENTRATIONS = [
  "CYBER_SECURITY",
  "IOT",
  "AI",
  "AI_HEALTHCARE",
  "GAME_DEVELOPMENT",
  "DEVOPS",
] as const satisfies readonly Concentration[];

export type InformaticsConcentration = (typeof INFORMATICS_CONCENTRATIONS)[number];

export type InformaticsQuestionType =
  | "LIKERT"
  | "AGREEMENT"
  | "MULTIPLE_CHOICE"
  | "SCENARIO"
  | "PRIORITY";

/**
 * Weights contributed by one answer. An absent concentration means weight 0.
 * All values must be integers between 0 and 5.
 */
export type InformaticsQuestionWeights = Partial<
  Record<InformaticsConcentration, number>
>;

export type InformaticsAnswerOption = {
  /** Stable option ID, e.g. "INF_Q01_A". */
  id: string;
  label: string;
  weights: InformaticsQuestionWeights;
};

export type InformaticsQuestion = {
  /** Stable question ID, e.g. "INF_Q01". */
  id: string;
  major: "INFORMATICS";
  type: InformaticsQuestionType;
  text: string;
  options: InformaticsAnswerOption[];
  /** Optional topic bucket used later for recommendation explanations. */
  category?: string;
  /**
   * Optional high-value differentiator marker (1 = strongest). Used
   * sparingly; final tie-breaking logic is implemented in a later step.
   */
  tieBreakerPriority?: number;
};

const informaticsQuestionConfig = [
  {
    id: "INF_Q01",
    major: "INFORMATICS",
    type: "LIKERT",
    category: "security",
    text: "How interested are you in understanding how computer systems are protected against unauthorized access and misuse?",
    options: [
      { id: "INF_Q01_A", label: "Not interested at all", weights: {} },
      { id: "INF_Q01_B", label: "Slightly interested", weights: { CYBER_SECURITY: 1 } },
      { id: "INF_Q01_C", label: "Neutral", weights: { CYBER_SECURITY: 2 } },
      { id: "INF_Q01_D", label: "Interested", weights: { CYBER_SECURITY: 4 } },
      { id: "INF_Q01_E", label: "Very interested", weights: { CYBER_SECURITY: 5 } },
    ],
  },
  {
    id: "INF_Q02",
    major: "INFORMATICS",
    type: "LIKERT",
    category: "hardware",
    text: "How interested are you in building software that works with physical devices, such as sensors, microcontrollers, or wearables?",
    options: [
      { id: "INF_Q02_A", label: "Not interested at all", weights: {} },
      { id: "INF_Q02_B", label: "Slightly interested", weights: { IOT: 1 } },
      { id: "INF_Q02_C", label: "Neutral", weights: { IOT: 2 } },
      { id: "INF_Q02_D", label: "Interested", weights: { IOT: 4 } },
      { id: "INF_Q02_E", label: "Very interested", weights: { IOT: 5 } },
    ],
  },
  {
    id: "INF_Q03",
    major: "INFORMATICS",
    type: "LIKERT",
    category: "machine-learning",
    text: "How interested are you in experimenting with machine learning models that learn patterns from data?",
    options: [
      { id: "INF_Q03_A", label: "Not interested at all", weights: {} },
      { id: "INF_Q03_B", label: "Slightly interested", weights: { AI: 1 } },
      { id: "INF_Q03_C", label: "Neutral", weights: { AI: 2 } },
      { id: "INF_Q03_D", label: "Interested", weights: { AI: 4 } },
      { id: "INF_Q03_E", label: "Very interested", weights: { AI: 5 } },
    ],
  },
  {
    id: "INF_Q04",
    major: "INFORMATICS",
    type: "LIKERT",
    category: "healthcare",
    text: "How interested are you in technology that helps people monitor or improve their health?",
    options: [
      { id: "INF_Q04_A", label: "Not interested at all", weights: {} },
      { id: "INF_Q04_B", label: "Slightly interested", weights: { AI_HEALTHCARE: 1 } },
      { id: "INF_Q04_C", label: "Neutral", weights: { AI_HEALTHCARE: 2 } },
      { id: "INF_Q04_D", label: "Interested", weights: { AI_HEALTHCARE: 4 } },
      { id: "INF_Q04_E", label: "Very interested", weights: { AI_HEALTHCARE: 5 } },
    ],
  },
  {
    id: "INF_Q05",
    major: "INFORMATICS",
    type: "LIKERT",
    category: "creative-development",
    text: "How interested are you in designing interactive experiences, such as games, that respond to what a player does?",
    options: [
      { id: "INF_Q05_A", label: "Not interested at all", weights: {} },
      { id: "INF_Q05_B", label: "Slightly interested", weights: { GAME_DEVELOPMENT: 1 } },
      { id: "INF_Q05_C", label: "Neutral", weights: { GAME_DEVELOPMENT: 2 } },
      { id: "INF_Q05_D", label: "Interested", weights: { GAME_DEVELOPMENT: 4 } },
      { id: "INF_Q05_E", label: "Very interested", weights: { GAME_DEVELOPMENT: 5 } },
    ],
  },
  {
    id: "INF_Q06",
    major: "INFORMATICS",
    type: "AGREEMENT",
    category: "infrastructure",
    text: "I am comfortable working with command-line tools, servers, containers, and cloud platforms rather than only writing application code.",
    options: [
      { id: "INF_Q06_A", label: "Strongly Disagree", weights: {} },
      { id: "INF_Q06_B", label: "Disagree", weights: { DEVOPS: 1 } },
      { id: "INF_Q06_C", label: "Neutral", weights: { DEVOPS: 2 } },
      { id: "INF_Q06_D", label: "Agree", weights: { DEVOPS: 4, CYBER_SECURITY: 1 } },
      { id: "INF_Q06_E", label: "Strongly Agree", weights: { DEVOPS: 5, CYBER_SECURITY: 2 } },
    ],
  },
  {
    id: "INF_Q07",
    major: "INFORMATICS",
    type: "AGREEMENT",
    category: "security",
    text: "I enjoy investigating how an unusual event or suspicious pattern might have entered a system.",
    options: [
      { id: "INF_Q07_A", label: "Strongly Disagree", weights: {} },
      { id: "INF_Q07_B", label: "Disagree", weights: { CYBER_SECURITY: 1 } },
      { id: "INF_Q07_C", label: "Neutral", weights: { CYBER_SECURITY: 2 } },
      { id: "INF_Q07_D", label: "Agree", weights: { CYBER_SECURITY: 4, AI: 1 } },
      { id: "INF_Q07_E", label: "Strongly Agree", weights: { CYBER_SECURITY: 5, AI: 2 } },
    ],
  },
  {
    id: "INF_Q08",
    major: "INFORMATICS",
    type: "AGREEMENT",
    category: "machine-learning",
    text: "I would rather build a system that learns and improves from data than one that follows a fixed set of rules.",
    options: [
      { id: "INF_Q08_A", label: "Strongly Disagree", weights: {} },
      { id: "INF_Q08_B", label: "Disagree", weights: { AI: 1 } },
      { id: "INF_Q08_C", label: "Neutral", weights: { AI: 2 } },
      { id: "INF_Q08_D", label: "Agree", weights: { AI: 4, DEVOPS: 1 } },
      { id: "INF_Q08_E", label: "Strongly Agree", weights: { AI: 5, DEVOPS: 2 } },
    ],
  },
  {
    id: "INF_Q09",
    major: "INFORMATICS",
    type: "AGREEMENT",
    category: "hardware",
    text: "I enjoy tinkering with physical hardware until it and the software around it work together.",
    options: [
      { id: "INF_Q09_A", label: "Strongly Disagree", weights: {} },
      { id: "INF_Q09_B", label: "Disagree", weights: { IOT: 1 } },
      { id: "INF_Q09_C", label: "Neutral", weights: { IOT: 2 } },
      { id: "INF_Q09_D", label: "Agree", weights: { IOT: 4, GAME_DEVELOPMENT: 1 } },
      { id: "INF_Q09_E", label: "Strongly Agree", weights: { IOT: 5, GAME_DEVELOPMENT: 2 } },
    ],
  },
  {
    id: "INF_Q10",
    major: "INFORMATICS",
    type: "MULTIPLE_CHOICE",
    category: "healthcare",
    tieBreakerPriority: 1,
    text: "A clinic wants to use technology to catch health problems earlier. Which task would you most enjoy?",
    options: [
      {
        id: "INF_Q10_A",
        label: "Build the wearable device that collects health signals from patients",
        weights: { IOT: 3, AI_HEALTHCARE: 2 },
      },
      {
        id: "INF_Q10_B",
        label: "Build the model that recognizes early warning patterns in health data",
        weights: { AI_HEALTHCARE: 5, AI: 3 },
      },
      {
        id: "INF_Q10_C",
        label: "Design the secure system that protects patient records and access",
        weights: { CYBER_SECURITY: 3, AI_HEALTHCARE: 2 },
      },
      {
        id: "INF_Q10_D",
        label: "Keep the data platform running reliably so results are always available",
        weights: { DEVOPS: 4, AI_HEALTHCARE: 1 },
      },
      {
        id: "INF_Q10_E",
        label: "Create the assistant that turns results into clear advice for patients",
        weights: { AI: 3, AI_HEALTHCARE: 2 },
      },
    ],
  },
  {
    id: "INF_Q11",
    major: "INFORMATICS",
    type: "MULTIPLE_CHOICE",
    category: "immersive-tech",
    tieBreakerPriority: 1,
    text: "You are asked to build a new immersive experience for a theme park. Which part would you most want to own?",
    options: [
      {
        id: "INF_Q11_A",
        label: "Design the 3D world and how visitors interact with it",
        weights: { GAME_DEVELOPMENT: 5, IOT: 1 },
      },
      {
        id: "INF_Q11_B",
        label: "Build the wearable motion-tracking gear and sensor network",
        weights: { IOT: 5, GAME_DEVELOPMENT: 2 },
      },
      {
        id: "INF_Q11_C",
        label: "Create the AI that adapts the experience to each visitor",
        weights: { AI: 3, GAME_DEVELOPMENT: 1 },
      },
      {
        id: "INF_Q11_D",
        label: "Protect the booking and control systems from tampering",
        weights: { CYBER_SECURITY: 2 },
      },
      {
        id: "INF_Q11_E",
        label: "Run the cloud infrastructure so the experience runs smoothly at scale",
        weights: { DEVOPS: 3 },
      },
    ],
  },
  {
    id: "INF_Q12",
    major: "INFORMATICS",
    type: "MULTIPLE_CHOICE",
    category: "security",
    text: "Which unexpected problem would you most enjoy digging into?",
    options: [
      {
        id: "INF_Q12_A",
        label: "Users can suddenly see data they should not have access to",
        weights: { CYBER_SECURITY: 5, AI: 1 },
      },
      {
        id: "INF_Q12_B",
        label: "A fleet of sensors is reporting readings that change for no clear reason",
        weights: { IOT: 4, DEVOPS: 1 },
      },
      {
        id: "INF_Q12_C",
        label: "A model's predictions are accurate for some groups of people but not others",
        weights: { AI: 3, AI_HEALTHCARE: 4 },
      },
      {
        id: "INF_Q12_D",
        label: "A game becomes unresponsive whenever many players join",
        weights: { GAME_DEVELOPMENT: 5, DEVOPS: 2 },
      },
      {
        id: "INF_Q12_E",
        label: "A deployment pipeline silently fails at the same stage every night",
        weights: { DEVOPS: 4, CYBER_SECURITY: 1 },
      },
    ],
  },
  {
    id: "INF_Q13",
    major: "INFORMATICS",
    type: "MULTIPLE_CHOICE",
    category: "data-analysis",
    text: "You have access to a large stream of real-world data. Which question would you most want to answer?",
    options: [
      {
        id: "INF_Q13_A",
        label: "Which events in network logs signal a possible attack?",
        weights: { CYBER_SECURITY: 4, AI: 2 },
      },
      {
        id: "INF_Q13_B",
        label: "Which sensor patterns predict that a machine is about to fail?",
        weights: { IOT: 3, AI: 2, DEVOPS: 1 },
      },
      {
        id: "INF_Q13_C",
        label: "Which features best predict the next value in a sequence?",
        weights: { AI: 5 },
      },
      {
        id: "INF_Q13_D",
        label: "Which early signals could warn that someone's health is changing?",
        weights: { AI_HEALTHCARE: 5, AI: 2 },
      },
      {
        id: "INF_Q13_E",
        label: "Which player behaviors make a game more engaging?",
        weights: { GAME_DEVELOPMENT: 4, AI: 1 },
      },
    ],
  },
  {
    id: "INF_Q14",
    major: "INFORMATICS",
    type: "MULTIPLE_CHOICE",
    category: "infrastructure",
    text: "A team ships new versions of its software every week. Which responsibility appeals to you most?",
    options: [
      {
        id: "INF_Q14_A",
        label: "Automate building, testing, and releasing each new version",
        weights: { DEVOPS: 5 },
      },
      {
        id: "INF_Q14_B",
        label: "Monitor the running system and respond to problems before users notice",
        weights: { DEVOPS: 4, CYBER_SECURITY: 2 },
      },
      {
        id: "INF_Q14_C",
        label: "Harden the systems so an attacker cannot break in",
        weights: { CYBER_SECURITY: 4 },
      },
      {
        id: "INF_Q14_D",
        label: "Build the models that detect anomalies in system metrics",
        weights: { AI: 3, DEVOPS: 2 },
      },
      {
        id: "INF_Q14_E",
        label: "Build the sensor layer that feeds monitoring with real device data",
        weights: { IOT: 3, DEVOPS: 1 },
      },
      {
        id: "INF_Q14_F",
        label: "Build a training simulator that lets new engineers practice deploying safely",
        weights: { GAME_DEVELOPMENT: 4, DEVOPS: 2 },
      },
    ],
  },
  {
    id: "INF_Q15",
    major: "INFORMATICS",
    type: "MULTIPLE_CHOICE",
    category: "creative-development",
    text: "Which game feature would you most want to design?",
    options: [
      {
        id: "INF_Q15_A",
        label: "A physics-based puzzle where objects respond realistically",
        weights: { GAME_DEVELOPMENT: 5, AI: 1 },
      },
      {
        id: "INF_Q15_B",
        label: "Enemies that adapt to how the player plays",
        weights: { AI: 5, GAME_DEVELOPMENT: 3 },
      },
      {
        id: "INF_Q15_C",
        label: "A VR level where the player moves through a 3D space using body motion",
        weights: { GAME_DEVELOPMENT: 5, IOT: 2 },
      },
      {
        id: "INF_Q15_D",
        label: "Online play that stays fair and free from cheating",
        weights: { CYBER_SECURITY: 3, GAME_DEVELOPMENT: 2 },
      },
      {
        id: "INF_Q15_E",
        label: "A cloud backend that keeps leaderboards and saves in sync",
        weights: { DEVOPS: 4, GAME_DEVELOPMENT: 1 },
      },
      {
        id: "INF_Q15_F",
        label: "A serious game that helps patients practice rehabilitation exercises",
        weights: { GAME_DEVELOPMENT: 4, AI_HEALTHCARE: 5, IOT: 1 },
      },
    ],
  },
  {
    id: "INF_Q16",
    major: "INFORMATICS",
    type: "SCENARIO",
    category: "security",
    tieBreakerPriority: 2,
    text: "A hospital's online patient portal suddenly experiences unusual traffic, and many users cannot log in. Which part of solving the problem would you most enjoy?",
    options: [
      {
        id: "INF_Q16_A",
        label: "Investigating whether the traffic is a coordinated attack",
        weights: { CYBER_SECURITY: 5, AI_HEALTHCARE: 1 },
      },
      {
        id: "INF_Q16_B",
        label: "Automating infrastructure recovery so the service comes back safely",
        weights: { DEVOPS: 5 },
      },
      {
        id: "INF_Q16_C",
        label: "Building a model that detects anomalous traffic in real time",
        weights: { AI: 4, CYBER_SECURITY: 2 },
      },
      {
        id: "INF_Q16_D",
        label: "Analyzing whether patient wearable devices are flooding the network with bad data",
        weights: { IOT: 4, AI_HEALTHCARE: 2, CYBER_SECURITY: 1 },
      },
      {
        id: "INF_Q16_E",
        label: "Designing a simulation that lets the team practice responding to incidents",
        weights: { GAME_DEVELOPMENT: 4, CYBER_SECURITY: 2 },
      },
      {
        id: "INF_Q16_F",
        label: "Ensuring patient data stays private and properly protected during the incident",
        weights: { AI_HEALTHCARE: 5, CYBER_SECURITY: 3 },
      },
    ],
  },
  {
    id: "INF_Q17",
    major: "INFORMATICS",
    type: "SCENARIO",
    category: "immersive-tech",
    tieBreakerPriority: 1,
    text: "You are building an immersive training environment where a technician learns to service machines. Which responsibility sounds most interesting?",
    options: [
      {
        id: "INF_Q17_A",
        label: "Creating the VR world, the 3D equipment models, and hands-on interaction",
        weights: { GAME_DEVELOPMENT: 5, IOT: 2 },
      },
      {
        id: "INF_Q17_B",
        label: "Wiring the motion sensors and haptic wearable devices that track the trainee",
        weights: { IOT: 5, GAME_DEVELOPMENT: 3 },
      },
      {
        id: "INF_Q17_C",
        label: "Building the intelligent system that adjusts training difficulty to the trainee's progress",
        weights: { AI: 4 },
      },
      {
        id: "INF_Q17_D",
        label: "Securing the training platform and the trainee records",
        weights: { CYBER_SECURITY: 3, GAME_DEVELOPMENT: 1 },
      },
      {
        id: "INF_Q17_E",
        label: "Automating updates and deployment of the training environment to many sites",
        weights: { DEVOPS: 4 },
      },
      {
        id: "INF_Q17_F",
        label: "Building a VR rehabilitation module that helps patients practice recovery movements",
        weights: { GAME_DEVELOPMENT: 4, AI_HEALTHCARE: 5, IOT: 2 },
      },
    ],
  },
  {
    id: "INF_Q18",
    major: "INFORMATICS",
    type: "SCENARIO",
    category: "automation",
    text: "A smart factory wants to reduce downtime by predicting when machines will fail. Which role would you prefer?",
    options: [
      {
        id: "INF_Q18_A",
        label: "Build the sensor network that collects vibration and temperature data",
        weights: { IOT: 5, AI: 2 },
      },
      {
        id: "INF_Q18_B",
        label: "Build the prediction model that learns failure patterns",
        weights: { AI: 4, IOT: 2 },
      },
      {
        id: "INF_Q18_C",
        label: "Protect the factory's control systems from cyber threats",
        weights: { CYBER_SECURITY: 4 },
      },
      {
        id: "INF_Q18_D",
        label: "Automate the maintenance workflow from alert to scheduled repair",
        weights: { DEVOPS: 5 },
      },
      {
        id: "INF_Q18_E",
        label: "Build a wearable safety device that monitors workers' fatigue and health",
        weights: { IOT: 4, AI_HEALTHCARE: 5 },
      },
    ],
  },
  {
    id: "INF_Q19",
    major: "INFORMATICS",
    type: "PRIORITY",
    category: "creative-development",
    text: "How important is combining creativity with programming in your future work?",
    options: [
      { id: "INF_Q19_A", label: "Not important at all", weights: {} },
      { id: "INF_Q19_B", label: "Slightly important", weights: { GAME_DEVELOPMENT: 1 } },
      { id: "INF_Q19_C", label: "Neutral", weights: { GAME_DEVELOPMENT: 2 } },
      { id: "INF_Q19_D", label: "Important", weights: { GAME_DEVELOPMENT: 4 } },
      { id: "INF_Q19_E", label: "Very important", weights: { GAME_DEVELOPMENT: 5 } },
    ],
  },
  {
    id: "INF_Q20",
    major: "INFORMATICS",
    type: "PRIORITY",
    category: "hardware",
    text: "How important is working with physical devices, sensors, or hardware in your future work?",
    options: [
      { id: "INF_Q20_A", label: "Not important at all", weights: {} },
      { id: "INF_Q20_B", label: "Slightly important", weights: { IOT: 1 } },
      { id: "INF_Q20_C", label: "Neutral", weights: { IOT: 2 } },
      { id: "INF_Q20_D", label: "Important", weights: { IOT: 4, AI_HEALTHCARE: 1 } },
      { id: "INF_Q20_E", label: "Very important", weights: { IOT: 5, AI_HEALTHCARE: 2 } },
    ],
  },
] as const satisfies readonly InformaticsQuestion[];

/** The complete Informatics questionnaire: exactly 20 questions. */
export const informaticsQuestions: readonly InformaticsQuestion[] =
  informaticsQuestionConfig;

