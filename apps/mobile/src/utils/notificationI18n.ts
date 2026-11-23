export type TranslateFn = (key: string, opts?: Record<string, unknown>) => string;

export interface LocalizedNotification {
  title: string;
  message: string;
}

const METRIC_KEY_MAP: Record<string, { key: string; fallback: string }> = {
  'blood pressure': { key: 'mobile.notif_metric_blood_pressure', fallback: 'Blood Pressure' },
  'heart rate': { key: 'mobile.notif_metric_heart_rate', fallback: 'Heart Rate' },
  'blood glucose': { key: 'mobile.notif_metric_blood_glucose', fallback: 'Blood Glucose' },
  'o2 saturation': { key: 'mobile.notif_metric_o2_saturation', fallback: 'O2 Saturation' },
  'blood oxygen': { key: 'mobile.notif_metric_o2_saturation', fallback: 'O2 Saturation' },
  spo2: { key: 'mobile.notif_metric_o2_saturation', fallback: 'O2 Saturation' },
  'body temperature': { key: 'mobile.notif_metric_body_temperature', fallback: 'Body Temperature' },
  temperature: { key: 'mobile.notif_metric_body_temperature', fallback: 'Body Temperature' },
  'respiratory rate': { key: 'mobile.notif_metric_respiratory_rate', fallback: 'Respiratory Rate' },
  bmi: { key: 'mobile.notif_metric_bmi', fallback: 'BMI' },
  weight: { key: 'mobile.notif_metric_weight', fallback: 'Weight' },
  height: { key: 'mobile.notif_metric_height', fallback: 'Height' },
  'water intake': { key: 'mobile.notif_metric_water_intake', fallback: 'Water Intake' },
  calories: { key: 'mobile.notif_metric_calories', fallback: 'Calories' },
};

const STATUS_KEY_MAP: Record<string, { key: string; fallback: string }> = {
  'hypertensive crisis': {
    key: 'mobile.notif_status_hypertensive_crisis',
    fallback: 'Hypertensive Crisis',
  },
  'hypertension stage 2': {
    key: 'mobile.notif_status_hypertension_stage_2',
    fallback: 'Hypertension Stage 2',
  },
  'hypertension stage 1': {
    key: 'mobile.notif_status_hypertension_stage_1',
    fallback: 'Hypertension Stage 1',
  },
  elevated: { key: 'mobile.notif_status_elevated', fallback: 'Elevated' },
  'bradycardia (low)': {
    key: 'mobile.notif_status_bradycardia_low',
    fallback: 'Bradycardia (Low)',
  },
  'tachycardia (high)': {
    key: 'mobile.notif_status_tachycardia_high',
    fallback: 'Tachycardia (High)',
  },
  hypoglycemia: { key: 'mobile.notif_status_hypoglycemia', fallback: 'Hypoglycemia' },
  prediabetes: { key: 'mobile.notif_status_prediabetes', fallback: 'Prediabetes' },
  diabetes: { key: 'mobile.notif_status_diabetes', fallback: 'Diabetes' },
  'severe hypoxemia (critical)': {
    key: 'mobile.notif_status_severe_hypoxemia_critical',
    fallback: 'Severe Hypoxemia (Critical)',
  },
  'mild hypoxemia': { key: 'mobile.notif_status_mild_hypoxemia', fallback: 'Mild Hypoxemia' },
  hypothermia: { key: 'mobile.notif_status_hypothermia', fallback: 'Hypothermia' },
  fever: { key: 'mobile.notif_status_fever', fallback: 'Fever' },
  'bradypnea (low)': { key: 'mobile.notif_status_bradypnea_low', fallback: 'Bradypnea (Low)' },
  'tachypnea (high)': { key: 'mobile.notif_status_tachypnea_high', fallback: 'Tachypnea (High)' },
  underweight: { key: 'mobile.notif_status_underweight', fallback: 'Underweight' },
  overweight: { key: 'mobile.notif_status_overweight', fallback: 'Overweight' },
  obesity: { key: 'mobile.notif_status_obesity', fallback: 'Obesity' },
  'below recommended': {
    key: 'mobile.notif_status_below_recommended',
    fallback: 'Below Recommended',
  },
  'above recommended': {
    key: 'mobile.notif_status_above_recommended',
    fallback: 'Above Recommended',
  },
  'below maintenance range': {
    key: 'mobile.notif_status_below_maintenance_range',
    fallback: 'Below Maintenance Range',
  },
  'above maintenance range': {
    key: 'mobile.notif_status_above_maintenance_range',
    fallback: 'Above Maintenance Range',
  },
  'outside safe threshold': {
    key: 'mobile.notif_status_outside_safe_threshold',
    fallback: 'Outside safe threshold',
  },
};

