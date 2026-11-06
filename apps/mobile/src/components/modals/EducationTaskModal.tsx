import React from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { X, BookOpen, Video, FileText, CheckCircle2, Info } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { tw, twInstance } from '@/tw';

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
  onAcknowledge: (payload: { action: 'acknowledge'; contentId: string; version: string }) => void;
}

export const EducationTaskModal: React.FC<EducationTaskModalProps> = ({
  visible,
  onClose,
  contentRef,
  onAcknowledge,
}) => {
  const { t, i18n } = useTranslation();
  const isVi = i18n.language?.startsWith('vi');

  const resolvedRef: EducationContentRef = contentRef || {
    contentId: 'edu-dash-sodium-01',
    version: 'v1.2',
    locale: isVi ? 'vi' : 'en',
    displayType: 'article',
    title: isVi
      ? 'Chế độ dinh dưỡng giảm muối (DASH) cho người tăng huyết áp'
      : 'Low-Sodium DASH Diet Guidelines for Hypertension',
    summary: isVi
      ? 'Tài liệu hướng dẫn kiểm soát lượng natri nạp vào dưới 2.000 mg/ngày giúp ổn định huyết áp tâm thu và giảm nguy cơ biến cố tim mạch.'
      : 'Clinical patient guide on keeping daily sodium intake below 2,000 mg/day to stabilize systolic blood pressure and reduce cardiovascular risk.',
    bulletPoints: isVi
      ? [
          'Ưu tiên rau xanh, trái cây tươi và ngũ cốc nguyên hạt trong mỗi bữa ăn.',
          'Hạn chế thực phẩm chế biến sẵn, đồ hộp, dưa muối và nước chấm mặn.',
          'Đọc kỹ nhãn dinh dưỡng để kiểm tra hàm lượng Sodium (Na) trước khi sử dụng.',
          'Kết hợp đi bộ nhẹ nhàng 30 phút/ngày và đo huyết áp đúng giờ.',
        ]
      : [
          'Prioritize fresh vegetables, fruits, and whole grains in every meal.',
          'Limit processed meats, canned soups, pickled foods, and high-sodium sauces.',
          'Check nutrition labels for Sodium (Na) content before purchasing.',
          'Combine with 30 minutes of brisk walking daily and scheduled blood pressure logs.',
        ],
  };

  const handleAcknowledge = () => {
    // Contract strictly requires { action: "acknowledge" }
    onAcknowledge({
      action: 'acknowledge',
      contentId: resolvedRef.contentId,
      version: resolvedRef.version,
    });
    Toast.show({
      type: 'success',
      text1: t('mobile.acknowledged_title', 'Đã xác nhận đã xem'),
      text2: t('mobile.acknowledged_desc', 'Nhiệm vụ giáo dục sức khỏe đã được ghi nhận (action: acknowledge).'),
    });
    onClose();
  };

  const DisplayIcon =
    resolvedRef.displayType === 'video' ? Video : resolvedRef.displayType === 'document' ? FileText : BookOpen;

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
                  {t('mobile.education_task_title', 'Tài liệu Giáo dục Sức khỏe')}
                </Text>
                <Text style={tw('text-xs text-slate-500 dark:text-slate-400')}>
                  ID: {resolvedRef.contentId} • {resolvedRef.version} • {resolvedRef.displayType.toUpperCase()}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={tw('p-2 rounded-full bg-slate-100 dark:bg-slate-800')}>
              <X color={twInstance.color('text-slate-600 dark:text-slate-300')} size={20} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={tw('p-5 gap-4')} showsVerticalScrollIndicator={false}>
            {/* Metadata badges */}
            <View style={tw('flex-row flex-wrap gap-2')}>
              <View style={tw('bg-amber-50 dark:bg-amber-950/40 px-3 py-1 rounded-full border border-amber-200 dark:border-amber-800')}>
                <Text style={tw('text-xs font-bold text-amber-700 dark:text-amber-300')}>
                  {resolvedRef.displayType === 'article'
                    ? t('mobile.edu_type_article', 'Bài viết (Article)')
                    : resolvedRef.displayType === 'video'
                    ? t('mobile.edu_type_video', 'Video hướng dẫn')
                    : t('mobile.edu_type_document', 'Tài liệu (Document)')}
                </Text>
              </View>
              <View style={tw('bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full')}>
                <Text style={tw('text-xs font-semibold text-slate-600 dark:text-slate-300')}>
                  Locale: {resolvedRef.locale.toUpperCase()}
                </Text>
              </View>
            </View>

            {/* Title & Summary */}
            <View style={tw('bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800')}>
              <Text style={tw('text-base font-bold text-slate-900 dark:text-white mb-2 leading-6')}>
                {resolvedRef.title}
              </Text>
              <Text style={tw('text-sm text-slate-600 dark:text-slate-300 leading-5')}>{resolvedRef.summary}</Text>
            </View>

            {/* Key Takeaways */}
            {resolvedRef.bulletPoints && resolvedRef.bulletPoints.length > 0 && (
              <View style={tw('bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 gap-2.5')}>
                <Text style={tw('text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1')}>
                  {t('mobile.key_takeaways', 'Nội dung chính cần lưu ý')}
                </Text>
                {resolvedRef.bulletPoints.map((point, idx) => (
                  <View key={idx} style={tw('flex-row items-start')}>
                    <CheckCircle2 color="#10b981" size={16} style={tw('mt-0.5 mr-2.5 shrink-0')} />
                    <Text style={tw('text-xs text-slate-700 dark:text-slate-300 flex-1 leading-5')}>{point}</Text>
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
                  'Theo quy định lâm sàng, nút xác nhận dưới đây ghi nhận bạn "Đã xác nhận đã xem" (action: acknowledge) phiên bản tài liệu này.'
                )}
              </Text>
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={tw('p-4 border-t border-slate-100 dark:border-slate-800 flex-row gap-3')}>
            <TouchableOpacity
              onPress={onClose}
              style={tw('flex-1 py-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 items-center')}
            >
              <Text style={tw('font-bold text-slate-700 dark:text-slate-300 text-sm')}>{t('mobile.close', 'Đóng')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleAcknowledge}
              style={tw('flex-1 py-3.5 rounded-xl bg-brand items-center justify-center flex-row')}
            >
              <CheckCircle2 color="#0f172a" size={18} style={tw('mr-1.5')} />
              <Text style={tw('font-bold text-slate-900 text-sm')}>
                {t('mobile.acknowledge_viewed', 'Xác nhận đã xem')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

