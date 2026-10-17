import React from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { X, History, FileText, Check, Trash2, User, Mail, Phone, Stethoscope, Briefcase } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { tw, twInstance } from '@/tw';

export interface RegistrationDraft {
  fullName: string;
  email: string;
  phone: string;
  specialty: string;
  workplace: string;
  experience: string;
  savedAt: string;
}

interface RestoreDraftModalProps {
  visible: boolean;
  onClose: () => void;
  onRestore: (draft: RegistrationDraft) => void;
  onClearDraft?: () => void;
  draft?: RegistrationDraft;
}

export const RestoreDraftModal: React.FC<RestoreDraftModalProps> = ({
  visible,
  onClose,
  onRestore,
  onClearDraft,
  draft,
}) => {
  const { t } = useTranslation();

  const currentDraft: RegistrationDraft = draft || {
    fullName: 'Dr. Sarah Connor, MD',
    email: 'sarah.connor@metropolis.med',
    phone: '+1 800 555 0199',
    specialty: 'Interventional Cardiology',
    workplace: 'Metropolis Central Hospital',
    experience: '8',
    savedAt: '2026-10-15 14:30',
  };

  const handleRestore = () => {
    onRestore(currentDraft);
    Toast.show({
      type: 'success',
      text1: t('mobile.draft_restored', 'Draft Restored'),
      text2: t('mobile.draft_restored_desc', 'Registration form fields populated'),
    });
    onClose();
  };

  const handleClear = () => {
    if (onClearDraft) onClearDraft();
    Toast.show({
      type: 'info',
      text1: t('mobile.draft_cleared', 'Draft Cleared'),
      text2: t('mobile.draft_cleared_desc', 'Saved registration draft was removed'),
    });
    onClose();
  };

  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <View style={tw('flex-1 justify-center items-center bg-black/65 px-4')}>
        <View style={tw('bg-white dark:bg-slate-900 rounded-3xl w-full max-w-sm border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xl')}>
          {/* Header */}
          <View style={tw('bg-emerald-50 dark:bg-emerald-950/40 p-5 items-center border-b border-emerald-100 dark:border-emerald-900/30')}>
            <View style={tw('w-14 h-14 bg-emerald-100 dark:bg-emerald-900/50 rounded-full items-center justify-center mb-2')}>
              <History color="#059669" size={28} />
            </View>
            <Text style={tw('text-lg font-bold text-slate-900 dark:text-white text-center')}>
              {t('mobile.restore_registration_draft', 'Restore Registration Draft')}
            </Text>
            <Text style={tw('text-xs text-slate-500 dark:text-slate-400 mt-1 text-center')}>
              {t('mobile.draft_saved_at', 'Saved on')} {currentDraft.savedAt}
            </Text>
          </View>

          <ScrollView contentContainerStyle={tw('p-5 gap-3')} showsVerticalScrollIndicator={false}>
            <Text style={tw('text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400')}>
              {t('mobile.saved_form_values', 'Saved Information')}
            </Text>

            <View style={tw('bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 gap-2.5')}>
              <View style={tw('flex-row items-center')}>
                <User color={twInstance.color('text-slate-400')} size={16} style={tw('mr-2.5')} />
                <Text style={tw('text-xs text-slate-500 dark:text-slate-400 w-20')}>{t('mobile.full_name', 'Full Name')}:</Text>
                <Text style={tw('text-xs font-bold text-slate-900 dark:text-white flex-1')}>{currentDraft.fullName}</Text>
              </View>

              <View style={tw('flex-row items-center')}>
                <Mail color={twInstance.color('text-slate-400')} size={16} style={tw('mr-2.5')} />
                <Text style={tw('text-xs text-slate-500 dark:text-slate-400 w-20')}>{t('mobile.email', 'Email')}:</Text>
                <Text style={tw('text-xs font-bold text-slate-900 dark:text-white flex-1')}>{currentDraft.email}</Text>
              </View>

              <View style={tw('flex-row items-center')}>
                <Phone color={twInstance.color('text-slate-400')} size={16} style={tw('mr-2.5')} />
                <Text style={tw('text-xs text-slate-500 dark:text-slate-400 w-20')}>{t('mobile.phone', 'Phone')}:</Text>
                <Text style={tw('text-xs font-bold text-slate-900 dark:text-white flex-1')}>{currentDraft.phone}</Text>
              </View>

              <View style={tw('flex-row items-center')}>
                <Stethoscope color={twInstance.color('text-slate-400')} size={16} style={tw('mr-2.5')} />
                <Text style={tw('text-xs text-slate-500 dark:text-slate-400 w-20')}>{t('mobile.specialty', 'Specialty')}:</Text>
                <Text style={tw('text-xs font-bold text-slate-900 dark:text-white flex-1')}>{currentDraft.specialty}</Text>
              </View>

              <View style={tw('flex-row items-center')}>
                <Briefcase color={twInstance.color('text-slate-400')} size={16} style={tw('mr-2.5')} />
                <Text style={tw('text-xs text-slate-500 dark:text-slate-400 w-20')}>{t('mobile.workplace', 'Workplace')}:</Text>
                <Text style={tw('text-xs font-bold text-slate-900 dark:text-white flex-1')}>{currentDraft.workplace}</Text>
              </View>
            </View>
          </ScrollView>

          {/* Footer Actions */}
          <View style={tw('p-4 border-t border-slate-100 dark:border-slate-800 gap-2.5 bg-slate-50 dark:bg-slate-950/60')}>
            <TouchableOpacity
              onPress={handleRestore}
              style={tw('w-full bg-emerald-500 py-3.5 rounded-xl items-center flex-row justify-center')}
            >
              <Check color="#ffffff" size={18} style={tw('mr-1.5')} />
              <Text style={tw('text-white font-bold text-sm')}>{t('mobile.restore_this_draft', 'Restore This Draft')}</Text>
            </TouchableOpacity>

            <View style={tw('flex-row gap-2.5')}>
              <TouchableOpacity
                onPress={handleClear}
                style={tw('flex-1 bg-rose-50 dark:bg-rose-950/40 py-3 rounded-xl border border-rose-200 dark:border-rose-900/40 items-center flex-row justify-center')}
              >
                <Trash2 color="#ef4444" size={16} style={tw('mr-1.5')} />
                <Text style={tw('text-rose-600 dark:text-rose-400 font-bold text-xs')}>{t('mobile.clear_draft', 'Clear')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={onClose}
                style={tw('flex-1 bg-white dark:bg-slate-800 py-3 rounded-xl border border-slate-200 dark:border-slate-700 items-center justify-center')}
              >
                <Text style={tw('text-slate-700 dark:text-slate-300 font-bold text-xs')}>{t('mobile.cancel', 'Cancel')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};
