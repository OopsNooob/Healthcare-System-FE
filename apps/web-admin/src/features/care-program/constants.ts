export interface OptionItem {
  key: string;
  defaultLabel: string;
}

export const DISEASE_KEY_OPTIONS: OptionItem[] = [
  { key: "hypertension", defaultLabel: "Hypertension" },
  { key: "diabetes", defaultLabel: "Diabetes" },
  { key: "cardiovascular", defaultLabel: "Cardiovascular" },
  { key: "respiratory", defaultLabel: "Respiratory" },
  { key: "general", defaultLabel: "General Chronic Care" },
];

export const BASELINE_OPTIONS: OptionItem[] = [
  { key: "systolic", defaultLabel: "Baseline Systolic BP" },
  { key: "diastolic", defaultLabel: "Baseline Diastolic BP" },
  { key: "glucose", defaultLabel: "Fasting Glucose" },
  { key: "weight", defaultLabel: "Weight & BMI" },
  { key: "heartRate", defaultLabel: "Resting Heart Rate" },
  { key: "hba1c", defaultLabel: "HbA1c" },
  { key: "medications", defaultLabel: "Current Medications" },
  { key: "symptoms", defaultLabel: "Baseline Symptoms" },
];

export type CareTaskType =
  | "metric"
  | "check_in"
  | "education"
  | "appointment"
  | "doctor_review";

export interface CareTaskTemplateItem {
  key: string;
  type: CareTaskType;
  time: string;
  windowMinutes: number;
  metricType?: string;
  allowedSymptomCodes?: string[];
  contentId?: string;
  contentVersion?: string;
  contentLocale?: string;
  displayType?: "article" | "video" | "document";
}

export const METRIC_TYPE_OPTIONS: { value: string; defaultLabel: string }[] = [
  { value: "blood_pressure", defaultLabel: "Blood Pressure (mmHg)" },
  { value: "blood_glucose", defaultLabel: "Blood Glucose (mg/dL)" },
  { value: "heart_rate", defaultLabel: "Heart Rate (bpm)" },
  { value: "oxygen_saturation", defaultLabel: "Oxygen Saturation - SpO2 (%)" },
  { value: "weight", defaultLabel: "Weight (kg)" },
  { value: "body_temperature", defaultLabel: "Body Temperature (°C)" },
];

export function inferDefaultMetricType(diseaseKey: string): string {
  const normalized = diseaseKey.trim().toLowerCase();
  if (normalized === "diabetes") return "blood_glucose";
  if (normalized === "hypertension" || normalized === "cardiovascular") {
    return "blood_pressure";
  }
  if (normalized === "respiratory") return "oxygen_saturation";
  return "heart_rate";
}

export interface EducationCatalogItem {
  id: string;
  contentId: string;
  version: string;
  locale: string;
  displayType: "article" | "video" | "document";
  title: string;
  summary: string;
  status: "draft" | "published" | "retired";
  programId?: string;
  programName?: string;
  programVersion?: number;
  programStatus?: "draft" | "published" | "retired";
}

export const SYMPTOM_OPTIONS: { code: string; defaultLabel: string }[] = [
  { code: "chest_pain", defaultLabel: "Chest Pain" },
  { code: "shortness_of_breath", defaultLabel: "Shortness of Breath" },
  { code: "dizziness", defaultLabel: "Dizziness" },
  { code: "headache", defaultLabel: "Headache" },
  { code: "fatigue", defaultLabel: "Fatigue" },
  { code: "palpitations", defaultLabel: "Palpitations" },
];

export const TASK_TYPE_OPTIONS: { type: CareTaskType; defaultLabel: string }[] = [
  { type: "metric", defaultLabel: "Health Metric Entry" },
  { type: "check_in", defaultLabel: "Symptom Check-in" },
  { type: "education", defaultLabel: "Educational Material" },
  { type: "appointment", defaultLabel: "Follow-up Appointment" },
  { type: "doctor_review", defaultLabel: "Doctor Review" },
];

export const STANDARD_CONTENT_REF_SUGGESTIONS: EducationCatalogItem[] = [
  {
    id: "ref-salt",
    contentId: "hypertension_salt_guide",
    version: "v1.0",
    locale: "vi",
    displayType: "article",
    title: "Low-Sodium Nutrition Guide",
    summary: "Dietary sodium targets for hypertensive care plans.",
    status: "published",
  },
  {
    id: "ref-bp-video",
    contentId: "bp_home_measurement_video",
    version: "v1.0",
    locale: "vi",
    displayType: "video",
    title: "Home Blood Pressure Measurement Posture Video",
    summary: "Proper cuff positioning and resting intervals before logging.",
    status: "published",
  },
  {
    id: "ref-diabetes-foot",
    contentId: "diabetes_foot_care_doc",
    version: "v1.0",
    locale: "vi",
    displayType: "document",
    title: "Diabetic Foot Care & Complication Prevention Handbook",
    summary: "Daily foot inspection checklist and warning signs to consult a doctor.",
    status: "published",
  },
];

export const DEFAULT_PROGRAM_TASK_TEMPLATES: CareTaskTemplateItem[] = [
  {
    key: "morning_vital_measurement",
    type: "metric",
    time: "08:00",
    windowMinutes: 120,
  },
  {
    key: "daily_symptom_checkin",
    type: "check_in",
    time: "18:00",
    windowMinutes: 180,
    allowedSymptomCodes: ["chest_pain", "shortness_of_breath", "dizziness"],
  },
];
