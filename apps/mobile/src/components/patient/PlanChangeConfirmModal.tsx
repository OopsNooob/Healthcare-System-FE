import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { AlertCircle, ArrowRight, Calendar, Crown, X } from 'lucide-react-native';
import type { FeTypes } from '@repo/shared-hooks';
import { tw, twInstance } from '@/tw';
import { useThemeContext } from '@/context/ThemeContext';
import { formatBillingMoney } from '@/utils/billingPlanSelection';

export type PlanChangeConfirmMode =
  | 'schedule_upgrade'
  | 'schedule_renew'
  | 'schedule_downgrade';

export interface PlanQuotaSummary {
  consultationLimitPerCycle: number;
  aiRequestLimit: number;
  aiTokenLimit: number;
  activeCareProgramLimit: number;
}

interface PlanChangeConfirmModalProps {
  visible: boolean;
  mode: PlanChangeConfirmMode;
  currentPlanName: string;
  currentPrice: number | null;
  currentCurrency?: string;
  currentQuota: PlanQuotaSummary | null;
  targetPlan: FeTypes.PatientBillingReadGetPlanResponse | null;
  effectiveAtFormatted: string;
  isProcessing: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const MODE_VISUALS: Record<
  PlanChangeConfirmMode,
  {
    titleKey: string;
    titleDefault: string;
    bannerClass: string;
    bannerTextClass: string;
    iconBgClass: string;
    iconColorClass: string;
    ctaBgClass: string;
    ctaTextClass: string;
    Icon: typeof Crown;
  }
> = {
  schedule_upgrade: {
    titleKey: 'mobile.confirm_modal_upgrade_title',
    titleDefault: 'Xác nhận đặt lịch nâng cấp',
    bannerClass: 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-900',
    bannerTextClass: 'text-indigo-800 dark:text-indigo-300',
    iconBgClass: 'bg-indigo-100 dark:bg-indigo-900/40',
    iconColorClass: 'text-indigo-600 dark:text-indigo-400',
    ctaBgClass: 'bg-slate-900 dark:bg-white',
    ctaTextClass: 'text-white dark:text-slate-900',
    Icon: Crown,
  },
  schedule_renew: {
    titleKey: 'mobile.confirm_modal_renew_title',
    titleDefault: 'Xác nhận gia hạn gói',
    bannerClass: 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-900',
    bannerTextClass: 'text-indigo-800 dark:text-indigo-300',
    iconBgClass: 'bg-emerald-100 dark:bg-emerald-900/30',
    iconColorClass: 'text-emerald-600 dark:text-emerald-400',
    ctaBgClass: 'bg-slate-900 dark:bg-white',
    ctaTextClass: 'text-white dark:text-slate-900',
    Icon: Calendar,
  },
  schedule_downgrade: {
    titleKey: 'mobile.confirm_modal_downgrade_title',
    titleDefault: 'Xác nhận đặt lịch hạ gói',
    bannerClass: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60',
    bannerTextClass: 'text-amber-800 dark:text-amber-300',
    iconBgClass: 'bg-amber-100 dark:bg-amber-900/30',
    iconColorClass: 'text-amber-600 dark:text-amber-400',
    ctaBgClass: 'bg-amber-600 dark:bg-amber-500',
    ctaTextClass: 'text-white dark:text-slate-950',
    Icon: AlertCircle,
  },
};

function getNumericDeltaClass(currentVal: number | null | undefined, nextVal: number): string {
  if (typeof currentVal !== 'number') {
    return 'text-slate-900 dark:text-white font-semibold';
  }
  if (nextVal > currentVal) {
    return 'text-emerald-600 dark:text-emerald-400 font-bold';
  }
  if (nextVal < currentVal) {
    return 'text-amber-600 dark:text-amber-400 font-bold';
  }
  return 'text-slate-900 dark:text-white font-semibold';
}

/**
 * Bottom-sheet confirmation modal comparing current entitlements against the
 * scheduled next-cycle plan before redirecting the patient to VNPAY.
 */
export const PlanChangeConfirmModal: React.FC<PlanChangeConfirmModalProps> = ({
  visible,
  mode,
  currentPlanName,
  currentPrice,
  currentCurrency = 'VND',
  currentQuota,
  targetPlan,
  effectiveAtFormatted,
  isProcessing,
  onClose,
  onConfirm,
}) => {
  const { t } = useTranslation();
  useThemeContext();

  const visual = MODE_VISUALS[mode];
  const HeaderIcon = visual.Icon;
  const freePriceLabel = t('mobile.free_price', '0đ');

  const rows = targetPlan
    ? [
        {
          key: 'price',
          label: t('mobile.compare_row_price', 'Giá gói'),
          currentDisplay:
            currentPrice !== null
              ? formatBillingMoney(currentPrice, currentCurrency, freePriceLabel)
              : '—',
          nextDisplay: formatBillingMoney(targetPlan.price, targetPlan.currency, freePriceLabel),
          nextClass: 'text-slate-900 dark:text-white font-bold',
        },
        {
          key: 'consultations',
          label: t('mobile.compare_row_consultations', 'Tư vấn bác sĩ'),
          currentDisplay:
            currentQuota !== null
              ? currentQuota.consultationLimitPerCycle.toLocaleString('vi-VN')
              : '—',
          nextDisplay: targetPlan.quota.consultationLimitPerCycle.toLocaleString('vi-VN'),
          nextClass: getNumericDeltaClass(
            currentQuota?.consultationLimitPerCycle,
            targetPlan.quota.consultationLimitPerCycle
          ),
        },
        {
          key: 'aiRequests',
          label: t('mobile.compare_row_ai_requests', 'Lượt hỏi AI'),
          currentDisplay:
            currentQuota !== null ? currentQuota.aiRequestLimit.toLocaleString('vi-VN') : '—',
          nextDisplay: targetPlan.quota.aiRequestLimit.toLocaleString('vi-VN'),
          nextClass: getNumericDeltaClass(
            currentQuota?.aiRequestLimit,
            targetPlan.quota.aiRequestLimit
          ),
        },
        {
          key: 'aiTokens',
          label: t('mobile.compare_row_ai_tokens', 'Hạn mức token AI'),
          currentDisplay:
            currentQuota !== null ? currentQuota.aiTokenLimit.toLocaleString('vi-VN') : '—',
          nextDisplay: targetPlan.quota.aiTokenLimit.toLocaleString('vi-VN'),
          nextClass: getNumericDeltaClass(
            currentQuota?.aiTokenLimit,
            targetPlan.quota.aiTokenLimit
          ),
        },
        {
          key: 'carePrograms',
          label: t('mobile.compare_row_care_programs', 'Chương trình chăm sóc'),
          currentDisplay:
            currentQuota !== null
              ? currentQuota.activeCareProgramLimit.toLocaleString('vi-VN')
              : '—',
          nextDisplay: targetPlan.quota.activeCareProgramLimit.toLocaleString('vi-VN'),
          nextClass: getNumericDeltaClass(
            currentQuota?.activeCareProgramLimit,
            targetPlan.quota.activeCareProgramLimit
          ),
        },
      ]
    : [];

  return (
    <Modal
      visible={visible && Boolean(targetPlan)}
      transparent
      animationType="slide"
      onRequestClose={() => {
        if (!isProcessing) onClose();
      }}
    >
      <View style={tw('flex-1 bg-black/60 justify-end')}>
        <View style={tw('bg-white dark:bg-slate-900 rounded-t-3xl p-6 max-h-[88%]')}>
          <View
            style={tw(
              'flex-row justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800'
            )}
          >
            <View style={tw('flex-row items-center flex-1 mr-3')}>
              <View
                style={tw(`w-10 h-10 rounded-full items-center justify-center mr-3 ${visual.iconBgClass}`)}
              >
                <HeaderIcon size={20} color={twInstance.color(visual.iconColorClass)} />
              </View>
              <View style={tw('flex-1')}>
                <Text style={tw('text-lg font-bold text-slate-900 dark:text-white')}>
                  {t(visual.titleKey, visual.titleDefault)}
                </Text>
                {targetPlan ? (
                  <Text style={tw('text-xs text-slate-500 dark:text-slate-400 mt-0.5')}>
                    {currentPlanName} → {targetPlan.name}
                  </Text>
                ) : null}
              </View>
            </View>
            <TouchableOpacity
              onPress={() => {
                if (!isProcessing) onClose();
              }}
              disabled={isProcessing}
              style={tw(`p-2 ${isProcessing ? 'opacity-40' : ''}`)}
            >
              <X size={22} color={twInstance.color('text-slate-400')} />
            </TouchableOpacity>
          </View>

          <ScrollView style={tw('mt-4')} showsVerticalScrollIndicator={false}>
            {targetPlan ? (
              <>
                <View style={tw(`p-3.5 rounded-2xl border mb-4 ${visual.bannerClass}`)}>
                  <Text style={tw(`text-xs leading-5 ${visual.bannerTextClass}`)}>
                    {mode === 'schedule_downgrade'
                      ? t(
                          'mobile.confirm_modal_downgrade_desc',
                          'Lưu ý: Gói {{target}} có hạn mức thấp hơn gói {{current}}. Gói hiện tại vẫn được giữ nguyên đến {{date}}, sau đó mới chuyển sang {{target}}.',
                          {
                            current: currentPlanName,
                            target: targetPlan.name,
                            date: effectiveAtFormatted,
                          }
                        )
                      : t(
                          'mobile.confirm_modal_effective_desc',
                          'Gói {{current}} hiện tại vẫn giữ nguyên quyền lợi đến {{date}}. Gói {{target}} sẽ tự động kích hoạt cho chu kỳ tiếp theo.',
                          {
                            current: currentPlanName,
                            target: targetPlan.name,
                            date: effectiveAtFormatted,
                          }
                        )}
                  </Text>
                </View>

                <View
                  style={tw(
                    'bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden mb-4'
                  )}
                >
                  <View
                    style={tw(
                      'flex-row px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700'
                    )}
                  >
                    <Text
                      style={[
                        tw('text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400'),
                        { flex: 1.3 },
                      ]}
                    >
                      {t('mobile.compare_col_metric', 'Quyền lợi')}
                    </Text>
                    <Text
                      style={tw(
                        'flex-1 text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 text-right'
                      )}
                      numberOfLines={1}
                    >
                      {t('mobile.compare_col_current', 'Hiện tại')} ({currentPlanName})
                    </Text>
                    <Text
                      style={tw(
                        'flex-1 text-[11px] font-bold uppercase text-slate-700 dark:text-slate-200 text-right ml-2'
                      )}
                      numberOfLines={1}
                    >
                      {t('mobile.compare_col_next', 'Chu kỳ sau')} ({targetPlan.name})
                    </Text>
                  </View>

                  {rows.map((row, idx) => (
                    <View
                      key={row.key}
                      style={tw(
                        `flex-row items-center px-3.5 py-2.5 ${
                          idx < rows.length - 1
                            ? 'border-b border-slate-200/70 dark:border-slate-700/70'
                            : ''
                        }`
                      )}
                    >
                      <Text
                        style={[
                          tw('text-xs text-slate-600 dark:text-slate-300 pr-2'),
                          { flex: 1.3 },
                        ]}
                      >
                        {row.label}
                      </Text>
                      <Text
                        style={tw('flex-1 text-xs text-slate-600 dark:text-slate-300 text-right')}
                      >
                        {row.currentDisplay}
                      </Text>
                      <Text style={tw(`flex-1 text-xs text-right ml-2 ${row.nextClass}`)}>
                        {row.nextDisplay}
                      </Text>
                    </View>
                  ))}
                </View>

                <View
                  style={tw(
                    'flex-row justify-between items-center bg-slate-100 dark:bg-slate-800 p-3.5 rounded-2xl mb-4'
                  )}
                >
                  <Text style={tw('text-xs font-semibold text-slate-600 dark:text-slate-300')}>
                    {t('mobile.pay_now_vnpay_label', 'Thanh toán ngay qua VNPAY')}
                  </Text>
                  <Text style={tw('text-base font-bold text-slate-900 dark:text-white')}>
                    {formatBillingMoney(targetPlan.price, targetPlan.currency, freePriceLabel)}
                  </Text>
                </View>
              </>
            ) : null}
          </ScrollView>

          <View style={tw('gap-2.5 pt-2')}>
            <TouchableOpacity
              onPress={onConfirm}
              disabled={isProcessing}
              style={tw(
                `${visual.ctaBgClass} py-3.5 rounded-2xl flex-row items-center justify-center shadow-sm ${
                  isProcessing ? 'opacity-70' : ''
                }`
              )}
            >
              {isProcessing ? (
                <ActivityIndicator
                  color={twInstance.color(visual.ctaTextClass)}
                  size="small"
                  style={tw('mr-2')}
                />
              ) : null}
              <Text style={tw(`${visual.ctaTextClass} font-bold text-base mr-2`)}>
                {isProcessing
                  ? t('mobile.creating_order', 'Đang tạo đơn...')
                  : t('mobile.confirm_and_pay_vnpay', 'Xác nhận & Thanh toán VNPAY')}
              </Text>
              <ArrowRight color={twInstance.color(visual.ctaTextClass)} size={18} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onClose}
              disabled={isProcessing}
              style={tw(
                `bg-slate-100 dark:bg-slate-800 py-3.5 rounded-2xl items-center justify-center ${
                  isProcessing ? 'opacity-60' : ''
                }`
              )}
            >
              <Text style={tw('text-slate-700 dark:text-slate-300 font-bold text-sm')}>
                {t('mobile.later_btn', 'Để sau')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

