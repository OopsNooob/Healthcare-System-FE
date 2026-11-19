import React, { useCallback, useEffect, useState } from 'react';
import {
  Image,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  Activity,
  AlertCircle,
  MapPin,
  Phone,
  RefreshCw,
  User,
  X,
} from 'lucide-react-native';
import {
  mobileApi,
  normalizePaginatedList,
} from '@repo/shared-hooks';
import { tw, twInstance } from '@/tw';
import { Skeleton } from '@/components/ui/Skeleton';
import { extractApiErrorMessage } from '@/utils/apiError';
import {
  extractUserProfileData,
  formatAddressSummary,
} from '@/utils/userProfile';

export interface PatientProfileModalTarget {
  id?: string | number;
  patientId?: string;
  enrollmentId?: string;
  name?: string;
  program?: string;
  status?: string;
  baseline?: string;
  current?: string;
  adherence?: number;
}

interface PatientProfileModalProps {
  visible: boolean;
  onClose: () => void;
  patient: PatientProfileModalTarget | null;
}

function formatMetricSummary(item: Record<string, unknown>): string {
  const metricType = String(item.metricType ?? '').replace(/_/g, ' ');
  const unit = String(item.unit ?? '');
  const values = (item.values ?? {}) as Record<string, unknown>;
  if (values.systolic !== undefined && values.diastolic !== undefined) {
    return `${String(values.systolic)}/${String(values.diastolic)} ${unit}`.trim();
  }
  const val = values.value ?? values.amount;
  if (val !== undefined) {
    return `${String(val)} ${unit}`.trim();
  }
  return metricType || '—';
}

