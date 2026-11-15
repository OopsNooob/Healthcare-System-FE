import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  X,
  Sparkles,
  AlertTriangle,
  TrendingUp,
  CheckCircle,
  ShieldCheck,
  Info,
  RefreshCw,
  FileText,
  Download,
} from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { tw, twInstance } from '@/tw';
import { Skeleton } from '@/components/ui/Skeleton';
import { extractApiErrorMessage } from '@/utils/apiError';
import { downloadMediaFileToDevice } from '@/services/nativeMedia';
import {
  mobileApi,
  generateIdempotencyKey,
  type FeTypes,
} from '@repo/shared-hooks';

interface ParsedSummaryContent {
  overview: string;
  observations: string[];
  missingData: string[];
  alertsToMention: string[];
  questionsForDoctor: string[];
  disclaimer: string;
}

interface AiSummaryModalProps {
  visible: boolean;
  onClose: () => void;
  enrollmentId?: string;
  reportId?: string;
  patientName?: string;
  programName?: string;
  baseline?: string;
  current?: string;
  adherence?: number;
  audience?: 'doctor' | 'patient';
}

function getId(item: Record<string, unknown> | null | undefined): string {
  return String(item?.id ?? item?._id ?? '');
}

function parseSummaryContent(
  summary: FeTypes.CareReportGenerateSummaryResponse | null
): ParsedSummaryContent | null {
  const raw = summary?.content as Record<string, unknown> | undefined;
  if (!raw || typeof raw !== 'object') return null;
  const toList = (val: unknown) =>
    Array.isArray(val) ? val.filter((v): v is string => typeof v === 'string') : [];
  return {
    overview: typeof raw.overview === 'string' ? raw.overview : '',
    observations: toList(raw.observations),
    missingData: toList(raw.missingData),
    alertsToMention: toList(raw.alertsToMention),
    questionsForDoctor: toList(raw.questionsForDoctor),
    disclaimer: typeof raw.disclaimer === 'string' ? raw.disclaimer : '',
  };
}

