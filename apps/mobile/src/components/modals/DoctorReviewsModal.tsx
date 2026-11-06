import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { useTranslation } from 'react-i18next';
import { X, Star, Flag, AlertTriangle } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { tw, twInstance } from '@/tw';

export interface DoctorReviewItem {
  id: string;
  patientName: string;
  rating: number;
  comment: string;
  createdAt: string;
  consultationMode: 'scheduled' | 'on_demand';
  reported?: boolean;
}

interface DoctorReviewsModalProps {
  visible: boolean;
  onClose: () => void;
  doctorName?: string;
}

export const DoctorReviewsModal: React.FC<DoctorReviewsModalProps> = ({
  visible,
  onClose,
  doctorName = 'Dr. Sarah Connor',
}) => {
  const { t } = useTranslation();

  const [reviews, setReviews] = useState<DoctorReviewItem[]>([
    {
      id: 'rev-101',
      patientName: 'Alex Johnson',
      rating: 5,
      comment: 'Bác sĩ tư vấn rất kỹ về phác đồ kiểm soát huyết áp và hướng dẫn chế độ ăn giảm muối dễ hiểu.',
      createdAt: '2026-11-03',
      consultationMode: 'scheduled',
    },
    {
      id: 'rev-102',
      patientName: 'Maria Garcia',
      rating: 5,
      comment: 'Very attentive during the video call and followed up promptly on my glucose logs.',
      createdAt: '2026-10-29',
      consultationMode: 'scheduled',
    },
    {
      id: 'rev-103',
      patientName: 'James Smith',
      rating: 4,
      comment: 'Phản hồi nhanh trong phiên khám on-demand, giải thích rõ nguyên nhân chóng mặt.',
      createdAt: '2026-10-21',
      consultationMode: 'on_demand',
    },
  ]);

  const [reportingReviewId, setReportingReviewId] = useState<string | null>(null);
  const [abuseReason, setAbuseReason] = useState('');

  const distribution = [
    { stars: 5, count: 112, pct: 88 },
    { stars: 4, count: 12, pct: 9 },
    { stars: 3, count: 3, pct: 2 },
    { stars: 2, count: 1, pct: 1 },
    { stars: 1, count: 0, pct: 0 },
  ];

  const handleReportAbuse = () => {
    if (!reportingReviewId || !abuseReason.trim()) return;
    setReviews((prev) =>
      prev.map((r) => (r.id === reportingReviewId ? { ...r, reported: true } : r))
    );
    setReportingReviewId(null);
    setAbuseReason('');
    Toast.show({
      type: 'success',
      text1: t('mobile.abuse_reported_title', 'Đã gửi báo cáo vi phạm (MOD-01)'),
      text2: t('mobile.abuse_reported_desc', 'Đánh giá đã được chuyển vào hàng đợi kiểm duyệt của Admin.'),
    });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={tw('flex-1 justify-end bg-black/60')}>
        <View style={tw('bg-white dark:bg-slate-900 rounded-t-3xl max-h-[90%] border-t border-slate-200 dark:border-slate-800')}>
          {/* Header */}
          <View style={tw('p-5 border-b border-slate-100 dark:border-slate-800 flex-row items-center justify-between')}>
            <View style={tw('flex-row items-center flex-1 mr-3')}>
              <View style={tw('w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-900/40 items-center justify-center mr-3')}>
                <Star color="#f59e0b" fill="#f59e0b" size={20} />
              </View>
              <View style={tw('flex-1')}>
                <Text style={tw('text-lg font-bold text-slate-900 dark:text-white')}>
                  {t('mobile.doctor_reviews_title', 'Đánh giá & Nhận xét từ Bệnh nhân (D-08)')}
                </Text>
                <Text style={tw('text-xs text-slate-500 dark:text-slate-400')}>
                  {doctorName} • DOC-02 / MOD-01
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={tw('p-2 rounded-full bg-slate-100 dark:bg-slate-800')}>
              <X color={twInstance.color('text-slate-600 dark:text-slate-300')} size={20} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={tw('p-5 gap-5')} showsVerticalScrollIndicator={false}>
            {/* Rating Summary & Distribution */}
            <View style={tw('bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex-row items-center gap-5')}>
              <View style={tw('items-center pr-4 border-r border-slate-200 dark:border-slate-800')}>
                <Text style={tw('text-4xl font-black text-slate-900 dark:text-white')}>4.9</Text>
                <View style={tw('flex-row my-1')}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} color="#f59e0b" fill="#f59e0b" size={13} />
                  ))}
                </View>
                <Text style={tw('text-xs text-slate-500 dark:text-slate-400')}>128 {t('mobile.reviews', 'đánh giá')}</Text>
              </View>

              <View style={tw('flex-1 gap-1.5')}>
                {distribution.map((row) => (
                  <View key={row.stars} style={tw('flex-row items-center gap-2')}>
                    <Text style={tw('text-xs font-bold text-slate-600 dark:text-slate-400 w-6')}>{row.stars}★</Text>
                    <View style={tw('flex-1 h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden')}>
                      <View style={[tw('h-full bg-amber-400 rounded-full'), { width: `${row.pct}%` }]} />
                    </View>
                    <Text style={tw('text-[11px] text-slate-500 dark:text-slate-400 w-8 text-right')}>{row.count}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Report Abuse Inline Dialog */}
            {reportingReviewId && (
              <View style={tw('bg-rose-50 dark:bg-rose-950/30 p-4 rounded-2xl border border-rose-200 dark:border-rose-800')}>
                <View style={tw('flex-row items-center justify-between mb-2')}>
                  <View style={tw('flex-row items-center')}>
                    <AlertTriangle color="#ef4444" size={16} style={tw('mr-1.5')} />
                    <Text style={tw('text-xs font-bold text-rose-800 dark:text-rose-200')}>
                      {t('mobile.report_abuse_dialog_title', 'Báo cáo đánh giá vi phạm (MOD-01)')}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setReportingReviewId(null)}>
                    <X color="#ef4444" size={16} />
                  </TouchableOpacity>
                </View>
                <TextInput
                  value={abuseReason}
                  onChangeText={setAbuseReason}
                  placeholder={t('mobile.report_abuse_placeholder', 'Nhập lý do báo cáo (ngôn từ xúc phạm, sai sự thật, spam)...')}
                  placeholderTextColor="#94a3b8"
                  style={tw('bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white mb-2.5')}
                />
                <TouchableOpacity
                  onPress={handleReportAbuse}
                  style={tw('bg-rose-600 py-2.5 rounded-xl items-center')}
                >
                  <Text style={tw('text-xs font-bold text-white')}>
                    {t('mobile.submit_abuse_report', 'Gửi báo cáo kiểm duyệt')}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Review List */}
            <View style={tw('gap-3')}>
              {reviews.map((rev) => (
                <View
                  key={rev.id}
                  style={tw('bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800')}
                >
                  <View style={tw('flex-row justify-between items-start mb-2')}>
                    <View>
                      <Text style={tw('text-sm font-bold text-slate-900 dark:text-white')}>{rev.patientName}</Text>
                      <View style={tw('flex-row items-center mt-0.5 gap-2')}>
                        <View style={tw('flex-row')}>
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              color="#f59e0b"
                              fill={s <= rev.rating ? '#f59e0b' : 'transparent'}
                              size={12}
                            />
                          ))}
                        </View>
                        <Text style={tw('text-[11px] text-slate-400 dark:text-slate-500')}>
                          {rev.createdAt} • {rev.consultationMode}
                        </Text>
                      </View>
                    </View>

                    {rev.reported ? (
                      <View style={tw('bg-rose-100 dark:bg-rose-900/40 px-2.5 py-1 rounded-full')}>
                        <Text style={tw('text-[10px] font-bold text-rose-700 dark:text-rose-300')}>
                          {t('mobile.reported_badge', 'Đã báo cáo')}
                        </Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        onPress={() => setReportingReviewId(rev.id)}
                        style={tw('p-2 rounded-xl bg-slate-100 dark:bg-slate-800 flex-row items-center')}
                      >
                        <Flag color={twInstance.color('text-slate-500 dark:text-slate-400')} size={13} />
                      </TouchableOpacity>
                    )}
                  </View>
                  <Text style={tw('text-xs text-slate-600 dark:text-slate-300 leading-5')}>{rev.comment}</Text>
                </View>
              ))}
            </View>
          </ScrollView>

          <View style={tw('p-4 border-t border-slate-100 dark:border-slate-800')}>
            <TouchableOpacity onPress={onClose} style={tw('py-3.5 rounded-xl bg-slate-900 dark:bg-white items-center')}>
              <Text style={tw('font-bold text-white dark:text-slate-900 text-sm')}>{t('mobile.close', 'Đóng')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

