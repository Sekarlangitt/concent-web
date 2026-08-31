import type { Major } from "@/lib/major";
import type { QuestionType } from "@/data/questionTypes";

/**
 * CLIENT-SAFE public questionnaire metadata (STEP 12 security refactor).
 *
 * This module is the ONLY question data that Client Components may import.
 * It deliberately contains NO scoring weights, NO scoring metadata, and no
 * tie-break configuration — only display metadata:
 *
 *   - question IDs
 *   - question text
 *   - question type (display hint)
 *   - category (display label)
 *   - option IDs and option labels
 *
 * The authoritative configuration — including every per-option weight — lives
 * in the server-only modules:
 *
 *   data/informaticsQuestions.ts            (server-only, with weights)
 *   data/informationSystemsQuestions.ts     (server-only, with weights)
 *   lib/scoring/server/informaticsWeights.ts
 *   lib/scoring/server/informationSystemsWeights.ts
 *
 * Because scoring weights must never reach the browser, the authoritative
 * modules import "server-only" and the application code is split so that
 * Client Components can only reach this public view. lib/weight-parity.test.ts
 * verifies this public view and the authoritative configuration never drift:
 * every question, option, text, label, type, and category must match.
 *
 * The questionnaire structure is preserved exactly:
 *   40 questions total — 20 Informatics (INF_Q01…INF_Q20) and
 *   20 Information Systems (IS_Q01…IS_Q20). A student answers exactly the
 *   20 questions for their selected major.
 */

/** A single client-safe answer option (ID + label only, no weights). */
export type PublicQuestionOption = {
  /** Stable option ID, e.g. "INF_Q01_A". */
  id: string;
  label: string;
};

/** A single client-safe question (display metadata only, no weights). */
export type PublicQuestion = {
  /** Stable question ID, e.g. "INF_Q01". */
  id: string;
  major: Major;
  type: QuestionType;
  text: string;
  category?: string;
  options: readonly PublicQuestionOption[];
};

/** Every public question across both majors. */
export type AnyPublicQuestion = PublicQuestion;

