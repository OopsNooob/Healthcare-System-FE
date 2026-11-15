import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import {
  connectNotificationsSocket,
  connectPresenceSocket,
  updateSocketAuth,
  useLogin,
} from '@repo/shared-hooks';
import { useSafeRouter as useRouter } from '@/utils/useSafeRouter';
import { extractApiErrorMessage } from '@/utils/apiError';
import { Mail, Lock, Cross, Check, Eye, EyeOff } from 'lucide-react-native';
import { tw } from '@/tw';

const REMEMBERED_EMAIL_KEY = 'mobile_remembered_email';

export default function LoginScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { login, isLoading } = useLogin();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(REMEMBERED_EMAIL_KEY)
      .then((savedEmail) => {
        if (savedEmail) {
          setEmail(savedEmail);
          setRememberMe(true);
        }
      })
      .catch(() => {});
  }, []);

  const handleLogin = async () => {
    if (isLoading) return;
    setErrorMessage(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      const msg = t('mobile.please_enter_email_and_password', 'Please enter your email and password.');
      setErrorMessage(msg);
      Toast.show({ type: 'error', text1: t('mobile.error', 'Error'), text2: msg });
      return;
    }

    try {
      const res = await login({ email: trimmedEmail, password });

      if (rememberMe) {
        await AsyncStorage.setItem(REMEMBERED_EMAIL_KEY, trimmedEmail);
      } else {
        await AsyncStorage.removeItem(REMEMBERED_EMAIL_KEY);
      }

      if (res.accessToken) {
        updateSocketAuth(res.accessToken);
        void connectNotificationsSocket(res.accessToken);
        void connectPresenceSocket(res.accessToken);
      }

      Toast.show({
        type: 'success',
        text1: t('mobile.login_success', 'Welcome back'),
        text2: res.user.fullName,
      });

      if (res.user.role === 'doctor') {
        router.replace('/(doctor)');
      } else {
        router.replace('/(patient)');
      }
    } catch (err) {
      const msg = extractApiErrorMessage(err, 'mobile.login_failed');
      setErrorMessage(msg);
      Toast.show({
        type: 'error',
        text1: t('mobile.login_failed_title', 'Sign In Failed'),
        text2: msg,
      });
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={tw('flex-1 bg-slate-50 dark:bg-slate-950')}
    >
      <ScrollView
        contentContainerStyle={tw('flex-grow items-center justify-center px-6 py-10')}
        keyboardShouldPersistTaps="handled"
      >
        <View style={tw('flex-col items-center gap-2 mb-10')}>
          <View style={tw('flex-row items-center gap-2')}>
            <Cross color="#10b981" fill="#10b981" size={32} />
            <Text style={tw('text-3xl font-bold text-[#313A34] dark:text-slate-100')}>
              {t('mobile.healthcare', 'Healthcare')}
            </Text>
          </View>
          <Text style={tw('text-sm text-gray-500 dark:text-slate-400 text-center')}>
            {t('mobile.your_intelligent_telecare_ai_s', 'Your intelligent telecare AI solutions.')}
          </Text>
        </View>

        <View style={tw('w-full bg-white dark:bg-slate-900 rounded-3xl border border-gray-200 dark:border-slate-800 shadow-sm px-6 py-8')}>
          <Text style={tw('text-center text-3xl font-bold text-[#313A34] dark:text-slate-100 mb-6')}>
            {t('mobile.sign_in', 'Sign in')}
          </Text>

          {errorMessage && (
            <View style={tw('mb-4 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50')}>
              <Text style={tw('text-xs font-medium text-rose-700 dark:text-rose-300')}>{errorMessage}</Text>
            </View>
          )}

          <View style={tw('gap-4')}>
            <View style={tw('gap-1.5')}>
              <Text style={tw('text-sm font-medium text-[#1E1E1E] dark:text-slate-200')}>
                {t('mobile.email', 'Email')}
              </Text>
              <View style={tw('flex-row items-center bg-gray-50 dark:bg-slate-800 rounded-2xl px-4 py-3 border border-gray-200 dark:border-slate-700')}>
                <Mail color="#9ca3af" size={20} />
                <TextInput
                  style={tw('flex-1 ml-3 text-base text-gray-900 dark:text-gray-100 bg-transparent')}
                  placeholder={t('mobile.enter_your_email', 'Enter your email account')}
                  placeholderTextColor="#9ca3af"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  editable={!isLoading}
                />
              </View>
            </View>

            <View style={tw('gap-1.5 mt-2')}>
              <Text style={tw('text-sm font-medium text-[#1E1E1E] dark:text-slate-200')}>
                {t('mobile.password', 'Password')}
              </Text>
              <View style={tw('flex-row items-center bg-gray-50 dark:bg-slate-800 rounded-2xl px-4 py-3 border border-gray-200 dark:border-slate-700')}>
                <Lock color="#9ca3af" size={20} />
                <TextInput
                  style={tw('flex-1 ml-3 text-base text-gray-900 dark:text-gray-100 bg-transparent')}
                  placeholder={t('mobile.enter_your_password', 'Enter your password')}
                  placeholderTextColor="#9ca3af"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  editable={!isLoading}
                />
                <TouchableOpacity onPress={() => setShowPassword((prev) => !prev)} hitSlop={8}>
                  {showPassword ? <EyeOff color="#9ca3af" size={18} /> : <Eye color="#9ca3af" size={18} />}
                </TouchableOpacity>
              </View>
            </View>

            <View style={tw('flex-row items-center justify-between mt-2 mb-4')}>
              <TouchableOpacity
                style={tw('flex-row items-center gap-2')}
                onPress={() => setRememberMe(!rememberMe)}
                disabled={isLoading}
              >
                <View
                  style={tw(
                    `w-5 h-5 rounded border items-center justify-center ${
                      rememberMe
                        ? 'bg-emerald-500 border-emerald-500'
                        : 'border-gray-300 dark:border-slate-600'
                    }`,
                  )}
                >
                  {rememberMe && <Check color="#ffffff" size={12} />}
                </View>
                <Text style={tw('text-sm text-gray-500 dark:text-slate-400')}>
                  {t('mobile.remember_me', 'Remember me')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')} disabled={isLoading}>
                <Text style={tw('text-sm font-medium text-emerald-600 dark:text-emerald-400')}>
                  {t('mobile.forget_your_password', 'Forget your password?')}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={tw(
                `h-12 w-full rounded-2xl flex-row items-center justify-center ${
                  isLoading ? 'bg-emerald-400' : 'bg-emerald-500'
                }`,
              )}
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={tw('text-white text-base font-semibold')}>
                  {t('mobile.log_in', 'Log in')}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={tw('mt-4 items-center')}
              onPress={() => router.push('/(auth)/register')}
              disabled={isLoading}
            >
              <Text style={tw('text-sm text-gray-500 dark:text-slate-400')}>
                {t('mobile.dont_have_account', "Don't have an account?")}{' '}
                <Text style={tw('font-medium text-emerald-600 dark:text-emerald-400')}>
                  {t('mobile.create_an_account', 'Create an account')}
                </Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
