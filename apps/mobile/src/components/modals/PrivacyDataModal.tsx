import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, TextInput, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { X, FileDown, Trash2, ShieldAlert, CheckCircle2, Clock, Download, Info } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { tw, twInstance } from '@/tw';

export interface DataExportJobItem {
  id: string;
  requestedAt: string;
  format: 'JSON';
  status: 'pending' | 'processing' | 'ready' | 'expired' | 'failed';
  expiresAt?: string;
}

interface PrivacyDataModalProps {
  visible: boolean;
  onClose: () => void;
}

export const PrivacyDataModal: React.FC<PrivacyDataModalProps> = ({ visible, onClose }) => {
  const { t } = useTranslation();

  const [exportJobs, setExportJobs] = useState<DataExportJobItem[]>([
    {
      id: 'EXP-2026-089',
      requestedAt: '2026-11-04 14:20',
      format: 'JSON',
      status: 'ready',
      expiresAt: '2026-11-07 14:20 (72h)',
    },
  ]);

  const [deleteReason, setDeleteReason] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [deletionRequested, setDeletionRequested] = useState(false);

  const handleRequestExport = () => {
    const newJob: DataExportJobItem = {
      id: `EXP-2026-${100 + exportJobs.length}`,
      requestedAt: new Date().toLocaleString(),
      format: 'JSON',
      status: 'processing',
    };
    setExportJobs((prev) => [newJob, ...prev]);
    Toast.show({
      type: 'success',
      text1: t('mobile.export_requested_title'),
      text2: t('mobile.export_requested_desc'),
    });
  };

  const handleDownloadExport = async (job: DataExportJobItem) => {
    try {
      const fileName = `Personal_Health_Data_${job.id}.json`;
      const exportData = {
        exportId: job.id,
        exportedAt: new Date().toISOString(),
        format: 'JSON',
        scope: 'full_personal_health_record',
        user: {
          fullName: 'Alex Johnson',
          email: 'alex.johnson@example.com',
          phone: '+84 912 345 678',
          dob: '1990-10-12',
          gender: 'male',
        },
        activeProgram: {
          name: 'Hypertension Management',
          status: 'active',
          adherenceRate: '75%',
          daysRemaining: 45,
        },
        healthMetrics: [
          { type: 'blood_pressure', systolic: 125, diastolic: 82, unit: 'mmHg', recordedAt: '2026-11-06 08:30' },
          { type: 'blood_sugar', value: 105, unit: 'mg/dL', recordedAt: '2026-11-05 07:00' },
          { type: 'heart_rate', value: 72, unit: 'bpm', recordedAt: '2026-11-06 08:30' },
        ],
        recentConsultations: [
          { doctor: 'Dr. Sarah Connor', specialty: 'Cardiologist', date: '2026-11-06 10:30', status: 'completed' },
        ],
        retentionPolicy: 'Medical records retained securely per healthcare compliance regulations.',
      };

      const jsonString = JSON.stringify(exportData, null, 2);

      if (Platform.OS === 'android' && FileSystem.StorageAccessFramework) {
        try {
          const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
          if (permissions.granted) {
            const directoryUri = permissions.directoryUri;
            const newFileUri = await FileSystem.StorageAccessFramework.createFileAsync(
              directoryUri,
              fileName,
              'application/json'
            );
            await FileSystem.writeAsStringAsync(newFileUri, jsonString, {
              encoding: FileSystem.EncodingType.UTF8,
            });

            Toast.show({
              type: 'success',
              text1: t('mobile.file_saved_to_folder'),
              text2: fileName,
            });
            return;
          } else {
            Toast.show({
              type: 'info',
              text1: t('mobile.folder_pick_cancelled'),
            });
            return;
          }
        } catch (safErr) {
          console.warn('StorageAccessFramework error, falling back to document/share:', safErr);
        }
      }

      const localDirectory = FileSystem.documentDirectory || FileSystem.cacheDirectory;
      const fileUri = `${localDirectory}${fileName}`;
      await FileSystem.writeAsStringAsync(fileUri, jsonString, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const isShareAvailable = await Sharing.isAvailableAsync();
      if (isShareAvailable) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/json',
          dialogTitle: t('mobile.select_save_folder'),
        });
      }

      Toast.show({
        type: 'success',
        text1: t('mobile.file_saved_to_folder'),
        text2: fileName,
      });
    } catch (err) {
      console.warn('Failed to export JSON file:', err);
      Toast.show({
        type: 'error',
        text1: t('mobile.download_error_title'),
        text2: t('mobile.download_error_desc'),
      });
    }
  };

  const handleRequestDeleteAccount = () => {
    if (confirmText.trim().toUpperCase() !== 'DELETE') {
      Toast.show({
        type: 'error',
        text1: t('mobile.confirmation_required'),
        text2: t('mobile.type_delete_to_confirm'),
      });
      return;
    }
    setDeletionRequested(true);
    Toast.show({
      type: 'info',
      text1: t('mobile.deletion_requested_title'),
      text2: t('mobile.deletion_requested_desc'),
    });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={tw('flex-1 justify-end bg-black/60')}>
        <View style={tw('bg-white dark:bg-slate-900 rounded-t-3xl max-h-[90%] border-t border-slate-200 dark:border-slate-800')}>
          {/* Header */}
          <View style={tw('p-5 border-b border-slate-100 dark:border-slate-800 flex-row items-center justify-between')}>
            <View style={tw('flex-row items-center flex-1 mr-3')}>
              <View style={tw('w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-900/40 items-center justify-center mr-3')}>
                <FileDown color={twInstance.color('text-blue-600 dark:text-blue-400')} size={22} />
              </View>
              <View style={tw('flex-1')}>
                <Text style={tw('text-lg font-bold text-slate-900 dark:text-white')}>
                  {t('mobile.privacy_data_title')}
                </Text>
                <Text style={tw('text-xs text-slate-500 dark:text-slate-400')}>
                  {t('mobile.privacy_data_subtitle')}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={tw('p-2 rounded-full bg-slate-100 dark:bg-slate-800')}>
              <X color={twInstance.color('text-slate-600 dark:text-slate-300')} size={20} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={tw('p-5 gap-5')} showsVerticalScrollIndicator={false}>
            {/* 1. Personal Data Export */}
            <View style={tw('bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800')}>
              <View style={tw('flex-row justify-between items-center mb-2')}>
                <Text style={tw('text-sm font-bold text-slate-900 dark:text-white')}>
                  {t('mobile.personal_data_export')}
                </Text>
                <TouchableOpacity
                  onPress={handleRequestExport}
                  style={tw('bg-brand px-3 py-1.5 rounded-xl')}
                >
                  <Text style={tw('text-xs font-bold text-slate-900')}>
                    + {t('mobile.request_export')}
                  </Text>
                </TouchableOpacity>
              </View>
              <Text style={tw('text-xs text-slate-500 dark:text-slate-400 mb-3 leading-4')}>
                {t('mobile.export_policy_desc')}
              </Text>

              <View style={tw('gap-2.5')}>
                {exportJobs.map((job) => (
                  <View
                    key={job.id}
                    style={tw('bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 flex-row items-center justify-between')}
                  >
                    <View style={tw('flex-1 mr-2')}>
                      <View style={tw('flex-row items-center gap-2')}>
                        <Text style={tw('text-xs font-bold text-slate-900 dark:text-white')}>{job.id}</Text>
                        <View
                          style={tw(
                            `px-2 py-0.5 rounded-full ${
                              job.status === 'ready'
                                ? 'bg-emerald-100 dark:bg-emerald-900/40'
                                : 'bg-amber-100 dark:bg-amber-900/40'
                            }`
                          )}
                        >
                          <Text
                            style={tw(
                              `text-[10px] font-bold uppercase ${
                                job.status === 'ready'
                                  ? 'text-emerald-700 dark:text-emerald-300'
                                  : 'text-amber-700 dark:text-amber-300'
                              }`
                            )}
                          >
                            {job.status === 'ready'
                              ? t('mobile.status_ready')
                              : t('mobile.processing')}
                          </Text>
                        </View>
                      </View>
                      <Text style={tw('text-[11px] text-slate-500 dark:text-slate-400 mt-1')}>
                        {job.requestedAt} • {job.format}
                      </Text>
                      {job.expiresAt && (
                        <Text style={tw('text-[10px] text-slate-400 dark:text-slate-500 mt-0.5')}>
                          {t('mobile.expires_label')} {job.expiresAt}
                        </Text>
                      )}
                    </View>
                    {job.status === 'ready' ? (
                      <TouchableOpacity
                        onPress={() => handleDownloadExport(job)}
                        style={tw('bg-emerald-600 px-3 py-2 rounded-xl flex-row items-center')}
                      >
                        <Download color="#ffffff" size={14} style={tw('mr-1')} />
                        <Text style={tw('text-xs font-bold text-white')}>
                          {t('mobile.download')}
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={tw('flex-row items-center px-2.5 py-1.5 bg-amber-50 dark:bg-amber-950/40 rounded-lg')}>
                        <Clock color="#d97706" size={13} style={tw('mr-1')} />
                        <Text style={tw('text-[11px] font-semibold text-amber-700 dark:text-amber-300')}>
                          {t('mobile.processing')}
                        </Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            </View>

            {/* 2. Account Deletion & Retention Policy */}
            <View style={tw('bg-rose-50/50 dark:bg-rose-950/20 p-4 rounded-2xl border border-rose-200 dark:border-rose-900/50')}>
              <View style={tw('flex-row items-center mb-2')}>
                <ShieldAlert color="#ef4444" size={18} style={tw('mr-2')} />
                <Text style={tw('text-sm font-bold text-rose-800 dark:text-rose-300')}>
                  {t('mobile.account_deletion_request')}
                </Text>
              </View>

              <View style={tw('bg-white/80 dark:bg-slate-900/80 p-3 rounded-xl border border-rose-100 dark:border-rose-900/40 mb-3 flex-row items-start')}>
                <Info color="#f43f5e" size={15} style={tw('mt-0.5 mr-2 shrink-0')} />
                <Text style={tw('text-xs text-slate-600 dark:text-slate-300 flex-1 leading-4')}>
                  {t('mobile.retention_policy_notice')}
                </Text>
              </View>

              {deletionRequested ? (
                <View style={tw('bg-amber-100 dark:bg-amber-900/40 p-3.5 rounded-xl flex-row items-center')}>
                  <CheckCircle2 color="#d97706" size={18} style={tw('mr-2')} />
                  <Text style={tw('text-xs font-bold text-amber-900 dark:text-amber-200 flex-1')}>
                    {t('mobile.deletion_pending_banner')}
                  </Text>
                </View>
              ) : (
                <View style={tw('gap-2.5')}>
                  <TextInput
                    value={deleteReason}
                    onChangeText={setDeleteReason}
                    placeholder={t('mobile.delete_reason_placeholder')}
                    placeholderTextColor="#94a3b8"
                    style={tw('bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white')}
                  />
                  <TextInput
                    value={confirmText}
                    onChangeText={setConfirmText}
                    placeholder={t('mobile.type_delete_placeholder')}
                    placeholderTextColor="#94a3b8"
                    autoCapitalize="characters"
                    style={tw('bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-800 rounded-xl px-3.5 py-2.5 text-xs font-bold text-rose-700 dark:text-rose-300')}
                  />
                  <TouchableOpacity
                    onPress={handleRequestDeleteAccount}
                    style={tw('bg-rose-600 py-3 rounded-xl items-center flex-row justify-center mt-1')}
                  >
                    <Trash2 color="#ffffff" size={15} style={tw('mr-1.5')} />
                    <Text style={tw('text-xs font-bold text-white')}>
                      {t('mobile.submit_deletion_request')}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </ScrollView>

          <View style={tw('p-4 border-t border-slate-100 dark:border-slate-800')}>
            <TouchableOpacity onPress={onClose} style={tw('py-3.5 rounded-xl bg-slate-900 dark:bg-white items-center')}>
              <Text style={tw('font-bold text-white dark:text-slate-900 text-sm')}>
                {t('mobile.close')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
