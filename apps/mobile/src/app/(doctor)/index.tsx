import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, Dimensions, Switch, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Users, Calendar as CalendarIcon, Clock, TrendingUp, Bell, Power } from 'lucide-react-native';
import { LineChart } from 'react-native-chart-kit';
import { tw, twInstance } from '@/tw';
import { useThemeContext } from '@/context/ThemeContext';

export default function DoctorHomeScreen() {
  const { t } = useTranslation();
  useThemeContext(); // Subscribe to theme changes for reactive re-render

  const router = useRouter();
  const [isOnline, setIsOnline] = useState(true);

  const stats = [
    { title: t('mobile.total_patients', 'Total Patients'), value: '1,248', icon: <Users color="#3b82f6" size={24} />, bg: 'bg-blue-50', trend: '+12%' },
    { title: t('mobile.consultations', 'Consultations'), value: '142', icon: <CalendarIcon color="#10b981" size={24} />, bg: 'bg-emerald-50', trend: '+5%' },
    { title: t('mobile.hours_online', 'Hours Online'), value: '64h', icon: <Clock color="#f59e0b" size={24} />, bg: 'bg-yellow-50', trend: '+2%' },
  ];

  const todayQueue = [
    { id: 1, name: 'Alex Johnson', time: '10:30 AM', statusKey: 'waiting', type: t('mobile.video_call', 'Video Call') },
    { id: 2, name: 'Maria Garcia', time: '11:00 AM', statusKey: 'upcoming', type: t('mobile.chat', 'Chat') },
    { id: 3, name: 'James Smith', time: '02:15 PM', statusKey: 'upcoming', type: t('mobile.video_call', 'Video Call') },
  ];

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [queue, setQueue] = useState<any[]>([]);

  useEffect(() => {
    setTimeout(() => {
      setQueue(todayQueue);
      setLoading(false);
    }, 1200);
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1200);
  };

  const renderQueueSkeleton = () => (
    <View style={tw('flex-row items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 mb-4')}>
      <View style={tw('flex-1')}>
        <View style={tw('w-32 h-5 bg-slate-200 dark:bg-slate-700 rounded mb-2')} />
        <View style={tw('w-24 h-4 bg-slate-200 dark:bg-slate-700 rounded')} />
      </View>
      <View style={tw('items-end')}>
        <View style={tw('w-16 h-6 bg-slate-200 dark:bg-slate-700 rounded-full mb-2')} />
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
          <View style={tw('flex-1')}>
            <Text style={tw('text-gray-500 text-sm')}>{t('mobile.good_morning', `Good morning,`)}</Text>
            <Text style={tw('text-2xl font-bold text-[#313A34] dark:text-slate-100')}>{t('mobile.dr_sarah_connor', `Dr. Sarah Connor`)}</Text>
          </View>
          <View style={tw('flex-row items-center')}>
            <View style={tw('flex-row items-center mr-4 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-full border border-gray-100 dark:border-gray-800 shadow-sm')}>
              <Power color={isOnline ? "#10b981" : "#94a3b8"} size={16} style={tw('mr-2')} />
              <Switch 
                value={isOnline}
                onValueChange={setIsOnline}
                trackColor={{ false: '#cbd5e1', true: '#34d399' }}
                thumbColor={'#ffffff'}
                style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
              />
            </View>
            <TouchableOpacity 
              style={tw('p-2 bg-white dark:bg-slate-900 rounded-full shadow-sm border border-gray-100 dark:border-gray-800 relative')}
              onPress={() => router.push('/(doctor)/notifications')}
            >
              <Bell color={twInstance.color('text-slate-900 dark:text-slate-100')} size={24} />
              <View style={tw('absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white')} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={tw('px-6 mb-8')}>
          <Text style={tw('text-lg font-bold text-[#313A34] dark:text-slate-100 mb-4')}>{t('mobile.overview', `Overview`)}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={tw('-mx-6 px-6')}>
            <View style={tw('flex-row gap-4')}>
              {stats.map((stat, idx) => (
                <View key={idx} style={tw('bg-white dark:bg-slate-900 p-5 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 w-40')}>
                  <View style={tw(`w-12 h-12 rounded-2xl ${stat.bg} items-center justify-center mb-4`)}>
                    {stat.icon}
                  </View>
                  <Text style={tw('text-2xl font-bold text-[#313A34] dark:text-slate-100')}>{stat.value}</Text>
                  <Text style={tw('text-sm text-gray-500 mb-2')}>{stat.title}</Text>
                  <View style={tw('flex-row items-center gap-1')}>
                    <TrendingUp color="#10b981" size={14} />
                    <Text style={tw('text-xs font-bold text-emerald-500')}>{stat.trend}</Text>
                    <Text style={tw('text-xs text-gray-400')}>{t('mobile.this_month', `this month`)}</Text>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Consultations Chart */}
        <View style={tw('px-6 mb-8')}>
          <Text style={tw('text-lg font-bold text-[#313A34] dark:text-slate-100 mb-4')}>{t('mobile.consultations_over_time', `Consultations Over Time`)}</Text>
          <View style={tw('bg-white dark:bg-slate-900 p-4 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800')}>
            <LineChart
              data={{
                labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
                datasets: [
                  {
                    data: [12, 19, 15, 25, 22, 10, 14]
                  }
                ]
              }}
              width={Dimensions.get("window").width - 80}
              height={220}
              yAxisSuffix=""
              yAxisInterval={1}
              chartConfig={{
                backgroundColor: "#ffffff",
                backgroundGradientFrom: "#ffffff",
                backgroundGradientTo: "#ffffff",
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
                style: {
                  borderRadius: 16
                },
                propsForDots: {
                  r: "5",
                  strokeWidth: "2",
                  stroke: "#10b981"
                }
              }}
              bezier
              style={{
                marginVertical: 8,
                borderRadius: 16,
                marginLeft: -10
              }}
            />
          </View>
        </View>

        {/* Today's Queue */}
        <View style={tw('px-6')}>
          <View style={tw('flex-row justify-between items-end mb-4')}>
            <Text style={tw('text-lg font-bold text-[#313A34] dark:text-slate-100')}>{t('mobile.todays_queue', `Today's Queue`)}</Text>
            <TouchableOpacity onPress={() => router.push('/(doctor)/consultations')}>
              <Text style={tw('text-sm font-medium text-blue-500')}>{t('mobile.view_schedule', `View Schedule`)}</Text>
            </TouchableOpacity>
          </View>

          <View style={tw('gap-4')}>
            {loading ? (
              <>
                {renderQueueSkeleton()}
                {renderQueueSkeleton()}
                {renderQueueSkeleton()}
              </>
            ) : queue.length > 0 ? (
              queue.map((item) => (
                <View 
                  key={item.id}
                  style={tw('flex-row items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800')}
                >
                  <View style={tw('flex-1')}>
                    <Text style={tw('text-base font-bold text-[#313A34] dark:text-slate-100')}>{item.name}</Text>
                    <Text style={tw('text-sm text-gray-500 mt-0.5')}>{item.type} • {item.time}</Text>
                  </View>
                  <View style={tw('items-end')}>
                    <View style={tw(`px-3 py-1 rounded-full ${item.statusKey === 'waiting' ? 'bg-orange-100' : 'bg-gray-100'}`)}>
                      <Text style={tw(`text-xs font-bold ${item.statusKey === 'waiting' ? 'text-orange-600' : 'text-gray-600'}`)}>
                        {item.statusKey === 'waiting' ? t('mobile.waiting', 'Waiting') : t('mobile.upcoming', 'Upcoming')}
                      </Text>
                    </View>
                    {item.statusKey === 'waiting' && (
                      <TouchableOpacity 
                        style={tw('mt-2 bg-blue-500 px-4 py-1.5 rounded-full')}
                        onPress={() => router.push('/(doctor)/video-call')}
                      >
                        <Text style={tw('text-white text-xs font-bold')}>{t('mobile.start', `Start`)}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))
            ) : (
              <View style={tw('items-center justify-center py-8 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-gray-800 border-dashed')}>
                <Users color="#94a3b8" size={32} style={tw('mb-2')} />
                <Text style={tw('text-gray-500 font-medium')}>{t('mobile.no_patients_in_queue', `No patients in queue`)}</Text>
              </View>
            )}
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
