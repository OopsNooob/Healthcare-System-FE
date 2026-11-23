import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  X,
  FileSpreadsheet,
  FileText,
  Download,
  CheckCircle,
  Sparkles,
  LineChart,
  ShieldCheck,
  Share2,
  CheckCircle2,
  Eye,
} from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { tw, twInstance } from '@/tw';
import { AppModalToast } from '@/components/ui/AppToast';
import { extractApiErrorMessage } from '@/utils/apiError';
import {
  generateHealthReport,
  saveReportToDevice,
  shareReportFile,
  downloadMediaFileToDevice,
  shareMediaFile,
  type GeneratedReport,
} from '@/services/nativeMedia';
import type {
  DynamicHealthReportExportOptions,
  ExcelHealthReadingRow,
  ExcelHealthAlertRow,
} from '@/services/excelReportGenerator';
import { mobileApi, generateIdempotencyKey } from '@repo/shared-hooks';

interface ReportExportModalProps {
  visible: boolean;
  onClose: () => void;
  onExportReport?: (options: {
    timeRange: string;
    format: 'xlsx' | 'csv' | 'pdf';
    includeAiSummary: boolean;
    includeCharts: boolean;
    includeAlerts: boolean;
  }) => void;
  defaultTimeRange?: '7d' | '30d' | '90d';
  reportId?: string | null;
  patientName?: string;
  patientCode?: string;
  aiSummaryText?: string;
  readings?: ExcelHealthReadingRow[];
  alerts?: ExcelHealthAlertRow[];
}

