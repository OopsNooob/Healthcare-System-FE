import { View, Text, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Bell, Calendar, MessageCircle, FileText } from 'lucide-react-native';
import { tw } from '@/tw';

export default function PatientNotificationsScreen() {
  const router = useRouter();

  const notifications = [
    { id: '1', title: 'Consultation Accepted', desc: 'Dr. Sarah Connor has accepted your consultation request.', time: '5 mins ago', type: 'appointment', read: false },
    { id: '2', title: 'Consultation Ended', desc: 'Your consultation with Dr. Michael Chen has ended. Please leave a review.', time: '2 hours ago', type: 'review', read: false },
    { id: '3', title: 'New Message', desc: 'Dr. Emily Watson replied to your message.', time: '1 day ago', type: 'message', read: true },
  ];

  const getIcon = (type: string) => {
    switch (type) {
      case 'appointment': return <Calendar color="#10b981" size={20} />;
      case 'message': return <MessageCircle color="#3b82f6" size={20} />;
      case 'review': return <FileText color="#f59e0b" size={20} />;
      default: return <Bell color="#64748b" size={20} />;
    }
  };

  return (
    <SafeAreaView style={tw('flex-1 bg-slate-50')}>
      {/* Header */}
      <View style={tw('px-4 pt-6 pb-4 bg-white border-b border-slate-100 flex-row items-center')}>
        <TouchableOpacity onPress={() => router.back()} style={tw('p-2 mr-2')}>
          <ArrowLeft color="#1E1E1E" size={24} />
        </TouchableOpacity>
        <Text style={tw('text-xl font-bold text-slate-900')}>Notifications</Text>
      </View>

      <ScrollView contentContainerStyle={tw('p-4 pb-20')}>
        {notifications.map((notif) => (
          <TouchableOpacity 
            key={notif.id} 
            style={tw(`bg-white p-4 rounded-2xl mb-3 flex-row border ${notif.read ? 'border-slate-100' : 'border-brand-light shadow-sm'}`)}
            onPress={() => {
              if (notif.type === 'review') {
                router.push('/(patient)/doctor-chat');
              }
            }}
          >
            <View style={tw(`w-12 h-12 rounded-full items-center justify-center mr-4 ${notif.read ? 'bg-slate-50' : 'bg-brand-light'}`)}>
              {getIcon(notif.type)}
            </View>
            <View style={tw('flex-1')}>
              <View style={tw('flex-row justify-between items-start mb-1')}>
                <Text style={tw(`text-base font-bold ${notif.read ? 'text-slate-700' : 'text-slate-900'}`)}>{notif.title}</Text>
                {!notif.read && <View style={tw('w-2.5 h-2.5 bg-brand rounded-full mt-1.5')} />}
              </View>
              <Text style={tw(`text-sm mb-2 ${notif.read ? 'text-slate-500' : 'text-slate-700'}`)}>{notif.desc}</Text>
              <Text style={tw('text-xs text-slate-400 font-medium')}>{notif.time}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
