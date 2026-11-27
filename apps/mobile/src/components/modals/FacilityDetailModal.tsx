import React, { useCallback, useEffect, useState } from 'react';
import { Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  AlertCircle,
  AlertTriangle,
  Building2,
  CalendarCheck2,
  ExternalLink,
  Globe,
  Info,
  MapPin,
  Navigation,
  Phone,
  ShieldCheck,
  Stethoscope,
  X,
} from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { mobileApi, type FeTypes } from '@repo/shared-hooks';
import { tw, twInstance } from '@/tw';
import { AppModalToast } from '@/components/ui/AppToast';
import { Skeleton } from '@/components/ui/Skeleton';
import { extractApiErrorInfo, extractApiErrorMessage } from '@/utils/apiError';
import {
  openExternalHttpsUrl,
  openMapsDirections,
  openPhoneCall,
} from '@/utils/externalLinks';

interface FacilityDetailModalProps {
  visible: boolean;
  facilityId: string | null;
  distanceMeters?: number;
  specialtyNameMap?: Record<string, string>;
  onClose: () => void;
  onUnavailable?: () => void;
}

function formatFacilityAddress(address?: FeTypes.FacilityDirectoryAddress): string {
  if (!address) return '--';
  return [address.street, address.ward, address.district, address.province]
    .filter(Boolean)
    .join(', ');
}