export const ReportExportModal: React.FC<ReportExportModalProps> = ({
  visible,
  onClose,
  onExportReport,
  defaultTimeRange = '7d',
  reportId,
  patientName,
  patientCode,
  aiSummaryText,
  readings = [],
  alerts = [],
}) => {
  const { t } = useTranslation();

  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>(defaultTimeRange);
  const [format, setFormat] = useState<'xlsx' | 'pdf' | 'csv'>('xlsx');
  const [includeAiSummary, setIncludeAiSummary] = useState(true);
  const [includeCharts, setIncludeCharts] = useState(true);
  const [includeAlerts, setIncludeAlerts] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [exportedResult, setExportedResult] = useState<GeneratedReport | null>(null);
  const [remoteDownloadUrl, setRemoteDownloadUrl] = useState<string | null>(null);
  const [remoteFileName, setRemoteFileName] = useState<string | null>(null);
  const [remoteMimeType, setRemoteMimeType] = useState<string>('application/pdf');
  const [isSaving, setIsSaving] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const cancelledRef = useRef(false);

  useEffect(() => {
    if (visible) {
      cancelledRef.current = false;
      setTimeRange(defaultTimeRange);
    }
    return () => {
      cancelledRef.current = true;
    };
  }, [visible, defaultTimeRange]);

  const ranges: Array<{ id: '7d' | '30d' | '90d'; label: string }> = [
    { id: '7d', label: t('mobile.days_7', '7 ngày') },
    { id: '30d', label: t('mobile.days_30', '30 ngày') },
    { id: '90d', label: t('mobile.days_90', '90 ngày') },
  ];

  const periodLabel =
    timeRange === '7d'
      ? t('mobile.days_7', '7 ngày')
      : timeRange === '30d'
        ? t('mobile.days_30', '30 ngày')
        : t('mobile.days_90', '90 ngày');

  const pollServerExport = async (exportId: string, fmt: 'pdf' | 'csv') => {
    for (let attempt = 0; attempt < 20; attempt++) {
      if (cancelledRef.current) return null;
      const statusRes = await mobileApi.careReportGetExport({ params: { id: exportId } });
      if (statusRes.status === 'ready' && statusRes.download?.url) {
        return statusRes.download.url;
      }
      if (statusRes.status === 'failed' || statusRes.status === 'expired') {
        throw new Error(
          statusRes.failureReasonCode ||
            t('mobile.export_error_desc', 'Không thể tạo tài liệu báo cáo.')
        );
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    throw new Error(t('mobile.export_timeout', `Quá thời gian chờ tệp ${fmt.toUpperCase()}.`));
  };

  const handleExport = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      if ((format === 'pdf' || format === 'csv') && reportId) {
        const created = await mobileApi.careReportCreateExport({
          params: { id: reportId },
          body: { format },
          headers: { 'Idempotency-Key': generateIdempotencyKey() },
        });
        let downloadUrl = created.download?.url ?? null;
        if (!downloadUrl) {
          downloadUrl = await pollServerExport(created.id, format);
        }
        if (!downloadUrl) return;
        const mime = format === 'pdf' ? 'application/pdf' : 'text/csv';
        const fileName = `Care_Report_${timeRange.toUpperCase()}.${format}`;
        setRemoteDownloadUrl(downloadUrl);
        setRemoteFileName(fileName);
        setRemoteMimeType(mime);
        setExportedResult({
          uri: downloadUrl,
          name: fileName,
          size: format.toUpperCase(),
          type: format === 'pdf' ? 'pdf' : 'xlsx',
          mimeType: mime,
        });
        Toast.show({
          type: 'success',
          text1: t('mobile.report_exported', 'Xuất báo cáo thành công'),
          text2: fileName,
        });
      } else {
        const exportOptions: DynamicHealthReportExportOptions = {
          timeRange,
          format: format === 'pdf' ? 'pdf' : 'xlsx',
          includeAiSummary,
          includeCharts,
          includeAlerts,
          patientName,
          patientCode,
          periodText: periodLabel,
          aiSummaryText,
          readings,
          alerts,
        };
        const result = await generateHealthReport(exportOptions);
        if (result) {
          setRemoteDownloadUrl(null);
          setRemoteFileName(null);
          setExportedResult(result);
          Toast.show({
            type: 'success',
            text1: t('mobile.report_exported', 'Xuất báo cáo thành công'),
            text2: result.name,
          });
        }
      }

      if (onExportReport) {
        onExportReport({
          timeRange,
          format,
          includeAiSummary,
          includeCharts,
          includeAlerts,
        });
      }
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: t('mobile.error', 'Lỗi'),
        text2: extractApiErrorMessage(err, 'mobile.export_error_desc'),
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleSaveToDevice = async () => {
    if (!exportedResult || isSaving) return;
    setIsSaving(true);
    try {
      if (remoteDownloadUrl && remoteFileName) {
        await downloadMediaFileToDevice({
          uri: remoteDownloadUrl,
          fileName: remoteFileName,
          mimeType: remoteMimeType,
        });
      } else {
        await saveReportToDevice(exportedResult.uri, exportedResult.name, exportedResult.mimeType);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleShare = async () => {
    if (!exportedResult || isSharing) return;
    setIsSharing(true);
    try {
      if (remoteDownloadUrl && remoteFileName) {
        await shareMediaFile({
          uri: remoteDownloadUrl,
          fileName: remoteFileName,
          mimeType: remoteMimeType,
        });
      } else {
        await shareReportFile(exportedResult.uri, exportedResult.name, exportedResult.mimeType);
      }
    } finally {
      setIsSharing(false);
    }
  };

  const handleClose = () => {
    cancelledRef.current = true;
    setShowPreview(false);
    setExportedResult(null);
    setRemoteDownloadUrl(null);
    setRemoteFileName(null);
    onClose();
  };

  const displayName = patientName || t('mobile.patient_label', 'Bệnh nhân');

  return (
    <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={handleClose}>
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
            <View style={tw('flex-row items-center flex-1 pr-2')}>
              <View
                style={tw(
                  'w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 items-center justify-center mr-3'
                )}
              >
                <FileSpreadsheet
                  color={twInstance.color('text-emerald-600 dark:text-emerald-400')}
                  size={22}
                />
              </View>
              <View style={tw('flex-1')}>
                <Text style={tw('text-lg font-bold text-slate-900 dark:text-white')} numberOfLines={1}>
                  {showPreview
                    ? t('mobile.spreadsheet_preview_title', 'Xem trước dữ liệu báo cáo')
                    : t('mobile.export_excel_title', 'Xuất báo cáo sức khỏe')}
                </Text>
                <Text style={tw('text-xs text-slate-500 dark:text-slate-400 leading-4 mt-0.5')}>
                  {showPreview
                    ? t('mobile.spreadsheet_preview_subtitle', 'Dữ liệu thực tế từ hồ sơ sức khỏe của bạn')
                    : t('mobile.export_excel_desc', 'Chọn khoảng thời gian, định dạng và nội dung đi kèm')}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={handleClose}
              style={tw('p-2 rounded-full bg-slate-100 dark:bg-slate-800')}
            >
              <X color={twInstance.color('text-slate-600 dark:text-slate-300')} size={20} />
            </TouchableOpacity>
          </View>

          {exportedResult ? (
            showPreview ? (
              <View style={tw('p-5 max-h-[75%]')}>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={tw('gap-4 pb-4')}>
                  <View
                    style={tw(
                      'p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800'
                    )}
                  >
                    <View style={tw('flex-row justify-between mb-1')}>
                      <Text style={tw('text-xs text-slate-500 dark:text-slate-400')}>
                        {t('mobile.patient_label_colon', 'Bệnh nhân:')}
                      </Text>
                      <Text style={tw('text-xs font-bold text-slate-800 dark:text-slate-200')}>
                        {displayName}
                        {patientCode ? ` (${patientCode})` : ''}
                      </Text>
                    </View>
                    <View style={tw('flex-row justify-between mb-1')}>
                      <Text style={tw('text-xs text-slate-500 dark:text-slate-400')}>
                        {t('mobile.period_label_colon', 'Khoảng thời gian:')}
                      </Text>
                      <Text style={tw('text-xs font-bold text-emerald-600 dark:text-emerald-400')}>
                        {periodLabel}
                      </Text>
                    </View>
                    <View style={tw('flex-row justify-between')}>
                      <Text style={tw('text-xs text-slate-500 dark:text-slate-400')}>
                        {t('mobile.filename_label_colon', 'Tên tệp:')}
                      </Text>
                      <Text style={tw('text-xs font-mono text-slate-700 dark:text-slate-300')} numberOfLines={1}>
                        {exportedResult.name}
                      </Text>
                    </View>
                  </View>

                  {includeAiSummary && (
                    <View
                      style={tw(
                        'p-3.5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40'
                      )}
                    >
                      <View style={tw('flex-row items-center gap-1.5 mb-1.5')}>
                        <Sparkles color="#10b981" size={15} />
                        <Text style={tw('text-xs font-bold text-emerald-800 dark:text-emerald-300')}>
                          {t('mobile.ai_clinical_summary', 'Tóm tắt tổng quan AI')}
                        </Text>
                      </View>
                      <Text style={tw('text-xs text-slate-700 dark:text-slate-300 leading-5')}>
                        {aiSummaryText?.trim() ||
                          t('mobile.excel_no_ai_summary', 'Chưa có tóm tắt AI cho khoảng thời gian này.')}
                      </Text>
                    </View>
                  )}

                  <View>
                    <Text
                      style={tw(
                        'text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2'
                      )}
                    >
                      {t('mobile.detailed_vital_telemetry', 'Dữ liệu chỉ số sinh hiệu')}
                    </Text>
                    {readings.length === 0 ? (
                      <View
                        style={tw(
                          'p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 items-center'
                        )}
                      >
                        <Text style={tw('text-xs text-slate-500 dark:text-slate-400 text-center')}>
                          {t(
                            'mobile.excel_no_readings',
                            'Chưa có dữ liệu chỉ số sinh hiệu trong khoảng thời gian đã chọn.'
                          )}
                        </Text>
                      </View>
                    ) : (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <View
                          style={tw(
                            'rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden'
                          )}
                        >
                          <View
                            style={tw(
                              'flex-row bg-slate-100 dark:bg-slate-800 p-2.5 border-b border-slate-200 dark:border-slate-700'
                            )}
                          >
                            <Text style={tw('w-32 text-[11px] font-bold text-slate-700 dark:text-slate-300')}>
                              {t('mobile.table_col_time', 'Thời gian')}
                            </Text>
                            <Text style={tw('w-24 text-[11px] font-bold text-slate-700 dark:text-slate-300')}>
                              {t('mobile.blood_pressure', 'Huyết áp')}
                            </Text>
                            <Text style={tw('w-24 text-[11px] font-bold text-slate-700 dark:text-slate-300')}>
                              {t('mobile.blood_glucose', 'Đường huyết')}
                            </Text>
                            <Text style={tw('w-20 text-[11px] font-bold text-slate-700 dark:text-slate-300')}>
                              {t('mobile.heart_rate', 'Nhịp tim')}
                            </Text>
                            <Text style={tw('w-28 text-[11px] font-bold text-slate-700 dark:text-slate-300')}>
                              {t('mobile.table_col_assessment', 'Đánh giá')}
                            </Text>
                          </View>
                          {readings.map((row, idx) => (
                            <View
                              key={idx}
                              style={tw(
                                `flex-row p-2.5 border-b border-slate-100 dark:border-slate-800/60 ${
                                  idx % 2 === 0
                                    ? 'bg-white dark:bg-slate-900'
                                    : 'bg-slate-50/50 dark:bg-slate-950'
                                }`
                              )}
                            >
                              <Text style={tw('w-32 text-[11px] text-slate-600 dark:text-slate-400')}>
                                {row.time}
                              </Text>
                              <Text style={tw('w-24 text-[11px] font-semibold text-slate-800 dark:text-slate-200')}>
                                {row.systolic != null && row.diastolic != null
                                  ? `${row.systolic}/${row.diastolic}`
                                  : '—'}
                              </Text>
                              <Text style={tw('w-24 text-[11px] text-slate-700 dark:text-slate-300')}>
                                {row.glucose != null ? `${row.glucose} mg/dL` : '—'}
                              </Text>
                              <Text style={tw('w-20 text-[11px] text-slate-700 dark:text-slate-300')}>
                                {row.heartRate != null ? `${row.heartRate} bpm` : '—'}
                              </Text>
                              <Text
                                style={tw(
                                  `w-28 text-[11px] font-bold ${
                                    row.isWarning
                                      ? 'text-amber-600 dark:text-amber-400'
                                      : 'text-emerald-600 dark:text-emerald-400'
                                  }`
                                )}
                              >
                                {row.assessment}
                              </Text>
                            </View>
                          ))}
                        </View>
                      </ScrollView>
                    )}
                  </View>

                  <View style={tw('flex-row gap-3 pt-2')}>
                    <TouchableOpacity
                      onPress={() => setShowPreview(false)}
                      style={tw(
                        'flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 items-center justify-center'
                      )}
                    >
                      <Text style={tw('text-slate-700 dark:text-slate-300 font-bold text-sm')}>
                        {t('mobile.back', 'Quay lại')}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => void handleShare()}
                      disabled={isSharing}
                      style={tw(
                        'flex-1 py-3 rounded-xl bg-emerald-600 items-center flex-row justify-center active:opacity-80'
                      )}
                    >
                      <Share2 color="#ffffff" size={16} style={tw('mr-1.5')} />
                      <Text style={tw('text-white font-bold text-sm')}>
                        {t('mobile.share_report', 'Chia sẻ')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </View>
            ) : (
              <View style={tw('p-6 items-center gap-4')}>
                <View
                  style={tw(
                    'w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/50 items-center justify-center border-4 border-emerald-50 dark:border-emerald-900/40'
                  )}
                >
                  <CheckCircle2 color="#10b981" size={32} />
                </View>

                <View style={tw('items-center')}>
                  <Text style={tw('text-lg font-bold text-slate-900 dark:text-white text-center')}>
                    {t('mobile.export_excel_success_title', 'Báo cáo đã sẵn sàng')}
                  </Text>
                  <Text style={tw('text-xs text-slate-500 dark:text-slate-400 text-center mt-1 px-4')}>
                    {t('mobile.export_excel_success_desc', 'Bạn có thể tải về máy hoặc chia sẻ cho bác sĩ.')}
                  </Text>
                </View>

                <View
                  style={tw(
                    'w-full p-4 rounded-2xl bg-emerald-50/50 dark:bg-slate-950 border border-emerald-200 dark:border-emerald-900/50 flex-row items-center gap-3 my-2'
                  )}
                >
                  <View
                    style={tw(
                      'w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 items-center justify-center'
                    )}
                  >
                    <FileSpreadsheet
                      color={twInstance.color('text-emerald-600 dark:text-emerald-400')}
                      size={24}
                    />
                  </View>
                  <View style={tw('flex-1')}>
                    <Text
                      style={tw('text-xs font-bold text-slate-900 dark:text-white mb-0.5')}
                      numberOfLines={1}
                    >
                      {exportedResult.name}
                    </Text>
                    <Text style={tw('text-[11px] text-slate-500 dark:text-slate-400')}>
                      {exportedResult.size} • {t('mobile.excel_saved_desc', 'Sẵn sàng lưu hoặc gửi')}
                    </Text>
                  </View>
                </View>

                <View style={tw('w-full gap-2.5 pt-2')}>
                  {!remoteDownloadUrl ? (
                    <TouchableOpacity
                      onPress={() => setShowPreview(true)}
                      style={tw(
                        'w-full py-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500 items-center flex-row justify-center active:opacity-80'
                      )}
                    >
                      <Eye
                        color={twInstance.color('text-emerald-600 dark:text-emerald-400')}
                        size={16}
                        style={tw('mr-1.5')}
                      />
                      <Text style={tw('text-emerald-700 dark:text-emerald-300 font-bold text-sm')}>
                        {t('mobile.preview_spreadsheet_data', 'Xem trước dữ liệu')}
                      </Text>
                    </TouchableOpacity>
                  ) : null}

                  <View style={tw('flex-row gap-3')}>
                    <TouchableOpacity
                      onPress={() => void handleSaveToDevice()}
                      disabled={isSaving}
                      style={tw(
                        'flex-1 py-3.5 rounded-xl bg-emerald-600 items-center flex-row justify-center active:opacity-80'
                      )}
                    >
                      {isSaving ? (
                        <ActivityIndicator color="#ffffff" size="small" />
                      ) : (
                        <>
                          <Download color="#ffffff" size={16} style={tw('mr-1.5')} />
                          <Text style={tw('text-white font-bold text-sm')}>
                            {t('mobile.save_to_device', 'Lưu về máy')}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => void handleShare()}
                      disabled={isSharing}
                      style={tw(
                        'flex-1 py-3.5 rounded-xl border border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 items-center flex-row justify-center active:opacity-80'
                      )}
                    >
                      {isSharing ? (
                        <ActivityIndicator color="#059669" size="small" />
                      ) : (
                        <>
                          <Share2
                            color={twInstance.color('text-emerald-600 dark:text-emerald-400')}
                            size={16}
                            style={tw('mr-1.5')}
                          />
                          <Text style={tw('text-emerald-700 dark:text-emerald-300 font-bold text-sm')}>
                            {t('mobile.share_report', 'Chia sẻ')}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    onPress={handleClose}
                    style={tw(
                      'w-full bg-slate-100 dark:bg-slate-800 py-3 rounded-xl items-center justify-center'
                    )}
                  >
                    <Text style={tw('text-slate-700 dark:text-slate-300 font-bold text-sm')}>
                      {t('mobile.done', 'Hoàn tất')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )
          ) : (
            <>
              <ScrollView contentContainerStyle={tw('p-5 gap-4')} showsVerticalScrollIndicator={false}>
                {/* Time Period */}
                <View>
                  <Text
                    style={tw(
                      'text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2'
                    )}
                  >
                    {t('mobile.time_period', 'Khoảng thời gian')}
                  </Text>
                  <View style={tw('flex-row gap-2')}>
                    {ranges.map((r) => (
                      <TouchableOpacity
                        key={r.id}
                        onPress={() => setTimeRange(r.id)}
                        style={tw(
                          `flex-1 py-3 px-1 rounded-xl border items-center justify-center ${
                            timeRange === r.id
                              ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40'
                              : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950'
                          }`
                        )}
                      >
                        <Text
                          numberOfLines={1}
                          adjustsFontSizeToFit={true}
                          minimumFontScale={0.75}
                          style={tw(
                            `text-xs font-bold text-center ${
                              timeRange === r.id
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-slate-600 dark:text-slate-400'
                            }`
                          )}
                        >
                          {r.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Document Format */}
                <View>
                  <Text
                    style={tw(
                      'text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2'
                    )}
                  >
                    {t('mobile.export_format', 'Định dạng xuất')}
                  </Text>
                  <View style={tw('flex-row gap-2')}>
                    {(
                      [
                        { id: 'xlsx', label: 'Excel' },
                        { id: 'pdf', label: 'PDF' },
                        ...(reportId ? [{ id: 'csv' as const, label: 'CSV' }] : []),
                      ] as Array<{ id: 'xlsx' | 'pdf' | 'csv'; label: string }>
                    ).map((item) => (
                      <TouchableOpacity
                        key={item.id}
                        onPress={() => setFormat(item.id)}
                        style={tw(
                          `flex-1 py-3 rounded-xl border items-center flex-row justify-center gap-1.5 ${
                            format === item.id
                              ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40'
                              : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950'
                          }`
                        )}
                      >
                        {item.id === 'xlsx' ? (
                          <FileSpreadsheet
                            size={16}
                            color={
                              format === item.id
                                ? '#059669'
                                : twInstance.color('text-slate-400')
                            }
                          />
                        ) : (
                          <FileText
                            size={16}
                            color={
                              format === item.id
                                ? '#059669'
                                : twInstance.color('text-slate-400')
                            }
                          />
                        )}
                        <Text
                          style={tw(
                            `text-xs font-bold ${
                              format === item.id
                                ? 'text-emerald-700 dark:text-emerald-300'
                                : 'text-slate-600 dark:text-slate-400'
                            }`
                          )}
                        >
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Inclusions (for Excel / Client PDF) */}
                {format !== 'csv' ? (
                  <View>
                    <Text
                      style={tw(
                        'text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2'
                      )}
                    >
                      {t('mobile.report_inclusions', 'Thành phần báo cáo')}
                    </Text>
                    <View style={tw('gap-2')}>
                      <TouchableOpacity
                        onPress={() => setIncludeAiSummary(!includeAiSummary)}
                        style={tw(
                          'p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex-row items-center justify-between'
                        )}
                      >
                        <View style={tw('flex-row items-center flex-1 mr-2')}>
                          <Sparkles color="#10b981" size={16} style={tw('mr-2.5')} />
                          <Text style={tw('text-xs font-semibold text-slate-800 dark:text-slate-200')}>
                            {t('mobile.include_ai_summary', 'Đính kèm tóm tắt AI')}
                          </Text>
                        </View>
                        <View
                          style={tw(
                            `w-5 h-5 rounded-md border items-center justify-center ${
                              includeAiSummary ? 'bg-emerald-600 border-emerald-600' : 'border-slate-400'
                            }`
                          )}
                        >
                          {includeAiSummary && <CheckCircle color="#ffffff" size={14} />}
                        </View>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => setIncludeCharts(!includeCharts)}
                        style={tw(
                          'p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex-row items-center justify-between'
                        )}
                      >
                        <View style={tw('flex-row items-center flex-1 mr-2')}>
                          <LineChart color="#10b981" size={16} style={tw('mr-2.5')} />
                          <Text style={tw('text-xs font-semibold text-slate-800 dark:text-slate-200')}>
                            {t('mobile.include_vital_data', 'Đính kèm bảng chỉ số chi tiết')}
                          </Text>
                        </View>
                        <View
                          style={tw(
                            `w-5 h-5 rounded-md border items-center justify-center ${
                              includeCharts ? 'bg-emerald-600 border-emerald-600' : 'border-slate-400'
                            }`
                          )}
                        >
                          {includeCharts && <CheckCircle color="#ffffff" size={14} />}
                        </View>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => setIncludeAlerts(!includeAlerts)}
                        style={tw(
                          'p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex-row items-center justify-between'
                        )}
                      >
                        <View style={tw('flex-row items-center flex-1 mr-2')}>
                          <ShieldCheck color="#f59e0b" size={16} style={tw('mr-2.5')} />
                          <Text style={tw('text-xs font-semibold text-slate-800 dark:text-slate-200')}>
                            {t('mobile.include_alerts_log', 'Đính kèm nhật ký cảnh báo')}
                          </Text>
                        </View>
                        <View
                          style={tw(
                            `w-5 h-5 rounded-md border items-center justify-center ${
                              includeAlerts ? 'bg-emerald-600 border-emerald-600' : 'border-slate-400'
                            }`
                          )}
                        >
                          {includeAlerts && <CheckCircle color="#ffffff" size={14} />}
                        </View>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : null}
              </ScrollView>

              <View
                style={tw(
                  'p-4 border-t border-slate-100 dark:border-slate-800 flex-row gap-3'
                )}
              >
                <TouchableOpacity
                  onPress={handleClose}
                  style={tw('flex-1 bg-slate-100 dark:bg-slate-800 py-3.5 rounded-xl items-center')}
                >
                  <Text style={tw('text-slate-700 dark:text-slate-300 font-bold text-sm')}>
                    {t('mobile.cancel', 'Hủy')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => void handleExport()}
                  disabled={isExporting}
                  style={tw(
                    `flex-1 bg-emerald-600 py-3.5 rounded-xl items-center flex-row justify-center active:opacity-80 ${
                      isExporting ? 'opacity-70' : ''
                    }`
                  )}
                >
                  {isExporting ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <>
                      <FileSpreadsheet color="#ffffff" size={16} style={tw('mr-1.5')} />
                      <Text style={tw('text-white font-bold text-sm')}>
                        {t('mobile.export_excel', 'Xuất báo cáo')}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
        <AppModalToast visible={visible} />
      </View>
    </Modal>
  );
};
