"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import {
  MAJOR_IDS,
  MAJOR_LABELS,
  MAJOR_PLACEHOLDER_LABEL,
} from "@/lib/major";
import { fullNameSchema, majorSchema } from "@/lib/validation";
import { saveAssessmentSession } from "@/lib/assessment-session";
import { clearCompletedAssessmentMarker } from "@/lib/completed-assessment";
import type { StudentQuestion } from "@/lib/validation";

type FormErrors = {
  fullName?: string;
  major?: string;
  form?: string;
};

type StartQuestionnaireResponse =
  | {
      success: true;
      questionnaireVersionId: string;
      versionNumber: number;
      questions: StudentQuestion[];
    }
  | { success: false; error: string; message?: string };

export function StudentInformationForm() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [major, setMajor] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const majorOptions = [
    { value: "", label: MAJOR_PLACEHOLDER_LABEL },
    ...MAJOR_IDS.map((id) => ({ value: id, label: MAJOR_LABELS[id] })),
  ];

  async function lockQuestionnaire(name: string, selectedMajor: string) {
    const response = await fetch("/api/questionnaire", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName: name, major: selectedMajor }),
    });
    let data: StartQuestionnaireResponse | null = null;
    try {
      data = (await response.json()) as StartQuestionnaireResponse;
    } catch {
      data = null;
    }
    if (response.ok && data?.success) {
      return { ok: true as const, data };
    }
    return {
      ok: false as const,
      message:
        data && "message" in data && typeof data.message === "string"
          ? data.message
          : "The questionnaire for this major is temporarily unavailable. Please try again later.",
    };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submitting) {
      return;
    }

    const nextErrors: FormErrors = {};

    const nameResult = fullNameSchema.safeParse(fullName);
    if (!nameResult.success) {
      nextErrors.fullName =
        nameResult.error.issues[0]?.message ?? "Please enter your full name.";
    }

    const majorResult = majorSchema.safeParse(major);
    if (!majorResult.success) {
      nextErrors.major = "Please select your major.";
    }

    setErrors(nextErrors);

    if (!nameResult.success || !majorResult.success) {
      return;
    }

    setSubmitting(true);

    // A new assessment begins: forget any earlier completed-assessment marker
    // so a returning student never sees "already submitted" for a previous run.
    clearCompletedAssessmentMarker();

    // Lock the currently published questionnaire version for this major. The
    // server returns the version id and the client-safe questions (never
    // weights) which are stored in the session for the whole attempt.
    const locked = await lockQuestionnaire(nameResult.data, majorResult.data);

    if (!locked.ok) {
      setSubmitting(false);
      setErrors({ form: locked.message });
      return;
    }

    const saved = saveAssessmentSession({
      fullName: nameResult.data,
      major: majorResult.data,
      questionnaireVersionId: locked.data.questionnaireVersionId,
      questions: locked.data.questions,
      answers: {},
      currentQuestion: 0,
    });

    if (!saved) {
      setSubmitting(false);
      setErrors({
        form:
          "We could not start your assessment because browser storage is unavailable. Please try again.",
      });
      return;
    }

    router.push("/assessment");
  }

  function clearError(field: keyof FormErrors) {
    if (errors[field]) {
      setErrors((current) => ({ ...current, [field]: undefined }));
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <FormField
        label="Full Name"
        placeholder="Enter your full name"
        autoComplete="name"
        required
        value={fullName}
        onChange={(event) => {
          setFullName(event.target.value);
          clearError("fullName");
        }}
        error={errors.fullName}
      />

      <FormField
        as="select"
        label="Major"
        required
        value={major}
        onChange={(event) => {
          setMajor(event.target.value);
          clearError("major");
        }}
        options={majorOptions}
        error={errors.major}
      />

      {errors.form ? (
        <p role="alert" className="rounded-lg border border-accent-200 bg-accent-50 px-4 py-3 text-sm font-medium text-accent-800">
          {errors.form}
        </p>
      ) : null}

      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={submitting}
      >
        {submitting ? "Preparing your assessment…" : "Start Assessment"}
      </Button>
    </form>
  );
}