function translateMetricLabel(rawMetric: string, t: TranslateFn): string {
  const mapped = METRIC_KEY_MAP[rawMetric.trim().toLowerCase()];
  return mapped ? t(mapped.key, { defaultValue: mapped.fallback }) : rawMetric.trim();
}

function translateStatusLabel(rawStatus: string, t: TranslateFn): string {
  const mapped = STATUS_KEY_MAP[rawStatus.trim().toLowerCase()];
  return mapped ? t(mapped.key, { defaultValue: mapped.fallback }) : rawStatus.trim();
}

const EXACT_TEMPLATE_PAIRS: Array<{
  titleMatch: RegExp;
  messageMatch?: RegExp;
  titleKey: string;
  titleFallback: string;
  messageKey: string;
  messageFallback: string;
}> = [
  {
    titleMatch: /^Consultation accepted$/i,
    messageMatch: /^Consultation accepted successfully\.?$/i,
    titleKey: 'mobile.notif_consultation_accepted_title',
    titleFallback: 'Consultation Accepted',
    messageKey: 'mobile.notif_consultation_accepted_msg',
    messageFallback: 'Your consultation request has been accepted.',
  },
  {
    titleMatch: /^Consultation declined$/i,
    messageMatch: /^Consultation declined successfully\.?$/i,
    titleKey: 'mobile.notif_consultation_declined_title',
    titleFallback: 'Consultation Declined',
    messageKey: 'mobile.notif_consultation_declined_msg',
    messageFallback: 'Your consultation request has been declined.',
  },
  {
    titleMatch: /^Cần chú ý sức khỏe ngay$/i,
    titleKey: 'mobile.notif_care_alert_urgent_title',
    titleFallback: 'Urgent Health Attention Needed',
    messageKey: 'mobile.notif_care_alert_urgent_msg',
    messageFallback:
      'A monitoring activity needs immediate attention. This is not a diagnosis. If you have severe symptoms or feel unsafe, contact emergency services or an appropriate local healthcare facility.',
  },
  {
    titleMatch: /^Có hoạt động theo dõi cần chú ý$/i,
    titleKey: 'mobile.notif_care_alert_attention_title',
    titleFallback: 'Monitoring Activity Needs Attention',
    messageKey: 'mobile.notif_care_alert_attention_msg',
    messageFallback:
      'A monitoring activity needs review. This is not a diagnosis. Check details in the app or contact a healthcare professional if you have concerning symptoms.',
  },
  {
    titleMatch: /^Nhắc nhiệm vụ theo dõi$/i,
    titleKey: 'mobile.notif_care_task_reminder_title',
    titleFallback: 'Care Task Reminder',
    messageKey: 'mobile.notif_care_task_reminder_msg',
    messageFallback: 'You have a health monitoring task due. Please open the app to view details.',
  },
  {
    titleMatch: /^Lịch tư vấn sắp tự hủy$/i,
    titleKey: 'mobile.notif_consult_timeout_warning_title',
    titleFallback: 'Consultation About to Auto-Cancel',
    messageKey: 'mobile.notif_consult_timeout_warning_msg',
    messageFallback: 'Your waiting consultation will automatically cancel if it does not start soon.',
  },
  {
    titleMatch: /^Lịch tư vấn được gia hạn chờ$/i,
    titleKey: 'mobile.notif_consult_timeout_extended_title',
    titleFallback: 'Consultation Wait Extended',
    messageKey: 'mobile.notif_consult_timeout_extended_msg',
    messageFallback: 'Waiting room activity was detected and the wait window was extended once.',
  },
  {
    titleMatch: /^Lịch tư vấn đã tự hủy$/i,
    titleKey: 'mobile.notif_consult_timeout_cancelled_title',
    titleFallback: 'Consultation Auto-Cancelled',
    messageKey: 'mobile.notif_consult_timeout_cancelled_msg',
    messageFallback:
      'The unstarted consultation was automatically cancelled; any reserved quota has been released.',
  },
  {
    titleMatch: /^Cần rà soát lịch tư vấn$/i,
    titleKey: 'mobile.notif_consult_review_needed_title',
    titleFallback: 'Consultation Review Needed',
    messageKey: 'mobile.notif_consult_review_needed_msg',
    messageFallback: 'This appointment has been open for over 24 hours without ending. Please review it.',
  },
];

