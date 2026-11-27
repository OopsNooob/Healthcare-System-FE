import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  X,
  FileDown,
  ShieldCheck,
  Clock,
  Download,
  Info,
} from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { mobileApi, normalizePaginatedList, useSharedAuthStore } from '@repo/shared-hooks';
import { tw, twInstance } from '@/tw';
import { AppModalToast } from '@/components/ui/AppToast';
import { useThemeContext } from '@/context/ThemeContext';
import { Skeleton } from '@/components/ui/Skeleton';
import { extractApiErrorMessage } from '@/utils/apiError';

interface PrivacyDataModalProps {
  visible: boolean;
  onClose: () => void;
}

interface DataSummaryState {
  metricsCount: number;
  consultationsCount: number;
  enrollmentsCount: number;
  reportsCount: number;
  latestEnrollmentId?: string;
}

export const PrivacyDataModal: React.FC<PrivacyDataModalProps> = ({ visible, onClose }) => {
  const { t } = useTranslation();
  useThemeContext();
  const user = useSharedAuthStore((s) => s.user);
  const dateLocale = t('mobile.date_locale', 'vi-VN');

  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [summary, setSummary] = useState<DataSummaryState | null>(null);
  const [lastExportAt, setLastExportAt] = useState<string | null>(null);

  const loadSummary = useCallback(async () => {
    setIsLoadingSummary(true);
    try {
      const [, metricsRes, consultRes, enrollRes] = await Promise.allSettled([
        mobileApi.patientProfileGetProfile(),
        mobileApi.healthMetricsFindAll({ query: { page: 1, limit: 20 } }),
        mobileApi.consultationsFindAll({ query: { page: 1, limit: 20 } }),
        mobileApi.careEnrollmentList({ query: { page: 1, limit: 10 } }),
      ]);

      const metricsPage =
        metricsRes.status === 'fulfilled' ? normalizePaginatedList(metricsRes.value, 1, 20) : { items: [], total: 0 };
      const consultPage =
        consultRes.status === 'fulfilled' ? normalizePaginatedList(consultRes.value, 1, 20) : { items: [], total: 0 };
      const enrollPage =
        enrollRes.status === 'fulfilled' ? normalizePaginatedList(enrollRes.value, 1, 10) : { items: [], total: 0 };

      const firstEnrollment = enrollPage.items[0] as { id?: string; _id?: string } | undefined;
      const firstEnrollmentId = firstEnrollment?.id || firstEnrollment?._id;
      const reportsVal = firstEnrollmentId
        ? await mobileApi
            .careReportList({ params: { id: firstEnrollmentId }, query: {} })
            .catch(() => null)
        : null;
      const reportsPage = reportsVal
        ? normalizePaginatedList(reportsVal, 1, 10)
        : { items: [], total: 0 };

      setSummary({
        metricsCount: metricsPage.total || metricsPage.items.length,
        consultationsCount: consultPage.total || consultPage.items.length,
        enrollmentsCount: enrollPage.total || enrollPage.items.length,
        reportsCount: reportsPage.total || reportsPage.items.length,
        latestEnrollmentId: firstEnrollmentId,
      });
    } finally {
      setIsLoadingSummary(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      void loadSummary();
    }
  }, [visible, loadSummary]);

  const handleDownloadExport = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const [meRes, patientRes, metricsRes, consultRes, enrollRes] = await Promise.allSettled([
        mobileApi.usersGetMe(),
        mobileApi.patientProfileGetProfile(),
        mobileApi.healthMetricsFindAll({ query: { page: 1, limit: 50 } }),
        mobileApi.consultationsFindAll({ query: { page: 1, limit: 50 } }),
        mobileApi.careEnrollmentList({ query: { page: 1, limit: 20 } }),
      ]);

      const exportEnrollments =
        enrollRes.status === 'fulfilled' ? normalizePaginatedList(enrollRes.value, 1, 20).items : [];
      const firstExportEnrollment = exportEnrollments[0] as { id?: string; _id?: string } | undefined;
      const firstExportEnrollmentId = firstExportEnrollment?.id || firstExportEnrollment?._id;
      const reportsVal = firstExportEnrollmentId
        ? await mobileApi
            .careReportList({ params: { id: firstExportEnrollmentId }, query: {} })
            .catch(() => null)
        : null;

      const exportData = {
        exportedAt: new Date().toISOString(),
        format: 'JSON',
        scope: 'full_personal_health_record',
        user: meRes.status === 'fulfilled' ? meRes.value : user,
        patientProfile: patientRes.status === 'fulfilled' ? patientRes.value : null,
        healthMetrics:
          metricsRes.status === 'fulfilled' ? normalizePaginatedList(metricsRes.value, 1, 50).items : [],
        consultations:
          consultRes.status === 'fulfilled' ? normalizePaginatedList(consultRes.value, 1, 50).items : [],
        careEnrollments: exportEnrollments,
        careReports: reportsVal ? normalizePaginatedList(reportsVal, 1, 20).items : [],
      };

      const fileName = `Personal_Health_Data_${new Date().toISOString().split('T')[0]}.json`;
      const jsonString = JSON.stringify(exportData, null, 2);

      if (Platform.OS === 'android' && FileSystem.StorageAccessFramework) {
        try {
          const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
          if (permissions.granted) {
            const newFileUri = await FileSystem.StorageAccessFramework.createFileAsync(
              permissions.directoryUri,
              fileName,
              'application/json',
            );
            await FileSystem.writeAsStringAsync(newFileUri, jsonString, {
              encoding: FileSystem.EncodingType.UTF8,
            });
            setLastExportAt(new Date().toLocaleTimeString(dateLocale));
            Toast.show({
              type: 'success',
              text1: t('mobile.file_saved_to_folder', 'Saved to device'),
              text2: fileName,
            });
            return;
          }
          Toast.show({
            type: 'info',
            text1: t('mobile.folder_pick_cancelled', 'Cancelled'),
          });
          return;
        } catch (safErr) {
          console.warn('SAF fallback:', safErr);
        }
      }

      const localDirectory = FileSystem.documentDirectory || FileSystem.cacheDirectory;
      const fileUri = `${localDirectory}${fileName}`;
      await FileSystem.writeAsStringAsync(fileUri, jsonString, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/json',
          dialogTitle: t('mobile.select_save_folder', 'Save personal data export'),
        });
      }

      setLastExportAt(new Date().toLocaleTimeString(dateLocale));
      Toast.show({
        type: 'success',
        text1: t('mobile.file_saved_to_folder', 'Export Ready'),
        text2: fileName,
      });
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: t('mobile.download_error_title', 'Export Failed'),
        text2: extractApiErrorMessage(err),
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={tw('flex-1 justify-end bg-black/60')}>
        <View style={tw('bg-white dark:bg-slate-900 rounded-t-3xl max-h-[90%] border-t border-slate-200 dark:border-slate-800')}>
          <View style={tw('p-5 border-b border-slate-100 dark:border-slate-800 flex-row items-center justify-between')}>
            <View style={tw('flex-row items-center flex-1 mr-3')}>
              <View style={tw('w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-900/40 items-center justify-center mr-3')}>
                <FileDown color={twInstance.color('text-blue-600 dark:text-blue-400')} size={22} />
              </View>
              <View style={tw('flex-1')}>
                <Text style={tw('text-lg font-bold text-slate-900 dark:text-white')}>
                  {t('mobile.privacy_data_title', 'Privacy & Personal Data')}
                </Text>
                <Text style={tw('text-xs text-slate-500 dark:text-slate-400')}>
                  {t('mobile.privacy_data_subtitle', 'Export your health records and review account retention policy')}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={tw('p-2 rounded-full bg-slate-100 dark:bg-slate-800')}>
              <X color={twInstance.color('text-slate-600 dark:text-slate-300')} size={20} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={tw('p-5 gap-5')} showsVerticalScrollIndicator={false}>
            <View style={tw('bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800')}>
              <View style={tw('flex-row justify-between items-center mb-2')}>
                <Text style={tw('text-sm font-bold text-slate-900 dark:text-white')}>
                  {t('mobile.personal_data_export', 'Personal Health Data Export')}
                </Text>
                <TouchableOpacity
                  onPress={handleDownloadExport}
                  disabled={isExporting || isLoadingSummary}
                  style={tw('bg-emerald-600 px-3 py-1.5 rounded-xl flex-row items-center')}
                >
                  {isExporting ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <>
                      <Download color="#ffffff" size={14} style={tw('mr-1')} />
                      <Text style={tw('text-xs font-bold text-white')}>
                        {t('mobile.export_json', 'Export JSON')}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              <Text style={tw('text-xs text-slate-500 dark:text-slate-400 mb-3 leading-4')}>
                {t(
                  'mobile.export_policy_desc',
                  'Export a structured JSON copy of your profile, health metrics, consultations, and care reports directly to your device.',
                )}
              </Text>

              {isLoadingSummary ? (
                <View style={tw('gap-2')}>
                  <Skeleton className="h-12 w-full rounded-xl" />
                  <Skeleton className="h-12 w-full rounded-xl" />
                </View>
              ) : (
                <View style={tw('bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 gap-2')}>
                  <View style={tw('flex-row justify-between')}>
                    <Text style={tw('text-xs text-slate-500 dark:text-slate-400')}>
                      {t('mobile.health_metrics', 'Health Metrics')}
                    </Text>
                    <Text style={tw('text-xs font-bold text-slate-900 dark:text-white')}>
                      {summary?.metricsCount ?? 0}
                    </Text>
                  </View>
                  <View style={tw('flex-row justify-between')}>
                    <Text style={tw('text-xs text-slate-500 dark:text-slate-400')}>
                      {t('mobile.consultations', 'Consultations')}
                    </Text>
                    <Text style={tw('text-xs font-bold text-slate-900 dark:text-white')}>
                      {summary?.consultationsCount ?? 0}
                    </Text>
                  </View>
                  <View style={tw('flex-row justify-between')}>
                    <Text style={tw('text-xs text-slate-500 dark:text-slate-400')}>
                      {t('mobile.care_reports', 'Care Reports')}
                    </Text>
                    <Text style={tw('text-xs font-bold text-slate-900 dark:text-white')}>
                      {summary?.reportsCount ?? 0}
                    </Text>
                  </View>
                  {lastExportAt && (
                    <View style={tw('flex-row items-center pt-1 border-t border-slate-100 dark:border-slate-800')}>
                      <Clock color="#10b981" size={12} style={tw('mr-1.5')} />
                      <Text style={tw('text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold')}>
                        {t('mobile.last_exported', 'Last exported')}: {lastExportAt}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>

            <View style={tw('bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 gap-3')}>
              <View style={tw('flex-row items-center')}>
                <ShieldCheck color="#10b981" size={18} style={tw('mr-2')} />
                <Text style={tw('text-sm font-bold text-slate-900 dark:text-white flex-1')}>
                  {t('mobile.privacy_retention_title', 'Retention Policy & Account Support')}
                </Text>
              </View>

              <View style={tw('bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex-row items-start')}>
                <Info color={twInstance.color('text-slate-500 dark:text-slate-400')} size={15} style={tw('mt-0.5 mr-2 shrink-0')} />
                <Text style={tw('text-xs text-slate-600 dark:text-slate-300 flex-1 leading-4')}>
                  {t(
                    'mobile.privacy_retention_desc',
                    'Your health records, consultation history, and billing invoices are secured and retained in accordance with healthcare regulations.',
                  )}
                </Text>
              </View>

              <Text style={tw('text-xs text-slate-500 dark:text-slate-400 leading-4')}>
                {t(
                  'mobile.privacy_delete_support_note',
                  'Self-service account deletion is not currently available in the app. If you need to deactivate or close your account, please contact an administrator or support.',
                )}
              </Text>
            </View>
          </ScrollView>

          <View style={tw('p-4 border-t border-slate-100 dark:border-slate-800')}>
            <TouchableOpacity onPress={onClose} style={tw('py-3.5 rounded-xl bg-slate-900 dark:bg-white items-center')}>
              <Text style={tw('font-bold text-white dark:text-slate-900 text-sm')}>
                {t('mobile.close', 'Close')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        <AppModalToast visible={visible} />
      </View>
    </Modal>
  );
};