/** The complete Informatics questionnaire as public metadata (20 questions). */
export const informaticsPublicQuestions: readonly PublicQuestion[] = [
  {
    id: "INF_Q01",
    major: "INFORMATICS",
    type: "LIKERT",
    text: "How interested are you in understanding how computer systems are protected against unauthorized access and misuse?",
    category: "security",
    options: [
      { id: "INF_Q01_A", label: "Not interested at all" },
      { id: "INF_Q01_B", label: "Slightly interested" },
      { id: "INF_Q01_C", label: "Neutral" },
      { id: "INF_Q01_D", label: "Interested" },
      { id: "INF_Q01_E", label: "Very interested" },
    ],
  },
  {
    id: "INF_Q02",
    major: "INFORMATICS",
    type: "LIKERT",
    text: "How interested are you in building software that works with physical devices, such as sensors, microcontrollers, or wearables?",
    category: "hardware",
    options: [
      { id: "INF_Q02_A", label: "Not interested at all" },
      { id: "INF_Q02_B", label: "Slightly interested" },
      { id: "INF_Q02_C", label: "Neutral" },
      { id: "INF_Q02_D", label: "Interested" },
      { id: "INF_Q02_E", label: "Very interested" },
    ],
  },
  {
    id: "INF_Q03",
    major: "INFORMATICS",
    type: "LIKERT",
    text: "How interested are you in experimenting with machine learning models that learn patterns from data?",
    category: "machine-learning",
    options: [
      { id: "INF_Q03_A", label: "Not interested at all" },
      { id: "INF_Q03_B", label: "Slightly interested" },
      { id: "INF_Q03_C", label: "Neutral" },
      { id: "INF_Q03_D", label: "Interested" },
      { id: "INF_Q03_E", label: "Very interested" },
    ],
  },
  {
    id: "INF_Q04",
    major: "INFORMATICS",
    type: "LIKERT",
    text: "How interested are you in technology that helps people monitor or improve their health?",
    category: "healthcare",
    options: [
      { id: "INF_Q04_A", label: "Not interested at all" },
      { id: "INF_Q04_B", label: "Slightly interested" },
      { id: "INF_Q04_C", label: "Neutral" },
      { id: "INF_Q04_D", label: "Interested" },
      { id: "INF_Q04_E", label: "Very interested" },
    ],
  },
  {
    id: "INF_Q05",
    major: "INFORMATICS",
    type: "LIKERT",
    text: "How interested are you in designing interactive experiences, such as games, that respond to what a player does?",
    category: "creative-development",
    options: [
      { id: "INF_Q05_A", label: "Not interested at all" },
      { id: "INF_Q05_B", label: "Slightly interested" },
      { id: "INF_Q05_C", label: "Neutral" },
      { id: "INF_Q05_D", label: "Interested" },
      { id: "INF_Q05_E", label: "Very interested" },
    ],
  },
  {
    id: "INF_Q06",
    major: "INFORMATICS",
    type: "AGREEMENT",
    text: "I am comfortable working with command-line tools, servers, containers, and cloud platforms rather than only writing application code.",
    category: "infrastructure",
    options: [
      { id: "INF_Q06_A", label: "Strongly Disagree" },
      { id: "INF_Q06_B", label: "Disagree" },
      { id: "INF_Q06_C", label: "Neutral" },
      { id: "INF_Q06_D", label: "Agree" },
      { id: "INF_Q06_E", label: "Strongly Agree" },
    ],
  },
  {
    id: "INF_Q07",
    major: "INFORMATICS",
    type: "AGREEMENT",
    text: "I enjoy investigating how an unusual event or suspicious pattern might have entered a system.",
    category: "security",
    options: [
      { id: "INF_Q07_A", label: "Strongly Disagree" },
      { id: "INF_Q07_B", label: "Disagree" },
      { id: "INF_Q07_C", label: "Neutral" },
      { id: "INF_Q07_D", label: "Agree" },
      { id: "INF_Q07_E", label: "Strongly Agree" },
    ],
  },
  {
    id: "INF_Q08",
    major: "INFORMATICS",
    type: "AGREEMENT",
    text: "I would rather build a system that learns and improves from data than one that follows a fixed set of rules.",
    category: "machine-learning",
    options: [
      { id: "INF_Q08_A", label: "Strongly Disagree" },
      { id: "INF_Q08_B", label: "Disagree" },
      { id: "INF_Q08_C", label: "Neutral" },
      { id: "INF_Q08_D", label: "Agree" },
      { id: "INF_Q08_E", label: "Strongly Agree" },
    ],
  },
  {
    id: "INF_Q09",
    major: "INFORMATICS",
    type: "AGREEMENT",
    text: "I enjoy tinkering with physical hardware until it and the software around it work together.",
    category: "hardware",
    options: [
      { id: "INF_Q09_A", label: "Strongly Disagree" },
      { id: "INF_Q09_B", label: "Disagree" },
      { id: "INF_Q09_C", label: "Neutral" },
      { id: "INF_Q09_D", label: "Agree" },
      { id: "INF_Q09_E", label: "Strongly Agree" },
    ],
  },
  {
    id: "INF_Q10",
    major: "INFORMATICS",
    type: "MULTIPLE_CHOICE",
    text: "A clinic wants to use technology to catch health problems earlier. Which task would you most enjoy?",
    category: "healthcare",
    options: [
      { id: "INF_Q10_A", label: "Build the wearable device that collects health signals from patients" },
      { id: "INF_Q10_B", label: "Build the model that recognizes early warning patterns in health data" },
      { id: "INF_Q10_C", label: "Design the secure system that protects patient records and access" },
      { id: "INF_Q10_D", label: "Keep the data platform running reliably so results are always available" },
      { id: "INF_Q10_E", label: "Create the assistant that turns results into clear advice for patients" },
    ],
  },
  {
    id: "INF_Q11",
    major: "INFORMATICS",
    type: "MULTIPLE_CHOICE",
    text: "You are asked to build a new immersive experience for a theme park. Which part would you most want to own?",
    category: "immersive-tech",
    options: [
      { id: "INF_Q11_A", label: "Design the 3D world and how visitors interact with it" },
      { id: "INF_Q11_B", label: "Build the wearable motion-tracking gear and sensor network" },
      { id: "INF_Q11_C", label: "Create the AI that adapts the experience to each visitor" },
      { id: "INF_Q11_D", label: "Protect the booking and control systems from tampering" },
      { id: "INF_Q11_E", label: "Run the cloud infrastructure so the experience runs smoothly at scale" },
    ],
  },
  {
    id: "INF_Q12",
    major: "INFORMATICS",
    type: "MULTIPLE_CHOICE",
    text: "Which unexpected problem would you most enjoy digging into?",
    category: "security",
    options: [
      { id: "INF_Q12_A", label: "Users can suddenly see data they should not have access to" },
      { id: "INF_Q12_B", label: "A fleet of sensors is reporting readings that change for no clear reason" },
      { id: "INF_Q12_C", label: "A model's predictions are accurate for some groups of people but not others" },
      { id: "INF_Q12_D", label: "A game becomes unresponsive whenever many players join" },
      { id: "INF_Q12_E", label: "A deployment pipeline silently fails at the same stage every night" },
    ],
  },
  {
    id: "INF_Q13",
    major: "INFORMATICS",
    type: "MULTIPLE_CHOICE",
    text: "You have access to a large stream of real-world data. Which question would you most want to answer?",
    category: "data-analysis",
    options: [
      { id: "INF_Q13_A", label: "Which events in network logs signal a possible attack?" },
      { id: "INF_Q13_B", label: "Which sensor patterns predict that a machine is about to fail?" },
      { id: "INF_Q13_C", label: "Which features best predict the next value in a sequence?" },
      { id: "INF_Q13_D", label: "Which early signals could warn that someone's health is changing?" },
      { id: "INF_Q13_E", label: "Which player behaviors make a game more engaging?" },
    ],
  },
  {
    id: "INF_Q14",
    major: "INFORMATICS",
    type: "MULTIPLE_CHOICE",
    text: "A team ships new versions of its software every week. Which responsibility appeals to you most?",
    category: "infrastructure",
    options: [
      { id: "INF_Q14_A", label: "Automate building, testing, and releasing each new version" },
      { id: "INF_Q14_B", label: "Monitor the running system and respond to problems before users notice" },
      { id: "INF_Q14_C", label: "Harden the systems so an attacker cannot break in" },
      { id: "INF_Q14_D", label: "Build the models that detect anomalies in system metrics" },
      { id: "INF_Q14_E", label: "Build the sensor layer that feeds monitoring with real device data" },
      { id: "INF_Q14_F", label: "Build a training simulator that lets new engineers practice deploying safely" },
    ],
  },
  {
    id: "INF_Q15",
    major: "INFORMATICS",
    type: "MULTIPLE_CHOICE",
    text: "Which game feature would you most want to design?",
    category: "creative-development",
    options: [
      { id: "INF_Q15_A", label: "A physics-based puzzle where objects respond realistically" },
      { id: "INF_Q15_B", label: "Enemies that adapt to how the player plays" },
      { id: "INF_Q15_C", label: "A VR level where the player moves through a 3D space using body motion" },
      { id: "INF_Q15_D", label: "Online play that stays fair and free from cheating" },
      { id: "INF_Q15_E", label: "A cloud backend that keeps leaderboards and saves in sync" },
      { id: "INF_Q15_F", label: "A serious game that helps patients practice rehabilitation exercises" },
    ],
  },
  {
    id: "INF_Q16",
    major: "INFORMATICS",
    type: "SCENARIO",
    text: "A hospital's online patient portal suddenly experiences unusual traffic, and many users cannot log in. Which part of solving the problem would you most enjoy?",
    category: "security",
    options: [
      { id: "INF_Q16_A", label: "Investigating whether the traffic is a coordinated attack" },
      { id: "INF_Q16_B", label: "Automating infrastructure recovery so the service comes back safely" },
      { id: "INF_Q16_C", label: "Building a model that detects anomalous traffic in real time" },
      { id: "INF_Q16_D", label: "Analyzing whether patient wearable devices are flooding the network with bad data" },
      { id: "INF_Q16_E", label: "Designing a simulation that lets the team practice responding to incidents" },
      { id: "INF_Q16_F", label: "Ensuring patient data stays private and properly protected during the incident" },
    ],
  },
  {
    id: "INF_Q17",
    major: "INFORMATICS",
    type: "SCENARIO",
    text: "You are building an immersive training environment where a technician learns to service machines. Which responsibility sounds most interesting?",
    category: "immersive-tech",
    options: [
      { id: "INF_Q17_A", label: "Creating the VR world, the 3D equipment models, and hands-on interaction" },
      { id: "INF_Q17_B", label: "Wiring the motion sensors and haptic wearable devices that track the trainee" },
      { id: "INF_Q17_C", label: "Building the intelligent system that adjusts training difficulty to the trainee's progress" },
      { id: "INF_Q17_D", label: "Securing the training platform and the trainee records" },
      { id: "INF_Q17_E", label: "Automating updates and deployment of the training environment to many sites" },
      { id: "INF_Q17_F", label: "Building a VR rehabilitation module that helps patients practice recovery movements" },
    ],
  },
  {
    id: "INF_Q18",
    major: "INFORMATICS",
    type: "SCENARIO",
    text: "A smart factory wants to reduce downtime by predicting when machines will fail. Which role would you prefer?",
    category: "automation",
    options: [
      { id: "INF_Q18_A", label: "Build the sensor network that collects vibration and temperature data" },
      { id: "INF_Q18_B", label: "Build the prediction model that learns failure patterns" },
      { id: "INF_Q18_C", label: "Protect the factory's control systems from cyber threats" },
      { id: "INF_Q18_D", label: "Automate the maintenance workflow from alert to scheduled repair" },
      { id: "INF_Q18_E", label: "Build a wearable safety device that monitors workers' fatigue and health" },
    ],
  },
  {
    id: "INF_Q19",
    major: "INFORMATICS",
    type: "PRIORITY",
    text: "How important is combining creativity with programming in your future work?",
    category: "creative-development",
    options: [
      { id: "INF_Q19_A", label: "Not important at all" },
      { id: "INF_Q19_B", label: "Slightly important" },
      { id: "INF_Q19_C", label: "Neutral" },
      { id: "INF_Q19_D", label: "Important" },
      { id: "INF_Q19_E", label: "Very important" },
    ],
  },
  {
    id: "INF_Q20",
    major: "INFORMATICS",
    type: "PRIORITY",
    text: "How important is working with physical devices, sensors, or hardware in your future work?",
    category: "hardware",
    options: [
      { id: "INF_Q20_A", label: "Not important at all" },
      { id: "INF_Q20_B", label: "Slightly important" },
      { id: "INF_Q20_C", label: "Neutral" },
      { id: "INF_Q20_D", label: "Important" },
      { id: "INF_Q20_E", label: "Very important" },
    ],
  },
];

