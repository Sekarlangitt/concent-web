import type { Concentration } from "@/data/concentrations";

/**
 * Hardcoded academic program info shown for the recommended concentration.
 *
 * This is display-only content (curriculum marketing copy), NOT scoring data.
 * The three Information Systems concentrations carry real content provided by
 * the curriculum team. The six Informatics concentrations carry DRAFT content
 * (based on standard Informatics program structures) that the program team
 * should review and refine before publishing.
 *
 * Any concentration can still be marked `isPlaceholder: true` to show a
 * friendly "details coming soon" state instead of content lists.
 */

export type ConcentrationProgram = {
  concentration: Concentration;
  /**
   * One-line tagline, e.g. "Data, analytics, machine learning, dashboards,
   * and decision support."
   */
  description: string;
  /** Audience note, e.g. "Best for students who like insight and patterns." */
  bestFor: string;
  /** Semester-4 focus sentence shown under the "What You'll Learn" heading. */
  focusStatement: string;
  /** Subjects/topics covered in Semester 4. */
  topics: readonly string[];
  /** Relevant careers after choosing this concentration. */
  careers: readonly string[];
  /** True when the content is a placeholder awaiting real curriculum info. */
  isPlaceholder: boolean;
};

export const CONCENTRATION_PROGRAMS: Record<Concentration, ConcentrationProgram> = {
  // -------------------------------------------------------------------------
  // Information Systems — full content
  // -------------------------------------------------------------------------
  DATA_SCIENCE: {
    concentration: "DATA_SCIENCE",
    description:
      "Data, analytics, machine learning, dashboards, and decision support.",
    bestFor: "Best for students who like insight, patterns, and data-driven decisions.",
    focusStatement:
      "For students who are passionate about using data for business insight and decision-making.",
    topics: [
      "Fundamental of Data Science",
      "Data Science Programming",
      "Machine Learning",
      "Data Mining",
      "Data Visualization and Reporting",
    ],
    careers: [
      "Data Analyst",
      "Business Intelligent Analyst",
      "Data Engineer Analyst",
      "Dashboard Developer",
      "Machine Learning Practitioner",
    ],
    isPlaceholder: false,
  },
  ERP: {
    concentration: "ERP",
    description:
      "Enterprise systems, ERP, business processes, and digital transformation.",
    bestFor:
      "Best for students who like company operations, process integration, and management technology.",
    focusStatement:
      "For students who want to understand and improve enterprise-level systems and digital transformation.",
    topics: [
      "Fundamental of ERP",
      "Supply chain management systems",
      "Inventory management system",
      "Manufacturing resource planning",
      "Sales and Finance management systems",
    ],
    careers: [
      "ERP Officer",
      "Enterprise System Analyst",
      "Business Process Analyst",
      "ERP Consultant",
      "Digital Transformation Staff",
      "Enterprise Application Specialist",
    ],
    isPlaceholder: false,
  },
  BPA: {
    concentration: "BPA",
    description:
      "AI, automation, RPA, workflow, and intelligent business operations.",
    bestFor:
      "Best for students who like practical AI tools and smart process improvement.",
    focusStatement:
      "For students who want to design AI-supported automation for business and organizational work.",
    topics: [
      "Robotic Process Automation",
      "AI agents and workflow automation",
      "Low-code application and API integration",
      "Intelligent document processing",
      "Process mining",
    ],
    careers: [
      "RPA Developer",
      "Automation Analyst",
      "AI Workflow Designer",
      "Low-Code Application Developer",
      "Process Mining Analyst",
      "Enterprise Automation Consultant",
    ],
    isPlaceholder: false,
  },

  // -------------------------------------------------------------------------
  // Informatics — drafted content (review with the program team)
  // -------------------------------------------------------------------------
  CYBER_SECURITY: {
    concentration: "CYBER_SECURITY",
    description:
      "Network defense, ethical hacking, system security, and digital forensics.",
    bestFor:
      "Best for students who like protecting systems, understanding how attacks work, and solving security puzzles.",
    focusStatement:
      "For students who want to design, monitor, and defend secure digital systems.",
    topics: [
      "Cryptography and Data Security",
      "Digital Forensics",
      "Security Risk Management and Audit",
    ],
    careers: [
      "Security Analyst",
      "Penetration Tester / Ethical Hacker",
      "Network Security Engineer",
      "SOC Analyst",
      "Digital Forensics Investigator",
      "Security Consultant",
    ],
    isPlaceholder: false,
  },
  IOT: {
    concentration: "IOT",
    description:
      "Connected devices, embedded systems, sensors, and smart environments.",
    bestFor:
      "Best for students who like hardware, electronics, and building things that sense and control the real world.",
    focusStatement:
      "For students who want to build and connect smart devices that collect and act on real-world data.",
    topics: [
      "Microcontroller",
      "Embedded System",
      "Robotics",
      "IoT Project",
      "Automatic Navigation System",
    ],
    careers: [
      "IoT Developer",
      "Embedded Systems Engineer",
      "IoT Solutions Architect",
      "Smart Product / Hardware Engineer",
      "IoT Security Specialist",
    ],
    isPlaceholder: false,
  },
  AI: {
    concentration: "AI",
    description:
      "Machine learning, deep learning, computer vision, NLP, and intelligent systems.",
    bestFor:
      "Best for students who like algorithms, models, and teaching computers to learn from data.",
    focusStatement:
      "For students who want to design intelligent systems that learn, reason, and make decisions.",
    topics: [
      "Deep Learning",
      "Image Processing and Recognition",
      "Natural Language Processing and Understanding",
      "Intelligent Robotics System",
      "Computer Vision",
    ],
    careers: [
      "Machine Learning Engineer",
      "AI Engineer / Deep Learning Engineer",
      "Applied Data Scientist",
      "NLP Engineer",
      "Computer Vision Engineer",
      "AI Research Assistant",
    ],
    isPlaceholder: false,
  },
  AI_HEALTHCARE: {
    concentration: "AI_HEALTHCARE",
    description:
      "AI applied to medical imaging, diagnostics, health data, and clinical decision support.",
    bestFor:
      "Best for students who like using technology to improve healthcare and patient outcomes.",
    focusStatement:
      "For students who want to apply artificial intelligence to medical and health challenges.",
    topics: [
      "NLP in Healthcare",
      "Data Science and Predictive Analytics in Healthcare",
      "Virtual Reality and IoT (Wearable Devices) in Healthcare",
    ],
    careers: [
      "Healthcare AI Engineer",
      "Clinical Data Analyst",
      "Medical Imaging AI Specialist",
      "Health Informatics Specialist",
      "AI Product Analyst (HealthTech)",
    ],
    isPlaceholder: false,
  },
  GAME_DEVELOPMENT: {
    concentration: "GAME_DEVELOPMENT",
    description:
      "Game design, real-time graphics, gameplay programming, and interactive media.",
    bestFor:
      "Best for students who like building games, storytelling through play, and creative programming.",
    focusStatement:
      "For students who want to create games and interactive experiences from concept to launch.",
    topics: [
      "Game Asset Design",
      "Game Programming",
      "Advance Game Programming",
      "Game Intelligence",
      "Extended Reality",
    ],
    careers: [
      "Game Developer / Gameplay Programmer",
      "Unity / Unreal Developer",
      "Game Designer",
      "Technical Artist",
      "Mobile Game Developer",
    ],
    isPlaceholder: false,
  },
  DEVOPS: {
    concentration: "DEVOPS",
    description:
      "Cloud infrastructure, CI/CD pipelines, automation, containers, and site reliability.",
    bestFor:
      "Best for students who like automating infrastructure and keeping software running reliably.",
    focusStatement:
      "For students who want to build and operate fast, reliable software delivery pipelines.",
    topics: [
      "Containerization (Docker) and orchestration",
      "IT Project Management and Agile",
      "CI/CD pipelines and automation",
      "Infrastructure as Code and monitoring",
      "Site reliability and incident management",
    ],
    careers: [
      "DevOps Engineer",
      "Cloud Engineer",
      "Site Reliability Engineer (SRE)",
      "Platform Engineer",
      "Release / Automation Engineer",
    ],
    isPlaceholder: false,
  },
};

/** Returns the program info for a concentration (always defined). */
export function getConcentrationProgram(
  concentration: Concentration,
): ConcentrationProgram {
  return CONCENTRATION_PROGRAMS[concentration];
}
