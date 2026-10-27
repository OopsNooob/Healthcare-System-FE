import AsyncStorage from '@react-native-async-storage/async-storage';
import { setStorageProvider } from '@repo/shared-hooks';

setStorageProvider(AsyncStorage);

import 'expo-router/entry';