/** The complete Information Systems questionnaire as public metadata (20 questions). */
export const informationSystemsPublicQuestions: readonly PublicQuestion[] = [
  {
    id: "IS_Q01",
    major: "INFORMATION_SYSTEMS",
    type: "LIKERT",
    text: "How interested are you in exploring large collections of business data to find patterns that are not obvious at first glance?",
    category: "analytics",
    options: [
      { id: "IS_Q01_A", label: "Not interested at all" },
      { id: "IS_Q01_B", label: "Slightly interested" },
      { id: "IS_Q01_C", label: "Neutral" },
      { id: "IS_Q01_D", label: "Interested" },
      { id: "IS_Q01_E", label: "Very interested" },
    ],
  },
  {
    id: "IS_Q02",
    major: "INFORMATION_SYSTEMS",
    type: "LIKERT",
    text: "How interested are you in understanding how finance, procurement, inventory, and operations are connected inside one enterprise system?",
    category: "business-process",
    options: [
      { id: "IS_Q02_A", label: "Not interested at all" },
      { id: "IS_Q02_B", label: "Slightly interested" },
      { id: "IS_Q02_C", label: "Neutral" },
      { id: "IS_Q02_D", label: "Interested" },
      { id: "IS_Q02_E", label: "Very interested" },
    ],
  },
  {
    id: "IS_Q03",
    major: "INFORMATION_SYSTEMS",
    type: "LIKERT",
    text: "How interested are you in building forecasts that help organizations prepare for the future using historical data?",
    category: "prediction",
    options: [
      { id: "IS_Q03_A", label: "Not interested at all" },
      { id: "IS_Q03_B", label: "Slightly interested" },
      { id: "IS_Q03_C", label: "Neutral" },
      { id: "IS_Q03_D", label: "Interested" },
      { id: "IS_Q03_E", label: "Very interested" },
    ],
  },
  {
    id: "IS_Q04",
    major: "INFORMATION_SYSTEMS",
    type: "LIKERT",
    text: "How interested are you in configuring enterprise software so different departments work from the same, consistent records?",
    category: "system-configuration",
    options: [
      { id: "IS_Q04_A", label: "Not interested at all" },
      { id: "IS_Q04_B", label: "Slightly interested" },
      { id: "IS_Q04_C", label: "Neutral" },
      { id: "IS_Q04_D", label: "Interested" },
      { id: "IS_Q04_E", label: "Very interested" },
    ],
  },
  {
    id: "IS_Q05",
    major: "INFORMATION_SYSTEMS",
    type: "LIKERT",
    text: "How interested are you in cleaning and combining data from several departments before it can be analyzed reliably?",
    category: "data-preparation",
    options: [
      { id: "IS_Q05_A", label: "Not interested at all" },
      { id: "IS_Q05_B", label: "Slightly interested" },
      { id: "IS_Q05_C", label: "Neutral" },
      { id: "IS_Q05_D", label: "Interested" },
      { id: "IS_Q05_E", label: "Very interested" },
    ],
  },
  {
    id: "IS_Q06",
    major: "INFORMATION_SYSTEMS",
    type: "AGREEMENT",
    text: "I prefer decisions that are supported by quantitative evidence over decisions based only on intuition.",
    category: "analytics",
    options: [
      { id: "IS_Q06_A", label: "Strongly Disagree" },
      { id: "IS_Q06_B", label: "Disagree" },
      { id: "IS_Q06_C", label: "Neutral" },
      { id: "IS_Q06_D", label: "Agree" },
      { id: "IS_Q06_E", label: "Strongly Agree" },
    ],
  },
  {
    id: "IS_Q07",
    major: "INFORMATION_SYSTEMS",
    type: "AGREEMENT",
    text: "I feel comfortable working within clearly defined processes and standardized workflows.",
    category: "business-process",
    options: [
      { id: "IS_Q07_A", label: "Strongly Disagree" },
      { id: "IS_Q07_B", label: "Disagree" },
      { id: "IS_Q07_C", label: "Neutral" },
      { id: "IS_Q07_D", label: "Agree" },
      { id: "IS_Q07_E", label: "Strongly Agree" },
    ],
  },
  {
    id: "IS_Q08",
    major: "INFORMATION_SYSTEMS",
    type: "AGREEMENT",
    text: "I enjoy running experiments and comparing outcomes to see which approach actually works better.",
    category: "experimentation",
    options: [
      { id: "IS_Q08_A", label: "Strongly Disagree" },
      { id: "IS_Q08_B", label: "Disagree" },
      { id: "IS_Q08_C", label: "Neutral" },
      { id: "IS_Q08_D", label: "Agree" },
      { id: "IS_Q08_E", label: "Strongly Agree" },
    ],
  },
  {
    id: "IS_Q09",
    major: "INFORMATION_SYSTEMS",
    type: "AGREEMENT",
    text: "I enjoy coordinating across departments so everyone works from the same information and follows the same procedures.",
    category: "organizational-change",
    options: [
      { id: "IS_Q09_A", label: "Strongly Disagree" },
      { id: "IS_Q09_B", label: "Disagree" },
      { id: "IS_Q09_C", label: "Neutral" },
      { id: "IS_Q09_D", label: "Agree" },
      { id: "IS_Q09_E", label: "Strongly Agree" },
    ],
  },
  {
    id: "IS_Q10",
    major: "INFORMATION_SYSTEMS",
    type: "MULTIPLE_CHOICE",
    text: "A retail company has sales, inventory, and customer data from several branches. Which part of solving its problem sounds most interesting to you?",
    category: "analytics",
    options: [
      { id: "IS_Q10_A", label: "Studying purchasing patterns across branches to understand customer behavior" },
      { id: "IS_Q10_B", label: "Building demand forecasts for each branch" },
      { id: "IS_Q10_C", label: "Creating dashboards that show how each branch is performing" },
      { id: "IS_Q10_D", label: "Integrating inventory and sales processes so branches stay in sync" },
      { id: "IS_Q10_E", label: "Configuring one centralized business system used by every branch" },
    ],
  },
  {
    id: "IS_Q11",
    major: "INFORMATION_SYSTEMS",
    type: "MULTIPLE_CHOICE",
    text: "A company frequently finds that stock levels differ between departments. Which responsibility would you prefer?",
    category: "operations",
    options: [
      { id: "IS_Q11_A", label: "Analyzing historical data to identify why the differences keep appearing" },
      { id: "IS_Q11_B", label: "Predicting future demand so purchases better match real needs" },
      { id: "IS_Q11_C", label: "Redesigning the process so every stock movement is recorded consistently" },
      { id: "IS_Q11_D", label: "Integrating the inventory and purchasing modules so records update together" },
    ],
  },
  {
    id: "IS_Q12",
    major: "INFORMATION_SYSTEMS",
    type: "MULTIPLE_CHOICE",
    text: "Which task would you find most satisfying?",
    category: "analytics",
    options: [
      { id: "IS_Q12_A", label: "Digging into a messy dataset to find the reason behind a surprising result" },
      { id: "IS_Q12_B", label: "Building a model that predicts an outcome better than the current approach" },
      { id: "IS_Q12_C", label: "Designing the screens and approval rules a team uses for its daily work" },
      { id: "IS_Q12_D", label: "Preparing an enterprise system so new users can start working with it" },
      { id: "IS_Q12_E", label: "Turning a complicated data question into a clear visual explanation" },
    ],
  },
  {
    id: "IS_Q13",
    major: "INFORMATION_SYSTEMS",
    type: "MULTIPLE_CHOICE",
    text: "A logistics company wants to reduce late deliveries. Which angle would you most want to work on?",
    category: "operations",
    options: [
      { id: "IS_Q13_A", label: "Analyzing delivery data to find which routes are consistently late" },
      { id: "IS_Q13_B", label: "Building a model that flags shipments likely to be delayed" },
      { id: "IS_Q13_C", label: "Redesigning the delivery planning workflow across warehouses and drivers" },
      { id: "IS_Q13_D", label: "Integrating order, warehouse, and transport systems so information flows automatically" },
    ],
  },
  {
    id: "IS_Q14",
    major: "INFORMATION_SYSTEMS",
    type: "MULTIPLE_CHOICE",
    text: "A company's HR team and department managers keep separate records of employee leave and attendance. Which fix would you most want to work on?",
    category: "business-process",
    options: [
      { id: "IS_Q14_A", label: "Analyzing the two sets of records to find where they disagree" },
      { id: "IS_Q14_B", label: "Building a dashboard that shows leave and attendance trends across departments" },
      { id: "IS_Q14_C", label: "Redesigning the leave approval workflow so records update once and stay consistent" },
      { id: "IS_Q14_D", label: "Integrating the HR and payroll modules so managers and HR see the same data" },
      { id: "IS_Q14_E", label: "Coordinating the rollout so managers and HR adopt the new process together" },
    ],
  },
  {
    id: "IS_Q15",
    major: "INFORMATION_SYSTEMS",
    type: "MULTIPLE_CHOICE",
    text: "During an annual planning exercise, which activity would you most want to own?",
    category: "analytics",
    options: [
      { id: "IS_Q15_A", label: "Analyzing last year's data to understand what drove the results" },
      { id: "IS_Q15_B", label: "Building the forecast that shapes next year's targets" },
      { id: "IS_Q15_C", label: "Aligning the planning process so every department submits consistent numbers" },
      { id: "IS_Q15_D", label: "Configuring the planning system to support the new process" },
      { id: "IS_Q15_E", label: "Preparing the summary dashboards that leadership reviews" },
      { id: "IS_Q15_F", label: "Training each department on the new planning process" },
    ],
  },
  {
    id: "IS_Q16",
    major: "INFORMATION_SYSTEMS",
    type: "SCENARIO",
    text: "A hospital wants to reduce how long patients wait for test results. Which part of the solution would you most enjoy?",
    category: "enterprise-integration",
    options: [
      { id: "IS_Q16_A", label: "Analyzing historical test data to identify the most important bottlenecks" },
      { id: "IS_Q16_B", label: "Building a model that predicts daily testing demand" },
      { id: "IS_Q16_C", label: "Integrating the laboratory, pharmacy, and patient registration systems" },
      { id: "IS_Q16_D", label: "Standardizing the sample-handling workflow across departments" },
    ],
  },
  {
    id: "IS_Q17",
    major: "INFORMATION_SYSTEMS",
    type: "SCENARIO",
    text: "A manufacturing company wants to reduce unplanned machine downtime. Which responsibility would you prefer?",
    category: "operations",
    options: [
      { id: "IS_Q17_A", label: "Analyzing maintenance and production records to find patterns that precede failures" },
      { id: "IS_Q17_B", label: "Building a dashboard that shows maintenance teams which machines need attention" },
      { id: "IS_Q17_C", label: "Integrating the maintenance, production, and purchasing modules" },
      { id: "IS_Q17_D", label: "Redesigning the maintenance workflow and its approval rules" },
    ],
  },
  {
    id: "IS_Q18",
    major: "INFORMATION_SYSTEMS",
    type: "SCENARIO",
    text: "A financial services firm struggles to close its monthly books on time. Which part of the fix interests you most?",
    category: "business-process",
    options: [
      { id: "IS_Q18_A", label: "Analyzing the reporting data to find why closing tasks take so long" },
      { id: "IS_Q18_B", label: "Building a forecast of monthly revenue and expenses" },
      { id: "IS_Q18_C", label: "Configuring the finance and accounting system to automate closing steps" },
      { id: "IS_Q18_D", label: "Coordinating finance, operations, and sales around one shared calendar" },
    ],
  },
  {
    id: "IS_Q19",
    major: "INFORMATION_SYSTEMS",
    type: "PRIORITY",
    text: "How important is it to you that decisions are supported by quantitative evidence?",
    category: "analytics",
    options: [
      { id: "IS_Q19_A", label: "Not important at all" },
      { id: "IS_Q19_B", label: "Slightly important" },
      { id: "IS_Q19_C", label: "Neutral" },
      { id: "IS_Q19_D", label: "Important" },
      { id: "IS_Q19_E", label: "Very important" },
    ],
  },
  {
    id: "IS_Q20",
    major: "INFORMATION_SYSTEMS",
    type: "PRIORITY",
    text: "How important is it to you that your work helps different departments work together more smoothly?",
    category: "organizational-change",
    options: [
      { id: "IS_Q20_A", label: "Not important at all" },
      { id: "IS_Q20_B", label: "Slightly important" },
      { id: "IS_Q20_C", label: "Neutral" },
      { id: "IS_Q20_D", label: "Important" },
      { id: "IS_Q20_E", label: "Very important" },
    ],
  },
];

/**
 * Returns the client-safe 20-question questionnaire for the student's major.
 *
 *   INFORMATICS         → informaticsPublicQuestions
 *   INFORMATION_SYSTEMS → informationSystemsPublicQuestions
 */
export function getPublicQuestionsForMajor(major: Major): readonly PublicQuestion[] {
  if (major === "INFORMATICS") {
    return informaticsPublicQuestions;
  }
  if (major === "INFORMATION_SYSTEMS") {
    return informationSystemsPublicQuestions;
  }
  return [];
}