export const PatientProfileModal: React.FC<PatientProfileModalProps> = ({
  visible,
  onClose,
  patient,
}) => {
  const { t } = useTranslation();
  const dateLocale = t('mobile.date_locale', 'vi-VN');

  const patientId = String(patient?.patientId ?? patient?.id ?? '');
  const enrollmentId = String(patient?.enrollmentId ?? '');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [profileName, setProfileName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [addressText, setAddressText] = useState('');
  const [emergencyContactText, setEmergencyContactText] = useState('');
  const [allergiesText, setAllergiesText] = useState('');
  const [recentMetrics, setRecentMetrics] = useState<Array<{ id: string; label: string; value: string; recordedAt: string }>>([]);
  const [baselineSummary, setBaselineSummary] = useState('');
  const [adherenceRate, setAdherenceRate] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    if (!visible || !patientId) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const [profileRes, metricsRes, enrollmentRes, completionRes] =
        await Promise.allSettled([
          mobileApi.usersFindProfile({ params: { id: patientId } }),
          mobileApi.healthMetricsFindAll({
            query: {
              patientId,
              limit: 10,
              sortBy: 'recordedAt',
              sortOrder: -1,
            },
          }),
          enrollmentId
            ? mobileApi.careEnrollmentDetail({ params: { id: enrollmentId } })
            : Promise.resolve(null),
          enrollmentId
            ? mobileApi.careTaskCompletionRate({ params: { id: enrollmentId } })
            : Promise.resolve(null),
        ]);

      if (profileRes.status === 'fulfilled') {
        const normalized = extractUserProfileData(profileRes.value);
        setProfileName(normalized.fullName || patient?.name || t('mobile.patient'));
        setAvatarUrl(normalized.avatarUrl);
        setPhoneNumber(normalized.phoneNumber);
        setEmail(normalized.email);
        setGender(normalized.gender);
        setDateOfBirth(normalized.dateOfBirth);
        setAddressText(formatAddressSummary(normalized.address));

        const rawRoot = (profileRes.value ?? {}) as Record<string, unknown>;
        const rawData =
          rawRoot.data && typeof rawRoot.data === 'object'
            ? (rawRoot.data as Record<string, unknown>)
            : rawRoot;
        const pProfile = (rawData.patientProfile ?? {}) as Record<string, unknown>;
        const allergies = pProfile.allergies;
        if (Array.isArray(allergies) && allergies.length > 0) {
          setAllergiesText(allergies.map(String).join(', '));
        } else if (typeof allergies === 'string' && allergies.trim()) {
          setAllergiesText(allergies.trim());
        } else {
          setAllergiesText('');
        }
        const ec = (pProfile.emergencyContact ?? rawData.emergencyContact) as
          | Record<string, unknown>
          | undefined;
        if (ec && (ec.name || ec.phoneNumber || ec.phone)) {
          const parts = [ec.name, ec.relationship, ec.phoneNumber ?? ec.phone]
            .filter(Boolean)
            .map(String);
          setEmergencyContactText(parts.join(' • '));
        } else {
          setEmergencyContactText('');
        }
      } else if (metricsRes.status === 'rejected') {
        throw profileRes.reason;
      }

      if (metricsRes.status === 'fulfilled') {
        const items = normalizePaginatedList<Record<string, unknown>>(metricsRes.value).items;
        setRecentMetrics(
          items
            .map((m) => ({
              id: String(m.id ?? m._id ?? ''),
              label: String(m.metricType ?? '').replace(/_/g, ' '),
              value: formatMetricSummary(m),
              recordedAt: String(m.recordedAt ?? m.createdAt ?? ''),
            }))
            .filter((m) => Boolean(m.id))
        );
      } else {
        setRecentMetrics([]);
      }

      if (enrollmentRes.status === 'fulfilled' && enrollmentRes.value) {
        const rawEnr = enrollmentRes.value as unknown as Record<string, unknown>;
        const detail =
          rawEnr.data && typeof rawEnr.data === 'object'
            ? (rawEnr.data as Record<string, unknown>)
            : rawEnr;
        const baseline = detail.baseline as Record<string, unknown> | undefined;
        const answers = (baseline?.answers ?? detail.baselineAnswers) as
          | Record<string, unknown>
          | undefined;
        if (answers && typeof answers === 'object') {
          const formatted = Object.entries(answers)
            .slice(0, 3)
            .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${String(v)}`)
            .join(' • ');
          setBaselineSummary(formatted);
        } else {
          setBaselineSummary(patient?.baseline ?? '');
        }
      } else {
        setBaselineSummary(patient?.baseline ?? '');
      }

      if (completionRes.status === 'fulfilled' && completionRes.value) {
        const rawRate = completionRes.value as unknown as Record<string, unknown>;
        const dataRate =
          rawRate.data && typeof rawRate.data === 'object'
            ? (rawRate.data as Record<string, unknown>)
            : rawRate;
        const pct =
          typeof dataRate.completionRate === 'number'
            ? dataRate.completionRate
            : typeof dataRate.rate === 'number'
            ? dataRate.rate <= 1
              ? Math.round(dataRate.rate * 100)
              : Math.round(dataRate.rate)
            : null;
        setAdherenceRate(pct);
      } else {
        setAdherenceRate(typeof patient?.adherence === 'number' ? patient.adherence : null);
      }
    } catch (err) {
      setErrorMsg(extractApiErrorMessage(err, 'mobile.load_patient_profile_failed'));
    } finally {
      setLoading(false);
    }
  }, [enrollmentId, patient?.adherence, patient?.baseline, patient?.name, patientId, t, visible]);

  useEffect(() => {
    if (visible && patientId) {
      void loadData();
    }
  }, [loadData, patientId, visible]);

  if (!patient) return null;

  const displayName = profileName || patient.name || t('mobile.patient');
  const ageSuffix = (() => {
    if (!dateOfBirth) return '';
    const dob = new Date(dateOfBirth);
    if (Number.isNaN(dob.getTime())) return '';
    const age = Math.floor((Date.now() - dob.getTime()) / (365.25 * 86400_000));
    return age > 0 && age < 130 ? `${age} ${t('mobile.years_old')}` : '';
  })();

  const genderLabel =
    gender === 'male'
      ? t('mobile.gender_male')
      : gender === 'female'
      ? t('mobile.gender_female')
      : gender === 'other'
      ? t('mobile.gender_other')
      : '';

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={tw('flex-1 justify-end bg-black/60')}>
        <View
          style={tw(
            'bg-white dark:bg-slate-900 rounded-t-3xl h-[86%] border-t border-slate-200 dark:border-slate-800'
          )}
        >
          {/* Header */}
          <View
            style={tw(
              'p-5 border-b border-slate-100 dark:border-slate-800 flex-row items-center justify-between'
            )}
          >
            <View style={tw('flex-row items-center flex-1 mr-3')}>
              <View
                style={tw(
                  'w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-900/40 items-center justify-center mr-3'
                )}
              >
                <User color={twInstance.color('text-blue-600 dark:text-blue-400')} size={20} />
              </View>
              <View style={tw('flex-1')}>
                <Text style={tw('text-lg font-bold text-slate-900 dark:text-white')}>
                  {t('mobile.patient_profile')}
                </Text>
                <Text numberOfLines={1} style={tw('text-xs text-slate-500 dark:text-slate-400')}>
                  {displayName}
                </Text>
              </View>
            </View>
            <View style={tw('flex-row items-center gap-2')}>
              <TouchableOpacity
                onPress={() => void loadData()}
                disabled={loading}
                style={tw('p-2 rounded-full bg-slate-100 dark:bg-slate-800')}
              >
                <RefreshCw
                  color={twInstance.color('text-slate-600 dark:text-slate-300')}
                  size={18}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onClose}
                style={tw('p-2 rounded-full bg-slate-100 dark:bg-slate-800')}
              >
                <X color={twInstance.color('text-slate-600 dark:text-slate-300')} size={20} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView contentContainerStyle={tw('p-5 gap-4')} showsVerticalScrollIndicator={false}>
            {loading ? (
              <View style={tw('gap-3')}>
                <Skeleton className="h-24 w-full rounded-2xl" />
                <Skeleton className="h-32 w-full rounded-2xl" />
                <Skeleton className="h-36 w-full rounded-2xl" />
              </View>
            ) : errorMsg ? (
              <View
                style={tw(
                  'bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-2xl p-5 items-center'
                )}
              >
                <AlertCircle color="#e11d48" size={28} style={tw('mb-2')} />
                <Text style={tw('text-sm font-semibold text-rose-700 dark:text-rose-300 text-center mb-3')}>
                  {errorMsg}
                </Text>
                <TouchableOpacity
                  onPress={() => void loadData()}
                  style={tw('bg-rose-600 px-4 py-2 rounded-xl')}
                >
                  <Text style={tw('text-white font-bold text-xs')}>{t('mobile.retry')}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {/* Top Summary Card */}
                <View
                  style={tw(
                    'bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex-row items-center'
                  )}
                >
                  {avatarUrl ? (
                    <Image
                      source={{ uri: avatarUrl }}
                      style={tw('w-16 h-16 rounded-full mr-4 bg-slate-200')}
                    />
                  ) : (
                    <View
                      style={tw(
                        'w-16 h-16 rounded-full mr-4 bg-blue-100 dark:bg-blue-900/40 items-center justify-center'
                      )}
                    >
                      <User
                        color={twInstance.color('text-blue-600 dark:text-blue-400')}
                        size={28}
                      />
                    </View>
                  )}
                  <View style={tw('flex-1')}>
                    <Text style={tw('text-lg font-bold text-slate-900 dark:text-white')}>
                      {displayName}
                    </Text>
                    <Text style={tw('text-xs text-slate-500 dark:text-slate-400 mt-0.5')}>
                      {[genderLabel, ageSuffix, email].filter(Boolean).join(' • ') ||
                        t('mobile.profile_details')}
                    </Text>
                    {patient.program ? (
                      <View
                        style={tw(
                          'bg-emerald-100 dark:bg-emerald-900/30 self-start px-2.5 py-0.5 rounded-full mt-2'
                        )}
                      >
                        <Text style={tw('text-[11px] font-bold text-emerald-700 dark:text-emerald-300')}>
                          {patient.program}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>

                {/* Demographics & Contact */}
                <View
                  style={tw(
                    'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4'
                  )}
                >
                  <Text
                    style={tw(
                      'text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3'
                    )}
                  >
                    {t('mobile.contact_and_identity')}
                  </Text>
                  <View style={tw('gap-2.5')}>
                    <View style={tw('flex-row items-center')}>
                      <Phone color={twInstance.color('text-slate-400')} size={16} style={tw('mr-2.5')} />
                      <Text style={tw('text-xs text-slate-500 dark:text-slate-400 w-24')}>
                        {t('mobile.phone')}:
                      </Text>
                      <Text style={tw('text-xs font-medium text-slate-800 dark:text-slate-200 flex-1')}>
                        {phoneNumber || t('mobile.not_provided')}
                      </Text>
                    </View>
                    <View style={tw('flex-row items-center')}>
                      <MapPin color={twInstance.color('text-slate-400')} size={16} style={tw('mr-2.5')} />
                      <Text style={tw('text-xs text-slate-500 dark:text-slate-400 w-24')}>
                        {t('mobile.address')}:
                      </Text>
                      <Text style={tw('text-xs font-medium text-slate-800 dark:text-slate-200 flex-1')}>
                        {addressText || t('mobile.not_provided')}
                      </Text>
                    </View>
                    <View style={tw('flex-row items-center')}>
                      <AlertCircle color={twInstance.color('text-amber-500')} size={16} style={tw('mr-2.5')} />
                      <Text style={tw('text-xs text-slate-500 dark:text-slate-400 w-24')}>
                        {t('mobile.emergency')}:
                      </Text>
                      <Text style={tw('text-xs font-medium text-slate-800 dark:text-slate-200 flex-1')}>
                        {emergencyContactText || t('mobile.not_provided')}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Clinical Baseline & Adherence */}
                <View
                  style={tw(
                    'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4'
                  )}
                >
                  <Text
                    style={tw(
                      'text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3'
                    )}
                  >
                    {t('mobile.clinical_baseline')}
                  </Text>
                  <View style={tw('gap-2.5')}>
                    <View
                      style={tw(
                        'flex-row justify-between gap-2 py-1 border-b border-slate-100 dark:border-slate-800'
                      )}
                    >
                      <Text style={tw('text-xs text-slate-500 dark:text-slate-400')}>
                        {t('mobile.known_allergies')}
                      </Text>
                      <Text
                        style={tw(
                          `text-xs font-bold text-right flex-1 ${
                            allergiesText ? 'text-red-500' : 'text-slate-600 dark:text-slate-300'
                          }`
                        )}
                      >
                        {allergiesText || t('mobile.none_reported')}
                      </Text>
                    </View>
                    <View
                      style={tw(
                        'flex-row justify-between gap-2 py-1 border-b border-slate-100 dark:border-slate-800'
                      )}
                    >
                      <Text style={tw('text-xs text-slate-500 dark:text-slate-400')}>
                        {t('mobile.baseline_survey_bp')}
                      </Text>
                      <Text style={tw('text-xs font-bold text-slate-800 dark:text-slate-200 text-right flex-1')}>
                        {baselineSummary || t('mobile.not_recorded')}
                      </Text>
                    </View>
                    <View
                      style={tw(
                        'flex-row justify-between gap-2 py-1 border-b border-slate-100 dark:border-slate-800'
                      )}
                    >
                      <Text style={tw('text-xs text-slate-500 dark:text-slate-400')}>
                        {t('mobile.current_telemetry_avg')}
                      </Text>
                      <Text style={tw('text-xs font-bold text-slate-800 dark:text-slate-200 text-right flex-1')}>
                        {recentMetrics[0]?.value || patient.current || t('mobile.not_recorded')}
                      </Text>
                    </View>
                    <View style={tw('flex-row justify-between py-1')}>
                      <Text style={tw('text-xs text-slate-500 dark:text-slate-400')}>
                        {t('mobile.program_adherence')}
                      </Text>
                      <Text style={tw('text-xs font-bold text-emerald-500')}>
                        {adherenceRate !== null ? `${adherenceRate}%` : '—'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Recent Health Metrics */}
                <View
                  style={tw(
                    'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4'
                  )}
                >
                  <View style={tw('flex-row items-center mb-3')}>
                    <Activity color={twInstance.color('text-emerald-500')} size={16} style={tw('mr-2')} />
                    <Text
                      style={tw(
                        'text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500'
                      )}
                    >
                      {t('mobile.recent_health_readings')}
                    </Text>
                  </View>
                  {recentMetrics.length === 0 ? (
                    <Text style={tw('text-xs text-slate-500 dark:text-slate-400')}>
                      {t('mobile.no_recent_metrics')}
                    </Text>
                  ) : (
                    <View style={tw('gap-2')}>
                      {recentMetrics.slice(0, 5).map((m) => (
                        <View
                          key={m.id}
                          style={tw(
                            'flex-row justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800'
                          )}
                        >
                          <View style={tw('flex-1 mr-2')}>
                            <Text style={tw('text-xs font-bold text-slate-800 dark:text-slate-200 capitalize')}>
                              {m.label}
                            </Text>
                            <Text style={tw('text-[11px] text-slate-400')}>
                              {m.recordedAt ? new Date(m.recordedAt).toLocaleString(dateLocale) : '—'}
                            </Text>
                          </View>
                          <Text style={tw('text-sm font-bold text-slate-900 dark:text-white')}>
                            {m.value}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={tw('p-4 border-t border-slate-100 dark:border-slate-800')}>
            <TouchableOpacity
              onPress={onClose}
              style={tw('bg-brand py-3.5 rounded-xl items-center')}
            >
              <Text style={tw('text-slate-900 font-bold text-sm')}>{t('mobile.close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
