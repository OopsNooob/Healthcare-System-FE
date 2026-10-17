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
