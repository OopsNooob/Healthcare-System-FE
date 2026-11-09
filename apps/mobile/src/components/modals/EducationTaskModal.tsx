import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { X, BookOpen, Video, FileText, CheckCircle2, Info, AlertCircle } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { tw, twInstance } from '@/tw';
import { useThemeContext } from '@/context/ThemeContext';

export interface EducationContentRef {
  contentId: string;
  version: string;
  locale: 'vi' | 'en';
  displayType: 'article' | 'video' | 'document';
  title?: string;
  summary?: string;
  bulletPoints?: string[];
}

interface EducationTaskModalProps {
  visible: boolean;
  onClose: () => void;
  contentRef?: EducationContentRef;
  isContentAvailable?: boolean;
  onAcknowledge: (payload: { action: 'acknowledge' }) => Promise<void> | void;
}

export const EducationTaskModal: React.FC<EducationTaskModalProps> = ({
  visible,
  onClose,
  contentRef,
  isContentAvailable = true,
  onAcknowledge,
}) => {
  const { t } = useTranslation();
  useThemeContext();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resolvedRef: EducationContentRef = contentRef || {
    contentId: 'edu-dash-sodium-01',
    version: 'v1.2',
    locale: 'vi',
    displayType: 'article',
    title: t(
      'mobile.edu_default_title',
      'Low-Sodium Diet Guidelines for Hypertension'
    ),
    summary: t(
      'mobile.edu_default_summary',
      'Clinical patient guide on keeping daily sodium intake below 2,000 mg/day to stabilize systolic blood pressure and reduce cardiovascular risk.'
    ),
    bulletPoints: [
      t(
        'mobile.edu_bullet_1',
        'Prioritize fresh vegetables, fruits, and whole grains in every meal.'
      ),
      t(
        'mobile.edu_bullet_2',
        'Limit processed meats, canned soups, pickled foods, and high-sodium sauces.'
      ),
      t(
        'mobile.edu_bullet_3',
        'Check nutrition labels for sodium content before purchasing.'
      ),
      t(
        'mobile.edu_bullet_4',
        'Combine with 30 minutes of brisk walking daily and scheduled blood pressure logs.'
      ),
    ],
  };

  const handleAcknowledge = async () => {
    if (isSubmitting || !isContentAvailable) return;
    setIsSubmitting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 240));
      await onAcknowledge({ action: 'acknowledge' });
      Toast.show({
        type: 'success',
        text1: t('mobile.acknowledged_title', 'Acknowledged'),
        text2: t(
          'mobile.acknowledged_desc',
          'Health education task has been marked as completed.'
        ),
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const DisplayIcon =
    resolvedRef.displayType === 'video'
      ? Video
      : resolvedRef.displayType === 'document'
        ? FileText
        : BookOpen;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={tw('flex-1 justify-end bg-black/60')}>
        <View style={tw('bg-white dark:bg-slate-900 rounded-t-3xl max-h-[85%] border-t border-slate-200 dark:border-slate-800')}>
          {/* Header */}
          <View style={tw('p-5 border-b border-slate-100 dark:border-slate-800 flex-row items-center justify-between')}>
            <View style={tw('flex-row items-center flex-1 mr-3')}>
              <View style={tw('w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-900/40 items-center justify-center mr-3')}>
                <DisplayIcon color={twInstance.color('text-amber-600 dark:text-amber-400')} size={22} />
              </View>
              <View style={tw('flex-1')}>
                <Text style={tw('text-lg font-bold text-slate-900 dark:text-white')} numberOfLines={1}>
                  {t('mobile.education_task_title', 'Health Education Material')}
                </Text>
                <Text style={tw('text-xs text-slate-500 dark:text-slate-400')}>
                  {t('mobile.version_label', 'Version')}: {resolvedRef.version}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              disabled={isSubmitting}
              onPress={onClose}
              style={tw('p-2 rounded-full bg-slate-100 dark:bg-slate-800')}
            >
              <X color={twInstance.color('text-slate-600 dark:text-slate-300')} size={20} />
            </TouchableOpacity>
          </View>

          {!isContentAvailable ? (
            <View style={tw('p-6 items-center')}>
              <View style={tw('w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 items-center justify-center mb-3')}>
                <AlertCircle color="#f59e0b" size={24} />
              </View>
              <Text style={tw('text-base font-bold text-slate-900 dark:text-white text-center mb-1')}>
                {t('mobile.education_unavailable_title', 'Material Currently Unavailable')}
              </Text>
              <Text style={tw('text-xs text-slate-500 dark:text-slate-400 text-center leading-5')}>
                {t(
                  'mobile.education_unavailable_desc',
                  'This educational material is awaiting publication or has been updated. Acknowledgement is locked until the published version is available.'
                )}
              </Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={tw('p-5 gap-4')} showsVerticalScrollIndicator={false}>
              {/* Metadata badges */}
              <View style={tw('flex-row flex-wrap gap-2')}>
                <View style={tw('bg-amber-50 dark:bg-amber-950/40 px-3 py-1 rounded-full border border-amber-200 dark:border-amber-800')}>
                  <Text style={tw('text-xs font-bold text-amber-700 dark:text-amber-300')}>
                    {resolvedRef.displayType === 'article'
                      ? t('mobile.edu_type_article', 'Medical Article')
                      : resolvedRef.displayType === 'video'
                        ? t('mobile.edu_type_video', 'Instructional Video')
                        : t('mobile.edu_type_document', 'Clinical Document')}
                  </Text>
                </View>
              </View>

              {/* Title & Summary */}
              <View style={tw('bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800')}>
                <Text style={tw('text-base font-bold text-slate-900 dark:text-white mb-2 leading-6')}>
                  {resolvedRef.title}
                </Text>
                <Text style={tw('text-sm text-slate-600 dark:text-slate-300 leading-5')}>
                  {resolvedRef.summary}
                </Text>
              </View>

              {/* Key Takeaways */}
              {resolvedRef.bulletPoints && resolvedRef.bulletPoints.length > 0 && (
                <View style={tw('bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 gap-2.5')}>
                  <Text style={tw('text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1')}>
                    {t('mobile.key_takeaways', 'Key Takeaways')}
                  </Text>
                  {resolvedRef.bulletPoints.map((point, idx) => (
                    <View key={idx} style={tw('flex-row items-start')}>
                      <CheckCircle2 color="#10b981" size={16} style={tw('mt-0.5 mr-2.5 shrink-0')} />
                      <Text style={tw('text-xs text-slate-700 dark:text-slate-300 flex-1 leading-5')}>
                        {point}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Policy note */}
              <View style={tw('bg-blue-50 dark:bg-blue-950/30 p-3.5 rounded-xl border border-blue-100 dark:border-blue-900/40 flex-row items-start')}>
                <Info color="#3b82f6" size={16} style={tw('mt-0.5 mr-2 shrink-0')} />
                <Text style={tw('text-xs text-blue-800 dark:text-blue-200 flex-1 leading-4')}>
                  {t(
                    'mobile.education_acknowledge_notice',
                    'Tap the button below to confirm you have read and understood this health care guidance.'
                  )}
                </Text>
              </View>
            </ScrollView>
          )}

          {/* Footer */}
          <View style={tw('p-4 border-t border-slate-100 dark:border-slate-800 flex-row gap-3')}>
            <TouchableOpacity
              disabled={isSubmitting}
              onPress={onClose}
              style={tw('flex-1 py-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 items-center')}
            >
              <Text style={tw('font-bold text-slate-700 dark:text-slate-300 text-sm')}>
                {t('mobile.close', 'Close')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              disabled={isSubmitting || !isContentAvailable}
              onPress={handleAcknowledge}
              style={tw(
                `flex-1 py-3.5 rounded-xl bg-brand items-center justify-center flex-row ${
                  isSubmitting || !isContentAvailable ? 'opacity-50' : ''
                }`
              )}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#0f172a" style={tw('mr-1.5')} />
              ) : (
                <CheckCircle2 color="#0f172a" size={18} style={tw('mr-1.5')} />
              )}
              <Text style={tw('font-bold text-slate-900 text-sm')}>
                {t('mobile.acknowledge_viewed', 'Acknowledge')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
