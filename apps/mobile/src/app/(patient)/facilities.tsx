import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Building2,
  Compass,
  ExternalLink,
  HeartPulse,
  MapPin,
  Phone,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Stethoscope,
} from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import {
  mobileApi,
  normalizePaginatedList,
  type FeTypes,
} from '@repo/shared-hooks';
import { tw, twInstance } from '@/tw';
import { useThemeContext } from '@/context/ThemeContext';
import { useSafeRouter as useRouter } from '@/utils/useSafeRouter';
import { Skeleton } from '@/components/ui/Skeleton';
import { FacilityDetailModal } from '@/components/modals';
import { extractApiErrorInfo, extractApiErrorMessage } from '@/utils/apiError';
import { openExternalHttpsUrl, openPhoneCall } from '@/utils/externalLinks';

type SelectorMode = 'specialty' | 'program' | 'disease';
type ScopeMode = 'area' | 'location';

interface ProgramChoice {
  programCode: string;
  name: string;
  diseaseKey: string;
  isEnrolled?: boolean;
}

const HCMC_AREA_PRESETS = [
  'Quận 1',
  'Quận 3',
  'Quận 5',
  'Quận 7',
  'Quận 10',
  'Bình Thạnh',
  'Phú Nhuận',
  'Tân Bình',
  'Gò Vấp',
  'Thủ Đức',
] as const;

const RADIUS_OPTIONS = [3, 5, 10, 20, 50] as const;

function formatFacilityAddress(address?: FeTypes.FacilityDirectoryAddress): string {
  if (!address) return '--';
  return (
    [address.street, address.ward, address.district, address.province]
      .filter(Boolean)
      .join(', ') || '--'
  );
}

function formatDistanceText(meters?: number): string | null {
  if (typeof meters !== 'number' || !Number.isFinite(meters)) return null;
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('GPS_TIMEOUT'));
    }, timeoutMs);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

function isWithinHcmcArea(lat: number, lng: number): boolean {
  return lat >= 10.35 && lat <= 11.2 && lng >= 106.35 && lng <= 107.05;
}

