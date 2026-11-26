export type BenefitTranslateFn = (key: string, defaultValue: string) => string;

export interface PlanBenefitRow {
  key: string;
  label: string;
  valueText: string;
  isBoolean: boolean;
  boolValue?: boolean;
}

export interface FormattedPlanBenefits {
  rows: PlanBenefitRow[];
  highlights: string[];
}

const BENEFIT_LABEL_MAP: Record<string, { key: string; fallback: string }> = {
  weeklyAiSummary: {
    key: 'mobile.plan_benefit_weekly_ai_summary',
    fallback: 'Tóm tắt sức khỏe AI hàng tuần',
  },
  doctorReview: {
    key: 'mobile.plan_benefit_doctor_review',
    fallback: 'Bác sĩ rà soát định kỳ',
  },
  summaryTokenBudget: {
    key: 'mobile.plan_benefit_summary_token_budget',
    fallback: 'Hạn mức token tóm tắt AI',
  },
  smartReminder: {
    key: 'mobile.plan_benefit_smart_reminder',
    fallback: 'Nhắc nhở thông minh',
  },
  medicationReminder: {
    key: 'mobile.plan_benefit_medication_reminder',
    fallback: 'Nhắc lịch uống thuốc',
  },
  priorityInbox: {
    key: 'mobile.plan_benefit_priority_inbox',
    fallback: 'Hộp thư ưu tiên với bác sĩ',
  },
  followUp: {
    key: 'mobile.plan_benefit_follow_up',
    fallback: 'Theo dõi tái khám',
  },
  facilitySearch: {
    key: 'mobile.plan_benefit_facility_search',
    fallback: 'Tìm kiếm cơ sở y tế',
  },
  reports: {
    key: 'mobile.plan_benefit_reports',
    fallback: 'Báo cáo sức khỏe',
  },
  exports: {
    key: 'mobile.plan_benefit_exports',
    fallback: 'Xuất dữ liệu báo cáo',
  },
};

const REPORT_VALUE_MAP: Record<string, { key: string; fallback: string }> = {
  weekly: {
    key: 'mobile.plan_benefit_report_weekly',
    fallback: 'Hàng tuần',
  },
  thirty_day: {
    key: 'mobile.plan_benefit_report_thirty_day',
    fallback: '30 ngày',
  },
  ninety_day: {
    key: 'mobile.plan_benefit_report_ninety_day',
    fallback: '90 ngày',
  },
};

const EXPORT_VALUE_MAP: Record<string, { key: string; fallback: string }> = {
  pdf: {
    key: 'mobile.plan_benefit_export_pdf',
    fallback: 'PDF',
  },
  csv: {
    key: 'mobile.plan_benefit_export_csv',
    fallback: 'CSV',
  },
};

function humanizeBenefitKey(key: string): string {
  const spaced = key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .trim();
  if (!spaced) return key;
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/**
 * Formats subscription plan `benefits` into localized rows and feature highlights,
 * skipping `familyLinkLimit` because it is shown in the Quota Specifications section.
 */
export function formatPlanBenefits(
  benefits: Record<string, unknown> | null | undefined,
  t: BenefitTranslateFn,
  dateLocale: string
): FormattedPlanBenefits {
  if (!benefits || typeof benefits !== 'object') {
    return { rows: [], highlights: [] };
  }

  const highlights = Array.isArray(benefits.highlights)
    ? benefits.highlights.map((item) => String(item ?? '').trim()).filter(Boolean)
    : [];

  const rows: PlanBenefitRow[] = [];

  for (const [key, value] of Object.entries(benefits)) {
    if (key === 'highlights' || key === 'familyLinkLimit' || value === null || value === undefined) {
      continue;
    }

    const labelSpec = BENEFIT_LABEL_MAP[key];
    const label = labelSpec ? t(labelSpec.key, labelSpec.fallback) : humanizeBenefitKey(key);

    if (typeof value === 'boolean') {
      rows.push({
        key,
        label,
        valueText: value ? t('mobile.common_yes', 'Có') : t('mobile.common_no', 'Không'),
        isBoolean: true,
        boolValue: value,
      });
      continue;
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      const formattedNum = value.toLocaleString(dateLocale);
      const valueText =
        key === 'summaryTokenBudget'
          ? `${formattedNum} ${t('mobile.tokens_unit', 'token')}`
          : formattedNum;
      rows.push({
        key,
        label,
        valueText,
        isBoolean: false,
      });
      continue;
    }

    if (Array.isArray(value)) {
      const valueMap = key === 'reports' ? REPORT_VALUE_MAP : key === 'exports' ? EXPORT_VALUE_MAP : null;
      const items = value
        .map((item) => {
          const raw = String(item ?? '').trim();
          if (!raw) return '';
          const mapped = valueMap?.[raw];
          return mapped ? t(mapped.key, mapped.fallback) : raw;
        })
        .filter(Boolean);
      if (items.length === 0) continue;
      rows.push({
        key,
        label,
        valueText: items.join(', '),
        isBoolean: false,
      });
      continue;
    }

    const text = String(value).trim();
    if (!text) continue;
    rows.push({
      key,
      label,
      valueText: text,
      isBoolean: false,
    });
  }

  return { rows, highlights };
}
