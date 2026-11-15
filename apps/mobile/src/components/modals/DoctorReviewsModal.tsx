import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Flag, Star, ThumbsUp, Trash2, X } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { tw, twInstance } from '@/tw';
import { useThemeContext } from '@/context/ThemeContext';
import { Skeleton } from '@/components/ui/Skeleton';
import { extractApiErrorMessage } from '@/utils/apiError';
import { mobileApi, normalizePaginatedList, type FeTypes } from '@repo/shared-hooks';

interface DoctorReviewsModalProps {
  visible: boolean;
  onClose: () => void;
  doctorId?: string;
  doctorName?: string;
}

type ReportReasonType =
  | 'harassment'
  | 'spam'
  | 'misinformation'
  | 'inappropriate_content'
  | 'other';

interface ReviewViewItem {
  id: string;
  patientId: string;
  patientName: string;
  rating: number;
  comment: string;
  dateLabel: string;
  helpfulCount: number;
  helpfulBy: string[];
  flagged: boolean;
}

export const DoctorReviewsModal: React.FC<DoctorReviewsModalProps> = ({
  visible,
  onClose,
  doctorId,
  doctorName,
}) => {
  const { t, i18n } = useTranslation();
  useThemeContext();

  const dateLocale = i18n.language?.startsWith('vi') ? 'vi-VN' : 'en-US';

  const [resolvedDoctorId, setResolvedDoctorId] = useState<string>('');
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [averageRating, setAverageRating] = useState<number>(0);
  const [totalReviews, setTotalReviews] = useState<number>(0);
  const [starDistribution, setStarDistribution] = useState<Record<number, number>>({
    5: 0,
    4: 0,
    3: 0,
    2: 0,
    1: 0,
  });
  const [reviews, setReviews] = useState<ReviewViewItem[]>([]);
  const [helpfulBusyId, setHelpfulBusyId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [reportTarget, setReportTarget] = useState<ReviewViewItem | null>(null);
  const [reportType, setReportType] = useState<ReportReasonType>('inappropriate_content');
  const [reportReason, setReportReason] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);

  const loadReviews = useCallback(
    async (isRefresh = false) => {
      if (!isRefresh) setLoading(true);
      setErrorMsg(null);
      try {
        let targetDoctorId = doctorId || '';
        const meRes = await mobileApi.usersGetMe().catch(() => null);
        const meObj = (meRes ?? {}) as Record<string, unknown>;
        const myId = String(meObj._id ?? meObj.id ?? '');
        setCurrentUserId(myId);

        if (!targetDoctorId && meObj.role === 'doctor') {
          targetDoctorId = myId;
        }
        setResolvedDoctorId(targetDoctorId);

        if (!targetDoctorId) {
          setReviews([]);
          setTotalReviews(0);
          setAverageRating(0);
          return;
        }

        const [ratingRes, reviewsRes] = await Promise.all([
          mobileApi.reviewsGetDoctorRating({ params: { doctorId: targetDoctorId } }).catch(() => null),
          mobileApi.reviewsFindByDoctor({ params: { doctorId: targetDoctorId } }),
        ]);

        const ratingData = (ratingRes as FeTypes.ReviewsGetDoctorRatingResponse | null)?.data;
        if (ratingData) {
          setAverageRating(Number(ratingData.averageRating ?? 0));
          setTotalReviews(Number(ratingData.totalReviews ?? 0));
          const dist = ratingData.starDistribution;
          setStarDistribution({
            5: Number(dist?.fiveStar ?? 0),
            4: Number(dist?.fourStar ?? 0),
            3: Number(dist?.threeStar ?? 0),
            2: Number(dist?.twoStar ?? 0),
            1: Number(dist?.oneStar ?? 0),
          });
        }

        const pageData = normalizePaginatedList<Record<string, unknown>>(reviewsRes);
        const mapped: ReviewViewItem[] = pageData.items.map((item) => {
          const patientRaw = item.patientId;
          const patientObj =
            patientRaw && typeof patientRaw === 'object'
              ? (patientRaw as Record<string, unknown>)
              : null;
          const patientIdStr = patientObj
            ? String(patientObj._id ?? patientObj.id ?? '')
            : String(patientRaw ?? '');
          const patientName = patientObj?.fullName
            ? String(patientObj.fullName)
            : t('mobile.patient_anonymous', 'Patient');
          const createdRaw = item.createdAt ? String(item.createdAt) : '';
          const dateLabel = createdRaw
            ? new Date(createdRaw).toLocaleDateString(dateLocale, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })
            : '—';

          return {
            id: String(item._id ?? item.id ?? ''),
            patientId: patientIdStr,
            patientName,
            rating: Number(item.rating ?? 0),
            comment: String(item.comment ?? ''),
            dateLabel,
            helpfulCount: Number(item.helpfulCount ?? 0),
            helpfulBy: Array.isArray(item.helpfulBy)
              ? item.helpfulBy.map((idVal) => String(idVal))
              : [],
            flagged: Boolean(item.flagged),
          };
        });

        setReviews(mapped);
        if (!ratingData) {
          const count = mapped.length;
          setTotalReviews(pageData.total || count);
          if (count > 0) {
            const sum = mapped.reduce((acc, r) => acc + r.rating, 0);
            setAverageRating(Math.round((sum / count) * 10) / 10);
          } else {
            setAverageRating(0);
          }
        }
      } catch (err) {
        setErrorMsg(extractApiErrorMessage(err));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [dateLocale, doctorId, t],
  );

  useEffect(() => {
    if (visible) {
      void loadReviews(false);
    } else {
      setReportTarget(null);
      setReportReason('');
    }
  }, [loadReviews, visible]);

  const handleToggleHelpful = async (rev: ReviewViewItem) => {
    if (helpfulBusyId || !rev.id) return;
    setHelpfulBusyId(rev.id);
    const hasMarked = currentUserId ? rev.helpfulBy.includes(currentUserId) : false;
    try {
      const res = hasMarked
        ? await mobileApi.reviewsUnmarkHelpful({ params: { id: rev.id } })
        : await mobileApi.reviewsMarkHelpful({ params: { id: rev.id } });
      const updated = (res as FeTypes.ReviewsMarkHelpfulResponse)?.data;
      setReviews((prev) =>
        prev.map((item) =>
          item.id === rev.id
            ? {
                ...item,
                helpfulCount:
                  typeof updated?.helpfulCount === 'number'
                    ? updated.helpfulCount
                    : hasMarked
                      ? Math.max(0, item.helpfulCount - 1)
                      : item.helpfulCount + 1,
                helpfulBy: Array.isArray(updated?.helpfulBy)
                  ? updated.helpfulBy.map((v) => String(v))
                  : hasMarked
                    ? item.helpfulBy.filter((v) => v !== currentUserId)
                    : [...item.helpfulBy, currentUserId].filter(Boolean),
              }
            : item,
        ),
      );
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: t('mobile.error_generic', 'Something went wrong'),
        text2: extractApiErrorMessage(err),
      });
    } finally {
      setHelpfulBusyId(null);
    }
  };

  const handleDeleteOwnReview = (rev: ReviewViewItem) => {
    if (deletingId || !rev.id) return;
    Alert.alert(
      t('mobile.delete_review', 'Delete review'),
      t(
        'mobile.delete_review_confirm',
        'Are you sure you want to delete this review? This action cannot be undone.',
      ),
      [
        { text: t('mobile.cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('mobile.delete', 'Delete'),
          style: 'destructive',
          onPress: async () => {
            if (deletingId) return;
            setDeletingId(rev.id);
            try {
              await mobileApi.reviewsRemove({ params: { id: rev.id } });
              setReviews((prev) => prev.filter((item) => item.id !== rev.id));
              setTotalReviews((prev) => Math.max(0, prev - 1));
              Toast.show({
                type: 'success',
                text1: t('mobile.review_deleted', 'Review deleted'),
              });
              void loadReviews(true);
            } catch (err) {
              Toast.show({
                type: 'error',
                text1: t('mobile.error_generic', 'Something went wrong'),
                text2: extractApiErrorMessage(err),
              });
            } finally {
              setDeletingId(null);
            }
          },
        },
      ],
    );
  };

  const handleSubmitReport = async () => {
    if (!reportTarget || submittingReport) return;
    const trimmed = reportReason.trim();
    if (!trimmed) {
      Toast.show({
        type: 'info',
        text1: t('mobile.report_reason_required', 'Please enter a reason'),
      });
      return;
    }

    setSubmittingReport(true);
    try {
      await mobileApi.violationsCreate({
        reported_user_id: reportTarget.patientId || resolvedDoctorId || undefined,
        report_type: reportType,
        reason: trimmed,
      });

      setReviews((prev) =>
        prev.map((item) => (item.id === reportTarget.id ? { ...item, flagged: true } : item)),
      );
      setReportTarget(null);
      setReportReason('');
      Toast.show({
        type: 'success',
        text1: t('mobile.report_sent', 'Abuse report sent'),
        text2: t(
          'mobile.report_sent_desc',
          'Content moderation admins will review your report shortly.',
        ),
      });
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: t('mobile.error_generic', 'Failed to submit report'),
        text2: extractApiErrorMessage(err),
      });
    } finally {
      setSubmittingReport(false);
    }
  };

  const starPercentages = useMemo(() => {
    const denom = totalReviews > 0 ? totalReviews : Math.max(1, reviews.length);
    return [5, 4, 3, 2, 1].map((stars) => ({
      stars,
      count: starDistribution[stars] ?? 0,
      percent: Math.min(100, Math.round(((starDistribution[stars] ?? 0) / denom) * 100)),
    }));
  }, [reviews.length, starDistribution, totalReviews]);

  const reasonOptions: { key: ReportReasonType; label: string }[] = [
    { key: 'inappropriate_content', label: t('mobile.report_type_inappropriate', 'Inappropriate content') },
    { key: 'harassment', label: t('mobile.report_type_harassment', 'Harassment') },
    { key: 'spam', label: t('mobile.report_type_spam', 'Spam') },
    { key: 'misinformation', label: t('mobile.report_type_misinformation', 'Misinformation') },
    { key: 'other', label: t('mobile.report_type_other', 'Other') },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={tw('flex-1 justify-end bg-black/60')}>
        <View
          style={tw(
            'bg-white dark:bg-slate-900 rounded-t-3xl h-[85%] border-t border-slate-200 dark:border-slate-800',
          )}
        >
          {/* Header */}
          <View
            style={tw(
              'flex-row items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800',
            )}
          >
            <View style={tw('flex-1 mr-3')}>
              <Text style={tw('text-lg font-bold text-slate-900 dark:text-white')}>
                {t('mobile.doctor_reviews_title', 'Patient Reviews')}
              </Text>
              <Text style={tw('text-xs text-slate-500 dark:text-slate-400')} numberOfLines={1}>
                {doctorName || t('mobile.doctor_profile', 'Doctor Profile')} •{' '}
                {t('mobile.total_reviews_count', {
                  count: totalReviews,
                  defaultValue: `${totalReviews} verified reviews`,
                })}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={tw('p-2 bg-slate-100 dark:bg-slate-800 rounded-full')}
            >
              <X color={twInstance.color('text-slate-600 dark:text-slate-300')} size={20} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={tw('flex-1 px-6')}
            contentContainerStyle={tw('py-5')}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  void loadReviews(true);
                }}
              />
            }
          >
            {loading ? (
              <View style={tw('gap-4')}>
                <Skeleton className="h-28 w-full rounded-2xl" />
                <Skeleton className="h-32 w-full rounded-2xl" />
                <Skeleton className="h-32 w-full rounded-2xl" />
              </View>
            ) : errorMsg ? (
              <View style={tw('items-center py-12 px-4')}>
                <Text style={tw('text-sm text-red-500 text-center mb-4')}>{errorMsg}</Text>
                <TouchableOpacity
                  onPress={() => void loadReviews(false)}
                  style={tw('px-5 py-2.5 rounded-xl bg-brand')}
                >
                  <Text style={tw('font-bold text-slate-900 text-xs')}>
                    {t('mobile.retry', 'Retry')}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {/* Rating Overview */}
                <View
                  style={tw(
                    'flex-row items-center bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 mb-6',
                  )}
                >
                  <View
                    style={tw(
                      'items-center pr-5 border-r border-slate-200 dark:border-slate-800',
                    )}
                  >
                    <Text style={tw('text-4xl font-black text-slate-900 dark:text-white')}>
                      {averageRating.toFixed(1)}
                    </Text>
                    <View style={tw('flex-row my-1')}>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          color="#f59e0b"
                          fill={s <= Math.round(averageRating) ? '#f59e0b' : 'transparent'}
                          size={13}
                        />
                      ))}
                    </View>
                    <Text style={tw('text-[11px] font-bold text-slate-500 dark:text-slate-400')}>
                      {totalReviews} {t('mobile.reviews', 'reviews')}
                    </Text>
                  </View>
                  <View style={tw('flex-1 pl-4 gap-1.5')}>
                    {starPercentages.map((row) => (
                      <View key={row.stars} style={tw('flex-row items-center')}>
                        <Text
                          style={tw(
                            'text-[11px] font-bold text-slate-500 dark:text-slate-400 w-5',
                          )}
                        >
                          {row.stars}★
                        </Text>
                        <View
                          style={tw(
                            'flex-1 h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden mx-2',
                          )}
                        >
                          <View
                            style={{
                              width: `${row.percent}%`,
                              height: '100%',
                              backgroundColor: '#f59e0b',
                            }}
                          />
                        </View>
                        <Text
                          style={tw(
                            'text-[11px] text-slate-400 dark:text-slate-500 w-7 text-right',
                          )}
                        >
                          {row.count}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>

                {reportTarget && (
                  <View
                    style={tw(
                      'bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-2xl p-4 mb-5',
                    )}
                  >
                    <View style={tw('flex-row justify-between items-center mb-2')}>
                      <Text style={tw('text-xs font-bold text-red-700 dark:text-red-300')}>
                        {t('mobile.report_abuse_title', 'Report Abuse')} — {reportTarget.patientName}
                      </Text>
                      <TouchableOpacity onPress={() => setReportTarget(null)}>
                        <X color="#ef4444" size={16} />
                      </TouchableOpacity>
                    </View>
                    <View style={tw('flex-row flex-wrap gap-1.5 mb-3')}>
                      {reasonOptions.map((opt) => (
                        <TouchableOpacity
                          key={opt.key}
                          onPress={() => setReportType(opt.key)}
                          style={tw(
                            `px-2.5 py-1.5 rounded-lg border ${
                              reportType === opt.key
                                ? 'bg-red-600 border-red-600'
                                : 'bg-white dark:bg-slate-900 border-red-200 dark:border-red-800'
                            }`,
                          )}
                        >
                          <Text
                            style={tw(
                              `text-[11px] font-bold ${
                                reportType === opt.key
                                  ? 'text-white'
                                  : 'text-red-700 dark:text-red-300'
                              }`,
                            )}
                          >
                            {opt.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <TextInput
                      value={reportReason}
                      onChangeText={setReportReason}
                      placeholder={t(
                        'mobile.report_reason_placeholder',
                        'Describe why this review violates community guidelines...',
                      )}
                      placeholderTextColor="#94a3b8"
                      multiline
                      style={tw(
                        'bg-white dark:bg-slate-900 border border-red-200 dark:border-red-800 rounded-xl p-3 text-xs text-slate-900 dark:text-white min-h-[70px] mb-3',
                      )}
                    />
                    <TouchableOpacity
                      disabled={submittingReport}
                      onPress={() => void handleSubmitReport()}
                      style={tw('bg-red-600 py-2.5 rounded-xl items-center flex-row justify-center')}
                    >
                      {submittingReport && (
                        <ActivityIndicator size="small" color="#ffffff" style={tw('mr-2')} />
                      )}
                      <Text style={tw('text-xs font-bold text-white')}>
                        {t('mobile.submit_report', 'Submit Report')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {reviews.length === 0 ? (
                  <View style={tw('items-center py-10')}>
                    <Text style={tw('text-sm text-slate-500 dark:text-slate-400 text-center')}>
                      {t('mobile.no_reviews_yet', 'No reviews have been submitted yet.')}
                    </Text>
                  </View>
                ) : (
                  reviews.map((rev) => {
                    const marked = currentUserId
                      ? rev.helpfulBy.includes(currentUserId)
                      : false;
                    const isOwnReview = Boolean(
                      currentUserId && rev.patientId && rev.patientId === currentUserId,
                    );
                    return (
                      <View
                        key={rev.id}
                        style={tw(
                          'bg-white dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 mb-3',
                        )}
                      >
                        <View style={tw('flex-row justify-between items-center mb-2')}>
                          <View>
                            <Text style={tw('font-bold text-sm text-slate-900 dark:text-white')}>
                              {rev.patientName}
                            </Text>
                            <Text style={tw('text-[11px] text-slate-400 dark:text-slate-500')}>
                              {rev.dateLabel}
                            </Text>
                          </View>
                          <View style={tw('flex-row items-center')}>
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                color="#f59e0b"
                                fill={s <= rev.rating ? '#f59e0b' : 'transparent'}
                                size={13}
                              />
                            ))}
                          </View>
                        </View>

                        {rev.comment ? (
                          <Text
                            style={tw('text-xs text-slate-600 dark:text-slate-300 leading-5 mb-3')}
                          >
                            {rev.comment}
                          </Text>
                        ) : null}

                        <View style={tw('flex-row justify-between items-center')}>
                          <TouchableOpacity
                            disabled={helpfulBusyId === rev.id}
                            onPress={() => void handleToggleHelpful(rev)}
                            style={tw(
                              `flex-row items-center px-3 py-1.5 rounded-lg border ${
                                marked
                                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800'
                                  : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                              }`,
                            )}
                          >
                            <ThumbsUp
                              color={marked ? '#10b981' : '#64748b'}
                              size={13}
                              style={tw('mr-1.5')}
                            />
                            <Text
                              style={tw(
                                `text-[11px] font-bold ${
                                  marked
                                    ? 'text-emerald-700 dark:text-emerald-300'
                                    : 'text-slate-500 dark:text-slate-400'
                                }`,
                              )}
                            >
                              {t('mobile.helpful_count', {
                                count: rev.helpfulCount,
                                defaultValue: `Helpful (${rev.helpfulCount})`,
                              })}
                            </Text>
                          </TouchableOpacity>

                          {isOwnReview ? (
                            <TouchableOpacity
                              disabled={deletingId === rev.id}
                              onPress={() => handleDeleteOwnReview(rev)}
                              style={tw(
                                'flex-row items-center px-2.5 py-1.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800',
                              )}
                            >
                              {deletingId === rev.id ? (
                                <ActivityIndicator size="small" color="#ef4444" />
                              ) : (
                                <>
                                  <Trash2 color="#ef4444" size={12} />
                                  <Text style={tw('text-[11px] font-bold ml-1 text-red-500')}>
                                    {t('mobile.delete', 'Delete')}
                                  </Text>
                                </>
                              )}
                            </TouchableOpacity>
                          ) : (
                            <TouchableOpacity
                              disabled={rev.flagged}
                              onPress={() => {
                                setReportTarget(rev);
                                setReportReason('');
                              }}
                              style={tw(
                                `flex-row items-center px-2.5 py-1.5 rounded-lg ${
                                  rev.flagged
                                    ? 'bg-red-50 dark:bg-red-950/40'
                                    : 'bg-slate-100 dark:bg-slate-800'
                                }`,
                              )}
                            >
                              <Flag color={rev.flagged ? '#ef4444' : '#94a3b8'} size={12} />
                              <Text
                                style={tw(
                                  `text-[11px] font-bold ml-1 ${
                                    rev.flagged
                                      ? 'text-red-500'
                                      : 'text-slate-500 dark:text-slate-400'
                                  }`,
                                )}
                              >
                                {rev.flagged
                                  ? t('mobile.reported_label', 'Reported')
                                  : t('mobile.report_abuse_btn', 'Report')}
                              </Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    );
                  })
                )}
              </>
            )}
          </ScrollView>

          <View style={tw('p-4 border-t border-slate-100 dark:border-slate-800')}>
            <TouchableOpacity
              onPress={onClose}
              style={tw('py-3.5 rounded-xl bg-slate-900 dark:bg-white items-center')}
            >
              <Text style={tw('font-bold text-white dark:text-slate-900 text-sm')}>
                {t('mobile.close', 'Close')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
