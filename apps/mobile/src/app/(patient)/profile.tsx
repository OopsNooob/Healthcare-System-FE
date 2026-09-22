import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, Image, TextInput, KeyboardAvoidingView, Platform, useColorScheme as useRNColorScheme } from 'react-native';
import { useSafeRouter as useRouter } from '@/utils/useSafeRouter';
import { Camera, Mail, Phone, MapPin, User, LogOut, Crown, ChevronRight } from 'lucide-react-native';
import { useAppColorScheme } from 'twrnc';
import { tw, twInstance } from '@/tw';

export default function ProfileScreen() {
  const { t, i18n } = useTranslation();
  const [colorScheme, toggleColorScheme, setColorScheme] = useAppColorScheme(twInstance);
  const rnColorScheme = useRNColorScheme();
  const activeScheme = colorScheme || rnColorScheme || 'light';
  const router = useRouter();

  const [form, setForm] = useState({
    fullName: 'Alex Johnson',
    email: 'alex.johnson@example.com',
    phone: '+1 234 567 890',
    gender: 'Male',
    street: '123 Health Street',
    ward: 'Ward 5',
    district: 'District 1',
    city: 'Metropolis',
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
                source={{ uri: 'https://i.pravatar.cc/150?img=12' }} 
                style={tw('w-32 h-32 rounded-full bg-slate-200 dark:bg-slate-700 border-4 border-white shadow-sm')} 
              />
              <TouchableOpacity style={tw('absolute bottom-0 right-2 w-10 h-10 bg-slate-900 rounded-full items-center justify-center border-4 border-white shadow-sm')}>
                <Camera color="#ffffff" size={16} />
              </TouchableOpacity>
            </View>
            <View style={tw('mt-4 bg-emerald-50 px-4 py-1.5 rounded-full border border-emerald-200 flex-row items-center')}>
              <User color="#10b981" size={14} />
              <Text style={tw('text-emerald-700 font-bold text-xs ml-1')}>{t('mobile.patient', `Patient`)}</Text>
            </View>
          </View>

          {/* Premium Card */}
          <View style={tw('px-6 mb-8')}>
            <TouchableOpacity 
              onPress={() => router.push('/(patient)/premium')}
              style={tw('bg-slate-900 p-4 rounded-3xl flex-row items-center justify-between shadow-lg')}
            >
              <View style={tw('flex-row items-center')}>
                <View style={tw('w-12 h-12 bg-amber-400 rounded-2xl items-center justify-center mr-4')}>
                  <Crown color="#0f172a" size={24} />
                </View>
                <View>
                  <Text style={tw('text-white font-bold text-base mb-0.5')}>{t('mobile.free_plan', `Free Plan`)}</Text>
                  <Text style={tw('text-amber-400 text-xs font-semibold')}>{t('mobile.upgrade_to_premium', `Upgrade to Premium`)}</Text>
                </View>
              </View>
              <ChevronRight color="#94a3b8" size={20} />
            </TouchableOpacity>
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
            
            <View style={tw('bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm mb-8')}>
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
