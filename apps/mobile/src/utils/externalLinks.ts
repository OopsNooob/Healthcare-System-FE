import { Linking, Platform } from 'react-native';
import Toast from 'react-native-toast-message';
import i18n from '@/i18n';

/**
 * Open native Maps app (Google Maps on Android, Apple Maps on iOS) with directions to facility destination
 */
export const openMapsDirections = async (facilityName: string, address: string): Promise<void> => {
  const destination = `${facilityName}, ${address}`.trim();
  const encodedDestination = encodeURIComponent(destination);

  // 1. Android Google Maps Navigation Scheme
  const androidAppNavUrl = `google.navigation:q=${encodedDestination}`;
  // 2. Android Generic Geo Search
  const androidGeoUrl = `geo:0,0?q=${encodedDestination}`;
  // 3. iOS Apple Maps Route Scheme
  const appleMapsUrl = `maps://app?daddr=${encodedDestination}`;
  // 4. Universal Web Fallback
  const webMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodedDestination}`;

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

    // Fallback: Open in Google Maps web / default browser
    await Linking.openURL(webMapsUrl);
  } catch (error) {
    console.warn('Failed to launch navigation map:', error);
    try {
      await Linking.openURL(webMapsUrl);
    } catch (fallbackError) {
      Toast.show({
        type: 'error',
        text1: i18n.t('mobile.directions', 'Directions'),
        text2: destination,
      });
    }
  }
};

/**
 * Open native Phone Dialer app with pre-filled phone number
 */
export const openPhoneCall = async (phoneNumber: string): Promise<void> => {
  if (!phoneNumber) return;
  // Clean phone number: keep only digits and leading plus sign
  const cleanNumber = phoneNumber.replace(/[^\d+]/g, '');
  const telUrl = `tel:${cleanNumber}`;

  try {
    const canOpen = await Linking.canOpenURL(telUrl).catch(() => false);
    if (canOpen) {
      await Linking.openURL(telUrl);
    } else {
      // Direct call fallback for Android or devices where canOpenURL returns false for tel:
      await Linking.openURL(telUrl);
    }
  } catch (error) {
    console.warn('Failed to open phone dialer:', error);
    Toast.show({
      type: 'info',
      text1: i18n.t('mobile.call', 'Call'),
      text2: phoneNumber,
    });
  }
};

