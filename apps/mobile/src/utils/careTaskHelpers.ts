import type { TFunction, i18n as I18nInstance } from 'i18next';

export interface ReviewTaskWindowCandidate {
  status?: string;
  windowStart?: string;
  windowEnd?: string;
  allowedActions?: string[];
}

/**
 * Resolves a localized CareTask / template title without leaking raw snake_case keys.
 * Strips dynamic numeric suffixes (e.g. `education_reading_3` -> `education_reading`)
 * and falls back cleanly to the localized `taskType` label.
 */
export function resolveCareTaskTemplateTitle(
  t: TFunction,
  i18n: I18nInstance,
  options: {
    title?: unknown;
    label?: unknown;
    name?: unknown;
    templateKey?: unknown;
    taskType?: unknown;
    fallbackIndex?: number;
  }
): string {
  if (typeof options.title === 'string' && options.title.trim()) return options.title;
  if (typeof options.label === 'string' && options.label.trim()) return options.label;
  if (typeof options.name === 'string' && options.name.trim()) return options.name;

  const rawKey = String(options.templateKey ?? '').trim().toLowerCase();
  if (rawKey) {
    const exactKey = `mobile.task_template_${rawKey}`;
    if (i18n.exists(exactKey)) return t(exactKey);

    const baseKey = rawKey.replace(/_\d+$/, '');
    if (baseKey && i18n.exists(`mobile.task_template_${baseKey}`)) {
      return t(`mobile.task_template_${baseKey}`);
    }

    switch (rawKey) {
      case 'morning_blood_pressure':
      case 'evening_blood_pressure':
        if (i18n.exists('mobile.task_bp_measurement')) return t('mobile.task_bp_measurement');
        break;
      case 'morning_blood_glucose':
        if (i18n.exists('mobile.task_glucose_measurement')) {
          return t('mobile.task_glucose_measurement');
        }
        break;
      case 'follow_up_appointment':
        if (i18n.exists('mobile.task_follow_up_appointment')) {
          return t('mobile.task_follow_up_appointment');
        }
        break;
      case 'symptom_check_in':
        if (i18n.exists('mobile.health_check_in_title')) return t('mobile.health_check_in_title');
        break;
    }
  }

  const rawType = String(options.taskType ?? '').trim().toLowerCase();
  if (rawType && i18n.exists(`mobile.task_type_${rawType}`)) {
    return t(`mobile.task_type_${rawType}`);
  }

  if (typeof options.fallbackIndex === 'number') {
    return `${t('mobile.care_task')} ${options.fallbackIndex + 1}`;
  }
  return t('mobile.care_task');
}

/**
 * Checks whether a `doctor_review` task can currently be submitted by the assigned doctor,
 * enforcing status (`due` | `scheduled`), `allowedActions`, and `[windowStart, windowEnd]`.
 */
export function isDoctorReviewTaskOpenNow(
  task: ReviewTaskWindowCandidate,
  nowMs = Date.now()
): boolean {
  const status = String(task.status ?? '').toLowerCase();
  if (status !== 'due' && status !== 'scheduled') return false;
  if (
    Array.isArray(task.allowedActions) &&
    !task.allowedActions.includes('doctor_review')
  ) {
    return false;
  }
  if (task.windowStart) {
    const startMs = Date.parse(task.windowStart);
    if (!Number.isNaN(startMs) && nowMs < startMs) return false;
  }
  if (task.windowEnd) {
    const endMs = Date.parse(task.windowEnd);
    if (!Number.isNaN(endMs) && nowMs > endMs) return false;
  }
  return true;
}

