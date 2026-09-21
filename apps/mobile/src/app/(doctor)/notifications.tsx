import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Bell, Calendar, MessageCircle, AlertTriangle } from 'lucide-react-native';
import { tw } from '@/tw';

export default function DoctorNotificationsScreen() {
  const { t } = useTranslation();

  const router = useRouter();

  const notifications = [
    { id: '1', title: 'New Consultation Request', desc: 'Alex Johnson has requested a new video consultation for today at 2:00 PM.', time: '10 mins ago', type: 'appointment', read: false },
    { id: '2', title: 'New Message', desc: 'Maria Garcia sent you a message: "Thank you for the advice, doctor."', time: '1 hour ago', type: 'message', read: true },
    { id: '3', title: 'System Alert', desc: 'Your profile has been successfully verified.', time: '1 day ago', type: 'alert', read: true },
  ];

  const getIcon = (type: string) => {
    switch (type) {
      case 'appointment': return <Calendar color="#3b82f6" size={20} />;
      case 'message': return <MessageCircle color="#10b981" size={20} />;
      case 'alert': return <AlertTriangle color="#f59e0b" size={20} />;
      default: return <Bell color="#64748b" size={20} />;
    }
  };

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notifs, setNotifs] = useState<any[]>([]);

  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
      setNotifs(notifications);
      setLoading(false);
    }, 1000);
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const renderNotifSkeleton = () => (
    <View style={tw('bg-white dark:bg-slate-900 p-4 rounded-2xl mb-3 flex-row border border-slate-100 dark:border-slate-800 shadow-sm')}>
      <View style={tw('w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700 mr-4')} />
      <View style={tw('flex-1')}>
        <View style={tw('w-3/4 h-5 bg-slate-200 dark:bg-slate-700 rounded mb-2')} />
        <View style={tw('w-full h-4 bg-slate-200 dark:bg-slate-700 rounded mb-1')} />
        <View style={tw('w-1/2 h-4 bg-slate-200 dark:bg-slate-700 rounded mb-2')} />
        <View style={tw('w-16 h-3 bg-slate-200 dark:bg-slate-700 rounded')} />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={tw('flex-1 bg-slate-50 dark:bg-slate-950')}>
      {/* Header */}
      <View style={tw('px-4 pt-6 pb-4 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex-row items-center')}>
        <TouchableOpacity onPress={() => router.back()} style={tw('p-2 mr-2')}>
          <ArrowLeft color="#1E1E1E" size={24} />
        </TouchableOpacity>
        <Text style={tw('text-xl font-bold text-slate-900 dark:text-white')}>{t('mobile.notifications', `Notifications`)}</Text>
      </View>

      <ScrollView 
        contentContainerStyle={tw('p-4 pb-20')}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0f172a" />}
      >
        {loading ? (
          <>
            {renderNotifSkeleton()}
            {renderNotifSkeleton()}
            {renderNotifSkeleton()}
          </>
        ) : notifs.length > 0 ? (
          notifs.map((notif) => (
            <TouchableOpacity 
              key={notif.id} 
              style={tw(`bg-white dark:bg-slate-900 p-4 rounded-2xl mb-3 flex-row border ${notif.read ? 'border-slate-100 dark:border-slate-800' : 'border-blue-100 shadow-sm'}`)}
            >
              <View style={tw(`w-12 h-12 rounded-full items-center justify-center mr-4 ${notif.read ? 'bg-slate-50 dark:bg-slate-950' : 'bg-blue-50'}`)}>
                {getIcon(notif.type)}
              </View>
              <View style={tw('flex-1')}>
                <View style={tw('flex-row justify-between items-start mb-1')}>
                  <Text style={tw(`text-base font-bold ${notif.read ? 'text-slate-700 dark:text-slate-200' : 'text-slate-900 dark:text-white'}`)}>{notif.title}</Text>
                  {!notif.read && <View style={tw('w-2.5 h-2.5 bg-blue-500 rounded-full mt-1.5')} />}
                </View>
                <Text style={tw(`text-sm mb-2 ${notif.read ? 'text-slate-500 dark:text-slate-400 dark:text-slate-500' : 'text-slate-700 dark:text-slate-200'}`)}>{notif.desc}</Text>
                <Text style={tw('text-xs text-slate-400 dark:text-slate-500 font-medium')}>{notif.time}</Text>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={tw('items-center justify-center py-12')}>
            <Bell color="#94a3b8" size={32} style={tw('mb-2')} />
            <Text style={tw('text-slate-500 dark:text-slate-400 dark:text-slate-500 font-medium')}>{t('mobile.no_notifications', `No notifications`)}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