export const AiSummaryModal: React.FC<AiSummaryModalProps> = ({
  visible,
  onClose,
  enrollmentId,
  reportId,
  patientName,
  programName,
  baseline,
  current,
  adherence,
  audience = 'doctor',
}) => {
  const { t } = useTranslation();

  const [reportType, setReportType] = useState<'weekly' | 'thirty_day'>('weekly');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeReport, setActiveReport] = useState<Record<string, unknown> | null>(null);
  const [summaryRes, setSummaryRes] =
    useState<FeTypes.CareReportGenerateSummaryResponse | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<'pdf' | 'csv' | null>(null);

  const cancelledRef = useRef(false);

  const loadReportAndSummary = useCallback(async () => {
    if (!visible) return;
    if (!reportId && !enrollmentId) {
      setErrorMsg(
        t('mobile.no_enrollment_for_summary', 'Chưa có chương trình chăm sóc để tải tóm tắt AI.')
      );
      setActiveReport(null);
      setSummaryRes(null);
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      let targetReportId = reportId || '';
      let fetchedReport: Record<string, unknown> | null = null;

      if (!targetReportId && enrollmentId) {
        const listRes = await mobileApi.careReportList({
          params: { id: enrollmentId },
          query: { reportType },
        });
        const list = Array.isArray(listRes) ? listRes : [];
        if (list.length > 0) {
          targetReportId = getId(list[0]);
          fetchedReport = list[0];
        }
      }

      if (targetReportId) {
        try {
          fetchedReport = await mobileApi.careReportGet({ params: { id: targetReportId } });
        } catch {
          // Keep list entry if get fails
        }
      }

      if (cancelledRef.current) return;
      setActiveReport(fetchedReport);

      if (targetReportId) {
        const sum = await mobileApi.careReportGenerateSummary({
          params: { id: targetReportId },
          body: { audience },
        });
        if (!cancelledRef.current) {
          setSummaryRes(sum);
        }
      } else {
        setSummaryRes(null);
      }
    } catch (err) {
      if (!cancelledRef.current) {
        setErrorMsg(extractApiErrorMessage(err, 'mobile.ai_summary_load_failed'));
      }
    } finally {
      if (!cancelledRef.current) {
        setLoading(false);
      }
    }
  }, [visible, reportId, enrollmentId, reportType, audience, t]);

  useEffect(() => {
    cancelledRef.current = false;
    if (visible) {
      void loadReportAndSummary();
    }
    return () => {
      cancelledRef.current = true;
    };
  }, [visible, loadReportAndSummary]);

  const handleGenerateNewReport = async () => {
    if (!enrollmentId || isGeneratingReport) return;
    setIsGeneratingReport(true);
    setErrorMsg(null);
    try {
      const created = await mobileApi.careReportGenerate({
        params: { id: enrollmentId },
        body: {
          reportType,
          dataUntil: new Date().toISOString(),
        },
      });
      const createdId = getId(created);
      setActiveReport(created);
      if (createdId) {
        const sum = await mobileApi.careReportGenerateSummary({
          params: { id: createdId },
          body: { audience },
        });
        setSummaryRes(sum);
      }
      Toast.show({
        type: 'success',
        text1: t('mobile.success', 'Thành công'),
        text2: t('mobile.care_report_generated', 'Đã tạo báo cáo kỳ theo dõi mới.'),
      });
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: t('mobile.error', 'Lỗi'),
        text2: extractApiErrorMessage(err, 'mobile.care_report_generate_failed'),
      });
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handleRegenerateSummary = async () => {
    const targetId = getId(activeReport) || reportId;
    if (!targetId || isGeneratingSummary) return;
    setIsGeneratingSummary(true);
    try {
      const sum = await mobileApi.careReportGenerateSummary({
        params: { id: targetId },
        body: { audience },
      });
      setSummaryRes(sum);
      Toast.show({
        type: 'success',
        text1: t('mobile.success', 'Thành công'),
        text2: t('mobile.ai_summary_updated', 'Đã cập nhật tóm tắt lâm sàng từ AI.'),
      });
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: t('mobile.error', 'Lỗi'),
        text2: extractApiErrorMessage(err, 'mobile.ai_summary_load_failed'),
      });
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const handleExportOfficial = async (format: 'pdf' | 'csv') => {
    const targetId = getId(activeReport) || reportId;
    if (!targetId || exportingFormat) return;
    setExportingFormat(format);
    try {
      const created = await mobileApi.careReportCreateExport({
        params: { id: targetId },
        body: { format },
        headers: { 'Idempotency-Key': generateIdempotencyKey() },
      });
      let downloadUrl = created.download?.url;
      for (let i = 0; i < 15 && !downloadUrl; i++) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const st = await mobileApi.careReportGetExport({ params: { id: created.id } });
        if (st.status === 'ready' && st.download?.url) {
          downloadUrl = st.download.url;
          break;
        }
        if (st.status === 'failed' || st.status === 'expired') {
          throw new Error(st.failureReasonCode || 'Export failed');
        }
      }
      if (!downloadUrl) {
        throw new Error(t('mobile.export_timeout', 'Quá thời gian chờ xuất tệp.'));
      }
      await downloadMediaFileToDevice({
        uri: downloadUrl,
        fileName: `Care_Report_${reportType}.${format}`,
        mimeType: format === 'pdf' ? 'application/pdf' : 'text/csv',
      });
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: t('mobile.error', 'Lỗi'),
        text2: extractApiErrorMessage(err, 'mobile.export_error_desc'),
      });
    } finally {
      setExportingFormat(null);
    }
  };

  const parsedContent = parseSummaryContent(summaryRes);
  const statistics = (activeReport?.statistics as Record<string, unknown> | undefined) ?? {};
  const taskStats = statistics.tasks as
    | { completionRate?: number; completed?: number; expected?: number }
    | undefined;
  const computedAdherence =
    typeof taskStats?.completionRate === 'number'
      ? Math.round(taskStats.completionRate * (taskStats.completionRate <= 1 ? 100 : 1))
      : adherence;

  return (
    <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={onClose}>
      <View style={tw('flex-1 justify-end bg-black/60')}>
        <View
          style={tw(
            'bg-white dark:bg-slate-900 rounded-t-3xl max-h-[88%] border-t border-slate-200 dark:border-slate-800'
          )}
        >
          {/* Header */}
          <View
            style={tw(
              'p-5 border-b border-slate-100 dark:border-slate-800 flex-row items-center justify-between'
            )}
          >
            <View style={tw('flex-row items-center flex-1 mr-2')}>
              <View
                style={tw(
                  'w-10 h-10 rounded-2xl bg-purple-100 dark:bg-purple-900/40 items-center justify-center mr-3'
                )}
              >
                <Sparkles
                  color={twInstance.color('text-purple-600 dark:text-purple-400')}
                  size={22}
                />
              </View>
              <View style={tw('flex-1')}>
                <Text style={tw('text-lg font-bold text-slate-900 dark:text-white')} numberOfLines={1}>
                  {t('mobile.ai_clinical_summary', 'Tóm tắt lâm sàng AI')}
                </Text>
                {(patientName || programName) ? (
                  <Text style={tw('text-xs text-slate-500 dark:text-slate-400')} numberOfLines={1}>
                    {[patientName, programName].filter(Boolean).join(' • ')}
                  </Text>
                ) : null}
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={tw('p-2 rounded-full bg-slate-100 dark:bg-slate-800')}
            >
              <X color={twInstance.color('text-slate-600 dark:text-slate-300')} size={20} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={tw('p-5 gap-4')} showsVerticalScrollIndicator={false}>
            {/* Window selector when enrollmentId is present */}
            {enrollmentId && !reportId ? (
              <View style={tw('flex-row bg-slate-100 dark:bg-slate-800 p-1 rounded-xl')}>
                {(
                  [
                    { id: 'weekly', label: t('mobile.report_weekly', 'Báo cáo 7 ngày') },
                    { id: 'thirty_day', label: t('mobile.report_30_day', 'Báo cáo 30 ngày') },
                  ] as const
                ).map((tab) => (
                  <TouchableOpacity
                    key={tab.id}
                    onPress={() => setReportType(tab.id)}
                    style={tw(
                      `flex-1 py-2 rounded-lg items-center ${
                        reportType === tab.id ? 'bg-white dark:bg-slate-900' : ''
                      }`
                    )}
                  >
                    <Text
                      style={tw(
                        `text-xs font-bold ${
                          reportType === tab.id
                            ? 'text-purple-600 dark:text-purple-400'
                            : 'text-slate-500 dark:text-slate-400'
                        }`
                      )}
                    >
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}

            {/* Quick Metrics Row */}
            {(baseline || current || computedAdherence !== undefined) ? (
              <View
                style={tw(
                  'bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex-row justify-between items-center'
                )}
              >
                <View>
                  <Text style={tw('text-xs text-slate-500 dark:text-slate-400')}>
                    {t('mobile.baseline', 'Mức nền')}
                  </Text>
                  <Text style={tw('font-bold text-sm text-slate-700 dark:text-slate-300')}>
                    {baseline || '—'}
                  </Text>
                </View>
                <View>
                  <Text style={tw('text-xs text-slate-500 dark:text-slate-400')}>
                    {t('mobile.current', 'Hiện tại')}
                  </Text>
                  <Text style={tw('font-bold text-sm text-slate-900 dark:text-white')}>
                    {current || '—'}
                  </Text>
                </View>
                <View>
                  <Text style={tw('text-xs text-slate-500 dark:text-slate-400')}>
                    {t('mobile.adherence', 'Tuân thủ')}
                  </Text>
                  <Text
                    style={tw(
                      `font-bold text-sm ${
                        (computedAdherence ?? 0) >= 80 ? 'text-emerald-500' : 'text-amber-500'
                      }`
                    )}
                  >
                    {computedAdherence !== undefined ? `${computedAdherence}%` : '—'}
                  </Text>
                </View>
              </View>
            ) : null}

            {loading ? (
              <View style={tw('gap-3')}>
                <Skeleton className="h-24 w-full rounded-2xl" />
                <Skeleton className="h-28 w-full rounded-2xl" />
                <Skeleton className="h-24 w-full rounded-2xl" />
              </View>
            ) : errorMsg ? (
              <View
                style={tw(
                  'bg-red-50 dark:bg-red-900/20 p-4 rounded-2xl border border-red-200 dark:border-red-800'
                )}
              >
                <Text style={tw('text-xs font-semibold text-red-700 dark:text-red-300')}>
                  {errorMsg}
                </Text>
                <TouchableOpacity
                  onPress={() => void loadReportAndSummary()}
                  style={tw(
                    'mt-3 self-start bg-red-600 px-3.5 py-2 rounded-xl flex-row items-center'
                  )}
                >
                  <RefreshCw size={14} color="#ffffff" />
                  <Text style={tw('text-xs font-bold text-white ml-1.5')}>
                    {t('mobile.retry', 'Thử lại')}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : !activeReport ? (
              <View
                style={tw(
                  'bg-slate-50 dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 items-center'
                )}
              >
                <FileText size={28} color={twInstance.color('text-slate-400')} />
                <Text style={tw('text-sm font-bold text-slate-800 dark:text-slate-200 mt-2 text-center')}>
                  {t('mobile.no_care_report_yet', 'Chưa có báo cáo chăm sóc định kỳ')}
                </Text>
                <Text style={tw('text-xs text-slate-500 dark:text-slate-400 mt-1 text-center')}>
                  {audience === 'doctor'
                    ? t(
                        'mobile.doctor_can_generate_report_hint',
                        'Nhấn nút bên dưới để tổng hợp báo cáo và phân tích AI cho kỳ này.'
                      )
                    : t(
                        'mobile.patient_waiting_report_hint',
                        'Báo cáo tổng hợp sẽ hiển thị sau khi được khởi tạo cho kỳ theo dõi.'
                      )}
                </Text>
                {audience === 'doctor' && enrollmentId ? (
                  <TouchableOpacity
                    onPress={() => void handleGenerateNewReport()}
                    disabled={isGeneratingReport}
                    style={tw(
                      `mt-4 bg-purple-600 px-4 py-2.5 rounded-xl flex-row items-center ${
                        isGeneratingReport ? 'opacity-70' : ''
                      }`
                    )}
                  >
                    {isGeneratingReport ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Sparkles size={15} color="#ffffff" />
                    )}
                    <Text style={tw('text-xs font-bold text-white ml-1.5')}>
                      {isGeneratingReport
                        ? t('mobile.generating_report', 'Đang tạo báo cáo...')
                        : t('mobile.generate_care_report', 'Tạo báo cáo kỳ mới')}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : (
              <>
                {/* Overview Card */}
                <View
                  style={tw(
                    'bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/50 p-4 rounded-2xl'
                  )}
                >
                  <View style={tw('flex-row items-center justify-between mb-2')}>
                    <View style={tw('flex-row items-center')}>
                      <ShieldCheck
                        color={twInstance.color('text-purple-600 dark:text-purple-400')}
                        size={18}
                      />
                      <Text
                        style={tw('text-sm font-bold text-purple-900 dark:text-purple-200 ml-1.5')}
                      >
                        {t('mobile.ai_overview_title', 'Tổng quan từ báo cáo')}
                      </Text>
                    </View>
                    {summaryRes?.status ? (
                      <View style={tw('bg-purple-200 dark:bg-purple-900/60 px-2.5 py-0.5 rounded-full')}>
                        <Text style={tw('text-[10px] font-bold text-purple-800 dark:text-purple-200 uppercase')}>
                          {summaryRes.status}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={tw('text-xs text-purple-900 dark:text-purple-200 leading-5')}>
                    {parsedContent?.overview ||
                      t('mobile.ai_summary_unavailable', 'Tóm tắt AI đang được cập nhật.')}
                  </Text>
                </View>

                {/* Observations & Missing Data */}
                {parsedContent && parsedContent.observations.length > 0 ? (
                  <View
                    style={tw(
                      'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4'
                    )}
                  >
                    <View style={tw('flex-row items-center mb-3')}>
                      <TrendingUp color={twInstance.color('text-blue-500')} size={18} />
                      <Text style={tw('text-sm font-bold text-slate-800 dark:text-slate-200 ml-2')}>
                        {t('mobile.ai_observations', 'Nhận xét lâm sàng')}
                      </Text>
                    </View>
                    <View style={tw('gap-2')}>
                      {parsedContent.observations.map((obs, idx) => (
                        <View key={idx} style={tw('flex-row items-start')}>
                          <CheckCircle
                            color={twInstance.color('text-emerald-500')}
                            size={15}
                            style={tw('mt-0.5 mr-2')}
                          />
                          <Text style={tw('text-xs text-slate-600 dark:text-slate-300 flex-1 leading-5')}>
                            {obs}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ) : null}

                {/* Alerts to Mention */}
                {parsedContent && parsedContent.alertsToMention.length > 0 ? (
                  <View
                    style={tw(
                      'bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-2xl p-4'
                    )}
                  >
                    <View style={tw('flex-row items-center mb-2.5')}>
                      <AlertTriangle color={twInstance.color('text-amber-500')} size={18} />
                      <Text style={tw('text-sm font-bold text-amber-900 dark:text-amber-200 ml-2')}>
                        {t('mobile.ai_alerts_to_mention', 'Cảnh báo cần lưu ý')}
                      </Text>
                    </View>
                    <View style={tw('gap-1.5')}>
                      {parsedContent.alertsToMention.map((alt, idx) => (
                        <Text key={idx} style={tw('text-xs text-amber-800 dark:text-amber-300 leading-5')}>
                          • {alt}
                        </Text>
                      ))}
                    </View>
                  </View>
                ) : null}

                {/* Questions / Next Focus */}
                {parsedContent && parsedContent.questionsForDoctor.length > 0 ? (
                  <View
                    style={tw(
                      'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4'
                    )}
                  >
                    <View style={tw('flex-row items-center mb-2.5')}>
                      <Sparkles color={twInstance.color('text-amber-500')} size={18} />
                      <Text style={tw('text-sm font-bold text-slate-800 dark:text-slate-200 ml-2')}>
                        {t('mobile.ai_questions_for_doctor', 'Điểm cần trao đổi thêm')}
                      </Text>
                    </View>
                    <View style={tw('gap-1.5')}>
                      {parsedContent.questionsForDoctor.map((q, idx) => (
                        <Text key={idx} style={tw('text-xs text-slate-600 dark:text-slate-300 leading-5')}>
                          • {q}
                        </Text>
                      ))}
                    </View>
                  </View>
                ) : null}

                {/* Doctor & Export Actions */}
                <View style={tw('gap-2.5')}>
                  <View style={tw('flex-row gap-2.5')}>
                    <TouchableOpacity
                      onPress={() => void handleRegenerateSummary()}
                      disabled={isGeneratingSummary}
                      style={tw(
                        `flex-1 bg-purple-600 py-2.5 rounded-xl flex-row items-center justify-center ${
                          isGeneratingSummary ? 'opacity-70' : ''
                        }`
                      )}
                    >
                      {isGeneratingSummary ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
                        <RefreshCw size={14} color="#ffffff" />
                      )}
                      <Text style={tw('text-xs font-bold text-white ml-1.5')}>
                        {t('mobile.refresh_ai_summary', 'Làm mới AI')}
                      </Text>
                    </TouchableOpacity>

                    {audience === 'doctor' && enrollmentId ? (
                      <TouchableOpacity
                        onPress={() => void handleGenerateNewReport()}
                        disabled={isGeneratingReport}
                        style={tw(
                          `flex-1 bg-slate-900 dark:bg-white py-2.5 rounded-xl flex-row items-center justify-center ${
                            isGeneratingReport ? 'opacity-70' : ''
                          }`
                        )}
                      >
                        <Text
                          style={tw('text-xs font-bold text-white dark:text-slate-900')}
                        >
                          {isGeneratingReport
                            ? t('mobile.generating_report', 'Đang tạo...')
                            : t('mobile.generate_care_report', 'Tạo báo cáo mới')}
                        </Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>

                  <View style={tw('flex-row gap-2.5')}>
                    <TouchableOpacity
                      onPress={() => void handleExportOfficial('pdf')}
                      disabled={Boolean(exportingFormat)}
                      style={tw(
                        `flex-1 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 py-2.5 rounded-xl flex-row items-center justify-center ${
                          exportingFormat ? 'opacity-60' : ''
                        }`
                      )}
                    >
                      <Download size={14} color={twInstance.color('text-emerald-600 dark:text-emerald-400')} />
                      <Text style={tw('text-xs font-bold text-emerald-700 dark:text-emerald-300 ml-1.5')}>
                        {exportingFormat === 'pdf'
                          ? t('mobile.processing', 'Đang xuất...')
                          : t('mobile.export_pdf', 'Xuất PDF')}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => void handleExportOfficial('csv')}
                      disabled={Boolean(exportingFormat)}
                      style={tw(
                        `flex-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 py-2.5 rounded-xl flex-row items-center justify-center ${
                          exportingFormat ? 'opacity-60' : ''
                        }`
                      )}
                    >
                      <Download size={14} color={twInstance.color('text-slate-700 dark:text-slate-300')} />
                      <Text style={tw('text-xs font-bold text-slate-700 dark:text-slate-300 ml-1.5')}>
                        {exportingFormat === 'csv'
                          ? t('mobile.processing', 'Đang xuất...')
                          : t('mobile.export_csv', 'Xuất CSV')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={tw('flex-row items-start bg-slate-100 dark:bg-slate-800/60 p-3 rounded-xl')}>
                  <Info color={twInstance.color('text-slate-400')} size={16} style={tw('mt-0.5 mr-2')} />
                  <Text style={tw('text-[11px] text-slate-500 dark:text-slate-400 flex-1 leading-4')}>
                    {parsedContent?.disclaimer ||
                      t(
                        'mobile.ai_disclaimer',
                        'Tóm tắt do AI hỗ trợ mang tính tham khảo và không thay thế chẩn đoán của bác sĩ.'
                      )}
                  </Text>
                </View>
              </>
            )}
          </ScrollView>

          <View style={tw('p-4 border-t border-slate-100 dark:border-slate-800')}>
            <TouchableOpacity onPress={onClose} style={tw('bg-brand py-3.5 rounded-xl items-center')}>
              <Text style={tw('text-slate-900 font-bold text-sm')}>
                {t('mobile.close', 'Đóng')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