function formatDistanceText(meters?: number): string | null {
  if (typeof meters !== 'number' || !Number.isFinite(meters)) return null;
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export const FacilityDetailModal: React.FC<FacilityDetailModalProps> = ({
  visible,
  facilityId,
  distanceMeters,
  specialtyNameMap = {},
  onClose,
  onUnavailable,
}) => {
  const { t } = useTranslation();
  const dateLocale = t('mobile.date_locale', 'vi-VN');

  const [detail, setDetail] = useState<FeTypes.FacilityDirectoryDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState(false);

  const loadDetail = useCallback(async () => {
    if (!visible || !facilityId) return;
    setLoading(true);
    setErrorMsg(null);
    setDetail(null);
    try {
      const res = await mobileApi.medicalFacilitiesGetDetail({
        params: { id: facilityId },
      });
      const raw = res as unknown as {
        data?: FeTypes.FacilityDirectoryDetail;
      } & FeTypes.FacilityDirectoryDetail;
      const payload = raw?.data ?? raw;
      setDetail(payload);
    } catch (err) {
      const info = extractApiErrorInfo(err);
      const msg = extractApiErrorMessage(err, 'mobile.facility_load_detail_failed');
      if (info.code === 'VERIFIED_FACILITY_NOT_FOUND') {
        Toast.show({
          type: 'info',
          text1: t('mobile.facility_no_longer_available'),
          text2: msg,
        });
        onClose();
        onUnavailable?.();
        return;
      }
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  }, [facilityId, onClose, onUnavailable, t, visible]);

  useEffect(() => {
    if (visible && facilityId) {
      void loadDetail();
    } else {
      setDetail(null);
      setErrorMsg(null);
    }
  }, [facilityId, loadDetail, visible]);

  const handleDirections = async () => {
    if (!detail || busyAction) return;
    setBusyAction(true);
    try {
      await openMapsDirections(
        detail.name,
        formatFacilityAddress(detail.address),
        detail.location?.coordinates,
      );
    } finally {
      setBusyAction(false);
    }
  };

  const handleCall = async () => {
    if (!detail?.contact?.phone || busyAction) return;
    setBusyAction(true);
    try {
      await openPhoneCall(detail.contact.phone);
    } finally {
      setBusyAction(false);
    }
  };

  const handleOpenUrl = async (url?: string) => {
    if (!url || busyAction) return;
    setBusyAction(true);
    try {
      await openExternalHttpsUrl(url);
    } finally {
      setBusyAction(false);
    }
  };

  const addressText = formatFacilityAddress(detail?.address);
  const distanceText = formatDistanceText(distanceMeters);
  const formattedLastChecked = detail?.lastCheckedAt
    ? new Date(detail.lastCheckedAt).toLocaleDateString(dateLocale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={tw('flex-1 justify-end bg-black/60')}>
        <View
          style={tw(
            'bg-white dark:bg-slate-900 rounded-t-3xl max-h-[88%] border-t border-slate-200 dark:border-slate-800',
          )}
        >
          {/* Header */}
          <View
            style={tw(
              'p-5 border-b border-slate-100 dark:border-slate-800 flex-row items-center justify-between',
            )}
          >
            <View style={tw('flex-row items-center flex-1 mr-3')}>
              <View
                style={tw(
                  'w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/40 items-center justify-center mr-3',
                )}
              >
                <Building2
                  color={twInstance.color('text-indigo-600 dark:text-indigo-400')}
                  size={24}
                />
              </View>
              <View style={tw('flex-1')}>
                <Text
                  style={tw('text-lg font-bold text-slate-900 dark:text-white')}
                  numberOfLines={2}
                >
                  {detail?.name ?? t('mobile.facility_detail_title')}
                </Text>
                {detail?.facilityType && (
                  <Text
                    style={tw(
                      'text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5',
                    )}
                  >
                    {t(`mobile.facility_type_${detail.facilityType}`)}
                  </Text>
                )}
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={tw('p-2 rounded-full bg-slate-100 dark:bg-slate-800')}
            >
              <X
                color={twInstance.color('text-slate-600 dark:text-slate-300')}
                size={20}
              />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={tw('p-5 gap-4')}
            showsVerticalScrollIndicator={false}
          >
            {loading ? (
              <View style={tw('gap-3')}>
                <Skeleton className="h-8 w-44 rounded-full" />
                <Skeleton className="h-24 w-full rounded-2xl" />
                <Skeleton className="h-20 w-full rounded-2xl" />
                <Skeleton className="h-20 w-full rounded-2xl" />
              </View>
            ) : errorMsg ? (
              <View
                style={tw(
                  'bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-2xl p-5 items-center',
                )}
              >
                <AlertCircle color="#e11d48" size={28} style={tw('mb-2')} />
                <Text
                  style={tw(
                    'text-sm font-semibold text-rose-700 dark:text-rose-300 text-center mb-3',
                  )}
                >
                  {errorMsg}
                </Text>
                <TouchableOpacity
                  onPress={() => void loadDetail()}
                  style={tw('bg-rose-600 px-4 py-2 rounded-xl')}
                >
                  <Text style={tw('text-white font-bold text-xs')}>
                    {t('mobile.retry')}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : detail ? (
              <>
                {/* Verification & Freshness Badges */}
                <View style={tw('flex-row flex-wrap gap-2')}>
                  {detail.verificationLabel === 'needs_recheck' ? (
                    <View
                      style={tw(
                        'bg-amber-50 dark:bg-amber-900/30 px-3 py-1 rounded-full border border-amber-200 dark:border-amber-800/50 flex-row items-center',
                      )}
                    >
                      <AlertTriangle color="#d97706" size={14} style={tw('mr-1.5')} />
                      <Text
                        style={tw(
                          'text-xs font-bold text-amber-700 dark:text-amber-300',
                        )}
                      >
                        {t('mobile.facility_needs_recheck')}
                      </Text>
                    </View>
                  ) : (
                    <View
                      style={tw(
                        'bg-emerald-50 dark:bg-emerald-900/30 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-800/50 flex-row items-center',
                      )}
                    >
                      <ShieldCheck color="#10b981" size={14} style={tw('mr-1.5')} />
                      <Text
                        style={tw(
                          'text-xs font-bold text-emerald-700 dark:text-emerald-300',
                        )}
                      >
                        {t('mobile.verified_facility')}
                      </Text>
                    </View>
                  )}

                  {formattedLastChecked && (
                    <View
                      style={tw(
                        'bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full flex-row items-center',
                      )}
                    >
                      <Text
                        style={tw(
                          'text-xs font-medium text-slate-600 dark:text-slate-300',
                        )}
                      >
                        {t('mobile.facility_last_checked', {
                          date: formattedLastChecked,
                        })}
                      </Text>
                    </View>
                  )}
                </View>

                {detail.verificationLabel === 'needs_recheck' && (
                  <View
                    style={tw(
                      'bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-2xl p-3 flex-row items-start',
                    )}
                  >
                    <Info color="#d97706" size={15} style={tw('mr-2 mt-0.5')} />
                    <Text
                      style={tw(
                        'flex-1 text-xs text-amber-800 dark:text-amber-300',
                      )}
                    >
                      {t('mobile.facility_needs_recheck_hint')}
                    </Text>
                  </View>
                )}

                {/* Address & Contact Card */}
                <View
                  style={tw(
                    'bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 gap-3',
                  )}
                >
                  <View style={tw('flex-row items-start')}>
                    <MapPin
                      color={twInstance.color('text-slate-400')}
                      size={18}
                      style={tw('mr-2.5 mt-0.5')}
                    />
                    <View style={tw('flex-1')}>
                      <Text
                        style={tw(
                          'text-xs font-bold text-slate-800 dark:text-slate-200',
                        )}
                      >
                        {t('mobile.address')}
                      </Text>
                      <Text
                        style={tw(
                          'text-xs text-slate-600 dark:text-slate-400 mt-0.5',
                        )}
                      >
                        {addressText}
                      </Text>
                    </View>
                    {distanceText && (
                      <View
                        style={tw(
                          'bg-brand/15 dark:bg-brand/20 px-2.5 py-1 rounded-lg ml-2',
                        )}
                      >
                        <Text
                          style={tw(
                            'text-xs font-bold text-slate-900 dark:text-brand',
                          )}
                        >
                          {distanceText}
                        </Text>
                      </View>
                    )}
                  </View>

                  {detail.contact?.phone && (
                    <View
                      style={tw(
                        'flex-row items-center pt-2.5 border-t border-slate-200 dark:border-slate-800',
                      )}
                    >
                      <Phone
                        color={twInstance.color('text-slate-400')}
                        size={16}
                        style={tw('mr-2.5')}
                      />
                      <Text
                        style={tw(
                          'text-xs font-medium text-slate-700 dark:text-slate-300 flex-1',
                        )}
                      >
                        {detail.contact.phone}
                      </Text>
                    </View>
                  )}

                  {detail.contact?.website && (
                    <TouchableOpacity
                      disabled={busyAction}
                      onPress={() => void handleOpenUrl(detail.contact?.website)}
                      style={tw(
                        'flex-row items-center pt-2.5 border-t border-slate-200 dark:border-slate-800',
                      )}
                    >
                      <Globe color="#2563eb" size={16} style={tw('mr-2.5')} />
                      <Text
                        numberOfLines={1}
                        style={tw(
                          'text-xs font-semibold text-blue-600 dark:text-blue-400 flex-1',
                        )}
                      >
                        {detail.contact.website}
                      </Text>
                      <ExternalLink color="#2563eb" size={14} />
                    </TouchableOpacity>
                  )}

                  {detail.contact?.bookingUrl && (
                    <View
                      style={tw(
                        'pt-2.5 border-t border-slate-200 dark:border-slate-800 gap-1',
                      )}
                    >
                      <TouchableOpacity
                        disabled={busyAction}
                        onPress={() =>
                          void handleOpenUrl(detail.contact?.bookingUrl)
                        }
                        style={tw('flex-row items-center')}
                      >
                        <CalendarCheck2
                          color="#059669"
                          size={16}
                          style={tw('mr-2.5')}
                        />
                        <Text
                          style={tw(
                            'text-xs font-bold text-emerald-700 dark:text-emerald-400 flex-1',
                          )}
                        >
                          {t('mobile.facility_external_booking_link')}
                        </Text>
                        <ExternalLink color="#059669" size={14} />
                      </TouchableOpacity>
                      <Text
                        style={tw(
                          'text-[11px] text-slate-500 dark:text-slate-400',
                        )}
                      >
                        {t('mobile.facility_booking_disclaimer')}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Specialties */}
                <View
                  style={tw(
                    'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4',
                  )}
                >
                  <View style={tw('flex-row items-center mb-2')}>
                    <Stethoscope
                      color={twInstance.color('text-slate-500 dark:text-slate-400')}
                      size={14}
                      style={tw('mr-1.5')}
                    />
                    <Text
                      style={tw(
                        'text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400',
                      )}
                    >
                      {t('mobile.specialized_departments')}
                    </Text>
                  </View>
                  <View style={tw('flex-row flex-wrap gap-2')}>
                    {detail.specialtyCodes.map((code) => (
                      <View
                        key={code}
                        style={tw('bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl')}
                      >
                        <Text
                          style={tw(
                            'text-xs text-slate-700 dark:text-slate-200 font-semibold',
                          )}
                        >
                          {specialtyNameMap[code] || code}
                        </Text>
                      </View>
                    ))}
                  </View>

                  {detail.services?.length > 0 && (
                    <View
                      style={tw(
                        'mt-3 pt-3 border-t border-slate-100 dark:border-slate-800',
                      )}
                    >
                      <Text
                        style={tw(
                          'text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2',
                        )}
                      >
                        {t('mobile.facility_services')}
                      </Text>
                      <View style={tw('flex-row flex-wrap gap-2')}>
                        {detail.services.map((service) => (
                          <View
                            key={service}
                            style={tw(
                              'bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded-lg',
                            )}
                          >
                            <Text
                              style={tw(
                                'text-xs text-indigo-700 dark:text-indigo-300 font-medium',
                              )}
                            >
                              {service}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
                </View>

                {/* Official Source Reference */}
                {detail.source?.reference && (
                  <TouchableOpacity
                    disabled={busyAction}
                    onPress={() => void handleOpenUrl(detail.source.reference)}
                    style={tw(
                      'bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 flex-row items-center justify-between',
                    )}
                  >
                    <View style={tw('flex-1 mr-2')}>
                      <Text
                        style={tw(
                          'text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400',
                        )}
                      >
                        {t('mobile.facility_official_source')}
                      </Text>
                      <Text
                        numberOfLines={1}
                        style={tw(
                          'text-xs text-blue-600 dark:text-blue-400 mt-0.5',
                        )}
                      >
                        {detail.source.reference}
                      </Text>
                    </View>
                    <ExternalLink color="#2563eb" size={16} />
                  </TouchableOpacity>
                )}
              </>
            ) : null}
          </ScrollView>

          {/* Action Row */}
          {detail && !loading && (
            <View
              style={tw(
                'p-4 border-t border-slate-100 dark:border-slate-800 flex-row gap-3',
              )}
            >
              <TouchableOpacity
                disabled={busyAction}
                onPress={() => void handleDirections()}
                style={tw(
                  'flex-1 bg-brand py-3.5 rounded-xl flex-row items-center justify-center',
                )}
              >
                <Navigation color="#0f172a" size={18} style={tw('mr-2')} />
                <Text style={tw('text-slate-900 font-bold text-sm')}>
                  {t('mobile.directions')}
                </Text>
              </TouchableOpacity>

              {detail.contact?.phone && (
                <TouchableOpacity
                  disabled={busyAction}
                  onPress={() => void handleCall()}
                  style={tw(
                    'flex-1 bg-slate-100 dark:bg-slate-800 py-3.5 rounded-xl flex-row items-center justify-center border border-slate-200 dark:border-slate-700',
                  )}
                >
                  <Phone
                    color={twInstance.color('text-slate-700 dark:text-slate-300')}
                    size={18}
                    style={tw('mr-2')}
                  />
                  <Text
                    style={tw(
                      'text-slate-700 dark:text-slate-300 font-bold text-sm',
                    )}
                  >
                    {t('mobile.call_now')}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
        <AppModalToast visible={visible} />
      </View>
    </Modal>
  );
};
