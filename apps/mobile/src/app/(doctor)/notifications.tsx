import { View, Text, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Bell, Calendar, MessageCircle, AlertTriangle } from 'lucide-react-native';
import { tw } from '@/tw';

export default function DoctorNotificationsScreen() {
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
            style={tw(`bg-white p-4 rounded-2xl mb-3 flex-row border ${notif.read ? 'border-slate-100' : 'border-blue-100 shadow-sm'}`)}
          >
            <View style={tw(`w-12 h-12 rounded-full items-center justify-center mr-4 ${notif.read ? 'bg-slate-50' : 'bg-blue-50'}`)}>
              {getIcon(notif.type)}
            </View>
            <View style={tw('flex-1')}>
              <View style={tw('flex-row justify-between items-start mb-1')}>
                <Text style={tw(`text-base font-bold ${notif.read ? 'text-slate-700' : 'text-slate-900'}`)}>{notif.title}</Text>
                {!notif.read && <View style={tw('w-2.5 h-2.5 bg-blue-500 rounded-full mt-1.5')} />}
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
