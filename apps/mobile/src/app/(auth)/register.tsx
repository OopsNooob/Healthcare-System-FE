import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, SafeAreaView, ScrollView, KeyboardAvoidingView, Platform, Alert, Image } from 'react-native';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import { Mail, Lock, Plus, User, Phone, Briefcase, Stethoscope, Clock, UploadCloud } from 'lucide-react-native';
import { tw } from '@/tw';

export default function RegisterScreen() {
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

  const handleRegister = () => {
    // Mock register logic
    if (role === 'doctor') {
      router.replace('/(doctor)');
    } else {
      router.replace('/(patient)');
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={tw('flex-1 bg-slate-50')}
    >
      <ScrollView contentContainerStyle={tw('flex-grow items-center justify-center px-6 py-10')}>
        {/* Logo area */}
        <View style={tw('flex-col items-center gap-2 mb-8')}>
          <View style={tw('flex-row items-center gap-2')}>
            <Plus color="#10b981" size={32} />
            <Text style={tw('text-3xl font-bold text-[#313A34]')}>Healthcare</Text>
          </View>
          <Text style={tw('text-sm text-gray-500')}>Your intelligent telecare AI solutions. ✨</Text>
        </View>

        {/* Form Card */}
        <View style={tw('w-full bg-white rounded-3xl border border-gray-200 shadow-sm px-6 py-8')}>
          <Text style={tw('text-center text-3xl font-bold text-[#313A34] mb-2')}>Sign up</Text>
          <Text style={tw('text-center text-sm text-gray-500 mb-6')}>Create a new account</Text>

          {/* Role selector */}
          <View style={tw('flex-row bg-gray-100 p-1 rounded-xl mb-6')}>
            <TouchableOpacity 
              style={tw(`flex-1 py-2 items-center rounded-lg ${role === 'patient' ? 'bg-white shadow-sm' : ''}`)}
              onPress={() => setRole('patient')}
            >
              <Text style={tw(`font-medium ${role === 'patient' ? 'text-emerald-600' : 'text-gray-500'}`)}>Patient</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={tw(`flex-1 py-2 items-center rounded-lg ${role === 'doctor' ? 'bg-white shadow-sm' : ''}`)}
              onPress={() => setRole('doctor')}
            >
              <Text style={tw(`font-medium ${role === 'doctor' ? 'text-emerald-600' : 'text-gray-500'}`)}>Doctor</Text>
            </TouchableOpacity>
          </View>

          <View style={tw('gap-4')}>
            
            {/* Email Field - Both */}
            <View style={tw('gap-1.5')}>
              <Text style={tw('text-sm font-medium text-[#1E1E1E]')}>Email</Text>
              <View style={tw('flex-row items-center bg-gray-50 rounded-2xl px-4 py-3 border border-gray-200')}>
                <Mail color="#9ca3af" size={20} />
                <TextInput
                  style={tw('flex-1 ml-3 text-base text-gray-900')}
                  placeholder="Enter your email account"
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
                <Text style={tw('text-sm text-emerald-600 font-medium')}>Load previous registration data?</Text>
              </TouchableOpacity>
            )}

            {/* Phone Field - Doctor (Second for Doctor) */}
            {role === 'doctor' && (
              <View style={tw('gap-1.5')}>
                <Text style={tw('text-sm font-medium text-[#1E1E1E]')}>Phone number</Text>
                <View style={tw('flex-row items-center bg-gray-50 rounded-2xl px-4 py-3 border border-gray-200')}>
                  <Phone color="#9ca3af" size={20} />
                  <TextInput
                    style={tw('flex-1 ml-3 text-base text-gray-900')}
                    placeholder="Enter your phone number"
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
              <Text style={tw('text-sm font-medium text-[#1E1E1E]')}>Full Name</Text>
              <View style={tw('flex-row items-center bg-gray-50 rounded-2xl px-4 py-3 border border-gray-200')}>
                <User color="#9ca3af" size={20} />
                <TextInput
                  style={tw('flex-1 ml-3 text-base text-gray-900')}
                  placeholder="John Doe"
                  placeholderTextColor="#9ca3af"
                  value={fullName}
                  onChangeText={setFullName}
                />
              </View>
            </View>

            {/* Phone Field - Patient (Third for Patient) */}
            {role === 'patient' && (
              <View style={tw('gap-1.5 mt-2')}>
                <Text style={tw('text-sm font-medium text-[#1E1E1E]')}>Phone number</Text>
                <View style={tw('flex-row items-center bg-gray-50 rounded-2xl px-4 py-3 border border-gray-200')}>
                  <Phone color="#9ca3af" size={20} />
                  <TextInput
                    style={tw('flex-1 ml-3 text-base text-gray-900')}
                    placeholder="Enter your phone number"
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
              <Text style={tw('text-sm font-medium text-[#1E1E1E]')}>Password</Text>
              <View style={tw('flex-row items-center bg-gray-50 rounded-2xl px-4 py-3 border border-gray-200')}>
                <Lock color="#9ca3af" size={20} />
                <TextInput
                  style={tw('flex-1 ml-3 text-base text-gray-900')}
                  placeholder="Create a password"
                  placeholderTextColor="#9ca3af"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>
            </View>

            {/* Confirm Password Field - Both */}
            <View style={tw('gap-1.5 mt-2')}>
              <Text style={tw('text-sm font-medium text-[#1E1E1E]')}>Confirm Password</Text>
              <View style={tw('flex-row items-center bg-gray-50 rounded-2xl px-4 py-3 border border-gray-200')}>
                <Lock color="#9ca3af" size={20} />
                <TextInput
                  style={tw('flex-1 ml-3 text-base text-gray-900')}
                  placeholder="Re-enter your password"
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
                  <Text style={tw('text-sm font-medium text-[#1E1E1E]')}>Specialty</Text>
                  <View style={tw('flex-row items-center bg-gray-50 rounded-2xl px-4 py-3 border border-gray-200')}>
                    <Stethoscope color="#9ca3af" size={20} />
                    <TextInput
                      style={tw('flex-1 ml-3 text-base text-gray-900')}
                      placeholder="e.g. Cardiology"
                      placeholderTextColor="#9ca3af"
                      value={specialty}
                      onChangeText={setSpecialty}
                    />
                  </View>
                </View>

                {/* Experience */}
                <View style={tw('gap-1.5 mt-2')}>
                  <Text style={tw('text-sm font-medium text-[#1E1E1E]')}>Years of Experience</Text>
                  <View style={tw('flex-row items-center bg-gray-50 rounded-2xl px-4 py-3 border border-gray-200')}>
                    <Clock color="#9ca3af" size={20} />
                    <TextInput
                      style={tw('flex-1 ml-3 text-base text-gray-900')}
                      placeholder="e.g. 5"
                      placeholderTextColor="#9ca3af"
                      value={experience}
                      onChangeText={setExperience}
                      keyboardType="number-pad"
                    />
                  </View>
                </View>

                {/* Workplace */}
                <View style={tw('gap-1.5 mt-2')}>
                  <Text style={tw('text-sm font-medium text-[#1E1E1E]')}>Current workplace / Hospital</Text>
                  <View style={tw('flex-row items-center bg-gray-50 rounded-2xl px-4 py-3 border border-gray-200')}>
                    <Briefcase color="#9ca3af" size={20} />
                    <TextInput
                      style={tw('flex-1 ml-3 text-base text-gray-900')}
                      placeholder="e.g. City Hospital"
                      placeholderTextColor="#9ca3af"
                      value={workplace}
                      onChangeText={setWorkplace}
                    />
                  </View>
                </View>
                
                {/* Verification Documents */}
                <View style={tw('gap-1.5 mt-4')}>
                  <View style={tw('flex-row items-center justify-between')}>
                    <Text style={tw('text-sm font-bold text-[#1E1E1E]')}>Professional Verification</Text>
                    <Text style={tw('text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full font-bold')}>Required</Text>
                  </View>
                  <Text style={tw('text-xs text-gray-500 mb-2')}>Required to activate your account</Text>
                  
                  <TouchableOpacity onPress={() => Toast.show({ type: 'info', text1: 'Info', text2: 'Select verification documents to upload' })} style={tw('border border-dashed border-gray-300 rounded-2xl bg-gray-50 py-6 items-center')}>
                    <View style={tw('bg-gray-200 p-3 rounded-full mb-2')}>
                      <UploadCloud color="#9ca3af" size={24} />
                    </View>
                    <Text style={tw('text-sm font-semibold text-gray-700')}>Tap to select documents</Text>
                    <Text style={tw('text-xs text-gray-500 mt-1')}>Upload Medical Degree and Practice License</Text>
                    <Text style={tw('text-xs text-gray-500')}>PDF, JPG, PNG, MAX 10 MB</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* Submit Button */}
            <TouchableOpacity 
              style={tw('h-12 w-full bg-emerald-500 rounded-2xl items-center justify-center mt-6')}
              onPress={handleRegister}
            >
              <Text style={tw('text-white text-base font-semibold')}>Create account</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={tw('mt-4 items-center')}
              onPress={() => router.push('/(auth)/login')}
            >
              <Text style={tw('text-sm text-gray-500')}>
                Already have an account? <Text style={tw('font-medium text-emerald-500')}>Log in</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
