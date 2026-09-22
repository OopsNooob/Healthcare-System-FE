import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, Image, TextInput, KeyboardAvoidingView, Platform, useColorScheme as useRNColorScheme } from 'react-native';
import { useSafeRouter as useRouter } from '@/utils/useSafeRouter';
import { Camera, Mail, Phone, MapPin, Stethoscope, LogOut, FileText, Pencil, Trash2, Plus, Radical, Building, ShieldCheck } from 'lucide-react-native';
import { useAppColorScheme } from 'twrnc';
import { tw, twInstance } from '@/tw';

export default function DoctorProfileScreen() {
  const { t, i18n } = useTranslation();
  const [colorScheme, toggleColorScheme, setColorScheme] = useAppColorScheme(twInstance);
  const rnColorScheme = useRNColorScheme();
  const activeScheme = colorScheme || rnColorScheme || 'light';

  const router = useRouter();

  const [form, setForm] = useState({
    fullName: 'Dr. Sarah Connor',
    email: 'sarah.connor@hospital.com',
    phone: '+1 234 567 8900',
    gender: 'Female',
    street: '456 Medical Blvd',
    ward: 'Ward 2',
    district: 'District 3',
    city: 'Metropolis',
    experience: '15',
    specialty: 'Cardiologist',
    workplace: 'Central Heart Hospital'
  });

  return (
    <SafeAreaView style={tw('flex-1 bg-slate-50 dark:bg-slate-950')}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={tw('flex-1')}
      >
        <ScrollView contentContainerStyle={tw('pb-20')} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={tw('px-6 pt-6 pb-4 flex-row justify-between items-center')}>
            <Text style={tw('text-2xl font-bold text-slate-900 dark:text-white')}>{t('mobile.my_profile', `My Profile`)}</Text>
            <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
              <LogOut color="#ef4444" size={24} />
            </TouchableOpacity>
          </View>

          {/* Avatar Section */}
          <View style={tw('items-center mb-8 mt-2')}>
            <View style={tw('relative')}>
              <Image 
                source={{ uri: 'https://i.pravatar.cc/150?img=1' }} 
                style={tw('w-32 h-32 rounded-full bg-slate-200 dark:bg-slate-700 border-4 border-white shadow-sm')} 
              />
              <TouchableOpacity style={tw('absolute bottom-0 right-2 w-10 h-10 bg-slate-900 rounded-full items-center justify-center border-4 border-white shadow-sm')}>
                <Camera color="#ffffff" size={16} />
              </TouchableOpacity>
            </View>
            <View style={tw('mt-4 bg-blue-50 px-4 py-1.5 rounded-full border border-blue-200 flex-row items-center')}>
              <Stethoscope color="#3b82f6" size={14} />
              <Text style={tw('text-blue-700 font-bold text-xs ml-1')}>{t('mobile.doctor', `Doctor`)}</Text>
            </View>
          </View>

          {/* Basic Info Form */}
          <View style={tw('px-6')}>
            <Text style={tw('text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-4')}>{t('mobile.basic_information', `Basic Information`)}</Text>
            
            <View style={tw('bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm mb-6')}>
              <View style={tw('mb-4')}>
                <Text style={tw('text-xs font-bold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2')}>{t('mobile.full_name', `Full Name`)}</Text>
                <TextInput
                  style={tw('bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 h-12 text-slate-900 dark:text-white font-medium')}
                  value={form.fullName}
                  onChangeText={(t) => setForm({...form, fullName: t})}
                />
              </View>

              <View style={tw('mb-4')}>
                <Text style={tw('text-xs font-bold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2')}>{t('mobile.email', `Email`)}</Text>
                <View style={tw('bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 h-12 flex-row items-center')}>
                  <Mail color="#94a3b8" size={18} style={tw('mr-2')} />
                  <TextInput
                    style={tw('flex-1 text-slate-500 dark:text-slate-400 dark:text-slate-500 font-medium')}
                    value={form.email}
                    editable={false}
                  />
                </View>
              </View>

              <View style={tw('mb-4')}>
                <Text style={tw('text-xs font-bold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2')}>{t('mobile.phone_number', `Phone Number`)}</Text>
                <View style={tw('bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 h-12 flex-row items-center')}>
                  <Phone color="#94a3b8" size={18} style={tw('mr-2')} />
                  <TextInput
                    style={tw('flex-1 text-slate-900 dark:text-white font-medium')}
                    value={form.phone}
                    onChangeText={(t) => setForm({...form, phone: t})}
                  />
                </View>
              </View>

              <View>
                <Text style={tw('text-xs font-bold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2')}>{t('mobile.gender', `Gender`)}</Text>
                <TextInput
                  style={tw('bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 h-12 text-slate-900 dark:text-white font-medium')}
                  value={form.gender}
                  onChangeText={(t) => setForm({...form, gender: t})}
                />
              </View>
            </View>

            {/* Address Form */}
            <Text style={tw('text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-4')}>{t('mobile.contact_address', `Contact Address`)}</Text>
            
            <View style={tw('bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm mb-6')}>
              <View style={tw('mb-4')}>
                <Text style={tw('text-xs font-bold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2')}>{t('mobile.street', `Street`)}</Text>
                <View style={tw('bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 h-12 flex-row items-center')}>
                  <MapPin color="#94a3b8" size={18} style={tw('mr-2')} />
                  <TextInput
                    style={tw('flex-1 text-slate-900 dark:text-white font-medium')}
                    value={form.street}
                    onChangeText={(t) => setForm({...form, street: t})}
                  />
                </View>
              </View>

              <View style={tw('flex-row gap-4 mb-4')}>
                <View style={tw('flex-1')}>
                  <Text style={tw('text-xs font-bold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2')}>{t('mobile.ward', `Ward`)}</Text>
                  <TextInput
                    style={tw('bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 h-12 text-slate-900 dark:text-white font-medium')}
                    value={form.ward}
                    onChangeText={(t) => setForm({...form, ward: t})}
                  />
                </View>
                <View style={tw('flex-1')}>
                  <Text style={tw('text-xs font-bold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2')}>{t('mobile.district', `District`)}</Text>
                  <TextInput
                    style={tw('bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 h-12 text-slate-900 dark:text-white font-medium')}
                    value={form.district}
                    onChangeText={(t) => setForm({...form, district: t})}
                  />
                </View>
              </View>

              <View>
                <Text style={tw('text-xs font-bold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2')}>{t('mobile.city', `City`)}</Text>
                <TextInput
                  style={tw('bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 h-12 text-slate-900 dark:text-white font-medium')}
                  value={form.city}
                  onChangeText={(t) => setForm({...form, city: t})}
                />
              </View>
            </View>

            {/* Professional Info */}
            <Text style={tw('text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-4')}>{t('mobile.professional_information', `Professional Information`)}</Text>
            
            <View style={tw('bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm mb-6')}>
              <View style={tw('mb-4')}>
                <Text style={tw('text-xs font-bold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2')}>{t('mobile.specialty', `Specialty`)}</Text>
                <View style={tw('bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 h-12 flex-row items-center')}>
                  <Stethoscope color="#94a3b8" size={18} style={tw('mr-2')} />
                  <TextInput
                    style={tw('flex-1 text-slate-900 dark:text-white font-medium')}
                    value={form.specialty}
                    onChangeText={(t) => setForm({...form, specialty: t})}
                  />
                </View>
              </View>

              <View style={tw('mb-4')}>
                <Text style={tw('text-xs font-bold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2')}>{t('mobile.workplace', `Workplace`)}</Text>
                <View style={tw('bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 h-12 flex-row items-center')}>
                  <Building color="#94a3b8" size={18} style={tw('mr-2')} />
                  <TextInput
                    style={tw('flex-1 text-slate-900 dark:text-white font-medium')}
                    value={form.workplace}
                    onChangeText={(t) => setForm({...form, workplace: t})}
                  />
                </View>
              </View>

              <View>
                <Text style={tw('text-xs font-bold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2')}>{t('mobile.years_of_experience', `Years of Experience`)}</Text>
                <View style={tw('bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 h-12 flex-row items-center')}>
                  <Radical color="#94a3b8" size={18} style={tw('mr-2')} />
                  <TextInput
                    style={tw('flex-1 text-slate-900 dark:text-white font-medium')}
                    value={form.experience}
                    keyboardType="numeric"
                    onChangeText={(t) => setForm({...form, experience: t})}
                  />
                </View>
              </View>
            </View>

            {/* Verification Documents */}
            <View style={tw('bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm mb-8')}>
              <View style={tw('flex-row justify-between items-center mb-4')}>
                <View>
                  <Text style={tw('text-base font-bold text-slate-900 dark:text-white')}>{t('mobile.verification_documents', `Verification Documents`)}</Text>
                  <Text style={tw('text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500')}>{t('mobile.upload_new_files_or_replace_ex', `Upload new files or replace existing docs.`)}</Text>
                </View>
                <TouchableOpacity style={tw('bg-slate-900 px-3 py-2 rounded-xl flex-row items-center')}>
                  <Plus color="#ffffff" size={14} style={tw('mr-1')} />
                  <Text style={tw('text-white font-bold text-xs')}>{t('mobile.add_docs', `Add Docs`)}</Text>
                </TouchableOpacity>
              </View>
              
              <View style={tw('border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-2xl p-4')}>
                <View style={tw('flex-row items-center justify-between')}>
                  <View style={tw('flex-row items-center flex-1 mr-2')}>
                    <View style={tw('bg-blue-50 w-10 h-10 rounded-xl items-center justify-center mr-3')}>
                      <FileText color="#3b82f6" size={20} />
                    </View>
                    <View style={tw('flex-1')}>
                      <Text style={tw('font-bold text-slate-800 dark:text-slate-100 text-sm')} numberOfLines={1}>{t('mobile.medicallicense2023pdf', `Medical_License_2023.pdf`)}</Text>
                      <Text style={tw('text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500')}>{t('mobile.uploaded_oct_12_2023', `Uploaded Oct 12, 2023`)}</Text>
                    </View>
                  </View>
                  <View style={tw('flex-row gap-2')}>
                    <TouchableOpacity style={tw('w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 items-center justify-center')}>
                      <Pencil color="#64748b" size={14} />
                    </TouchableOpacity>
                    <TouchableOpacity style={tw('w-8 h-8 rounded-lg border border-red-200 bg-red-50 items-center justify-center')}>
                      <Trash2 color="#ef4444" size={14} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>

            {/* Preferences */}
            <Text style={tw('text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-4 mt-4')}>{t('mobile.preferences', `Preferences`)}</Text>
            
            <View style={tw('bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm mb-8')}>
              <View style={tw('mb-4 flex-row justify-between items-center')}>
                <Text style={tw('text-sm font-bold text-slate-700 dark:text-slate-200')}>{t('mobile.language', `Language`)}</Text>
                <View style={tw('flex-row bg-slate-100 dark:bg-slate-800 rounded-xl p-1')}>
                  <TouchableOpacity 
                    onPress={() => i18n.changeLanguage('en')}
                    style={tw(`px-4 py-2 rounded-lg ${i18n.language === 'en' || !i18n.language.startsWith('vi') ? 'bg-white dark:bg-slate-700 shadow-sm' : ''}`)}
                  >
                    <Text style={tw(`text-xs font-bold ${i18n.language === 'en' || !i18n.language.startsWith('vi') ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`)}>EN</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => i18n.changeLanguage('vi')}
                    style={tw(`px-4 py-2 rounded-lg ${i18n.language?.startsWith('vi') ? 'bg-white dark:bg-slate-700 shadow-sm' : ''}`)}
                  >
                    <Text style={tw(`text-xs font-bold ${i18n.language?.startsWith('vi') ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`)}>VI</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={tw('flex-row justify-between items-center')}>
                <Text style={tw('text-sm font-bold text-slate-700 dark:text-slate-200')}>{t('mobile.dark_mode', `Dark Mode`)}</Text>
                <View style={tw('flex-row bg-slate-100 dark:bg-slate-800 rounded-xl p-1')}>
                  <TouchableOpacity 
                    onPress={() => setColorScheme('light')}
                    style={tw(`px-4 py-2 rounded-lg ${activeScheme === 'light' ? 'bg-white dark:bg-slate-700 shadow-sm' : ''}`)}
                  >
                    <Text style={tw(`text-xs font-bold ${activeScheme === 'light' ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`)}>Light</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => setColorScheme('dark')}
                    style={tw(`px-4 py-2 rounded-lg ${activeScheme === 'dark' ? 'bg-white dark:bg-slate-700 shadow-sm' : ''}`)}
                  >
                    <Text style={tw(`text-xs font-bold ${activeScheme === 'dark' ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`)}>Dark</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Save Button */}
            <TouchableOpacity style={tw('bg-slate-900 h-14 rounded-2xl items-center justify-center shadow-md')}>
              <Text style={tw('text-white font-bold text-lg')}>{t('mobile.save_changes', `Save Changes`)}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