/**
 * Bidirectionally translates hardcoded backend notification templates (EN/VI DB rows)
 * into the active mobile app locale while preserving dynamic names, notes, and readings.
 */
export function localizeNotificationContent(
  rawTitle: string,
  rawMessage: string,
  t: TranslateFn
): LocalizedNotification {
  const titleTrimmed = rawTitle.trim();
  const messageTrimmed = rawMessage.trim();

  if (/^Consultation request$/i.test(titleTrimmed)) {
    const localizedTitle = t('mobile.notif_consultation_request_title', {
      defaultValue: 'New Consultation Request',
    });
    const msgMatch = messageTrimmed.match(
      /^New consultation request from (.+?)\.\s*Note:\s*(.*?)\.?$/i
    );
    if (msgMatch) {
      const name = msgMatch[1].trim();
      const note = msgMatch[2].trim();
      const localizedMessage = note
        ? t('mobile.notif_consultation_request_msg_with_note', {
            name,
            note,
            defaultValue: `New consultation request from ${name}. Note: ${note}.`,
          })
        : t('mobile.notif_consultation_request_msg', {
            name,
            defaultValue: `New consultation request from ${name}.`,
          });
      return { title: localizedTitle, message: localizedMessage };
    }
    return { title: localizedTitle, message: rawMessage };
  }

  const criticalMatch = titleTrimmed.match(/^Critical (.+?) alert$/i);
  if (criticalMatch) {
    const localizedMetric = translateMetricLabel(criticalMatch[1], t);
    const localizedTitle = t('mobile.notif_critical_metric_title', {
      metric: localizedMetric,
      defaultValue: `Critical ${localizedMetric} Alert`,
    });
    const adviceMatch = messageTrimmed.match(
      /^([^:]+):\s*(.+?)\s*\(([^)]+)\)\s*is outside the configured safe threshold\./i
    );
    if (adviceMatch) {
      const localizedStatus = translateStatusLabel(adviceMatch[1], t);
      const bodyMetric = translateMetricLabel(adviceMatch[2], t);
      const reading = adviceMatch[3].trim();
      const localizedMessage = t('mobile.notif_critical_metric_msg', {
        status: localizedStatus,
        metric: bodyMetric,
        value: reading,
        defaultValue: `${localizedStatus}: ${bodyMetric} (${reading}) is outside the configured safe threshold. This is an advisory notification, not a diagnosis. Please contact a healthcare professional if you have concerning symptoms.`,
      });
      return { title: localizedTitle, message: localizedMessage };
    }
    return { title: localizedTitle, message: rawMessage };
  }

  for (const pair of EXACT_TEMPLATE_PAIRS) {
    if (!pair.titleMatch.test(titleTrimmed)) continue;
    const localizedTitle = t(pair.titleKey, { defaultValue: pair.titleFallback });
    const messageMatches = pair.messageMatch ? pair.messageMatch.test(messageTrimmed) : true;
    const localizedMessage = messageMatches
      ? t(pair.messageKey, { defaultValue: pair.messageFallback })
      : rawMessage;
    return { title: localizedTitle, message: localizedMessage };
  }

  return { title: rawTitle, message: rawMessage };
}

