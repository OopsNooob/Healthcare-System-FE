import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, TextInput, TouchableOpacity, SafeAreaView, ScrollView, KeyboardAvoidingView, Platform, Alert, Image } from 'react-native';
import { useSafeRouter as useRouter } from '@/utils/useSafeRouter';
import Toast from 'react-native-toast-message';
import { Mail, Lock, Plus, User, Phone, Briefcase, Stethoscope, Clock, UploadCloud } from 'lucide-react-native';
import { tw } from '@/tw';

export default function RegisterScreen() {
  const { t } = useTranslation();

  const router = useRouter();
  const [role, setRole] = useState<'patient' | 'doctor'>('patient');
  
  // Shared fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Doctor only fields
  const [specialty, setSpecialty] = useState('');
  const [workplace, setWorkplace] = useState('');
  const [experience, setExperience] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = () => {
    if (isLoading) return;
    setIsLoading(true);
    // Mock register logic
    setTimeout(() => {
      setIsLoading(false);
      if (role === 'doctor') {
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
        <View style={tw('flex-col items-center gap-2 mb-8')}>
          <View style={tw('flex-row items-center gap-2')}>
            <Plus color="#10b981" size={32} />
            <Text style={tw('text-3xl font-bold text-[#313A34] dark:text-slate-100')}>{t('mobile.healthcare', `Healthcare`)}</Text>
          </View>
          <Text style={tw('text-sm text-gray-500')}>{t('mobile.your_intelligent_telecare_ai_s', `Your intelligent telecare AI solutions. ✨`)}</Text>
        </View>

        {/* Form Card */}
        <View style={tw('w-full bg-white dark:bg-slate-900 rounded-3xl border border-gray-200 shadow-sm px-6 py-8')}>
          <Text style={tw('text-center text-3xl font-bold text-[#313A34] dark:text-slate-100 mb-2')}>{t('mobile.sign_up', `Sign up`)}</Text>
          <Text style={tw('text-center text-sm text-gray-500 mb-6')}>{t('mobile.create_a_new_account', `Create a new account`)}</Text>

          {/* Role selector */}
          <View style={tw('flex-row bg-gray-100 p-1 rounded-xl mb-6')}>
            <TouchableOpacity 
              style={tw(`flex-1 py-2 items-center rounded-lg ${role === 'patient' ? 'bg-white dark:bg-slate-900 shadow-sm' : ''}`)}
              onPress={() => setRole('patient')}
              disabled={isLoading}
            >
              <Text style={tw(`font-medium ${role === 'patient' ? 'text-emerald-600' : 'text-gray-500'}`)}>{t('mobile.patient', `Patient`)}</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={tw(`flex-1 py-2 items-center rounded-lg ${role === 'doctor' ? 'bg-white dark:bg-slate-900 shadow-sm' : ''}`)}
              onPress={() => setRole('doctor')}
              disabled={isLoading}
            >
              <Text style={tw(`font-medium ${role === 'doctor' ? 'text-emerald-600' : 'text-gray-500'}`)}>{t('mobile.doctor', `Doctor`)}</Text>
            </TouchableOpacity>
          </View>

          <View style={tw('gap-4')}>
            
            {/* Email Field - Both */}
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

            {/* Doctor Load Previous Registration Data */}
            {role === 'doctor' && (
              <TouchableOpacity onPress={() => Toast.show({ type: 'info', text1: 'Info', text2: 'Load previous registration data' })} style={tw('flex-row items-center justify-end -mt-2 mb-2')}>
                <Text style={tw('text-sm text-emerald-600 font-medium')}>{t('mobile.load_previous_registration_dat', `Load previous registration data?`)}</Text>
              </TouchableOpacity>
            )}

            {/* Phone Field - Doctor (Second for Doctor) */}
            {role === 'doctor' && (
              <View style={tw('gap-1.5')}>
                <Text style={tw('text-sm font-medium text-[#1E1E1E] dark:text-slate-200')}>{t('mobile.phone_number', `Phone number`)}</Text>
                <View style={tw('flex-row items-center bg-gray-50 rounded-2xl px-4 py-3 border border-gray-200')}>
                  <Phone color="#9ca3af" size={20} />
                  <TextInput
                    style={tw('flex-1 ml-3 text-base text-gray-900 dark:text-gray-100')}
                    placeholder={t('mobile.enter_your_phone', 'Enter your phone number')}
                    placeholderTextColor="#9ca3af"
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                  />
                </View>
              </View>
            )}

            {/* Full Name Field - Both */}
            <View style={tw('gap-1.5 mt-2')}>
              <Text style={tw('text-sm font-medium text-[#1E1E1E] dark:text-slate-200')}>{t('mobile.full_name', `Full Name`)}</Text>
              <View style={tw('flex-row items-center bg-gray-50 rounded-2xl px-4 py-3 border border-gray-200')}>
                <User color="#9ca3af" size={20} />
                <TextInput
                  style={tw('flex-1 ml-3 text-base text-gray-900 dark:text-gray-100')}
                  placeholder={t('mobile.enter_full_name', 'John Doe')}
                  placeholderTextColor="#9ca3af"
                  value={fullName}
                  onChangeText={setFullName}
                />
              </View>
            </View>

            {/* Phone Field - Patient (Third for Patient) */}
            {role === 'patient' && (
              <View style={tw('gap-1.5 mt-2')}>
                <Text style={tw('text-sm font-medium text-[#1E1E1E] dark:text-slate-200')}>{t('mobile.phone_number', `Phone number`)}</Text>
                <View style={tw('flex-row items-center bg-gray-50 rounded-2xl px-4 py-3 border border-gray-200')}>
                  <Phone color="#9ca3af" size={20} />
                  <TextInput
                    style={tw('flex-1 ml-3 text-base text-gray-900 dark:text-gray-100')}
                    placeholder={t('mobile.enter_your_phone', 'Enter your phone number')}
                    placeholderTextColor="#9ca3af"
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                  />
                </View>
              </View>
            )}

            {/* Password Field - Both */}
            <View style={tw('gap-1.5 mt-2')}>
              <Text style={tw('text-sm font-medium text-[#1E1E1E] dark:text-slate-200')}>{t('mobile.password', `Password`)}</Text>
              <View style={tw('flex-row items-center bg-gray-50 rounded-2xl px-4 py-3 border border-gray-200')}>
                <Lock color="#9ca3af" size={20} />
                <TextInput
                  style={tw('flex-1 ml-3 text-base text-gray-900 dark:text-gray-100')}
                  placeholder={t('mobile.create_password_hint', 'Create a password')}
                  placeholderTextColor="#9ca3af"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>
            </View>

            {/* Confirm Password Field - Both */}
            <View style={tw('gap-1.5 mt-2')}>
              <Text style={tw('text-sm font-medium text-[#1E1E1E] dark:text-slate-200')}>{t('mobile.confirm_password', `Confirm Password`)}</Text>
              <View style={tw('flex-row items-center bg-gray-50 rounded-2xl px-4 py-3 border border-gray-200')}>
                <Lock color="#9ca3af" size={20} />
                <TextInput
                  style={tw('flex-1 ml-3 text-base text-gray-900 dark:text-gray-100')}
                  placeholder={t('mobile.reenter_password_hint', 'Re-enter your password')}
                  placeholderTextColor="#9ca3af"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                />
              </View>
            </View>

            {role === 'doctor' && (
              <>
                {/* Specialty */}
                <View style={tw('gap-1.5 mt-2')}>
                  <Text style={tw('text-sm font-medium text-[#1E1E1E] dark:text-slate-200')}>{t('mobile.specialty', `Specialty`)}</Text>
                  <View style={tw('flex-row items-center bg-gray-50 rounded-2xl px-4 py-3 border border-gray-200')}>
                    <Stethoscope color="#9ca3af" size={20} />
                    <TextInput
                      style={tw('flex-1 ml-3 text-base text-gray-900 dark:text-gray-100')}
                      placeholder={t('mobile.specialty_hint', 'e.g. Cardiology')}
                      placeholderTextColor="#9ca3af"
                      value={specialty}
                      onChangeText={setSpecialty}
                    />
                  </View>
                </View>

                {/* Experience */}
                <View style={tw('gap-1.5 mt-2')}>
                  <Text style={tw('text-sm font-medium text-[#1E1E1E] dark:text-slate-200')}>{t('mobile.years_of_experience', `Years of Experience`)}</Text>
                  <View style={tw('flex-row items-center bg-gray-50 rounded-2xl px-4 py-3 border border-gray-200')}>
                    <Clock color="#9ca3af" size={20} />
                    <TextInput
                      style={tw('flex-1 ml-3 text-base text-gray-900 dark:text-gray-100')}
                      placeholder={t('mobile.experience_hint', 'e.g. 5')}
                      placeholderTextColor="#9ca3af"
                      value={experience}
                      onChangeText={setExperience}
                      keyboardType="number-pad"
                    />
                  </View>
                </View>

                {/* Workplace */}
                <View style={tw('gap-1.5 mt-2')}>
                  <Text style={tw('text-sm font-medium text-[#1E1E1E] dark:text-slate-200')}>{t('mobile.current_workplace_hospital', `Current workplace / Hospital`)}</Text>
                  <View style={tw('flex-row items-center bg-gray-50 rounded-2xl px-4 py-3 border border-gray-200')}>
                    <Briefcase color="#9ca3af" size={20} />
                    <TextInput
                      style={tw('flex-1 ml-3 text-base text-gray-900 dark:text-gray-100')}
                      placeholder={t('mobile.workplace_hint', 'e.g. City Hospital')}
                      placeholderTextColor="#9ca3af"
                      value={workplace}
                      onChangeText={setWorkplace}
                    />
                  </View>
                </View>
                
                {/* Verification Documents */}
                <View style={tw('gap-1.5 mt-4')}>
                  <View style={tw('flex-row items-center justify-between')}>
                    <Text style={tw('text-sm font-bold text-[#1E1E1E] dark:text-slate-200')}>{t('mobile.professional_verification', `Professional Verification`)}</Text>
                    <Text style={tw('text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full font-bold')}>{t('mobile.required', `Required`)}</Text>
                  </View>
                  <Text style={tw('text-xs text-gray-500 mb-2')}>{t('mobile.required_to_activate_your_acco', `Required to activate your account`)}</Text>
                  
                  <TouchableOpacity 
                    onPress={() => Toast.show({ type: 'info', text1: 'Info', text2: 'Select verification documents to upload' })} 
                    style={tw('border border-dashed border-gray-300 rounded-2xl bg-gray-50 py-6 items-center')}
                    disabled={isLoading}
                  >
                    <View style={tw('bg-gray-200 p-3 rounded-full mb-2')}>
                      <UploadCloud color="#9ca3af" size={24} />
                    </View>
                    <Text style={tw('text-sm font-semibold text-gray-700')}>{t('mobile.tap_to_select_documents', `Tap to select documents`)}</Text>
                    <Text style={tw('text-xs text-gray-500 mt-1')}>{t('mobile.upload_medical_degree_and_prac', `Upload Medical Degree and Practice License`)}</Text>
                    <Text style={tw('text-xs text-gray-500')}>{t('mobile.pdf_jpg_png_max_10_mb', `PDF, JPG, PNG, MAX 10 MB`)}</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* Submit Button */}
            <TouchableOpacity 
              style={tw(`h-12 w-full mt-4 rounded-2xl items-center justify-center ${isLoading ? 'bg-emerald-400' : 'bg-emerald-500'}`)}
              onPress={handleRegister}
              disabled={isLoading}
            >
              <Text style={tw('text-white text-base font-semibold')}>{isLoading ? t('mobile.loading', 'Loading...') : t('mobile.sign_up', `Sign up`)}</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={tw('mt-4 items-center')}
              onPress={() => handleNavigate('/(auth)/login')}
              disabled={isLoading}
            >
              <Text style={tw('text-sm text-gray-500')}>
                {t('mobile.already_have_account', 'Already have an account?')} <Text style={tw('font-medium text-emerald-500')}>{t('mobile.log_in', `Log in`)}</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
