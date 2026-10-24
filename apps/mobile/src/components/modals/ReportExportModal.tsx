import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { X, FileText, Download, CheckCircle, Sparkles, LineChart, ShieldCheck, Share2, CheckCircle2 } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import * as Sharing from 'expo-sharing';
import { tw, twInstance } from '@/tw';
import { exportAndShareHealthReport } from '@/services/nativeMedia';

interface ReportExportModalProps {
  visible: boolean;
  onClose: () => void;
  onExportReport?: (options: {
    timeRange: string;
    format: 'pdf' | 'csv';
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
  const { t, i18n } = useTranslation();
  const isVi = i18n.language === 'vi';

  const [timeRange, setTimeRange] = useState<string>(defaultTimeRange);
  const [format, setFormat] = useState<'pdf' | 'csv'>('pdf');
  const [includeAiSummary, setIncludeAiSummary] = useState(true);
  const [includeCharts, setIncludeCharts] = useState(true);
  const [includeAlerts, setIncludeAlerts] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [exportedResult, setExportedResult] = useState<{ uri: string; name: string } | null>(null);

  const ranges = [
    { id: '7d', label: t('mobile.7_days', '7 Days') },
    { id: '30d', label: t('mobile.30_days', '30 Days') },
    { id: '90d', label: t('mobile.90_days', '90 Days') },
  ];

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const uri = await exportAndShareHealthReport({
        timeRange,
        format,
        includeAiSummary,
        includeCharts,
        includeAlerts,
      });

      if (uri) {
        const ext = format === 'csv' ? 'csv' : (uri.endsWith('.html') ? 'html' : 'pdf');
        const fileName = `Health_Report_${timeRange.toUpperCase()}.${ext}`;
        setExportedResult({ uri, name: fileName });

        Toast.show({
          type: 'success',
          text1: t('mobile.report_exported', 'Report Generated'),
          text2: fileName,
        });
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
      console.warn('Export operation caught error:', err);
      Toast.show({
        type: 'error',
        text1: t('mobile.error', 'Error'),
        text2: 'Failed to export document',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleShareAgain = async () => {
    if (!exportedResult?.uri) return;
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(exportedResult.uri, {
          mimeType: exportedResult.uri.endsWith('.pdf') ? 'application/pdf' : exportedResult.uri.endsWith('.csv') ? 'text/csv' : 'text/html',
          dialogTitle: exportedResult.name,
        });
      }
    } catch (err) {
      console.warn('Share again error:', err);
    }
  };

  const handleClose = () => {
    setExportedResult(null);
    onClose();
  };

  return (
    <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={handleClose}>
      <View style={tw('flex-1 justify-end bg-black/60')}>
        <View style={tw('bg-white dark:bg-slate-900 rounded-t-3xl max-h-[88%] border-t border-slate-200 dark:border-slate-800')}>
          {/* Header */}
          <View style={tw('p-5 border-b border-slate-100 dark:border-slate-800 flex-row items-center justify-between')}>
            <View style={tw('flex-row items-center')}>
              <View style={tw('w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-900/40 items-center justify-center mr-3')}>
                <FileText color={twInstance.color('text-indigo-600 dark:text-indigo-400')} size={22} />
              </View>
              <View>
                <Text style={tw('text-lg font-bold text-slate-900 dark:text-white')}>
                  {t('mobile.export_health_report', 'Export Health Report')}
                </Text>
                <Text style={tw('text-xs text-slate-500 dark:text-slate-400')}>
                  {t('mobile.export_report_desc', 'Generate certified PDF or raw dataset')}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={handleClose} style={tw('p-2 rounded-full bg-slate-100 dark:bg-slate-800')}>
              <X color={twInstance.color('text-slate-600 dark:text-slate-300')} size={20} />
            </TouchableOpacity>
          </View>

          {/* Success State View */}
          {exportedResult ? (
            <View style={tw('p-6 items-center gap-4')}>
              <View style={tw('w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/50 items-center justify-center border-4 border-emerald-50 dark:border-emerald-900/40')}>
                <CheckCircle2 color="#10b981" size={32} />
              </View>

              <View style={tw('items-center')}>
                <Text style={tw('text-lg font-bold text-slate-900 dark:text-white text-center')}>
                  {t('mobile.export_success_title', 'Report Ready')}
                </Text>
                <Text style={tw('text-xs text-slate-500 dark:text-slate-400 text-center mt-1 px-4')}>
                  {t('mobile.export_success_desc', 'Clinical health report has been generated successfully.')}
                </Text>
              </View>

              {/* File details card */}
              <View style={tw('w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex-row items-center gap-3 my-2')}>
                <View style={tw('w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 items-center justify-center')}>
                  <FileText color={twInstance.color('text-indigo-600 dark:text-indigo-400')} size={24} />
                </View>
                <View style={tw('flex-1')}>
                  <Text style={tw('text-xs font-bold text-slate-900 dark:text-white mb-0.5')} numberOfLines={1}>
                    {exportedResult.name}
                  </Text>
                  <Text style={tw('text-[11px] text-slate-500 dark:text-slate-400')}>
                    {isVi ? 'Đã lưu vào bộ nhớ đệm thiết bị' : 'Saved to device cache'}
                  </Text>
                </View>
              </View>

              {/* Actions */}
              <View style={tw('w-full flex-row gap-3 pt-2')}>
                <TouchableOpacity
                  onPress={handleShareAgain}
                  style={tw('flex-1 py-3.5 rounded-xl border border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 items-center flex-row justify-center')}
                >
                  <Share2 color={twInstance.color('text-indigo-600 dark:text-indigo-400')} size={16} style={tw('mr-2')} />
                  <Text style={tw('text-indigo-700 dark:text-indigo-300 font-bold text-sm')}>
                    {t('mobile.share_again', 'Share Again')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleClose}
                  style={tw('flex-1 bg-brand py-3.5 rounded-xl items-center flex-row justify-center')}
                >
                  <Text style={tw('text-slate-900 font-bold text-sm')}>
                    {t('mobile.done', 'Done')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              <ScrollView contentContainerStyle={tw('p-5 gap-4')} showsVerticalScrollIndicator={false}>
                {/* Time Period */}
                <View>
                  <Text style={tw('text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2')}>
                    {t('mobile.time_period', 'Reporting Period')}
                  </Text>
                  <View style={tw('flex-row gap-2')}>
                    {ranges.map((r) => (
                      <TouchableOpacity
                        key={r.id}
                        onPress={() => setTimeRange(r.id)}
                        style={tw(
                          `flex-1 py-2.5 rounded-xl border items-center ${
                            timeRange === r.id
                              ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40'
                              : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950'
                          }`
                        )}
                      >
                        <Text
                          style={tw(
                            `text-xs font-bold ${
                              timeRange === r.id
                                ? 'text-indigo-600 dark:text-indigo-400'
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
                  <Text style={tw('text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2')}>
                    {t('mobile.export_format', 'Export Format')}
                  </Text>
                  <View style={tw('flex-row gap-3')}>
                    <TouchableOpacity
                      onPress={() => setFormat('pdf')}
                      style={tw(
                        `flex-1 p-3.5 rounded-2xl border ${
                          format === 'pdf'
                            ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40'
                            : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950'
                        }`
                      )}
                    >
                      <View style={tw('flex-row items-center justify-between mb-1.5')}>
                        <Text style={tw('font-bold text-slate-900 dark:text-white text-sm')}>{t('mobile.pdf_document', 'PDF Document')}</Text>
                        <View
                          style={tw(
                            `w-4 h-4 rounded-full border items-center justify-center ${
                              format === 'pdf' ? 'border-indigo-600 bg-indigo-600' : 'border-slate-400'
                            }`
                          )}
                        >
                          {format === 'pdf' && <View style={tw('w-1.5 h-1.5 rounded-full bg-white')} />}
                        </View>
                      </View>
                      <Text style={tw('text-[11px] text-slate-500 dark:text-slate-400 leading-4')}>
                        {t('mobile.pdf_format_desc', 'Formatted for doctor review & printing')}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => setFormat('csv')}
                      style={tw(
                        `flex-1 p-3.5 rounded-2xl border ${
                          format === 'csv'
                            ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40'
                            : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950'
                        }`
                      )}
                    >
                      <View style={tw('flex-row items-center justify-between mb-1.5')}>
                        <Text style={tw('font-bold text-slate-900 dark:text-white text-sm')}>{t('mobile.csv_dataset', 'CSV Dataset')}</Text>
                        <View
                          style={tw(
                            `w-4 h-4 rounded-full border items-center justify-center ${
                              format === 'csv' ? 'border-indigo-600 bg-indigo-600' : 'border-slate-400'
                            }`
                          )}
                        >
                          {format === 'csv' && <View style={tw('w-1.5 h-1.5 rounded-full bg-white')} />}
                        </View>
                      </View>
                      <Text style={tw('text-[11px] text-slate-500 dark:text-slate-400 leading-4')}>
                        {t('mobile.csv_format_desc', 'Raw vital signs & biometric data')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Report Inclusions */}
                <View>
                  <Text style={tw('text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2')}>
                    {t('mobile.report_inclusions', 'Include in Report')}
                  </Text>
                  <View style={tw('gap-2')}>
                    <TouchableOpacity
                      onPress={() => setIncludeAiSummary(!includeAiSummary)}
                      style={tw('p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex-row items-center justify-between')}
                    >
                      <View style={tw('flex-row items-center flex-1 mr-2')}>
                        <Sparkles color="#6366f1" size={16} style={tw('mr-2.5')} />
                        <Text style={tw('text-xs font-semibold text-slate-800 dark:text-slate-200')}>
                          {t('mobile.include_ai_summary', 'AI Health Summary & Insights')}
                        </Text>
                      </View>
                      <View
                        style={tw(
                          `w-5 h-5 rounded-md border items-center justify-center ${
                            includeAiSummary ? 'bg-indigo-600 border-indigo-600' : 'border-slate-400'
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
                          {t('mobile.include_vital_charts', 'Vital Sign Trend Charts')}
                        </Text>
                      </View>
                      <View
                        style={tw(
                          `w-5 h-5 rounded-md border items-center justify-center ${
                            includeCharts ? 'bg-indigo-600 border-indigo-600' : 'border-slate-400'
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
                          {t('mobile.include_alerts_log', 'Alert History & Clinical Notes')}
                        </Text>
                      </View>
                      <View
                        style={tw(
                          `w-5 h-5 rounded-md border items-center justify-center ${
                            includeAlerts ? 'bg-indigo-600 border-indigo-600' : 'border-slate-400'
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
                  <Text style={tw('text-slate-700 dark:text-slate-300 font-bold text-sm')}>{t('mobile.cancel', 'Cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleExport}
                  disabled={isExporting}
                  style={tw('flex-1 bg-indigo-600 py-3.5 rounded-xl items-center flex-row justify-center active:opacity-80')}
                >
                  {isExporting ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <>
                      <Download color="#ffffff" size={16} style={tw('mr-1.5')} />
                      <Text style={tw('text-white font-bold text-sm')}>
                        {format === 'pdf' ? t('mobile.generate_export', 'Download PDF') : 'Export CSV'}
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
