import { Linking, Platform } from 'react-native';
import Toast from 'react-native-toast-message';
import i18n from '@/i18n';

/**
 * Opens native Maps app (Google Maps on Android, Apple Maps on iOS) with directions to facility.
 * Uses verified [longitude, latitude] coordinates when available, with address fallback.
 */
export const openMapsDirections = async (
  facilityName: string,
  address: string,
  coordinates?: [number, number]
): Promise<void> => {
  const destination = `${facilityName}, ${address}`.trim();
  const hasValidCoords =
    Array.isArray(coordinates) &&
    coordinates.length === 2 &&
    Number.isFinite(coordinates[0]) &&
    Number.isFinite(coordinates[1]);

  const queryTarget = hasValidCoords
    ? `${coordinates[1]},${coordinates[0]}`
    : destination;
  const encodedQuery = encodeURIComponent(queryTarget);
  const encodedLabel = encodeURIComponent(facilityName || destination);

  const androidAppNavUrl = `google.navigation:q=${encodedQuery}`;
  const androidGeoUrl = hasValidCoords
    ? `geo:${coordinates[1]},${coordinates[0]}?q=${encodedQuery}(${encodedLabel})`
    : `geo:0,0?q=${encodeURIComponent(destination)}`;
  const appleMapsUrl = `maps://app?daddr=${encodedQuery}`;
  const webMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodedQuery}`;

  try {
    if (Platform.OS === 'android') {
      const canOpenNav = await Linking.canOpenURL(androidAppNavUrl).catch(() => false);
      if (canOpenNav) {
        await Linking.openURL(androidAppNavUrl);
        return;
      }
      const canOpenGeo = await Linking.canOpenURL(androidGeoUrl).catch(() => false);
      if (canOpenGeo) {
        await Linking.openURL(androidGeoUrl);
        return;
      }
    } else if (Platform.OS === 'ios') {
      const canOpenApple = await Linking.canOpenURL(appleMapsUrl).catch(() => false);
      if (canOpenApple) {
        await Linking.openURL(appleMapsUrl);
        return;
      }
    }

    await Linking.openURL(webMapsUrl);
  } catch (error) {
    console.warn('Failed to launch navigation map:', error);
    try {
      await Linking.openURL(webMapsUrl);
    } catch {
      Toast.show({
        type: 'error',
        text1: i18n.t('mobile.directions'),
        text2: destination,
      });
    }
  }
};

/**
 * Validates and opens an external public HTTPS URL (website, booking link, official source, or Google Maps URI).
 */
export const openExternalHttpsUrl = async (url?: string): Promise<void> => {
  if (!url) return;
  const trimmed = url.trim();
  if (!/^https:\/\//i.test(trimmed)) {
    Toast.show({
      type: 'error',
      text1: i18n.t('mobile.error'),
      text2: i18n.t('mobile.facility_invalid_external_link'),
    });
    return;
  }
  try {
    await Linking.openURL(trimmed);
  } catch {
    Toast.show({
      type: 'error',
      text1: i18n.t('mobile.error'),
      text2: i18n.t('mobile.facility_open_link_failed'),
    });
  }
};

/**
 * Opens native Phone Dialer app with pre-filled phone number.
 */
export const openPhoneCall = async (phoneNumber?: string): Promise<void> => {
  if (!phoneNumber) return;
  const cleanNumber = phoneNumber.replace(/[^\d+]/g, '');
  if (!cleanNumber) return;
  const telUrl = `tel:${cleanNumber}`;

  try {
    const canOpen = await Linking.canOpenURL(telUrl).catch(() => false);
    if (canOpen) {
      await Linking.openURL(telUrl);
    } else {
      await Linking.openURL(telUrl);
    }
  } catch (error) {
    console.warn('Failed to open phone dialer:', error);
    Toast.show({
      type: 'info',
      text1: i18n.t('mobile.call'),
      text2: phoneNumber,
    });
  }
};
