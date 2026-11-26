export type MetricUnitTranslateFn = (key: string, defaultValue: string) => string;

export const DEFAULT_METRIC_UNIT: Record<string, string> = {
  blood_pressure: 'mmHg',
  heart_rate: 'bpm',
  blood_glucose: 'mg/dL',
  oxygen_saturation: '%',
  body_temperature: '°C',
  respiratory_rate: 'breaths/min',
  bmi: 'kg/m²',
  weight: 'kg',
  height: 'cm',
  water_intake: 'L',
  kcal_intake: 'kcal',
};

const UNIT_LOCALE_KEY_MAP: Record<string, { key: string; fallback: string }> = {
  'breaths/min': { key: 'mobile.unit_breaths_per_min', fallback: 'breaths/min' },
  'br/min': { key: 'mobile.unit_breaths_per_min', fallback: 'breaths/min' },
  'breath/min': { key: 'mobile.unit_breaths_per_min', fallback: 'breaths/min' },
  breaths_per_min: { key: 'mobile.unit_breaths_per_min', fallback: 'breaths/min' },
  bpm: { key: 'mobile.bpm', fallback: 'bpm' },
  'beats/min': { key: 'mobile.bpm', fallback: 'bpm' },
  l: { key: 'mobile.unit_liters', fallback: 'L' },
  liter: { key: 'mobile.unit_liters', fallback: 'L' },
  liters: { key: 'mobile.unit_liters', fallback: 'L' },
  litre: { key: 'mobile.unit_liters', fallback: 'L' },
  litres: { key: 'mobile.unit_liters', fallback: 'L' },
  ml: { key: 'mobile.unit_milliliters', fallback: 'mL' },
  milliliter: { key: 'mobile.unit_milliliters', fallback: 'mL' },
  milliliters: { key: 'mobile.unit_milliliters', fallback: 'mL' },
  c: { key: 'mobile.unit_celsius', fallback: '°C' },
  '°c': { key: 'mobile.unit_celsius', fallback: '°C' },
  celsius: { key: 'mobile.unit_celsius', fallback: '°C' },
  'kg/m2': { key: 'mobile.unit_bmi', fallback: 'kg/m²' },
  'kg/m²': { key: 'mobile.unit_bmi', fallback: 'kg/m²' },
  mmhg: { key: 'mobile.unit_mmhg', fallback: 'mmHg' },
  'mg/dl': { key: 'mobile.unit_mg_dl', fallback: 'mg/dL' },
  'mmol/l': { key: 'mobile.unit_mmol_l', fallback: 'mmol/L' },
  '%': { key: 'mobile.unit_percent', fallback: '%' },
  kg: { key: 'mobile.unit_kg', fallback: 'kg' },
  cm: { key: 'mobile.unit_cm', fallback: 'cm' },
  kcal: { key: 'mobile.unit_kcal', fallback: 'kcal' },
  cal: { key: 'mobile.unit_kcal', fallback: 'kcal' },
  times: { key: 'mobile.unit_times', fallback: 'times' },
};

export function formatHealthMetricUnit(
  rawUnit: unknown,
  t: MetricUnitTranslateFn,
  metricType?: string,
): string {
  const trimmed = typeof rawUnit === 'string' ? rawUnit.trim() : String(rawUnit ?? '').trim();
  const fallbackUnit = metricType
    ? (DEFAULT_METRIC_UNIT[metricType.trim().toLowerCase()] ?? '')
    : '';
  const candidate = trimmed || fallbackUnit;
  if (!candidate) return '';

  const entry = UNIT_LOCALE_KEY_MAP[candidate.toLowerCase()];
  return entry ? t(entry.key, entry.fallback) : candidate;
}

