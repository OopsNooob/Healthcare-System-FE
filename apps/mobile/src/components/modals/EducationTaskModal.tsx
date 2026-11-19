import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { X, BookOpen, Video, FileText, CheckCircle2, Info, AlertCircle, RefreshCw } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { mobileApi, type FeTypes } from '@repo/shared-hooks';
import { tw, twInstance } from '@/tw';
import { useThemeContext } from '@/context/ThemeContext';
import { Skeleton } from '@/components/ui/Skeleton';
import { extractApiErrorMessage } from '@/utils/apiError';

export interface EducationContentRef {
  contentId: string;
  version: string;
  locale: 'vi' | 'en';
  displayType: 'article' | 'video' | 'document';
  title?: string;
  summary?: string;
  body?: string;
  bulletPoints?: string[];
}

interface EducationTaskModalProps {
  visible: boolean;
  onClose: () => void;
  taskId?: string | null;
  contentRef?: EducationContentRef;
  isContentAvailable?: boolean;
  onAcknowledge: (payload: { action: 'acknowledge' }) => Promise<void> | void;
}

export const EducationTaskModal: React.FC<EducationTaskModalProps> = ({
  visible,
  onClose,
  taskId,
  contentRef,
  isContentAvailable: propIsContentAvailable = true,
  onAcknowledge,
}) => {
  const { t } = useTranslation();
  useThemeContext();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [taskDetail, setTaskDetail] = useState<FeTypes.CareTaskDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadDetail = useCallback(async () => {
    if (!taskId) {
      setTaskDetail(null);
      setLoadError(null);
      return;
    }
    setIsLoading(true);
    setLoadError(null);
    try {
      const detail = await mobileApi.careTaskDetail({ params: { id: taskId } });
      setTaskDetail(detail);
    } catch (err) {
      setLoadError(extractApiErrorMessage(err, 'mobile.load_task_failed'));
    } finally {
      setIsLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    if (visible) {
      void loadDetail();
    }
  }, [visible, loadDetail]);

  const presentation = (taskDetail?.presentation ?? {}) as Record<string, unknown>;
  const serverContent = (presentation.content ?? null) as Record<string, unknown> | null;

  const resolveServerLocalizedValue = (val: unknown): string | undefined => {
    if (typeof val === 'string') return val;
    if (val && typeof val === 'object') {
      const rec = val as Record<string, unknown>;
      const lang = t('mobile.lang_code', 'vi') === 'en' ? 'en' : 'vi';
      const preferred = rec[lang] ?? rec.vi ?? rec.en;
      return typeof preferred === 'string' ? preferred : undefined;
    }
    return undefined;
  };

  const resolvedRef: EducationContentRef | null = serverContent
    ? {
        contentId: String(serverContent.contentId ?? serverContent.id ?? taskDetail?.templateKey ?? ''),
        version: String(serverContent.version ?? 'v1'),
        locale: t('mobile.lang_code', 'vi') === 'en' ? 'en' : 'vi',
        displayType:
          serverContent.displayType === 'video' || serverContent.displayType === 'document'
            ? serverContent.displayType
            : 'article',
        title: resolveServerLocalizedValue(serverContent.title),
        summary: resolveServerLocalizedValue(serverContent.summary),
        body: resolveServerLocalizedValue(serverContent.body),
        bulletPoints: Array.isArray(serverContent.bulletPoints)
          ? serverContent.bulletPoints
              .map((item) => resolveServerLocalizedValue(item))
              .filter((s): s is string => Boolean(s))
          : undefined,
      }
    : contentRef ?? null;

  const isAvailable =
    taskDetail !== null
      ? presentation.responseConfigured !== false && Boolean(serverContent)
      : propIsContentAvailable && Boolean(resolvedRef);

  const isAlreadyAcknowledged =
    taskDetail?.status === 'completed' ||
    Boolean((taskDetail?.progress as Record<string, unknown> | undefined)?.acknowledged);

  const canAcknowledgeAction =
    !taskDetail ||
    taskDetail.allowedActions?.includes('acknowledge') ||
    (!isAlreadyAcknowledged && (taskDetail.status === 'due' || taskDetail.status === 'scheduled'));

  const handleAcknowledge = async () => {
    if (isSubmitting || !isAvailable || isAlreadyAcknowledged || !canAcknowledgeAction) return;
    setIsSubmitting(true);
    try {
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
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: t('mobile.error', 'Error'),
        text2: extractApiErrorMessage(err, 'mobile.acknowledge_failed'),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const DisplayIcon =
    resolvedRef?.displayType === 'video'
      ? Video
      : resolvedRef?.displayType === 'document'
        ? FileText
        : BookOpen;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={tw('flex-1 justify-end bg-black/60')}>
        <View style={tw('bg-white dark:bg-slate-900 rounded-t-3xl max-h-[85%] border-t border-slate-200 dark:border-slate-800')}>
          <View style={tw('p-5 border-b border-slate-100 dark:border-slate-800 flex-row items-center justify-between')}>
            <View style={tw('flex-row items-center flex-1 mr-3')}>
              <View style={tw('w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-900/40 items-center justify-center mr-3')}>
                <DisplayIcon color={twInstance.color('text-amber-600 dark:text-amber-400')} size={22} />
              </View>
              <View style={tw('flex-1')}>
                <Text style={tw('text-lg font-bold text-slate-900 dark:text-white')} numberOfLines={1}>
                  {t('mobile.education_task_title', 'Health Education Material')}
                </Text>
                {resolvedRef?.version ? (
                  <Text style={tw('text-xs text-slate-500 dark:text-slate-400')}>
                    {t('mobile.version_label', 'Version')}: {resolvedRef.version}
                  </Text>
                ) : null}
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

          {isLoading ? (
            <View style={tw('p-5 gap-3')}>
              <Skeleton className="h-6 w-28 rounded-full" />
              <Skeleton className="h-28 w-full rounded-2xl" />
              <Skeleton className="h-24 w-full rounded-2xl" />
            </View>
          ) : loadError ? (
            <View style={tw('p-6 items-center gap-3')}>
              <AlertCircle color="#ef4444" size={28} />
              <Text style={tw('text-sm font-bold text-slate-900 dark:text-white text-center')}>
                {loadError}
              </Text>
              <TouchableOpacity
                onPress={() => void loadDetail()}
                style={tw('px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 flex-row items-center')}
              >
                <RefreshCw color={twInstance.color('text-slate-700 dark:text-slate-200')} size={16} style={tw('mr-2')} />
                <Text style={tw('text-xs font-bold text-slate-700 dark:text-slate-200')}>
                  {t('mobile.retry', 'Retry')}
                </Text>
              </TouchableOpacity>
            </View>
          ) : !isAvailable || !resolvedRef ? (
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

              <View style={tw('bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800')}>
                {resolvedRef.title ? (
                  <Text style={tw('text-base font-bold text-slate-900 dark:text-white mb-2 leading-6')}>
                    {resolvedRef.title}
                  </Text>
                ) : null}
                {resolvedRef.summary ? (
                  <Text style={tw('text-sm text-slate-600 dark:text-slate-300 leading-5')}>
                    {resolvedRef.summary}
                  </Text>
                ) : null}
                {resolvedRef.body ? (
                  <Text style={tw('text-sm text-slate-600 dark:text-slate-300 leading-5 mt-2')}>
                    {resolvedRef.body}
                  </Text>
                ) : null}
              </View>

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

              <View style={tw('bg-blue-50 dark:bg-blue-950/30 p-3.5 rounded-xl border border-blue-100 dark:border-blue-900/40 flex-row items-start')}>
                <Info color="#3b82f6" size={16} style={tw('mt-0.5 mr-2 shrink-0')} />
                <Text style={tw('text-xs text-blue-800 dark:text-blue-200 flex-1 leading-4')}>
                  {isAlreadyAcknowledged
                    ? t('mobile.acknowledged_desc', 'Health education task has been marked as completed.')
                    : t(
                        'mobile.education_acknowledge_notice',
                        'Tap the button below to confirm you have read and understood this health care guidance.'
                      )}
                </Text>
              </View>
            </ScrollView>
          )}

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
            {!isAlreadyAcknowledged && (
              <TouchableOpacity
                disabled={isSubmitting || isLoading || Boolean(loadError) || !isAvailable || !canAcknowledgeAction}
                onPress={handleAcknowledge}
                style={tw(
                  `flex-1 py-3.5 rounded-xl bg-brand items-center justify-center flex-row ${
                    isSubmitting || isLoading || Boolean(loadError) || !isAvailable || !canAcknowledgeAction
                      ? 'opacity-50'
                      : ''
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
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};
