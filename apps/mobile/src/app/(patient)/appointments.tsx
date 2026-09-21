import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, RefreshControl, Alert } from 'react-native';
import Toast from 'react-native-toast-message';
import { Calendar, Clock, Video, MessageCircle, MapPin, AlertCircle, X, Check, CalendarX2 } from 'lucide-react-native';
import { tw } from '@/tw';
import { useRouter } from 'expo-router';

export default function AppointmentsScreen() {
  const { t } = useTranslation();

  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'history'>('upcoming');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [upcomingList, setUpcomingList] = useState<any[]>([]);
  const [historyList, setHistoryList] = useState<any[]>([]);

  const upcomingAppointments = [
    { 
      id: '1', 
      doctor: 'Dr. Sarah Connor', 
      specialty: 'Cardiologist', 
      date: 'Today', 
      time: '11:00 AM', 
      type: 'Video Call',
      status: 'Queueing',
      queuePosition: 2,
      estimatedWait: '15 mins'
    },
    { 
      id: '2', 
      doctor: 'Dr. Michael Chen', 
      specialty: 'Dermatologist', 
      date: 'Oct 25, 2023', 
      time: '02:30 PM', 
      type: 'Chat',
      status: 'Confirmed'
    },
  ];

  const historyAppointments = [
    { 
      id: '3', 
      doctor: 'Dr. Emily Blunt', 
      specialty: 'General Practitioner', 
      date: 'Sep 12, 2023', 
      time: '09:00 AM', 
      type: 'Video Call',
      status: 'Completed'
    },
    { 
      id: '4', 
      doctor: 'Dr. Robert Fox', 
      specialty: 'Neurologist', 
      date: 'Aug 05, 2023', 
      time: '04:15 PM', 
      type: 'Chat',
      status: 'Cancelled'
    },
  ];

  useEffect(() => {
    // Simulate initial loading
    setTimeout(() => {
      setUpcomingList(upcomingAppointments);
      setHistoryList(historyAppointments);
      setLoading(false);
    }, 1500);
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
      // Simulate refreshing data
    }, 1500);
  };

  const handleCancel = (id: string) => {
    Alert.alert('Cancel Appointment', 'Are you sure you want to cancel this appointment?', [
      { text: 'No', style: 'cancel' },
      { 
        text: 'Yes, Cancel', 
        style: 'destructive',
        onPress: () => {
          setUpcomingList(prev => prev.filter(apt => apt.id !== id));
          Toast.show({
            type: 'success',
            text1: 'Success',
            text2: 'Appointment cancelled successfully'
          });
        }
      }
    ]);
  };

  const renderSkeleton = () => (
    <View style={tw('bg-white dark:bg-slate-900 rounded-3xl p-5 mb-5 border border-slate-200 dark:border-slate-700 shadow-sm opacity-60')}>
      <View style={tw('flex-row justify-between items-start mb-4')}>
        <View>
          <View style={tw('w-40 h-6 bg-slate-200 dark:bg-slate-700 rounded-md mb-2')} />
          <View style={tw('w-24 h-4 bg-slate-200 dark:bg-slate-700 rounded-md')} />
        </View>
        <View style={tw('w-16 h-6 bg-slate-200 dark:bg-slate-700 rounded-full')} />
      </View>
      <View style={tw('flex-row flex-wrap gap-y-3 mb-5')}>
        <View style={tw('w-1/2 flex-row items-center')}>
          <View style={tw('w-4 h-4 bg-slate-200 dark:bg-slate-700 rounded')} />
          <View style={tw('w-20 h-4 bg-slate-200 dark:bg-slate-700 rounded ml-2')} />
        </View>
        <View style={tw('w-1/2 flex-row items-center')}>
          <View style={tw('w-4 h-4 bg-slate-200 dark:bg-slate-700 rounded')} />
          <View style={tw('w-20 h-4 bg-slate-200 dark:bg-slate-700 rounded ml-2')} />
        </View>
      </View>
      <View style={tw('flex-row gap-3 mt-2')}>
        <View style={tw('flex-1 h-12 bg-slate-200 dark:bg-slate-700 rounded-xl')} />
      </View>
    </View>
  );

  const renderEmptyState = (tab: 'upcoming' | 'history') => (
    <View style={tw('items-center justify-center py-20 px-6')}>
      <View style={tw('w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-full items-center justify-center mb-6')}>
        <CalendarX2 color="#94a3b8" size={40} />
      </View>
      <Text style={tw('text-xl font-bold text-slate-900 dark:text-white mb-2 text-center')}>No {tab} appointments</Text>
      <Text style={tw('text-slate-500 dark:text-slate-400 dark:text-slate-500 text-center mb-8')}>
        {tab === 'upcoming' 
          ? "You don't have any upcoming appointments scheduled at the moment."
          : "You haven't had any appointments yet."}
      </Text>
      {tab === 'upcoming' && (
        <TouchableOpacity 
          onPress={() => router.push('/(patient)/my-doctors')}
          style={tw('bg-brand px-8 py-4 rounded-2xl flex-row items-center')}
        >
          <Text style={tw('text-slate-900 dark:text-white font-bold')}>{t('mobile.book_new_appointment', `Book New Appointment`)}</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView style={tw('flex-1 bg-slate-50 dark:bg-slate-950')}>
      {/* Header */}
      <View style={tw('px-6 pt-6 pb-4 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800')}>
        <Text style={tw('text-2xl font-bold text-slate-900 dark:text-white')}>{t('mobile.my_appointments', `My Appointments`)}</Text>
        <Text style={tw('text-slate-500 dark:text-slate-400 dark:text-slate-500 text-sm mt-1')}>{t('mobile.track_and_manage_your_schedule', `Track and manage your schedule`)}</Text>
      </View>

      {/* Tabs */}
      <View style={tw('flex-row px-4 py-2 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800')}>
        <TouchableOpacity 
          onPress={() => setActiveTab('upcoming')}
          style={tw(`flex-1 py-3 items-center border-b-2 ${activeTab === 'upcoming' ? 'border-brand' : 'border-transparent'}`)}
        >
          <Text style={tw(`font-bold ${activeTab === 'upcoming' ? 'text-brand' : 'text-slate-500 dark:text-slate-400 dark:text-slate-500'}`)}>{t('mobile.upcoming', `Upcoming`)}</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => setActiveTab('history')}
          style={tw(`flex-1 py-3 items-center border-b-2 ${activeTab === 'history' ? 'border-brand' : 'border-transparent'}`)}
        >
          <Text style={tw(`font-bold ${activeTab === 'history' ? 'text-brand' : 'text-slate-500 dark:text-slate-400 dark:text-slate-500'}`)}>{t('mobile.history', `History`)}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={tw('p-6 pb-20')} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0f172a" colors={['#0f172a']} />
        }
      >
        
        {loading ? (
          <>
            {renderSkeleton()}
            {renderSkeleton()}
            {renderSkeleton()}
          </>
        ) : (
          <>
            {activeTab === 'upcoming' && (
              upcomingList.length > 0 ? upcomingList.map((apt) => (
                <View key={apt.id} style={tw('bg-white dark:bg-slate-900 rounded-3xl p-5 mb-5 border border-slate-200 dark:border-slate-700 shadow-sm')}>
            {apt.status === 'Queueing' && (
              <View style={tw('bg-amber-50 border border-amber-100 rounded-2xl p-4 mb-4 flex-row items-center justify-between')}>
                <View style={tw('flex-row items-center')}>
                  <AlertCircle color="#d97706" size={20} />
                  <View style={tw('ml-3')}>
                    <Text style={tw('text-amber-800 font-bold')}>{t('mobile.you_are_in_queue', `You are in Queue`)}</Text>
                    <Text style={tw('text-amber-600 text-xs')}>Estimated wait: {apt.estimatedWait}</Text>
                  </View>
                </View>
                <View style={tw('bg-amber-200 w-10 h-10 rounded-full items-center justify-center')}>
                  <Text style={tw('text-amber-900 font-black text-lg')}>{apt.queuePosition}</Text>
                </View>
              </View>
            )}

            <View style={tw('flex-row justify-between items-start mb-4')}>
              <View>
                <Text style={tw('text-lg font-bold text-slate-900 dark:text-white')}>{apt.doctor}</Text>
                <Text style={tw('text-sm font-medium text-slate-500 dark:text-slate-400 dark:text-slate-500')}>{apt.specialty}</Text>
              </View>
              <View style={tw(`px-3 py-1 rounded-full ${apt.status === 'Queueing' ? 'bg-amber-100' : 'bg-blue-100'}`)}>
                <Text style={tw(`text-xs font-bold ${apt.status === 'Queueing' ? 'text-amber-600' : 'text-blue-600'}`)}>
                  {apt.status}
                </Text>
              </View>
            </View>

            <View style={tw('flex-row flex-wrap gap-y-3 mb-5')}>
              <View style={tw('flex-row items-center w-1/2')}>
                <Calendar color="#94a3b8" size={16} />
                <Text style={tw('text-slate-700 dark:text-slate-200 ml-2 text-sm font-medium')}>{apt.date}</Text>
              </View>
              <View style={tw('flex-row items-center w-1/2')}>
                <Clock color="#94a3b8" size={16} />
                <Text style={tw('text-slate-700 dark:text-slate-200 ml-2 text-sm font-medium')}>{apt.time}</Text>
              </View>
              <View style={tw('flex-row items-center w-1/2 mt-1')}>
                {apt.type === 'Video Call' ? <Video color="#94a3b8" size={16} /> : <MessageCircle color="#94a3b8" size={16} />}
                <Text style={tw('text-slate-700 dark:text-slate-200 ml-2 text-sm font-medium')}>{apt.type}</Text>
              </View>
            </View>

            <View style={tw('flex-row gap-3 mt-2')}>
              {apt.status === 'Queueing' ? (
                <TouchableOpacity 
                  onPress={() => router.push('/(patient)/video-call')}
                  style={tw('flex-1 bg-brand py-3.5 rounded-xl flex-row justify-center items-center')}
                >
                  <Text style={tw('text-white font-bold text-sm')}>{t('mobile.join_room', `Join Room`)}</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity 
                  onPress={() => handleCancel(apt.id)}
                  style={tw('flex-1 bg-red-50 border border-red-100 py-3.5 rounded-xl flex-row justify-center items-center')}
                >
                  <Text style={tw('text-red-500 font-bold text-sm')}>{t('mobile.cancel', `Cancel`)}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )) : renderEmptyState('upcoming'))}

        {activeTab === 'history' && (
          historyList.length > 0 ? historyList.map((apt) => (
          <View key={apt.id} style={tw('bg-white dark:bg-slate-900 rounded-3xl p-5 mb-5 border border-slate-200 dark:border-slate-700 shadow-sm opacity-80')}>
            <View style={tw('flex-row justify-between items-start mb-4')}>
              <View>
                <Text style={tw('text-lg font-bold text-slate-900 dark:text-white')}>{apt.doctor}</Text>
                <Text style={tw('text-sm font-medium text-slate-500 dark:text-slate-400 dark:text-slate-500')}>{apt.specialty}</Text>
              </View>
              <View style={tw(`px-3 py-1 rounded-full ${apt.status === 'Completed' ? 'bg-emerald-100' : 'bg-slate-100 dark:bg-slate-800'}`)}>
                <Text style={tw(`text-xs font-bold ${apt.status === 'Completed' ? 'text-emerald-600' : 'text-slate-600 dark:text-slate-300'}`)}>
                  {apt.status}
                </Text>
              </View>
            </View>

            <View style={tw('flex-row flex-wrap gap-y-3 mb-5')}>
              <View style={tw('flex-row items-center w-1/2')}>
                <Calendar color="#94a3b8" size={16} />
                <Text style={tw('text-slate-700 dark:text-slate-200 ml-2 text-sm font-medium')}>{apt.date}</Text>
              </View>
              <View style={tw('flex-row items-center w-1/2')}>
                <Clock color="#94a3b8" size={16} />
                <Text style={tw('text-slate-700 dark:text-slate-200 ml-2 text-sm font-medium')}>{apt.time}</Text>
              </View>
            </View>

            <TouchableOpacity 
              onPress={() => router.push(`/(patient)/doctor-chat`)}
              style={tw('bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 py-3.5 rounded-xl flex-row justify-center items-center')}
            >
              <Text style={tw('text-slate-700 dark:text-slate-200 font-bold text-sm')}>{t('mobile.view_log', `View Log`)}</Text>
            </TouchableOpacity>
          </View>
        )) : renderEmptyState('history'))}
          </>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}
