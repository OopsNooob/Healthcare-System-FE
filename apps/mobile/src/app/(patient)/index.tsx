import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, ScrollView, TouchableOpacity, Image, TextInput, SafeAreaView, RefreshControl, Dimensions } from 'react-native';
import { useSafeRouter as useRouter } from '@/utils/useSafeRouter';
import { Search, Bell, Calendar, ChevronRight, Star, Heart, Activity, Crown, MessageSquare, Droplet, Flame, CheckCircle2, Circle } from 'lucide-react-native';
import { tw, twInstance } from '@/tw';
import { useThemeContext } from '@/context/ThemeContext';

export default function PatientHomeScreen() {
  const { t } = useTranslation();
  useThemeContext(); // Subscribe to theme changes for reactive re-render

  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // --- NEW DA2 MOCK DATA ---
  const careProgram = {
    name: t('mobile.hypertension_program', 'Hypertension Management'),
    progress: 75, // 75% adherence
    streak: 12, // 12 days streak
    daysLeft: 45,
  };

  const todayTasks = [
    { id: 1, type: 'metric', title: t('mobile.measure_bp', 'Measure Blood Pressure'), time: '08:00 AM', completed: true, icon: Activity, color: twInstance.color('text-rose-500'), bg: 'bg-rose-100 dark:bg-rose-900/30' },
    { id: 2, type: 'metric', title: t('mobile.measure_bg', 'Measure Blood Sugar'), time: '01:00 PM', completed: false, icon: Droplet, color: twInstance.color('text-blue-500'), bg: 'bg-blue-100 dark:bg-blue-900/30' },
    { id: 3, type: 'education', title: t('mobile.read_diet', 'Diet for Hypertension'), time: t('mobile.anytime', 'Anytime'), completed: false, icon: Flame, color: twInstance.color('text-amber-500'), bg: 'bg-amber-100 dark:bg-amber-900/30' },
  ];

  const quotas = {
    aiRemaining: 15,
    aiTotal: 20,
    consultsRemaining: 2,
    consultsTotal: 3
  };

  const upcomingAppointment = {
    id: 1,
    doctorName: 'Dr. Sarah Connor',
    specialty: t('mobile.cardiologist', 'Cardiologist'),
    date: 'Mon, 12 Aug',
    time: '10:00 AM',
    image: 'https://i.pravatar.cc/150?img=1',
  };

  useEffect(() => {
    setTimeout(() => {
      setLoading(false);
    }, 1200);
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1200);
  };

  return (
    <SafeAreaView style={tw('flex-1 bg-slate-50 dark:bg-slate-950')}>
      <ScrollView 
        contentContainerStyle={tw('pb-20')} 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={twInstance.color('text-slate-900 dark:text-slate-100')} />}
      >
        {/* Header */}
        <View style={tw('flex-row justify-between items-center px-6 pt-6 pb-4')}>
          <View>
            <Text style={tw('text-gray-500 dark:text-gray-400 text-sm')}>{t('mobile.good_morning', 'Good morning,')}</Text>
            <Text style={tw('text-2xl font-bold text-[#313A34] dark:text-slate-100')}>{t('mobile.alex_johnson', 'Alex Johnson')}</Text>
          </View>
          <TouchableOpacity 
            style={tw('p-2 bg-white dark:bg-slate-900 rounded-full shadow-sm border border-gray-100 dark:border-gray-800 relative')}
            onPress={() => router.push('/(patient)/notifications')}
          >
            <Bell color={twInstance.color('text-slate-900 dark:text-slate-100')} size={24} />
            <View style={tw('absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-slate-900')} />
          </TouchableOpacity>
        </View>

        {/* Quotas Bar (DA2) */}
        <View style={tw('px-6 mb-6 flex-row gap-3')}>
          <View style={tw('flex-row items-center bg-emerald-50 dark:bg-emerald-900/30 px-3 py-2 rounded-full border border-emerald-100 dark:border-emerald-800/50 flex-1')}>
             <MessageSquare size={16} color={twInstance.color('text-emerald-600 dark:text-emerald-400')} />
             <Text style={tw('ml-2 text-xs font-medium text-emerald-800 dark:text-emerald-300')}>AI: {quotas.aiRemaining}/{quotas.aiTotal} {t('mobile.chats', 'chats')}</Text>
          </View>
          <View style={tw('flex-row items-center bg-blue-50 dark:bg-blue-900/30 px-3 py-2 rounded-full border border-blue-100 dark:border-blue-800/50 flex-1')}>
             <Activity size={16} color={twInstance.color('text-blue-600 dark:text-blue-400')} />
             <Text style={tw('ml-2 text-xs font-medium text-blue-800 dark:text-blue-300')}>Call: {quotas.consultsRemaining}/{quotas.consultsTotal} {t('mobile.left', 'left')}</Text>
          </View>
        </View>

        {/* Care Program Banner (DA2) */}
        <View style={tw('px-6 mb-6')}>
          <View style={tw('bg-indigo-600 dark:bg-indigo-700 rounded-3xl p-5 shadow-sm')}>
            <View style={tw('flex-row justify-between items-start mb-4')}>
              <View style={tw('flex-1')}>
                <Text style={tw('text-indigo-100 text-xs font-medium uppercase tracking-wider mb-1')}>{t('mobile.active_program', 'Active Program')}</Text>
                <Text style={tw('text-white font-bold text-lg leading-tight')}>{careProgram.name}</Text>
              </View>
              <View style={tw('bg-white/20 px-3 py-1.5 rounded-full flex-row items-center')}>
                <Flame size={14} color="#fca5a5" />
                <Text style={tw('text-white text-xs font-bold ml-1')}>{careProgram.streak} {t('mobile.days', 'days')}</Text>
              </View>
            </View>
            
            {/* Progress bar */}
            <View style={tw('mb-2')}>
              <View style={tw('flex-row justify-between mb-1')}>
                <Text style={tw('text-indigo-100 text-xs')}>{t('mobile.adherence', 'Adherence')}</Text>
                <Text style={tw('text-white font-bold text-xs')}>{careProgram.progress}%</Text>
              </View>
              <View style={tw('w-full h-2 bg-indigo-900/50 rounded-full overflow-hidden')}>
                <View style={[tw('h-full bg-emerald-400 rounded-full'), { width: `${careProgram.progress}%` }]} />
              </View>
            </View>
            <Text style={tw('text-indigo-200 text-xs text-right')}>{careProgram.daysLeft} {t('mobile.days_remaining', 'days remaining')}</Text>
          </View>
        </View>

        {/* Today's Tasks (DA2) */}
        <View style={tw('px-6 mb-8')}>
          <View style={tw('flex-row justify-between items-end mb-4')}>
            <Text style={tw('text-lg font-bold text-[#313A34] dark:text-slate-100')}>{t('mobile.todays_tasks', "Today's Tasks")}</Text>
            <Text style={tw('text-sm font-medium text-emerald-500')}>1/3 {t('mobile.done', 'Done')}</Text>
          </View>

          <View style={tw('gap-3')}>
            {todayTasks.map((task) => {
              const Icon = task.icon;
              return (
                <TouchableOpacity 
                  key={task.id} 
                  style={tw(`flex-row items-center bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-800 ${task.completed ? 'opacity-60' : ''}`)}
                  onPress={() => router.push('/(patient)/health-metric')}
                >
                  <View style={tw(`w-12 h-12 rounded-xl items-center justify-center mr-4 ${task.bg}`)}>
                    <Icon size={24} color={task.color as string} />
                  </View>
                  <View style={tw('flex-1')}>
                    <Text style={tw(`text-base font-bold dark:text-slate-100 ${task.completed ? 'text-gray-400 line-through' : 'text-[#313A34]'}`)}>{task.title}</Text>
                    <Text style={tw('text-sm text-gray-500 dark:text-gray-400')}>{task.time}</Text>
                  </View>
                  <View>
                    {task.completed ? (
                      <CheckCircle2 size={24} color={twInstance.color('text-emerald-500')} />
                    ) : (
                      <Circle size={24} color={twInstance.color('text-gray-300 dark:text-gray-600')} />
                    )}
                  </View>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>

        {/* Premium Banner */}
        <View style={tw('px-6 mb-8')}>
          <TouchableOpacity 
            onPress={() => router.push('/(patient)/premium')}
            style={tw('bg-amber-500 rounded-3xl p-5 flex-row items-center justify-between shadow-md')}
          >
            <View style={tw('flex-1 pr-4')}>
              <View style={tw('flex-row items-center mb-1')}>
                <Crown color="#ffffff" size={20} style={tw('mr-2')} />
                <Text style={tw('text-white font-bold text-lg')}>{t('mobile.upgrade_premium', 'Upgrade Premium')}</Text>
              </View>
              <Text style={tw('text-amber-50 text-sm leading-tight')}>{t('mobile.unlimited_ai_chats_priority_do', 'Unlimited AI chats & priority doctor queue')}</Text>
            </View>
            <View style={tw('bg-white dark:bg-slate-900/20 p-2 rounded-full')}>
              <ChevronRight color={twInstance.color('text-amber-500 dark:text-white')} size={24} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Upcoming Appointment */}
        <View style={tw('px-6 mb-8')}>
          <View style={tw('flex-row justify-between items-end mb-4')}>
            <Text style={tw('text-lg font-bold text-[#313A34] dark:text-slate-100')}>{t('mobile.upcoming_appointment', 'Upcoming Appointment')}</Text>
            <TouchableOpacity onPress={() => router.push('/(patient)/chat-hub')}>
              <Text style={tw('text-sm font-medium text-emerald-500')}>{t('mobile.see_all', 'See all')}</Text>
            </TouchableOpacity>
          </View>

          <View style={tw('bg-emerald-500 dark:bg-emerald-600 rounded-3xl p-5 shadow-sm')}>
            <View style={tw('flex-row items-center mb-4')}>
              <Image 
                source={{ uri: upcomingAppointment.image }} 
                style={tw('w-14 h-14 rounded-2xl bg-emerald-400')} 
              />
              <View style={tw('ml-3 flex-1')}>
                <Text style={tw('text-white font-bold text-lg')}>{upcomingAppointment.doctorName}</Text>
                <Text style={tw('text-emerald-100 text-sm')}>{upcomingAppointment.specialty}</Text>
              </View>
              <TouchableOpacity style={tw('w-10 h-10 bg-white dark:bg-slate-900/20 rounded-full items-center justify-center')} onPress={() => router.push('/(patient)/video-call')}>
                <View style={tw('w-10 h-10 bg-white dark:bg-slate-900 rounded-full items-center justify-center')}>
                  <Activity color="#10b981" size={20} />
                </View>
              </TouchableOpacity>
            </View>

            <View style={tw('bg-emerald-600 dark:bg-emerald-700 rounded-2xl p-3 flex-row items-center justify-between')}>
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

      </ScrollView>
    </SafeAreaView>
  );
}
