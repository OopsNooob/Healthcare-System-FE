import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { X, FileSpreadsheet, Download, CheckCircle, Sparkles, LineChart, ShieldCheck, Share2, CheckCircle2, Eye } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { tw, twInstance } from '@/tw';
import { generateHealthReport, saveReportToDevice, shareReportFile, GeneratedReport } from '@/services/nativeMedia';

interface ReportExportModalProps {
  visible: boolean;
  onClose: () => void;
  onExportReport?: (options: {
    timeRange: string;
    format: 'xlsx' | 'csv';
    includeAiSummary: boolean;
    includeCharts: boolean;
    includeAlerts: boolean;
  }) => void;
  defaultTimeRange?: '7d' | '30d' | '90d';
}

export const ReportExportModal: React.FC<ReportExportModalProps> = ({
  visible,
  onClose,
  onExportReport,
  defaultTimeRange = '7d',
}) => {
  const { t } = useTranslation();

  const [timeRange, setTimeRange] = useState<string>(defaultTimeRange);
  const [includeAiSummary, setIncludeAiSummary] = useState(true);
  const [includeCharts, setIncludeCharts] = useState(true);
  const [includeAlerts, setIncludeAlerts] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [exportedResult, setExportedResult] = useState<GeneratedReport | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const ranges = [
    { id: '7d', label: t('mobile.days_7') },
    { id: '30d', label: t('mobile.days_30') },
    { id: '90d', label: t('mobile.days_90') },
  ];

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const result = await generateHealthReport({
        timeRange,
        format: 'xlsx',
        includeAiSummary,
        includeCharts,
        includeAlerts,
      });

      if (result) {
        setExportedResult(result);

        Toast.show({
          type: 'success',
          text1: t('mobile.report_exported'),
          text2: result.name,
        });
      }

      if (onExportReport) {
        onExportReport({
          timeRange,
          format: 'xlsx',
          includeAiSummary,
          includeCharts,
          includeAlerts,
        });
      }
    } catch (err) {
      console.warn('Export operation caught error:', err);
      Toast.show({
        type: 'error',
        text1: t('mobile.error'),
        text2: t('mobile.export_error_desc'),
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleSaveToDevice = async () => {
    if (!exportedResult) return;
    setIsSaving(true);
    try {
      await saveReportToDevice(exportedResult.uri, exportedResult.name, exportedResult.mimeType);
    } catch (err) {
      console.warn('handleSaveToDevice error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleShare = async () => {
    if (!exportedResult) return;
    setIsSharing(true);
    try {
      await shareReportFile(exportedResult.uri, exportedResult.name, exportedResult.mimeType);
    } catch (err) {
      console.warn('handleShare error:', err);
    } finally {
      setIsSharing(false);
    }
  };

  const handleClose = () => {
    setShowPreview(false);
    setExportedResult(null);
    onClose();
  };

  return (
    <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={handleClose}>
      <View style={tw('flex-1 justify-end bg-black/60')}>
        <View style={tw('bg-white dark:bg-slate-900 rounded-t-3xl max-h-[88%] border-t border-slate-200 dark:border-slate-800')}>
          {/* Header */}
          <View style={tw('p-5 border-b border-slate-100 dark:border-slate-800 flex-row items-center justify-between')}>
            <View style={tw('flex-row items-center flex-1 pr-2')}>
              <View style={tw('w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 items-center justify-center mr-3')}>
                <FileSpreadsheet color={twInstance.color('text-emerald-600 dark:text-emerald-400')} size={22} />
              </View>
              <View style={tw('flex-1')}>
                <Text style={tw('text-lg font-bold text-slate-900 dark:text-white')} numberOfLines={1}>
                  {showPreview
                    ? t('mobile.spreadsheet_preview_title')
                    : t('mobile.export_excel_title')}
                </Text>
                <Text style={tw('text-xs text-slate-500 dark:text-slate-400 leading-4 mt-0.5')}>
                  {showPreview
                    ? t('mobile.spreadsheet_preview_subtitle')
                    : t('mobile.export_excel_desc')}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={handleClose} style={tw('p-2 rounded-full bg-slate-100 dark:bg-slate-800')}>
              <X color={twInstance.color('text-slate-600 dark:text-slate-300')} size={20} />
            </TouchableOpacity>
          </View>

          {/* Success State View */}
          {exportedResult ? (
            showPreview ? (
              /* Spreadsheet In-App Preview */
              <View style={tw('p-5 max-h-[75%]')}>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={tw('gap-4 pb-4')}>
                  {/* Metadata Summary Banner */}
                  <View style={tw('p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800')}>
                    <View style={tw('flex-row justify-between mb-1')}>
                      <Text style={tw('text-xs text-slate-500 dark:text-slate-400')}>{t('mobile.patient_label_colon')}</Text>
                      <Text style={tw('text-xs font-bold text-slate-800 dark:text-slate-200')}>Nguyễn Văn An (HS-8921-2026)</Text>
                    </View>
                    <View style={tw('flex-row justify-between mb-1')}>
                      <Text style={tw('text-xs text-slate-500 dark:text-slate-400')}>{t('mobile.period_label_colon')}</Text>
                      <Text style={tw('text-xs font-bold text-emerald-600 dark:text-emerald-400')}>
                        {timeRange === '7d' ? t('mobile.days_7') : timeRange === '30d' ? t('mobile.days_30') : t('mobile.days_90')}
                      </Text>
                    </View>
                    <View style={tw('flex-row justify-between')}>
                      <Text style={tw('text-xs text-slate-500 dark:text-slate-400')}>{t('mobile.filename_label_colon')}</Text>
                      <Text style={tw('text-xs font-mono text-slate-700 dark:text-slate-300')}>{exportedResult.name}</Text>
                    </View>
                  </View>

                  {/* AI Summary Box */}
                  {includeAiSummary && (
                    <View style={tw('p-3.5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40')}>
                      <View style={tw('flex-row items-center gap-1.5 mb-1.5')}>
                        <Sparkles color="#10b981" size={15} />
                        <Text style={tw('text-xs font-bold text-emerald-800 dark:text-emerald-300')}>
                          {t('mobile.ai_clinical_summary')}
                        </Text>
                      </View>
                      <Text style={tw('text-xs text-slate-700 dark:text-slate-300 leading-5')}>
                        {t('mobile.spreadsheet_ai_summary_sample')}
                      </Text>
                    </View>
                  )}

                  {/* Telemetry Table */}
                  <View>
                    <Text style={tw('text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2')}>
                      {t('mobile.detailed_vital_telemetry')}
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View style={tw('rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden')}>
                        {/* Table Header */}
                        <View style={tw('flex-row bg-slate-100 dark:bg-slate-800 p-2.5 border-b border-slate-200 dark:border-slate-700')}>
                          <Text style={tw('w-28 text-[11px] font-bold text-slate-700 dark:text-slate-300')}>{t('mobile.table_col_time')}</Text>
                          <Text style={tw('w-24 text-[11px] font-bold text-slate-700 dark:text-slate-300')}>{t('mobile.blood_pressure')}</Text>
                          <Text style={tw('w-24 text-[11px] font-bold text-slate-700 dark:text-slate-300')}>{t('mobile.blood_glucose')}</Text>
                          <Text style={tw('w-20 text-[11px] font-bold text-slate-700 dark:text-slate-300')}>{t('mobile.heart_rate')}</Text>
                          <Text style={tw('w-28 text-[11px] font-bold text-slate-700 dark:text-slate-300')}>{t('mobile.table_col_assessment')}</Text>
                        </View>
                        {/* Table Rows */}
                        {[
                          { time: '17/10 08:00', bp: '120/80', glucose: '102 mg/dL', hr: '74 bpm', eval: t('mobile.eval_normal'), type: 'good' },
                          { time: '16/10 08:15', bp: '124/82', glucose: '108 mg/dL', hr: '78 bpm', eval: t('mobile.eval_normal'), type: 'good' },
                          { time: '15/10 08:00', bp: '138/88', glucose: '125 mg/dL', hr: '82 bpm', eval: t('mobile.eval_elevated'), type: 'warning' },
                          { time: '14/10 08:30', bp: '122/80', glucose: '98 mg/dL', hr: '72 bpm', eval: t('mobile.eval_target'), type: 'good' },
                          { time: '13/10 08:00', bp: '118/78', glucose: '95 mg/dL', hr: '70 bpm', eval: t('mobile.eval_optimal'), type: 'good' },
                          { time: '12/10 08:00', bp: '121/80', glucose: '101 mg/dL', hr: '73 bpm', eval: t('mobile.eval_normal'), type: 'good' },
                          { time: '11/10 08:00', bp: '125/82', glucose: '105 mg/dL', hr: '75 bpm', eval: t('mobile.eval_normal'), type: 'good' },
                        ].map((row, idx) => (
                          <View
                            key={idx}
                            style={tw(
                              `flex-row p-2.5 border-b border-slate-100 dark:border-slate-800/60 ${
                                idx % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/50 dark:bg-slate-950'
                              }`
                            )}
                          >
                            <Text style={tw('w-28 text-[11px] text-slate-600 dark:text-slate-400')}>{row.time}</Text>
                            <Text style={tw('w-24 text-[11px] font-semibold text-slate-800 dark:text-slate-200')}>{row.bp}</Text>
                            <Text style={tw('w-24 text-[11px] text-slate-700 dark:text-slate-300')}>{row.glucose}</Text>
                            <Text style={tw('w-20 text-[11px] text-slate-700 dark:text-slate-300')}>{row.hr}</Text>
                            <Text
                              style={tw(
                                `w-28 text-[11px] font-bold ${
                                  row.type === 'warning' ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
                                }`
                              )}
                            >
                              {row.eval}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </ScrollView>
                  </View>

                  {/* Actions inside Preview */}
                  <View style={tw('flex-row gap-3 pt-2')}>
                    <TouchableOpacity
                      onPress={() => setShowPreview(false)}
                      style={tw('flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 items-center justify-center')}
                    >
                      <Text style={tw('text-slate-700 dark:text-slate-300 font-bold text-sm')}>
                        {t('mobile.back')}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={handleShare}
                      style={tw('flex-1 py-3 rounded-xl bg-emerald-600 items-center flex-row justify-center active:opacity-80')}
                    >
                      <Share2 color="#ffffff" size={16} style={tw('mr-1.5')} />
                      <Text style={tw('text-white font-bold text-sm')}>{t('mobile.share_report')}</Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </View>
            ) : (
              <View style={tw('p-6 items-center gap-4')}>
                <View style={tw('w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/50 items-center justify-center border-4 border-emerald-50 dark:border-emerald-900/40')}>
                  <CheckCircle2 color="#10b981" size={32} />
                </View>

                <View style={tw('items-center')}>
                  <Text style={tw('text-lg font-bold text-slate-900 dark:text-white text-center')}>
                    {t('mobile.export_excel_success_title')}
                  </Text>
                  <Text style={tw('text-xs text-slate-500 dark:text-slate-400 text-center mt-1 px-4')}>
                    {t('mobile.export_excel_success_desc')}
                  </Text>
                </View>

                {/* File details card */}
                <View style={tw('w-full p-4 rounded-2xl bg-emerald-50/50 dark:bg-slate-950 border border-emerald-200 dark:border-emerald-900/50 flex-row items-center gap-3 my-2')}>
                  <View style={tw('w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 items-center justify-center')}>
                    <FileSpreadsheet color={twInstance.color('text-emerald-600 dark:text-emerald-400')} size={24} />
                  </View>
                  <View style={tw('flex-1')}>
                    <Text style={tw('text-xs font-bold text-slate-900 dark:text-white mb-0.5')} numberOfLines={1}>
                      {exportedResult.name}
                    </Text>
                    <Text style={tw('text-[11px] text-slate-500 dark:text-slate-400')}>
                      {exportedResult.size} • {t('mobile.excel_saved_desc')}
                    </Text>
                  </View>
                </View>

                {/* Actions */}
                <View style={tw('w-full gap-2.5 pt-2')}>
                  {/* Quick Preview Button */}
                  <TouchableOpacity
                    onPress={() => setShowPreview(true)}
                    style={tw('w-full py-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500 items-center flex-row justify-center active:opacity-80')}
                  >
                    <Eye color={twInstance.color('text-emerald-600 dark:text-emerald-400')} size={16} style={tw('mr-1.5')} />
                    <Text style={tw('text-emerald-700 dark:text-emerald-300 font-bold text-sm')}>
                      {t('mobile.preview_spreadsheet_data')}
                    </Text>
                  </TouchableOpacity>

                  <View style={tw('flex-row gap-3')}>
                    <TouchableOpacity
                      onPress={handleSaveToDevice}
                      disabled={isSaving}
                      style={tw('flex-1 py-3.5 rounded-xl bg-emerald-600 items-center flex-row justify-center active:opacity-80')}
                    >
                      {isSaving ? (
                        <ActivityIndicator color="#ffffff" size="small" />
                      ) : (
                        <>
                          <Download color="#ffffff" size={16} style={tw('mr-1.5')} />
                          <Text style={tw('text-white font-bold text-sm')}>
                            {t('mobile.save_to_device')}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={handleShare}
                      disabled={isSharing}
                      style={tw('flex-1 py-3.5 rounded-xl border border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 items-center flex-row justify-center active:opacity-80')}
                    >
                      {isSharing ? (
                        <ActivityIndicator color="#059669" size="small" />
                      ) : (
                        <>
                          <Share2 color={twInstance.color('text-emerald-600 dark:text-emerald-400')} size={16} style={tw('mr-1.5')} />
                          <Text style={tw('text-emerald-700 dark:text-emerald-300 font-bold text-sm')}>
                            {t('mobile.share_report')}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    onPress={handleClose}
                    style={tw('w-full bg-slate-100 dark:bg-slate-800 py-3 rounded-xl items-center justify-center')}
                  >
                    <Text style={tw('text-slate-700 dark:text-slate-300 font-bold text-sm')}>
                      {t('mobile.done')}
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
                  <Text style={tw('text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2')}>
                    {t('mobile.time_period')}
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

                {/* Document Format Info */}
                <View>
                  <Text style={tw('text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2')}>
                    {t('mobile.export_format')}
                  </Text>
                  <View style={tw('p-3.5 rounded-2xl border border-emerald-300 dark:border-emerald-800/80 bg-emerald-50/60 dark:bg-emerald-950/30 flex-row items-center gap-3')}>
                    <View style={tw('w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 items-center justify-center')}>
                      <FileSpreadsheet color={twInstance.color('text-emerald-600 dark:text-emerald-400')} size={20} />
                    </View>
                    <View style={tw('flex-1')}>
                      <Text style={tw('font-bold text-slate-900 dark:text-white text-sm')}>
                        {t('mobile.excel_format_name')}
                      </Text>
                      <Text style={tw('text-[11px] text-slate-500 dark:text-slate-400 leading-4 mt-0.5')}>
                        {t('mobile.excel_format_desc')}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Report Inclusions */}
                <View>
                  <Text style={tw('text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2')}>
                    {t('mobile.report_inclusions')}
                  </Text>
                  <View style={tw('gap-2')}>
                    <TouchableOpacity
                      onPress={() => setIncludeAiSummary(!includeAiSummary)}
                      style={tw('p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex-row items-center justify-between')}
                    >
                      <View style={tw('flex-row items-center flex-1 mr-2')}>
                        <Sparkles color="#10b981" size={16} style={tw('mr-2.5')} />
                        <Text style={tw('text-xs font-semibold text-slate-800 dark:text-slate-200')}>
                          {t('mobile.include_ai_summary')}
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
                      style={tw('p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex-row items-center justify-between')}
                    >
                      <View style={tw('flex-row items-center flex-1 mr-2')}>
                        <LineChart color="#10b981" size={16} style={tw('mr-2.5')} />
                        <Text style={tw('text-xs font-semibold text-slate-800 dark:text-slate-200')}>
                          {t('mobile.include_vital_data')}
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
                      style={tw('p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex-row items-center justify-between')}
                    >
                      <View style={tw('flex-row items-center flex-1 mr-2')}>
                        <ShieldCheck color="#f59e0b" size={16} style={tw('mr-2.5')} />
                        <Text style={tw('text-xs font-semibold text-slate-800 dark:text-slate-200')}>
                          {t('mobile.include_alerts_log')}
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
              </ScrollView>

              {/* Footer Actions */}
              <View style={tw('p-4 border-t border-slate-100 dark:border-slate-800 flex-row gap-3')}>
                <TouchableOpacity onPress={handleClose} style={tw('flex-1 bg-slate-100 dark:bg-slate-800 py-3.5 rounded-xl items-center')}>
                  <Text style={tw('text-slate-700 dark:text-slate-300 font-bold text-sm')}>{t('mobile.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleExport}
                  disabled={isExporting}
                  style={tw('flex-1 bg-emerald-600 py-3.5 rounded-xl items-center flex-row justify-center active:opacity-80')}
                >
                  {isExporting ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <>
                      <FileSpreadsheet color="#ffffff" size={16} style={tw('mr-1.5')} />
                      <Text style={tw('text-white font-bold text-sm')}>
                        {t('mobile.export_excel')}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};