export default function MedicalFacilitiesScreen() {
  const { t } = useTranslation();
  useThemeContext();
  const router = useRouter();
  const dateLocale = t('mobile.date_locale', 'vi-VN');

  const [directoryDisabled, setDirectoryDisabled] = useState(false);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [specialties, setSpecialties] = useState<FeTypes.FacilityDirectorySpecialty[]>([]);
  const [programs, setPrograms] = useState<ProgramChoice[]>([]);

  // Selector states (mutually exclusive: specialty | program | disease)
  const [selectorMode, setSelectorMode] = useState<SelectorMode>('specialty');
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('');
  const [selectedProgram, setSelectedProgram] = useState<string>('');
  const [selectedDisease, setSelectedDisease] = useState<string>('');

  // Scope states (mutually exclusive: area | location)
  const [scopeMode, setScopeMode] = useState<ScopeMode>('area');
  const [areaText, setAreaText] = useState('Quận 1');
  const [locationConsent, setLocationConsent] = useState(false);
  const [coords, setCoords] = useState<FeTypes.FacilityDirectoryLocationRequest | null>(null);
  const [locatingGps, setLocatingGps] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [radiusKm, setRadiusKm] = useState<number>(10);

  // Internal search results
  const [searching, setSearching] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [mappingStatus, setMappingStatus] = useState<
    'matched' | 'manual_specialty_required' | null
  >(null);
  const [items, setItems] = useState<FeTypes.FacilityDirectorySearchItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);

  // External Google Maps fallback (explicit user action ONLY)
  const [externalSpecialtyOverride, setExternalSpecialtyOverride] = useState('');
  const [externalLoading, setExternalLoading] = useState(false);
  const [externalError, setExternalError] = useState<string | null>(null);
  const [externalItems, setExternalItems] = useState<FeTypes.FacilityDirectoryMapCandidate[]>([]);
  const [externalAttributions, setExternalAttributions] = useState<string[]>([]);
  const [hasSearchedExternal, setHasSearchedExternal] = useState(false);

  // Detail modal & action locks
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [detailFacilityId, setDetailFacilityId] = useState<string | null>(null);
  const [detailDistanceMeters, setDetailDistanceMeters] = useState<number | undefined>(
    undefined
  );
  const actionLockRef = useRef(false);
  const latestSearchSeqRef = useRef(0);

  const specialtyNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const sp of specialties) {
      map[sp.code] = sp.nameVi;
    }
    return map;
  }, [specialties]);

  const diseaseKeys = useMemo(
    () => Array.from(new Set(programs.map((p) => p.diseaseKey).filter(Boolean))),
    [programs]
  );

  const loadInitialCatalog = useCallback(async () => {
    setLoadingCatalog(true);
    setDirectoryDisabled(false);
    try {
      const [specRes, progRes, enrollRes] = await Promise.allSettled([
        mobileApi.medicalFacilitiesListSpecialties(),
        mobileApi.careProgramRuleListPrograms({
          query: { status: 'published', limit: 50, page: 1 },
        }),
        mobileApi.careEnrollmentList({
          query: { limit: 10, sortBy: 'updatedAt', sortOrder: -1 },
        }),
      ]);

      if (specRes.status === 'rejected') {
        const info = extractApiErrorInfo(specRes.reason);
        if (info.code === 'FACILITY_DIRECTORY_DISABLED') {
          setDirectoryDisabled(true);
          setSpecialties([]);
          return;
        }
        setSearchError(
          extractApiErrorMessage(specRes.reason, 'mobile.facility_load_specialties_failed')
        );
      } else {
        const raw = specRes.value as unknown as {
          data?: FeTypes.FacilityDirectorySpecialty[];
        };
        const list = Array.isArray(raw?.data) ? raw.data : [];
        setSpecialties(list);
        if (list.length > 0) {
          setSelectedSpecialty((prev) => prev || list[0].code);
          setExternalSpecialtyOverride((prev) => prev || list[0].code);
        }
      }

      const enrolledIds = new Set<string>();
      if (enrollRes.status === 'fulfilled') {
        const enrollPage = normalizePaginatedList<Record<string, unknown>>(enrollRes.value);
        for (const e of enrollPage.items) {
          if (e.careProgramId) enrolledIds.add(String(e.careProgramId));
        }
      }

      if (progRes.status === 'fulfilled') {
        const progPage = normalizePaginatedList<Record<string, unknown>>(progRes.value);
        const mapped = progPage.items
          .map((item) => ({
            programCode: String(item.programCode ?? ''),
            name: String(item.name ?? item.programCode ?? ''),
            diseaseKey: String(item.diseaseKey ?? ''),
            isEnrolled: enrolledIds.has(String(item.id ?? item._id ?? '')),
          }))
          .filter((p) => Boolean(p.programCode))
          .sort((a, b) => Number(b.isEnrolled) - Number(a.isEnrolled));
        setPrograms(mapped);
        if (mapped.length > 0) {
          setSelectedProgram((prev) => prev || mapped[0].programCode);
          const firstDisease = mapped.find((p) => Boolean(p.diseaseKey))?.diseaseKey;
          if (firstDisease) setSelectedDisease((prev) => prev || firstDisease);
        }
      }
    } finally {
      setLoadingCatalog(false);
    }
  }, []);

  useEffect(() => {
    void loadInitialCatalog();
  }, [loadInitialCatalog]);

  const buildInternalSearchBody = useCallback(
    (targetPage: number): FeTypes.FacilityDirectorySearchRequest | null => {
      const selector: Partial<FeTypes.FacilityDirectorySearchRequest> = {};
      if (selectorMode === 'specialty') {
        if (!selectedSpecialty) return null;
        selector.specialtyCode = selectedSpecialty;
      } else if (selectorMode === 'program') {
        if (!selectedProgram) return null;
        selector.programCode = selectedProgram;
      } else {
        if (!selectedDisease) return null;
        selector.diseaseKey = selectedDisease;
      }

      if (scopeMode === 'location') {
        if (!locationConsent || !coords) return null;
        return {
          ...selector,
          location: {
            longitude: coords.longitude,
            latitude: coords.latitude,
          },
          locationConsent: true,
          radiusKm,
          page: targetPage,
          limit: 20,
        };
      }

      const trimmedArea = areaText.trim();
      if (!trimmedArea) return null;
      return {
        ...selector,
        area: trimmedArea,
        page: targetPage,
        limit: 20,
      };
    },
    [
      areaText,
      coords,
      locationConsent,
      radiusKm,
      scopeMode,
      selectedDisease,
      selectedProgram,
      selectedSpecialty,
      selectorMode,
    ]
  );

  const runInternalSearch = useCallback(
    async (targetPage = 1, append = false) => {
      if (directoryDisabled) return;
      const body = buildInternalSearchBody(targetPage);
      if (!body) {
        if (!append) {
          setItems([]);
          setMappingStatus(null);
          setHasNextPage(false);
        }
        return;
      }

      const seq = ++latestSearchSeqRef.current;
      if (append) {
        setLoadingMore(true);
      } else {
        setSearching(true);
        setSearchError(null);
        // Clear stale results immediately when filters change per integration contract
        setItems([]);
        setMappingStatus(null);
        setExternalItems([]);
        setExternalError(null);
        setHasSearchedExternal(false);
      }

      try {
        const res = await mobileApi.medicalFacilitiesSearch({ body });
        if (seq !== latestSearchSeqRef.current) return;
        const raw = res as unknown as {
          data?: FeTypes.FacilityDirectorySearchResponse['data'];
        };
        const payload = raw?.data ?? (res as unknown as FeTypes.FacilityDirectorySearchResponse['data']);
        const nextItems = Array.isArray(payload?.items) ? payload.items : [];

        setMappingStatus(payload?.mappingStatus ?? 'matched');
        setItems((prev) => (append ? [...prev, ...nextItems] : nextItems));
        setPage(Number(payload?.pagination?.page ?? targetPage));
        setHasNextPage(Boolean(payload?.pagination?.hasNextPage));
      } catch (err) {
        if (seq !== latestSearchSeqRef.current) return;
        const info = extractApiErrorInfo(err);
        if (info.code === 'FACILITY_DIRECTORY_DISABLED') {
          setDirectoryDisabled(true);
          return;
        }
        setSearchError(
          extractApiErrorMessage(err, 'mobile.facility_search_failed')
        );
      } finally {
        if (seq === latestSearchSeqRef.current) {
          setSearching(false);
          setLoadingMore(false);
        }
      }
    },
    [buildInternalSearchBody, directoryDisabled]
  );

  // Trigger search automatically when active catalog & selector/scope are ready
  useEffect(() => {
    if (loadingCatalog || directoryDisabled) return;
    if (scopeMode === 'area' && !areaText.trim()) return;
    if (scopeMode === 'location' && (!locationConsent || !coords)) return;
    const timer = setTimeout(() => {
      void runInternalSearch(1, false);
    }, 250);
    return () => clearTimeout(timer);
  }, [
    areaText,
    coords,
    directoryDisabled,
    loadingCatalog,
    locationConsent,
    radiusKm,
    runInternalSearch,
    scopeMode,
    selectedDisease,
    selectedProgram,
    selectedSpecialty,
    selectorMode,
  ]);

  const handleRequestGpsLocation = async () => {
    if (locatingGps) return;
    setLocatingGps(true);
    setGpsError(null);
    try {
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        setLocationConsent(false);
        setCoords(null);
        setGpsError(t('mobile.facility_gps_services_disabled'));
        return;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationConsent(false);
        setCoords(null);
        setGpsError(t('mobile.facility_gps_permission_denied'));
        return;
      }

      let pos: Location.LocationObject | null = null;
      try {
        pos = await withTimeout(
          Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          }),
          8000
        );
      } catch {
        pos = null;
      }

      if (!pos?.coords) {
        try {
          pos = await Location.getLastKnownPositionAsync({
            maxAge: 3_600_000,
          });
        } catch {
          pos = null;
        }
      }

      if (!pos?.coords) {
        try {
          pos = await Location.getLastKnownPositionAsync();
        } catch {
          pos = null;
        }
      }

      if (!pos?.coords) {
        try {
          pos = await withTimeout(
            Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Lowest,
            }),
            5000
          );
        } catch {
          pos = null;
        }
      }

      if (
        pos?.coords &&
        Number.isFinite(pos.coords.latitude) &&
        Number.isFinite(pos.coords.longitude)
      ) {
        setLocationConsent(true);
        setCoords({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
      } else {
        setLocationConsent(false);
        setCoords(null);
        setGpsError(t('mobile.facility_gps_unavailable_fallback'));
      }
    } catch {
      setLocationConsent(false);
      setCoords(null);
      setGpsError(t('mobile.facility_gps_unavailable_fallback'));
    } finally {
      setLocatingGps(false);
    }
  };

  const handleExternalGoogleSearch = async () => {
    if (externalLoading || directoryDisabled) return;

    const specialtyForExternal =
      selectorMode === 'specialty'
        ? selectedSpecialty
        : externalSpecialtyOverride || specialties[0]?.code || '';

    if (!specialtyForExternal) {
      Toast.show({
        type: 'info',
        text1: t('mobile.facility_select_specialty_for_google'),
      });
      return;
    }

    if (scopeMode === 'location' && (!locationConsent || !coords)) {
      Toast.show({
        type: 'info',
        text1: t('mobile.facility_gps_consent_required'),
      });
      return;
    }
    if (scopeMode === 'area' && !areaText.trim()) {
      Toast.show({
        type: 'info',
        text1: t('mobile.facility_enter_area_required'),
      });
      return;
    }

    setExternalLoading(true);
    setExternalError(null);
    setHasSearchedExternal(true);
    try {
      const body: FeTypes.FacilityDirectoryExternalSearchRequest =
        scopeMode === 'location' && coords
          ? {
              specialtyCode: specialtyForExternal,
              location: {
                longitude: coords.longitude,
                latitude: coords.latitude,
              },
              locationConsent: true,
              radiusKm,
            }
          : {
              specialtyCode: specialtyForExternal,
              area: areaText.trim(),
            };

      const res = await mobileApi.medicalFacilitiesExternalSearch({ body });
      const raw = res as unknown as {
        data?: FeTypes.FacilityDirectoryExternalSearchResponse['data'];
      };
      const payload =
        raw?.data ??
        (res as unknown as FeTypes.FacilityDirectoryExternalSearchResponse['data']);
      const list = Array.isArray(payload?.items) ? payload.items : [];
      setExternalItems(list);

      const thirdParties = new Set<string>();
      for (const candidate of list) {
        if (Array.isArray(candidate.thirdPartyAttributions)) {
          for (const attr of candidate.thirdPartyAttributions) {
            if (attr.provider) thirdParties.add(attr.provider);
          }
        }
      }
      setExternalAttributions(Array.from(thirdParties));
    } catch (err) {
      // Keep internal verified results intact when Google provider fails
      setExternalError(
        extractApiErrorMessage(err, 'mobile.facility_external_search_failed')
      );
      setExternalItems([]);
    } finally {
      setExternalLoading(false);
    }
  };

  const onRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      if (directoryDisabled || specialties.length === 0) {
        await loadInitialCatalog();
      } else {
        await runInternalSearch(1, false);
      }
    } finally {
      setRefreshing(false);
    }
  };

  const handleOpenDetail = (item: FeTypes.FacilityDirectorySearchItem) => {
    if (actionLockRef.current) return;
    actionLockRef.current = true;
    setDetailFacilityId(item.id);
    setDetailDistanceMeters(item.distanceMeters);
    setDetailModalVisible(true);
    setTimeout(() => {
      actionLockRef.current = false;
    }, 350);
  };

  const handleSafeCall = async (phone?: string) => {
    if (!phone || actionLockRef.current) return;
    actionLockRef.current = true;
    try {
      await openPhoneCall(phone);
    } finally {
      setTimeout(() => {
        actionLockRef.current = false;
      }, 400);
    }
  };

  const handleSafeOpenLink = async (url?: string) => {
    if (!url || actionLockRef.current) return;
    actionLockRef.current = true;
    try {
      await openExternalHttpsUrl(url);
    } finally {
      setTimeout(() => {
        actionLockRef.current = false;
      }, 400);
    }
  };

  return (
    <SafeAreaView style={tw('flex-1 bg-slate-50 dark:bg-slate-950')}>
      {/* Header */}
      <View
        style={tw(
          'px-5 pt-4 pb-3 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800'
        )}
      >
        <View style={tw('flex-row items-center')}>
          <TouchableOpacity
            onPress={() => router.back('/(patient)/profile')}
            style={tw('p-2 -ml-2 mr-2 rounded-full')}
          >
            <ArrowLeft
              color={twInstance.color('text-slate-900 dark:text-white')}
              size={22}
            />
          </TouchableOpacity>
          <View style={tw('flex-1')}>
            <Text
              style={tw('text-xl font-bold text-slate-900 dark:text-white')}
              numberOfLines={1}
            >
              {t('mobile.medical_facilities')}
            </Text>
            <Text style={tw('text-xs text-slate-500 dark:text-slate-400')}>
              {t('mobile.facility_pilot_subtitle')}
            </Text>
          </View>
          <TouchableOpacity
            disabled={searching || loadingCatalog}
            onPress={() => void onRefresh()}
            style={tw('p-2 rounded-full bg-slate-100 dark:bg-slate-800')}
          >
            <RefreshCw
              color={twInstance.color('text-slate-600 dark:text-slate-300')}
              size={18}
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={tw('p-5 pb-24 gap-4')}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void onRefresh()}
            tintColor={twInstance.color('text-slate-900 dark:text-white')}
          />
        }
      >
        {/* 1. Urgent Clinical Guidance Banner FIRST (per backend integration doc) */}
        <View
          style={tw(
            'bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 rounded-2xl p-3.5 flex-row items-center justify-between gap-3'
          )}
        >
          <View style={tw('flex-row items-start flex-1')}>
            <ShieldAlert color="#e11d48" size={18} style={tw('mr-2.5 mt-0.5')} />
            <View style={tw('flex-1')}>
              <Text
                style={tw('text-xs font-bold text-rose-800 dark:text-rose-200')}
              >
                {t('mobile.facility_urgent_banner_title')}
              </Text>
              <Text
                style={tw('text-[11px] text-rose-700 dark:text-rose-300 mt-0.5')}
              >
                {t('mobile.facility_urgent_banner_desc')}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => void handleSafeCall('115')}
            style={tw('bg-rose-600 px-3 py-2 rounded-xl flex-row items-center')}
          >
            <Phone color="#ffffff" size={13} style={tw('mr-1')} />
            <Text style={tw('text-xs font-bold text-white')}>115</Text>
          </TouchableOpacity>
        </View>

        {/* 2. Directory Disabled (503) state */}
        {directoryDisabled ? (
          <View
            style={tw(
              'bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/50 rounded-3xl p-6 items-center gap-3'
            )}
          >
            <AlertTriangle color="#d97706" size={34} />
            <Text
              style={tw('text-base font-bold text-slate-900 dark:text-white text-center')}
            >
              {t('mobile.facility_disabled_title')}
            </Text>
            <Text
              style={tw('text-xs text-slate-500 dark:text-slate-400 text-center')}
            >
              {t('apiErrors.FACILITY_DIRECTORY_DISABLED')}
            </Text>
            <TouchableOpacity
              onPress={() => void loadInitialCatalog()}
              style={tw('bg-brand px-4 py-2.5 rounded-xl')}
            >
              <Text style={tw('text-xs font-bold text-slate-900')}>
                {t('mobile.retry')}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* 3. Filter Panel */}
            <View
              style={tw(
                'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 gap-3.5'
              )}
            >
              {/* Mutually exclusive selector tabs */}
              <Text
                style={tw('text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400')}
              >
                {t('mobile.facility_search_by')}
              </Text>
              <View style={tw('flex-row gap-2')}>
                {(
                  [
                    { id: 'specialty', label: t('mobile.facility_mode_specialty') },
                    { id: 'program', label: t('mobile.facility_mode_program') },
                    { id: 'disease', label: t('mobile.facility_mode_disease') },
                  ] as const
                ).map((mode) => {
                  const active = selectorMode === mode.id;
                  return (
                    <TouchableOpacity
                      key={mode.id}
                      onPress={() => setSelectorMode(mode.id)}
                      style={tw(
                        `flex-1 py-2 px-2 rounded-xl border items-center ${
                          active
                            ? 'bg-slate-900 dark:bg-brand border-slate-900 dark:border-brand'
                            : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'
                        }`
                      )}
                    >
                      <Text
                        numberOfLines={1}
                        style={tw(
                          `text-xs font-bold ${
                            active
                              ? 'text-white dark:text-slate-900'
                              : 'text-slate-600 dark:text-slate-300'
                          }`
                        )}
                      >
                        {mode.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Dynamic Selector Options */}
              {loadingCatalog ? (
                <View style={tw('flex-row gap-2')}>
                  <Skeleton className="h-9 w-28 rounded-full" />
                  <Skeleton className="h-9 w-28 rounded-full" />
                  <Skeleton className="h-9 w-24 rounded-full" />
                </View>
              ) : selectorMode === 'specialty' ? (
                specialties.length === 0 ? (
                  <Text style={tw('text-xs text-slate-500 dark:text-slate-400')}>
                    {t('mobile.facility_no_specialties')}
                  </Text>
                ) : (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={tw('gap-2')}
                  >
                    {specialties.map((sp) => {
                      const active = selectedSpecialty === sp.code;
                      return (
                        <TouchableOpacity
                          key={sp.code}
                          onPress={() => {
                            setSelectedSpecialty(sp.code);
                            setExternalSpecialtyOverride(sp.code);
                          }}
                          style={tw(
                            `px-3.5 py-2 rounded-full border ${
                              active
                                ? 'bg-brand border-brand'
                                : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-700'
                            }`
                          )}
                        >
                          <Text
                            style={tw(
                              `text-xs font-bold ${
                                active
                                  ? 'text-slate-900'
                                  : 'text-slate-700 dark:text-slate-300'
                              }`
                            )}
                          >
                            {sp.nameVi}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                )
              ) : selectorMode === 'program' ? (
                programs.length === 0 ? (
                  <Text style={tw('text-xs text-slate-500 dark:text-slate-400')}>
                    {t('mobile.facility_no_programs')}
                  </Text>
                ) : (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={tw('gap-2')}
                  >
                    {programs.map((prog) => {
                      const active = selectedProgram === prog.programCode;
                      return (
                        <TouchableOpacity
                          key={prog.programCode}
                          onPress={() => setSelectedProgram(prog.programCode)}
                          style={tw(
                            `px-3.5 py-2 rounded-full border ${
                              active
                                ? 'bg-brand border-brand'
                                : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-700'
                            }`
                          )}
                        >
                          <Text
                            style={tw(
                              `text-xs font-bold ${
                                active
                                  ? 'text-slate-900'
                                  : 'text-slate-700 dark:text-slate-300'
                              }`
                            )}
                          >
                            {prog.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                )
              ) : diseaseKeys.length === 0 ? (
                <Text style={tw('text-xs text-slate-500 dark:text-slate-400')}>
                  {t('mobile.facility_no_diseases')}
                </Text>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={tw('gap-2')}
                >
                  {diseaseKeys.map((dk) => {
                    const active = selectedDisease === dk;
                    return (
                      <TouchableOpacity
                        key={dk}
                        onPress={() => setSelectedDisease(dk)}
                        style={tw(
                          `px-3.5 py-2 rounded-full border ${
                            active
                              ? 'bg-brand border-brand'
                              : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-700'
                          }`
                        )}
                      >
                        <Text
                          style={tw(
                            `text-xs font-bold ${
                              active
                                ? 'text-slate-900'
                                : 'text-slate-700 dark:text-slate-300'
                            }`
                          )}
                        >
                          {t(`mobile.disease_${dk}`, dk)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}

              {/* Mutually exclusive scope: HCMC Area OR GPS Near Me */}
              <View style={tw('pt-2 border-t border-slate-100 dark:border-slate-800 gap-2.5')}>
                <View style={tw('flex-row items-center justify-between')}>
                  <Text
                    style={tw('text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400')}
                  >
                    {t('mobile.facility_scope_title')}
                  </Text>
                  <View style={tw('flex-row gap-1.5')}>
                    <TouchableOpacity
                      onPress={() => setScopeMode('area')}
                      style={tw(
                        `px-3 py-1 rounded-lg border ${
                          scopeMode === 'area'
                            ? 'bg-slate-900 dark:bg-brand border-slate-900 dark:border-brand'
                            : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-700'
                        }`
                      )}
                    >
                      <Text
                        style={tw(
                          `text-xs font-bold ${
                            scopeMode === 'area'
                              ? 'text-white dark:text-slate-900'
                              : 'text-slate-600 dark:text-slate-300'
                          }`
                        )}
                      >
                        {t('mobile.facility_scope_area')}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setScopeMode('location')}
                      style={tw(
                        `px-3 py-1 rounded-lg border flex-row items-center ${
                          scopeMode === 'location'
                            ? 'bg-slate-900 dark:bg-brand border-slate-900 dark:border-brand'
                            : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-700'
                        }`
                      )}
                    >
                      <Compass
                        color={
                          scopeMode === 'location'
                            ? twInstance.color('text-white dark:text-slate-900')
                            : twInstance.color('text-slate-600 dark:text-slate-300')
                        }
                        size={12}
                        style={tw('mr-1')}
                      />
                      <Text
                        style={tw(
                          `text-xs font-bold ${
                            scopeMode === 'location'
                              ? 'text-white dark:text-slate-900'
                              : 'text-slate-600 dark:text-slate-300'
                          }`
                        )}
                      >
                        {t('mobile.facility_scope_nearby')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {scopeMode === 'area' ? (
                  <View style={tw('gap-2')}>
                    <View
                      style={tw(
                        'flex-row items-center bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700'
                      )}
                    >
                      <Search
                        color={twInstance.color('text-slate-400')}
                        size={16}
                        style={tw('mr-2')}
                      />
                      <TextInput
                        style={tw('flex-1 text-xs text-slate-900 dark:text-white')}
                        placeholder={t('mobile.facility_area_placeholder')}
                        placeholderTextColor={twInstance.color('text-slate-400')}
                        value={areaText}
                        onChangeText={setAreaText}
                      />
                    </View>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={tw('gap-1.5')}
                    >
                      {HCMC_AREA_PRESETS.map((preset) => {
                        const active = areaText.trim() === preset;
                        return (
                          <TouchableOpacity
                            key={preset}
                            onPress={() => setAreaText(preset)}
                            style={tw(
                              `px-2.5 py-1 rounded-lg border ${
                                active
                                  ? 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-400 dark:border-indigo-700'
                                  : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'
                              }`
                            )}
                          >
                            <Text
                              style={tw(
                                `text-[11px] font-semibold ${
                                  active
                                    ? 'text-indigo-700 dark:text-indigo-300'
                                    : 'text-slate-600 dark:text-slate-400'
                                }`
                              )}
                            >
                              {preset}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                ) : (
                  <View style={tw('gap-2.5')}>
                    <View
                      style={tw(
                        'bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 gap-2'
                      )}
                    >
                      <Text
                        style={tw('text-xs text-slate-600 dark:text-slate-300')}
                      >
                        {t('mobile.facility_gps_consent_desc')}
                      </Text>
                      <TouchableOpacity
                        disabled={locatingGps}
                        onPress={() => void handleRequestGpsLocation()}
                        style={tw(
                          'bg-brand py-2.5 px-3.5 rounded-xl flex-row items-center justify-center'
                        )}
                      >
                        {locatingGps ? (
                          <ActivityIndicator
                            size="small"
                            color="#0f172a"
                            style={tw('mr-2')}
                          />
                        ) : (
                          <Compass color="#0f172a" size={16} style={tw('mr-2')} />
                        )}
                        <Text style={tw('text-xs font-bold text-slate-900')}>
                          {locationConsent && coords
                            ? t('mobile.facility_gps_refresh')
                            : t('mobile.facility_gps_consent_cta')}
                        </Text>
                      </TouchableOpacity>
                      {locationConsent && coords && (
                        <View style={tw('gap-2')}>
                          <Text
                            style={tw(
                              'text-[11px] font-semibold text-emerald-700 dark:text-emerald-400'
                            )}
                          >
                            {t('mobile.facility_gps_ready_coords', {
                              lat: coords.latitude.toFixed(4),
                              lng: coords.longitude.toFixed(4),
                            })}
                          </Text>
                          {!isWithinHcmcArea(
                            coords.latitude,
                            coords.longitude
                          ) && (
                            <View
                              style={tw(
                                'bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-2.5 gap-1.5'
                              )}
                            >
                              <Text
                                style={tw(
                                  'text-[11px] text-amber-800 dark:text-amber-300'
                                )}
                              >
                                {t('mobile.facility_gps_outside_hcmc_hint')}
                              </Text>
                              <TouchableOpacity
                                onPress={() => setScopeMode('area')}
                                style={tw(
                                  'self-start px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-900/50 border border-amber-300 dark:border-amber-700'
                                )}
                              >
                                <Text
                                  style={tw(
                                    'text-[11px] font-bold text-amber-900 dark:text-amber-200'
                                  )}
                                >
                                  {t('mobile.facility_scope_area')}
                                </Text>
                              </TouchableOpacity>
                            </View>
                          )}
                        </View>
                      )}
                      {gpsError && (
                        <Text
                          style={tw('text-[11px] text-rose-600 dark:text-rose-400')}
                        >
                          {gpsError}
                        </Text>
                      )}
                    </View>

                    {/* Radius selector 1-50 km */}
                    <View style={tw('flex-row items-center gap-1.5 flex-wrap')}>
                      <Text
                        style={tw('text-xs font-semibold text-slate-600 dark:text-slate-400 mr-1')}
                      >
                        {t('mobile.facility_radius_label')}:
                      </Text>
                      {RADIUS_OPTIONS.map((r) => (
                        <TouchableOpacity
                          key={r}
                          onPress={() => setRadiusKm(r)}
                          style={tw(
                            `px-2.5 py-1 rounded-lg border ${
                              radiusKm === r
                                ? 'bg-brand border-brand'
                                : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-700'
                            }`
                          )}
                        >
                          <Text
                            style={tw(
                              `text-xs font-bold ${
                                radiusKm === r
                                  ? 'text-slate-900'
                                  : 'text-slate-600 dark:text-slate-300'
                              }`
                            )}
                          >
                            {r} km
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            </View>

            {/* 4. Internal Verified Facilities Results */}
            <View style={tw('gap-3')}>
              <View style={tw('flex-row items-center justify-between')}>
                <Text
                  style={tw('text-base font-bold text-slate-900 dark:text-white')}
                >
                  {t('mobile.facility_verified_results_title')}
                </Text>
                {!searching && items.length > 0 && (
                  <Text style={tw('text-xs text-slate-500 dark:text-slate-400')}>
                    {t('mobile.facility_results_count', { count: items.length })}
                  </Text>
                )}
              </View>

              {searching ? (
                <View style={tw('gap-3')}>
                  <Skeleton className="h-36 w-full rounded-3xl" />
                  <Skeleton className="h-36 w-full rounded-3xl" />
                </View>
              ) : searchError ? (
                <View
                  style={tw(
                    'bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-3xl p-5 items-center gap-3'
                  )}
                >
                  <AlertCircle color="#e11d48" size={28} />
                  <Text
                    style={tw('text-xs font-semibold text-rose-700 dark:text-rose-300 text-center')}
                  >
                    {searchError}
                  </Text>
                  <TouchableOpacity
                    onPress={() => void runInternalSearch(1, false)}
                    style={tw('bg-rose-600 px-4 py-2 rounded-xl')}
                  >
                    <Text style={tw('text-xs font-bold text-white')}>
                      {t('mobile.retry')}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : mappingStatus === 'manual_specialty_required' ? (
                <View
                  style={tw(
                    'bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/50 rounded-3xl p-5 items-center gap-3'
                  )}
                >
                  <Stethoscope color="#d97706" size={32} />
                  <Text
                    style={tw('text-sm font-bold text-slate-900 dark:text-white text-center')}
                  >
                    {t('mobile.facility_manual_specialty_title')}
                  </Text>
                  <Text
                    style={tw('text-xs text-slate-500 dark:text-slate-400 text-center')}
                  >
                    {t('mobile.facility_manual_specialty_desc')}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setSelectorMode('specialty')}
                    style={tw('bg-brand px-4 py-2.5 rounded-xl')}
                  >
                    <Text style={tw('text-xs font-bold text-slate-900')}>
                      {t('mobile.facility_choose_specialty_cta')}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : scopeMode === 'area' && !areaText.trim() ? (
                <View
                  style={tw(
                    'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 items-center gap-2'
                  )}
                >
                  <MapPin color="#64748b" size={28} />
                  <Text
                    style={tw('text-xs text-slate-600 dark:text-slate-300 text-center')}
                  >
                    {t('mobile.facility_enter_area_required')}
                  </Text>
                </View>
              ) : scopeMode === 'location' && (!locationConsent || !coords) ? (
                <View
                  style={tw(
                    'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 items-center gap-2'
                  )}
                >
                  <Compass color="#64748b" size={28} />
                  <Text
                    style={tw('text-xs text-slate-600 dark:text-slate-300 text-center')}
                  >
                    {t('mobile.facility_gps_prompt_card')}
                  </Text>
                </View>
              ) : items.length === 0 ? (
                <View
                  style={tw(
                    'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 items-center gap-2'
                  )}
                >
                  <Building2 color={twInstance.color('text-slate-400')} size={32} />
                  <Text
                    style={tw('text-base font-bold text-slate-900 dark:text-white text-center')}
                  >
                    {t('mobile.no_facilities_found')}
                  </Text>
                  <Text
                    style={tw('text-xs text-slate-500 dark:text-slate-400 text-center')}
                  >
                    {t('mobile.try_different_search')}
                  </Text>
                </View>
              ) : (
                <>
                  {items.map((facility) => {
                    const distText = formatDistanceText(facility.distanceMeters);
                    const checkedText = new Date(
                      facility.lastCheckedAt
                    ).toLocaleDateString(dateLocale, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    });

                    return (
                      <TouchableOpacity
                        key={facility.id}
                        activeOpacity={0.85}
                        onPress={() => handleOpenDetail(facility)}
                        style={tw(
                          'bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-200 dark:border-slate-800 gap-3'
                        )}
                      >
                        <View style={tw('flex-row justify-between items-start gap-3')}>
                          <View style={tw('flex-row items-start flex-1')}>
                            <View
                              style={tw(
                                'w-11 h-11 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl items-center justify-center mr-3'
                              )}
                            >
                              <Building2
                                color={twInstance.color('text-indigo-600 dark:text-indigo-400')}
                                size={22}
                              />
                            </View>
                            <View style={tw('flex-1')}>
                              <Text
                                style={tw('text-base font-bold text-slate-900 dark:text-white')}
                                numberOfLines={2}
                              >
                                {facility.name}
                              </Text>
                              <Text
                                style={tw('text-xs text-slate-500 dark:text-slate-400 mt-0.5')}
                              >
                                {t(`mobile.facility_type_${facility.facilityType}`)}
                              </Text>
                            </View>
                          </View>

                          {facility.verificationLabel === 'needs_recheck' ? (
                            <View
                              style={tw(
                                'bg-amber-50 dark:bg-amber-900/30 px-2.5 py-1 rounded-full flex-row items-center'
                              )}
                            >
                              <AlertTriangle color="#d97706" size={13} style={tw('mr-1')} />
                              <Text
                                style={tw('text-[10px] font-bold text-amber-700 dark:text-amber-300')}
                              >
                                {t('mobile.facility_needs_recheck')}
                              </Text>
                            </View>
                          ) : (
                            <View
                              style={tw(
                                'bg-emerald-50 dark:bg-emerald-900/30 px-2.5 py-1 rounded-full flex-row items-center'
                              )}
                            >
                              <ShieldCheck color="#10b981" size={13} style={tw('mr-1')} />
                              <Text
                                style={tw('text-[10px] font-bold text-emerald-700 dark:text-emerald-300')}
                              >
                                {t('mobile.verified_facility')}
                              </Text>
                            </View>
                          )}
                        </View>

                        {/* Neutral Reason Code + Specialty chips */}
                        <View style={tw('flex-row flex-wrap gap-1.5')}>
                          <View
                            style={tw('bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg')}
                          >
                            <Text
                              style={tw('text-[11px] font-semibold text-slate-700 dark:text-slate-300')}
                            >
                              {t(`mobile.facility_reason_${facility.reasonCode}`)}
                            </Text>
                          </View>
                          {facility.matchedSpecialtyCodes.map((code) => (
                            <View
                              key={code}
                              style={tw(
                                'bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded-lg flex-row items-center'
                              )}
                            >
                              <HeartPulse color="#e11d48" size={11} style={tw('mr-1')} />
                              <Text
                                style={tw('text-[11px] font-semibold text-indigo-700 dark:text-indigo-300')}
                              >
                                {specialtyNameMap[code] || code}
                              </Text>
                            </View>
                          ))}
                        </View>

                        {/* Address + Distance */}
                        <View
                          style={tw(
                            'flex-row items-center bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl'
                          )}
                        >
                          <MapPin
                            color={twInstance.color('text-slate-400')}
                            size={15}
                            style={tw('mr-2')}
                          />
                          <Text
                            style={tw('text-xs text-slate-600 dark:text-slate-300 flex-1')}
                            numberOfLines={2}
                          >
                            {formatFacilityAddress(facility.address)}
                          </Text>
                          {distText && (
                            <Text
                              style={tw('text-xs font-bold text-slate-800 dark:text-slate-100 ml-2')}
                            >
                              {distText}
                            </Text>
                          )}
                        </View>

                        <View style={tw('flex-row items-center justify-between')}>
                          <Text
                            style={tw('text-[11px] text-slate-400 dark:text-slate-500')}
                          >
                            {t('mobile.facility_last_checked', { date: checkedText })}
                          </Text>

                          <View style={tw('flex-row items-center gap-2')}>
                            {facility.contact?.phone && (
                              <TouchableOpacity
                                onPress={() => void handleSafeCall(facility.contact?.phone)}
                                style={tw(
                                  'bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl flex-row items-center'
                                )}
                              >
                                <Phone
                                  color={twInstance.color('text-slate-700 dark:text-slate-200')}
                                  size={13}
                                  style={tw('mr-1')}
                                />
                                <Text
                                  style={tw('text-xs font-bold text-slate-700 dark:text-slate-200')}
                                >
                                  {t('mobile.call')}
                                </Text>
                              </TouchableOpacity>
                            )}
                            <View
                              style={tw('bg-brand/20 dark:bg-brand/25 px-3 py-1.5 rounded-xl')}
                            >
                              <Text
                                style={tw('text-xs font-bold text-slate-900 dark:text-brand')}
                              >
                                {t('mobile.facility_view_detail')}
                              </Text>
                            </View>
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}

                  {hasNextPage && (
                    <TouchableOpacity
                      disabled={loadingMore}
                      onPress={() => void runInternalSearch(page + 1, true)}
                      style={tw(
                        'py-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 items-center flex-row justify-center'
                      )}
                    >
                      {loadingMore && (
                        <ActivityIndicator
                          size="small"
                          color={twInstance.color('text-slate-700 dark:text-white')}
                          style={tw('mr-2')}
                        />
                      )}
                      <Text
                        style={tw('text-xs font-bold text-slate-800 dark:text-slate-200')}
                      >
                        {t('mobile.load_more')}
                      </Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>

            {/* 5. Explicit Google Maps Fallback Section (NEVER auto-invoked) */}
            <View
              style={tw(
                'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 gap-3'
              )}
            >
              <View style={tw('gap-1')}>
                <Text style={tw('text-sm font-bold text-slate-900 dark:text-white')}>
                  {t('mobile.facility_external_section_title')}
                </Text>
                <Text style={tw('text-xs text-slate-500 dark:text-slate-400')}>
                  {t('mobile.facility_external_section_desc')}
                </Text>
              </View>

              {selectorMode !== 'specialty' && specialties.length > 0 && (
                <View style={tw('gap-1.5')}>
                  <Text
                    style={tw('text-[11px] font-semibold text-slate-600 dark:text-slate-300')}
                  >
                    {t('mobile.facility_external_specialty_picker')}
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={tw('gap-1.5')}
                  >
                    {specialties.map((sp) => {
                      const active = externalSpecialtyOverride === sp.code;
                      return (
                        <TouchableOpacity
                          key={sp.code}
                          onPress={() => setExternalSpecialtyOverride(sp.code)}
                          style={tw(
                            `px-3 py-1.5 rounded-full border ${
                              active
                                ? 'bg-indigo-600 border-indigo-600'
                                : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-700'
                            }`
                          )}
                        >
                          <Text
                            style={tw(
                              `text-xs font-bold ${
                                active
                                  ? 'text-white'
                                  : 'text-slate-600 dark:text-slate-300'
                              }`
                            )}
                          >
                            {sp.nameVi}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              <TouchableOpacity
                disabled={externalLoading}
                onPress={() => void handleExternalGoogleSearch()}
                style={tw(
                  'py-3 px-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 flex-row items-center justify-center'
                )}
              >
                {externalLoading ? (
                  <ActivityIndicator
                    size="small"
                    color="#4f46e5"
                    style={tw('mr-2')}
                  />
                ) : (
                  <MapPin color="#4f46e5" size={16} style={tw('mr-2')} />
                )}
                <Text
                  style={tw('text-xs font-bold text-indigo-700 dark:text-indigo-300')}
                >
                  {t('mobile.facility_search_google_maps_cta')}
                </Text>
              </TouchableOpacity>

              {externalLoading && (
                <View style={tw('gap-2.5')}>
                  <Skeleton className="h-24 w-full rounded-2xl" />
                  <Skeleton className="h-24 w-full rounded-2xl" />
                </View>
              )}

              {!externalLoading && externalError && (
                <View
                  style={tw(
                    'bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-2xl p-3.5 gap-2'
                  )}
                >
                  <Text
                    style={tw('text-xs font-semibold text-amber-800 dark:text-amber-300')}
                  >
                    {externalError}
                  </Text>
                  <TouchableOpacity
                    onPress={() => void handleExternalGoogleSearch()}
                    style={tw('self-start bg-amber-600 px-3 py-1.5 rounded-xl')}
                  >
                    <Text style={tw('text-xs font-bold text-white')}>
                      {t('mobile.retry')}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {!externalLoading && !externalError && hasSearchedExternal && (
                <View style={tw('gap-2.5')}>
                  <View style={tw('flex-row flex-wrap items-center justify-between gap-2')}>
                    <Text
                      style={tw('text-[11px] font-bold text-slate-500 dark:text-slate-400')}
                    >
                      {t('mobile.facility_attribution_label')}: Google Maps
                      {externalAttributions.length > 0
                        ? ` (${externalAttributions.join(', ')})`
                        : ''}
                    </Text>
                  </View>

                  {externalItems.length === 0 ? (
                    <Text
                      style={tw('text-xs text-slate-500 dark:text-slate-400 text-center py-3')}
                    >
                      {t('mobile.facility_external_empty')}
                    </Text>
                  ) : (
                    externalItems.map((ext) => (
                      <View
                        key={ext.placeId}
                        style={tw(
                          'bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 gap-2'
                        )}
                      >
                        <View style={tw('flex-row items-start justify-between gap-2')}>
                          <Text
                            style={tw('text-sm font-bold text-slate-900 dark:text-white flex-1')}
                          >
                            {ext.name || ext.placeId}
                          </Text>
                          <View
                            style={tw(
                              'bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 rounded-md'
                            )}
                          >
                            <Text
                              style={tw('text-[10px] font-bold text-amber-800 dark:text-amber-300')}
                            >
                              {t('mobile.facility_not_verified_internally')}
                            </Text>
                          </View>
                        </View>
                        {ext.address && (
                          <Text
                            style={tw('text-xs text-slate-600 dark:text-slate-300')}
                          >
                            {ext.address}
                          </Text>
                        )}
                        <View style={tw('flex-row items-center justify-between pt-1')}>
                          <Text style={tw('text-[10px] text-slate-400')}>
                            {ext.attribution}
                          </Text>
                          {ext.mapsUrl && (
                            <TouchableOpacity
                              onPress={() => void handleSafeOpenLink(ext.mapsUrl)}
                              style={tw(
                                'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-xl flex-row items-center'
                              )}
                            >
                              <ExternalLink color="#2563eb" size={12} style={tw('mr-1.5')} />
                              <Text
                                style={tw('text-xs font-bold text-blue-600 dark:text-blue-400')}
                              >
                                {t('mobile.facility_open_google_maps')}
                              </Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    ))
                  )}
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>

      <FacilityDetailModal
        visible={detailModalVisible}
        facilityId={detailFacilityId}
        distanceMeters={detailDistanceMeters}
        specialtyNameMap={specialtyNameMap}
        onClose={() => setDetailModalVisible(false)}
        onUnavailable={() => void runInternalSearch(1, false)}
      />
    </SafeAreaView>
  );
}
