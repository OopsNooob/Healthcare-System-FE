import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  X,
  History,
  Check,
  Trash2,
  User,
  Mail,
  Lock,
  Phone,
  Stethoscope,
  Briefcase,
  Search,
  AlertCircle,
  FileText,
} from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { useRestoreDoctorReapplication } from '@repo/shared-hooks';
import { tw, twInstance } from '@/tw';
import { AppModalToast } from '@/components/ui/AppToast';
import { useThemeContext } from '@/context/ThemeContext';
import { Skeleton } from '@/components/ui/Skeleton';
import { extractApiErrorMessage } from '@/utils/apiError';

export interface RegistrationDraft {
  fullName: string;
  email: string;
  phone: string;
  specialty: string;
  workplace: string;
  experience: string;
  hasServerDocuments?: boolean;
  verificationDocumentCount?: number;
  verificationDocumentLabels?: string[];
  verificationStatus?: 'pending' | 'approved' | 'rejected';
  rejectReason?: string | null;
}

interface RestoreDraftModalProps {
  visible: boolean;
  onClose: () => void;
  onRestore: (draft: RegistrationDraft) => void;
  onClearDraft?: () => void;
  initialEmail?: string;
}

export const RestoreDraftModal: React.FC<RestoreDraftModalProps> = ({
  visible,
  onClose,
  onRestore,
  onClearDraft,
  initialEmail = '',
}) => {
  const { t } = useTranslation();
  const { isDark } = useThemeContext();
  const { restoreApplication, isLoading } = useRestoreDoctorReapplication();
  const [lookupEmail, setLookupEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [draft, setDraft] = useState<RegistrationDraft | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setLookupEmail(initialEmail);
      setPassword('');
      setDraft(null);
      setLookupError(null);
    }
  }, [visible, initialEmail]);

  const handleFetch = async () => {
    if (isLoading) return;
    const cleanEmail = lookupEmail.trim();
    if (!cleanEmail) {
      setLookupError(t('mobile.please_enter_email', 'Please enter your email address.'));
      return;
    }
    if (!password) {
      setLookupError(t('mobile.restore_password_required', 'Please enter your previous application password.'));
      return;
    }

    setLookupError(null);
    try {
      const res = await restoreApplication({ email: cleanEmail, password });
      const labels = Array.isArray(res.verificationDocuments)
        ? res.verificationDocuments
            .map((doc) => (typeof doc === 'string' ? doc : doc.label))
            .filter(Boolean)
        : [];
      const docCount = res.verificationDocumentCount ?? labels.length;

      setDraft({
        fullName: res.fullName ?? '',
        email: cleanEmail,
        phone: res.phoneNumber ?? '',
        specialty: res.specialty ?? '',
        workplace: res.workplace ?? '',
        experience:
          res.experienceYears !== undefined && res.experienceYears !== null
            ? String(res.experienceYears)
            : '',
        hasServerDocuments: docCount > 0,
        verificationDocumentCount: docCount,
        verificationDocumentLabels: labels,
        verificationStatus: 'rejected',
      });
    } catch (err) {
      setDraft(null);
      setLookupError(extractApiErrorMessage(err));
    }
  };

  const handleRestore = () => {
    if (!draft) return;
    onRestore(draft);
    Toast.show({
      type: 'success',
      text1: t('mobile.draft_restored', 'Data Loaded'),
      text2: t('mobile.draft_restored_desc', 'Registration form fields populated'),
    });
    onClose();
  };

  const handleClear = () => {
    setDraft(null);
    setPassword('');
    setLookupError(null);
    onClearDraft?.();
    Toast.show({
      type: 'info',
      text1: t('mobile.draft_cleared', 'Cleared'),
      text2: t('mobile.draft_cleared_desc', 'Saved registration data cleared'),
    });
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={tw('flex-1 justify-center items-center bg-black/65 px-4')}>
        <View style={tw('bg-white dark:bg-slate-900 rounded-3xl w-full max-w-sm border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xl max-h-[85%]')}>
          <View style={tw('bg-emerald-50 dark:bg-emerald-950/40 p-5 items-center border-b border-emerald-100 dark:border-emerald-900/30')}>
            <TouchableOpacity
              onPress={onClose}
              style={tw('absolute right-3 top-3 p-1.5 rounded-full bg-white/80 dark:bg-slate-800')}
            >
              <X color={twInstance.color('text-slate-600 dark:text-slate-300')} size={18} />
            </TouchableOpacity>
            <View style={tw('w-12 h-12 bg-emerald-100 dark:bg-emerald-900/50 rounded-full items-center justify-center mb-2')}>
              <History color={isDark ? '#34d399' : '#059669'} size={24} />
            </View>
            <Text style={tw('text-lg font-bold text-slate-900 dark:text-white text-center')}>
              {t('mobile.restore_registration_draft', 'Restore Rejected Application')}
            </Text>
            <Text style={tw('text-xs text-slate-500 dark:text-slate-400 mt-1 text-center')}>
              {t(
                'mobile.restore_doctor_credentials_desc',
                'Enter your registered doctor email and password to load previous profile info.',
              )}
            </Text>
          </View>

          <ScrollView contentContainerStyle={tw('p-5 gap-3')} showsVerticalScrollIndicator={false}>
            <View style={tw('gap-2.5')}>
              <View style={tw('flex-row items-center bg-slate-50 dark:bg-slate-800 rounded-xl px-3 py-2.5 border border-slate-200 dark:border-slate-700')}>
                <Mail color="#94a3b8" size={16} />
                <TextInput
                  style={tw('flex-1 ml-2 text-xs text-slate-900 dark:text-white')}
                  placeholder={t('mobile.enter_your_email', 'Enter your email account')}
                  placeholderTextColor="#94a3b8"
                  value={lookupEmail}
                  onChangeText={setLookupEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  editable={!isLoading}
                />
              </View>

              <View style={tw('flex-row items-center gap-2')}>
                <View style={tw('flex-1 flex-row items-center bg-slate-50 dark:bg-slate-800 rounded-xl px-3 py-2.5 border border-slate-200 dark:border-slate-700')}>
                  <Lock color="#94a3b8" size={16} />
                  <TextInput
                    style={tw('flex-1 ml-2 text-xs text-slate-900 dark:text-white')}
                    placeholder={t('mobile.enter_your_password', 'Enter your password')}
                    placeholderTextColor="#94a3b8"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    editable={!isLoading}
                  />
                </View>

                <TouchableOpacity
                  onPress={() => void handleFetch()}
                  disabled={isLoading}
                  style={tw(`px-3.5 py-2.5 rounded-xl flex-row items-center ${isLoading ? 'bg-emerald-400' : 'bg-emerald-600'}`)}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Search color="#ffffff" size={16} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {isLoading && (
              <View style={tw('gap-2.5 py-2')}>
                <Skeleton className="h-5 w-full rounded-lg" />
                <Skeleton className="h-5 w-4/5 rounded-lg" />
                <Skeleton className="h-5 w-3/4 rounded-lg" />
              </View>
            )}

            {!isLoading && lookupError && (
              <View style={tw('p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 flex-row items-center gap-2')}>
                <AlertCircle color="#ef4444" size={16} />
                <Text style={tw('text-xs text-rose-700 dark:text-rose-300 flex-1')}>{lookupError}</Text>
              </View>
            )}

            {!isLoading && draft && (
              <View style={tw('bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 gap-2.5')}>
                <View style={tw('flex-row items-center')}>
                  <User color="#94a3b8" size={16} style={tw('mr-2.5')} />
                  <Text style={tw('text-xs text-slate-500 dark:text-slate-400 w-20')}>{t('mobile.full_name', 'Full Name')}:</Text>
                  <Text style={tw('text-xs font-bold text-slate-900 dark:text-white flex-1')}>{draft.fullName}</Text>
                </View>

                <View style={tw('flex-row items-center')}>
                  <Phone color="#94a3b8" size={16} style={tw('mr-2.5')} />
                  <Text style={tw('text-xs text-slate-500 dark:text-slate-400 w-20')}>{t('mobile.phone', 'Phone')}:</Text>
                  <Text style={tw('text-xs font-bold text-slate-900 dark:text-white flex-1')}>{draft.phone || '—'}</Text>
                </View>

                <View style={tw('flex-row items-center')}>
                  <Stethoscope color="#94a3b8" size={16} style={tw('mr-2.5')} />
                  <Text style={tw('text-xs text-slate-500 dark:text-slate-400 w-20')}>{t('mobile.specialty', 'Specialty')}:</Text>
                  <Text style={tw('text-xs font-bold text-slate-900 dark:text-white flex-1')}>{draft.specialty || '—'}</Text>
                </View>

                <View style={tw('flex-row items-center')}>
                  <Briefcase color="#94a3b8" size={16} style={tw('mr-2.5')} />
                  <Text style={tw('text-xs text-slate-500 dark:text-slate-400 w-20')}>{t('mobile.workplace', 'Workplace')}:</Text>
                  <Text style={tw('text-xs font-bold text-slate-900 dark:text-white flex-1')}>{draft.workplace || '—'}</Text>
                </View>

                {(draft.verificationDocumentCount ?? 0) > 0 && (
                  <View style={tw('pt-2 border-t border-slate-200 dark:border-slate-800 gap-1.5')}>
                    <View style={tw('flex-row items-center gap-1.5')}>
                      <FileText color={isDark ? '#34d399' : '#059669'} size={14} />
                      <Text style={tw('text-[11px] font-semibold text-emerald-700 dark:text-emerald-400')}>
                        {t('mobile.restore_docs_count', {
                          count: draft.verificationDocumentCount,
                          defaultValue: '{{count}} verification documents on file',
                        })}
                      </Text>
                    </View>
                    {draft.verificationDocumentLabels && draft.verificationDocumentLabels.length > 0 && (
                      <View style={tw('flex-row flex-wrap gap-1.5')}>
                        {draft.verificationDocumentLabels.map((label, idx) => (
                          <View
                            key={`${label}-${idx}`}
                            style={tw('bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-md')}
                          >
                            <Text style={tw('text-[10px] font-medium text-emerald-700 dark:text-emerald-300')}>
                              {label}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                )}

                {draft.verificationStatus && (
                  <View style={tw('pt-1 border-t border-slate-200 dark:border-slate-800')}>
                    <Text style={tw('text-[11px] font-semibold text-slate-600 dark:text-slate-300')}>
                      {t('mobile.verification_status', 'Status')}: {draft.verificationStatus}
                    </Text>
                    {Boolean(draft.rejectReason) && (
                      <Text style={tw('text-[11px] text-rose-600 dark:text-rose-400 mt-0.5')}>
                        {draft.rejectReason}
                      </Text>
                    )}
                  </View>
                )}
              </View>
            )}
          </ScrollView>

          <View style={tw('p-4 border-t border-slate-100 dark:border-slate-800 gap-2.5 bg-slate-50 dark:bg-slate-950/60')}>
            <TouchableOpacity
              onPress={handleRestore}
              disabled={!draft || isLoading}
              style={tw(`w-full py-3.5 rounded-xl items-center flex-row justify-center ${draft && !isLoading ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`)}
            >
              <Check color="#ffffff" size={18} style={tw('mr-1.5')} />
              <Text style={tw('text-white font-bold text-sm')}>{t('mobile.restore_this_draft', 'Use This Information')}</Text>
            </TouchableOpacity>

            <View style={tw('flex-row gap-2.5')}>
              <TouchableOpacity
                onPress={handleClear}
                disabled={isLoading}
                style={tw('flex-1 bg-rose-50 dark:bg-rose-950/40 py-3 rounded-xl border border-rose-200 dark:border-rose-900/40 items-center flex-row justify-center')}
              >
                <Trash2 color="#ef4444" size={16} style={tw('mr-1.5')} />
                <Text style={tw('text-rose-600 dark:text-rose-400 font-bold text-xs')}>{t('mobile.clear_draft', 'Clear')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={onClose}
                disabled={isLoading}
                style={tw('flex-1 bg-white dark:bg-slate-800 py-3 rounded-xl border border-slate-200 dark:border-slate-700 items-center justify-center')}
              >
                <Text style={tw('text-slate-700 dark:text-slate-300 font-bold text-xs')}>{t('mobile.cancel', 'Cancel')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
        <AppModalToast visible={visible} />
      </View>
    </Modal>
  );
};
