import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, TextInput, TouchableOpacity, Image, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useSafeRouter as useRouter } from '@/utils/useSafeRouter';
import { Mail, Lock, Plus } from 'lucide-react-native';
import { tw } from '@/tw';

export default function LoginScreen() {
  const { t } = useTranslation();

  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = () => {
    if (isLoading) return;
    setIsLoading(true);
    // Mock login logic
    setTimeout(() => {
      setIsLoading(false);
      if (email.toLowerCase().includes('doctor')) {
        router.replace('/(doctor)');
      } else {
        router.replace('/(patient)');
      }
    }, 500);
  };

  const handleNavigate = (path: any) => {
    if (isLoading) return;
    setIsLoading(true);
    router.push(path);
    setTimeout(() => setIsLoading(false), 500);
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={tw('flex-1 bg-slate-50 dark:bg-slate-950')}
    >
      <ScrollView contentContainerStyle={tw('flex-grow items-center justify-center px-6 py-10')}>
        {/* Logo area */}
        <View style={tw('flex-col items-center gap-2 mb-10')}>
          <View style={tw('flex-row items-center gap-2')}>
            <Plus color="#10b981" size={32} />
            <Text style={tw('text-3xl font-bold text-[#313A34] dark:text-slate-100')}>{t('mobile.healthcare', `Healthcare`)}</Text>
          </View>
          <Text style={tw('text-sm text-gray-500')}>{t('mobile.your_intelligent_telecare_ai_s', `Your intelligent telecare AI solutions. ✨`)}</Text>
        </View>

        {/* Form Card */}
        <View style={tw('w-full bg-white dark:bg-slate-900 rounded-3xl border border-gray-200 shadow-sm px-6 py-8')}>
          <Text style={tw('text-center text-3xl font-bold text-[#313A34] dark:text-slate-100 mb-8')}>{t('mobile.sign_in', `Sign in`)}</Text>

          <View style={tw('gap-4')}>
            {/* Email Field */}
            <View style={tw('gap-1.5')}>
              <Text style={tw('text-sm font-medium text-[#1E1E1E] dark:text-slate-200')}>{t('mobile.email', `Email`)}</Text>
              <View style={tw('flex-row items-center bg-gray-50 rounded-2xl px-4 py-3 border border-gray-200')}>
                <Mail color="#9ca3af" size={20} />
                <TextInput
                  style={tw('flex-1 ml-3 text-base text-gray-900 dark:text-gray-100')}
                  placeholder={t('mobile.enter_your_email', 'Enter your email account')}
                  placeholderTextColor="#9ca3af"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
            </View>

            {/* Password Field */}
            <View style={tw('gap-1.5 mt-2')}>
              <Text style={tw('text-sm font-medium text-[#1E1E1E] dark:text-slate-200')}>{t('mobile.password', `Password`)}</Text>
              <View style={tw('flex-row items-center bg-gray-50 rounded-2xl px-4 py-3 border border-gray-200')}>
                <Lock color="#9ca3af" size={20} />
                <TextInput
                  style={tw('flex-1 ml-3 text-base text-gray-900 dark:text-gray-100')}
                  placeholder={t('mobile.enter_your_password', 'Enter your password')}
                  placeholderTextColor="#9ca3af"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>
            </View>

            {/* Remember & Forgot */}
            <View style={tw('flex-row items-center justify-between mt-2 mb-4')}>
              <TouchableOpacity 
                style={tw('flex-row items-center gap-2')}
                onPress={() => setRememberMe(!rememberMe)}
                disabled={isLoading}
              >
                <View style={tw(`w-5 h-5 rounded border ${rememberMe ? 'bg-emerald-500 border-emerald-500 items-center justify-center' : 'border-gray-300'}`)}>
                  {rememberMe && <Text style={tw('text-white text-xs')}>{t('mobile.', '✓')}</Text>}
                </View>
                <Text style={tw('text-sm text-gray-500')}>{t('mobile.remember_me', `Remember me`)}</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => handleNavigate('/(auth)/forgot-password')} disabled={isLoading}>
                <Text style={tw('text-sm font-medium text-emerald-500')}>{t('mobile.forget_your_password', `Forget your password?`)}</Text>
              </TouchableOpacity>
            </View>

            {/* Submit Button */}
            <TouchableOpacity 
              style={tw(`h-12 w-full ${isLoading ? 'bg-emerald-400' : 'bg-emerald-500'} rounded-2xl items-center justify-center`)}
              onPress={handleLogin}
              disabled={isLoading}
            >
              <Text style={tw('text-white text-base font-semibold')}>{isLoading ? t('mobile.loading', 'Loading...') : t('mobile.log_in', `Log in`)}</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={tw('mt-4 items-center')}
              onPress={() => handleNavigate('/(auth)/register')}
              disabled={isLoading}
            >
              <Text style={tw('text-sm text-gray-500')}>
                {t('mobile.dont_have_account', "Don't have an account?")} <Text style={tw('font-medium text-emerald-500')}>{t('mobile.create_an_account', `Create an account`)}</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
