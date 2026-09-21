import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, ScrollView, TouchableOpacity, Image, TextInput, SafeAreaView, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Search, Bell, Calendar, ChevronRight, Star, Heart, Activity, Crown } from 'lucide-react-native';
import { tw, twInstance } from '@/tw';
import { useThemeContext } from '@/context/ThemeContext';

export default function PatientHomeScreen() {
  const { t } = useTranslation();
  useThemeContext(); // Subscribe to theme changes for reactive re-render

  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [doctors, setDoctors] = useState<any[]>([]);

  // Mock data
  const upcomingAppointment = {
    id: 1,
    doctorName: 'Dr. Sarah Connor',
    specialty: 'Cardiologist',
    date: 'Mon, 12 Aug',
    time: '10:00 AM',
    image: 'https://i.pravatar.cc/150?img=1',
  };

  const specialties = [
    { id: 1, name: 'Cardiology', icon: '❤️', color: 'bg-red-100' },
    { id: 2, name: 'Dental', icon: '🦷', color: 'bg-blue-100' },
    { id: 3, name: 'Eye Care', icon: '👁️', color: 'bg-emerald-100' },
    { id: 4, name: 'Neurology', icon: '🧠', color: 'bg-purple-100' },
    { id: 5, name: 'Pediatric', icon: '👶', color: 'bg-yellow-100' },
    { id: 6, name: 'Nutrition', icon: '🥗', color: 'bg-orange-100' },
  ];

  const topDoctors = [
    { id: 1, name: 'Dr. John Doe', specialty: 'Neurologist', rating: 4.8, reviews: 124, image: 'https://i.pravatar.cc/150?img=11' },
    { id: 2, name: 'Dr. Jane Smith', specialty: 'Dentist', rating: 4.9, reviews: 312, image: 'https://i.pravatar.cc/150?img=5' },
    { id: 3, name: 'Dr. Emily Chen', specialty: 'Pediatrician', rating: 4.7, reviews: 89, image: 'https://i.pravatar.cc/150?img=9' },
  ];

  useEffect(() => {
    setTimeout(() => {
      setDoctors(topDoctors);
      setLoading(false);
    }, 1200);
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1200);
  };

  const renderDoctorSkeleton = () => (
    <View style={tw('flex-row bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-800 mb-4')}>
      <View style={tw('w-20 h-20 rounded-xl bg-slate-200 dark:bg-slate-700')} />
      <View style={tw('ml-4 flex-1 justify-center')}>
        <View style={tw('w-3/4 h-5 bg-slate-200 dark:bg-slate-700 rounded mb-2')} />
        <View style={tw('w-1/2 h-4 bg-slate-200 dark:bg-slate-700 rounded mb-3')} />
        <View style={tw('w-1/3 h-4 bg-slate-200 dark:bg-slate-700 rounded')} />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={tw('flex-1 bg-slate-50 dark:bg-slate-950')}>
      <ScrollView 
        contentContainerStyle={tw('pb-20')} 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0f172a" />}
      >
        {/* Header */}
        <View style={tw('flex-row justify-between items-center px-6 pt-6 pb-4')}>
          <View>
            <Text style={tw('text-gray-500 text-sm')}>{t('mobile.good_morning', `Good morning,`)}</Text>
            <Text style={tw('text-2xl font-bold text-[#313A34] dark:text-slate-100')}>{t('mobile.alex_johnson', `Alex Johnson`)}</Text>
          </View>
          <TouchableOpacity 
            style={tw('p-2 bg-white dark:bg-slate-900 rounded-full shadow-sm border border-gray-100 dark:border-gray-800 relative')}
            onPress={() => router.push('/(patient)/notifications')}
          >
            <Bell color={twInstance.color('text-slate-900 dark:text-slate-100')} size={24} />
            <View style={tw('absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white')} />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={tw('px-6 mb-6')}>
          <View style={tw('flex-row items-center bg-white dark:bg-slate-900 rounded-2xl px-4 py-3 shadow-sm border border-gray-100 dark:border-gray-800')}>
            <Search color="#9ca3af" size={20} />
            <TextInput
              style={tw('flex-1 ml-3 text-base text-gray-900 dark:text-gray-100')}
              placeholder={t('mobile.search_doctor_specialties', 'Search doctor, specialties...')}
              placeholderTextColor="#9ca3af"
            />
          </View>
        </View>

        {/* Premium Banner */}
        <View style={tw('px-6 mb-6')}>
          <TouchableOpacity 
            onPress={() => router.push('/(patient)/premium')}
            style={tw('bg-amber-500 rounded-3xl p-5 flex-row items-center justify-between shadow-md')}
          >
            <View style={tw('flex-1 pr-4')}>
              <View style={tw('flex-row items-center mb-1')}>
                <Crown color="#ffffff" size={20} style={tw('mr-2')} />
                <Text style={tw('text-white font-bold text-lg')}>{t('mobile.upgrade_premium', `Upgrade Premium`)}</Text>
              </View>
              <Text style={tw('text-amber-50 text-sm leading-tight')}>{t('mobile.unlimited_ai_chats_priority_do', `Unlimited AI chats & priority doctor queue`)}</Text>
            </View>
            <View style={tw('bg-white dark:bg-slate-900/20 p-2 rounded-full')}>
              <ChevronRight color="#ffffff" size={24} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Upcoming Appointment */}
        <View style={tw('px-6 mb-8')}>
          <View style={tw('flex-row justify-between items-end mb-4')}>
            <Text style={tw('text-lg font-bold text-[#313A34] dark:text-slate-100')}>{t('mobile.upcoming_appointment', `Upcoming Appointment`)}</Text>
            <TouchableOpacity onPress={() => router.push('/(patient)/chat-hub')}>
              <Text style={tw('text-sm font-medium text-emerald-500')}>{t('mobile.see_all', `See all`)}</Text>
            </TouchableOpacity>
          </View>

          <View style={tw('bg-emerald-500 rounded-3xl p-5 shadow-sm')}>
            <View style={tw('flex-row items-center mb-4')}>
              <Image 
                source={{ uri: upcomingAppointment.image }} 
                style={tw('w-14 h-14 rounded-2xl bg-emerald-400')} 
              />
              <View style={tw('ml-3 flex-1')}>
                <Text style={tw('text-white font-bold text-lg')}>{upcomingAppointment.doctorName}</Text>
                <Text style={tw('text-emerald-100 text-sm')}>{upcomingAppointment.specialty}</Text>
              </View>
              <TouchableOpacity style={tw('w-10 h-10 bg-white dark:bg-slate-900/20 rounded-full items-center justify-center')}>
                <View style={tw('w-10 h-10 bg-white dark:bg-slate-900 rounded-full items-center justify-center')}>
                  <Activity color="#10b981" size={20} />
                </View>
              </TouchableOpacity>
            </View>

            <View style={tw('bg-emerald-600 rounded-2xl p-3 flex-row items-center justify-between')}>
              <View style={tw('flex-row items-center gap-2')}>
                <Calendar color="#d1fae5" size={16} />
                <Text style={tw('text-emerald-50 text-sm font-medium')}>{upcomingAppointment.date}</Text>
              </View>
              <View style={tw('w-[1px] h-4 bg-emerald-400')} />
              <View style={tw('flex-row items-center gap-2')}>
                <Text style={tw('text-emerald-50 text-sm font-medium')}>{upcomingAppointment.time}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Specialties (Vertical List as requested) */}
        <View style={tw('px-6 mb-8')}>
          <Text style={tw('text-lg font-bold text-[#313A34] dark:text-slate-100 mb-4')}>{t('mobile.specialties', `Specialties`)}</Text>
          <View style={tw('flex-row flex-wrap justify-between gap-y-4')}>
            {specialties.map((item) => (
              <TouchableOpacity key={item.id} style={tw('w-[30%] items-center')}>
                <View style={tw(`w-16 h-16 rounded-2xl ${item.color} items-center justify-center mb-2`)}>
                  <Text style={tw('text-2xl')}>{item.icon}</Text>
                </View>
                <Text style={tw('text-xs font-medium text-center text-gray-700')} numberOfLines={1}>{item.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Top Doctors (Vertical Scroll) */}
        <View style={tw('px-6')}>
          <View style={tw('flex-row justify-between items-end mb-4')}>
            <Text style={tw('text-lg font-bold text-[#313A34] dark:text-slate-100')}>{t('mobile.top_doctors', `Top Doctors`)}</Text>
            <TouchableOpacity onPress={() => router.push('/(patient)/my-doctors')}>
              <Text style={tw('text-sm font-medium text-emerald-500')}>{t('mobile.see_all', `See all`)}</Text>
            </TouchableOpacity>
          </View>

          <View style={tw('gap-4')}>
            {loading ? (
              <>
                {renderDoctorSkeleton()}
                {renderDoctorSkeleton()}
              </>
            ) : doctors.length > 0 ? (
              doctors.map((doc) => (
                <TouchableOpacity 
                  key={doc.id} 
                  style={tw('flex-row bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-800')}
                  onPress={() => {}}
                >
                  <Image source={{ uri: doc.image }} style={tw('w-20 h-20 rounded-xl bg-gray-200')} />
                  <View style={tw('ml-4 flex-1 justify-center')}>
                    <View style={tw('flex-row justify-between items-start mb-1')}>
                      <Text style={tw('text-base font-bold text-[#313A34] dark:text-slate-100')} numberOfLines={1}>{doc.name}</Text>
                      <TouchableOpacity>
                        <Heart color="#9ca3af" size={20} />
                      </TouchableOpacity>
                    </View>
                    <Text style={tw('text-sm text-gray-500 mb-2')}>{doc.specialty}</Text>
                    
                    <View style={tw('flex-row items-center gap-1')}>
                      <Star color="#f59e0b" fill="#f59e0b" size={14} />
                      <Text style={tw('text-sm font-bold text-gray-700')}>{doc.rating}</Text>
                      <Text style={tw('text-xs text-gray-400')}>({doc.reviews} reviews)</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            ) : null}
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
