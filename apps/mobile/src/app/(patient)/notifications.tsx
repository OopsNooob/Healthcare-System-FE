import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, RefreshControl } from 'react-native';
import { useSafeRouter as useRouter } from '@/utils/useSafeRouter';
import { ArrowLeft, Bell, Calendar, MessageCircle, FileText, BellOff } from 'lucide-react-native';
import { tw, twInstance } from '@/tw';

interface NotificationItem {
  id: string;
  title: string;
  desc: string;
  time: string;
  type: string;
  read: boolean;
}

export default function PatientNotificationsScreen() {
  const { t } = useTranslation();

  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const notificationsData = [
    { id: '1', titleKey: 'mobile.notif_consultation_accepted', defaultTitle: 'Consultation Accepted', descKey: 'mobile.notif_consultation_accepted_desc', defaultDesc: 'Dr. Sarah Connor has accepted your consultation request.', timeKey: 'mobile.time_5_mins_ago', defaultTime: '5 mins ago', type: 'appointment', read: false },
    { id: '2', titleKey: 'mobile.notif_consultation_ended', defaultTitle: 'Consultation Ended', descKey: 'mobile.notif_consultation_ended_desc', defaultDesc: 'Your consultation with Dr. Michael Chen has ended. Please leave a review.', timeKey: 'mobile.time_2_hours_ago', defaultTime: '2 hours ago', type: 'review', read: false },
    { id: '3', titleKey: 'mobile.notif_new_message', defaultTitle: 'New Message', descKey: 'mobile.notif_new_message_desc', defaultDesc: 'Dr. Emily Watson replied to your message.', timeKey: 'mobile.time_1_day_ago', defaultTime: '1 day ago', type: 'message', read: true },
  ];

  const [notifs, setNotifs] = useState(notificationsData);

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1200);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'appointment': return <Calendar color="#10b981" size={20} />;
      case 'message': return <MessageCircle color="#3b82f6" size={20} />;
      case 'review': return <FileText color="#f59e0b" size={20} />;
      default: return <Bell color="#64748b" size={20} />;
    }
  };

  const renderSkeleton = () => (
    <View style={tw('bg-white dark:bg-slate-900 p-4 rounded-2xl mb-3 flex-row border border-slate-100 dark:border-slate-800')}>
      <View style={tw('w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700 mr-4')} />
      <View style={tw('flex-1')}>
        <View style={tw('w-3/4 h-5 bg-slate-200 dark:bg-slate-700 rounded mb-2')} />
        <View style={tw('w-full h-4 bg-slate-200 dark:bg-slate-700 rounded mb-1')} />
        <View style={tw('w-5/6 h-4 bg-slate-200 dark:bg-slate-700 rounded mb-2')} />
        <View style={tw('w-1/4 h-3 bg-slate-200 dark:bg-slate-700 rounded')} />
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={tw('items-center justify-center py-20')}>
      <View style={tw('w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full items-center justify-center mb-4')}>
        <BellOff color="#94a3b8" size={32} />
      </View>
      <Text style={tw('text-lg font-bold text-slate-900 dark:text-white mb-2 text-center')}>{t('mobile.no_notifications', `No Notifications`)}</Text>
      <Text style={tw('text-slate-500 dark:text-slate-400 dark:text-slate-500 text-center')}>{t('mobile.youre_all_caught_up_there_are_', `You're all caught up! There are no new notifications at the moment.`)}</Text>
    </View>
  );

  return (
    <SafeAreaView style={tw('flex-1 bg-slate-50 dark:bg-slate-950')}>
      {/* Header */}
      <View style={tw('px-4 pt-6 pb-4 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex-row items-center')}>
        <TouchableOpacity onPress={() => router.back()} style={tw('p-2 mr-2')}>
          <ArrowLeft color={twInstance.color('text-slate-900 dark:text-slate-100')} size={24} />
        </TouchableOpacity>
        <Text style={tw('text-xl font-bold text-slate-900 dark:text-white')}>{t('mobile.notifications', `Notifications`)}</Text>
      </View>

      <ScrollView 
        contentContainerStyle={tw('p-4 pb-20')}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0f172a" />}
      >
        {loading ? (
          <>
            {renderSkeleton()}
            {renderSkeleton()}
            {renderSkeleton()}
          </>
        ) : notifs.length > 0 ? (
          notifs.map((notif) => (
            <TouchableOpacity 
              key={notif.id} 
              style={tw(`bg-white dark:bg-slate-900 p-4 rounded-2xl mb-3 flex-row border ${notif.read ? 'border-slate-100 dark:border-slate-800' : 'border-brand-light shadow-sm'}`)}
              onPress={() => {
                if (notif.type === 'review') {
                  router.push('/(patient)/doctor-chat');
                }
              }}
            >
              <View style={tw(`w-12 h-12 rounded-full items-center justify-center mr-4 ${notif.read ? 'bg-slate-50 dark:bg-slate-950' : 'bg-brand-light'}`)}>
                {getIcon(notif.type)}
              </View>
              <View style={tw('flex-1')}>
                <View style={tw('flex-row justify-between items-start mb-1')}>
                  <Text style={tw(`text-base font-bold ${notif.read ? 'text-slate-700 dark:text-slate-200' : 'text-slate-900 dark:text-white'}`)}>{t(notif.titleKey, notif.defaultTitle)}</Text>
                  {!notif.read && <View style={tw('w-2.5 h-2.5 bg-brand rounded-full mt-1.5')} />}
                </View>
                <Text style={tw(`text-sm mb-2 ${notif.read ? 'text-slate-500 dark:text-slate-400 dark:text-slate-500' : 'text-slate-700 dark:text-slate-200'}`)}>{t(notif.descKey, notif.defaultDesc)}</Text>
                <Text style={tw('text-xs text-slate-400 dark:text-slate-500 font-medium')}>{t(notif.timeKey, notif.defaultTime)}</Text>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          renderEmptyState()
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
