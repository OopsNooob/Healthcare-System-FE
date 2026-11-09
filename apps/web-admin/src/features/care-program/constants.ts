export interface BaselineOption {
  key: string;
  defaultLabel: string;
}

export const BASELINE_OPTIONS: BaselineOption[] = [
  { key: "bloodPressure", defaultLabel: "Blood Pressure" },
  { key: "heartRate", defaultLabel: "Heart Rate" },
  { key: "fastingGlucose", defaultLabel: "Fasting Glucose" },
  { key: "hba1c", defaultLabel: "HbA1c" },
  { key: "weight", defaultLabel: "Weight" },
  { key: "medications", defaultLabel: "Current Medications" },
  { key: "quietHours", defaultLabel: "Quiet Hours" },
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
  allowedSymptomCodes?: string[];
  contentId?: string;
  contentVersion?: string;
  contentLocale?: "vi" | "en";
  displayType?: "article" | "video" | "document";
}

export interface CareContentCatalogItem {
  id: string;
  contentId: string;
  version: string;
  locale: "vi" | "en";
  displayType: "article" | "video" | "document";
  status: "published" | "draft" | "retired";
  titleVi: string;
  titleEn: string;
  summaryVi: string;
  summaryEn: string;
  updatedAt: string;
}

export const SYMPTOM_OPTIONS: { code: string; defaultLabel: string }[] = [
  { code: "chest_pain", defaultLabel: "Chest pain" },
  { code: "shortness_of_breath", defaultLabel: "Shortness of breath" },
  { code: "dizziness", defaultLabel: "Dizziness" },
  { code: "headache", defaultLabel: "Headache" },
  { code: "fatigue", defaultLabel: "Fatigue" },
  { code: "edema", defaultLabel: "Mild swelling" },
  { code: "nausea", defaultLabel: "Nausea" },
  { code: "palpitations", defaultLabel: "Palpitations" },
];

export const TASK_TYPE_OPTIONS: { type: CareTaskType; defaultLabel: string }[] = [
  { type: "metric", defaultLabel: "Vital Measurement" },
  { type: "check_in", defaultLabel: "Symptom Check-in" },
  { type: "education", defaultLabel: "Health Education" },
  { type: "appointment", defaultLabel: "Follow-up Appointment" },
  { type: "doctor_review", defaultLabel: "Doctor Review" },
];

export const INITIAL_EDUCATION_CATALOG: CareContentCatalogItem[] = [
  {
    id: "edu-1",
    contentId: "hypertension_salt_guide",
    version: "v1.0",
    locale: "vi",
    displayType: "article",
    status: "published",
    titleVi: "Hướng dẫn giảm muối và dinh dưỡng cho người tăng huyết áp",
    titleEn: "Low-Sodium Diet & Nutrition Guide for Hypertension",
    summaryVi:
      "Chế độ ăn giảm natri dưới 2.000 mg mỗi ngày, tăng cường rau xanh và đo huyết áp định kỳ.",
    summaryEn:
      "Keep daily sodium intake below 2,000 mg, increase leafy greens, and monitor blood pressure daily.",
    updatedAt: "2026-11-01",
  },
  {
    id: "edu-2",
    contentId: "bp_home_measurement_video",
    version: "v1.2",
    locale: "vi",
    displayType: "video",
    status: "published",
    titleVi: "Video hướng dẫn tư thế đo huyết áp chuẩn tại nhà",
    titleEn: "Home Blood Pressure Measurement Posture Video",
    summaryVi:
      "Nghỉ ngơi 5 phút trước khi đo, đặt vòng bít ngang mức tim và không nói chuyện trong lúc đo.",
    summaryEn:
      "Rest 5 minutes before measuring, keep the cuff at heart level, and remain quiet during measurement.",
    updatedAt: "2026-11-03",
  },
  {
    id: "edu-3",
    contentId: "diabetes_foot_care_doc",
    version: "v2.0",
    locale: "vi",
    displayType: "document",
    status: "published",
    titleVi: "Tài liệu chăm sóc bàn chân và phòng ngừa biến chứng đái tháo đường",
    titleEn: "Diabetic Foot Care & Complication Prevention Handbook",
    summaryVi:
      "Kiểm tra bàn chân mỗi tối, giữ da khô thoáng và liên hệ bác sĩ ngay khi có vết xước lâu lành.",
    summaryEn:
      "Inspect feet every evening, keep skin dry, and contact your doctor immediately for slow-healing sores.",
    updatedAt: "2026-11-05",
  },
  {
    id: "edu-4",
    contentId: "medication_adherence_guide",
    version: "v2.1",
    locale: "vi",
    displayType: "article",
    status: "draft",
    titleVi: "Cẩm nang tuân thủ dùng thuốc tim mạch lâu dài",
    titleEn: "Long-Term Cardiovascular Medication Adherence Guide",
    summaryVi:
      "Bản thảo đang chờ hội đồng chuyên môn duyệt trước khi phát hành cho bệnh nhân.",
    summaryEn:
      "Draft awaiting medical board review before publishing to enrolled patients.",
    updatedAt: "2026-11-08",
  },
];

export const DEFAULT_PROGRAM_TASK_TEMPLATES: CareTaskTemplateItem[] = [
  {
    key: "morning_bp_measurement",
    type: "metric",
    time: "08:00",
    windowMinutes: 120,
  },
  {
    key: "daily_symptom_check",
    type: "check_in",
    time: "09:00",
    windowMinutes: 180,
    allowedSymptomCodes: [
      "chest_pain",
      "shortness_of_breath",
      "dizziness",
      "headache",
      "fatigue",
      "palpitations",
    ],
  },
  {
    key: "diet_education_reading",
    type: "education",
    time: "14:00",
    windowMinutes: 240,
    contentId: "hypertension_salt_guide",
    contentVersion: "v1.0",
    contentLocale: "vi",
    displayType: "article",
  },
  {
    key: "scheduled_followup_visit",
    type: "appointment",
    time: "10:00",
    windowMinutes: 480,
  },
  {
    key: "weekly_doctor_review",
    type: "doctor_review",
    time: "16:00",
    windowMinutes: 360,
  },
];

export function mockDelay(ms = 280): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
