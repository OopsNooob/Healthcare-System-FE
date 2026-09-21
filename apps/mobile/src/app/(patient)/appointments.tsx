import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import { Calendar, Clock, Video, MessageCircle, MapPin, AlertCircle, X, Check } from 'lucide-react-native';
import { tw } from '@/tw';
import { useRouter } from 'expo-router';

export default function AppointmentsScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'history'>('upcoming');

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

  const handleCancel = () => {
    alert('Are you sure you want to cancel this appointment?');
  };

  return (
    <SafeAreaView style={tw('flex-1 bg-slate-50')}>
      {/* Header */}
      <View style={tw('px-6 pt-6 pb-4 bg-white border-b border-slate-100')}>
        <Text style={tw('text-2xl font-bold text-slate-900')}>My Appointments</Text>
        <Text style={tw('text-slate-500 text-sm mt-1')}>Track and manage your schedule</Text>
      </View>

      {/* Tabs */}
      <View style={tw('flex-row px-4 py-2 bg-white border-b border-slate-100')}>
        <TouchableOpacity 
          onPress={() => setActiveTab('upcoming')}
          style={tw(`flex-1 py-3 items-center border-b-2 ${activeTab === 'upcoming' ? 'border-brand' : 'border-transparent'}`)}
        >
          <Text style={tw(`font-bold ${activeTab === 'upcoming' ? 'text-brand' : 'text-slate-500'}`)}>Upcoming</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => setActiveTab('history')}
          style={tw(`flex-1 py-3 items-center border-b-2 ${activeTab === 'history' ? 'border-brand' : 'border-transparent'}`)}
        >
          <Text style={tw(`font-bold ${activeTab === 'history' ? 'text-brand' : 'text-slate-500'}`)}>History</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={tw('p-6 pb-20')} showsVerticalScrollIndicator={false}>
        
        {activeTab === 'upcoming' && upcomingAppointments.map((apt) => (
          <View key={apt.id} style={tw('bg-white rounded-3xl p-5 mb-5 border border-slate-200 shadow-sm')}>
            {apt.status === 'Queueing' && (
              <View style={tw('bg-amber-50 border border-amber-100 rounded-2xl p-4 mb-4 flex-row items-center justify-between')}>
                <View style={tw('flex-row items-center')}>
                  <AlertCircle color="#d97706" size={20} />
                  <View style={tw('ml-3')}>
                    <Text style={tw('text-amber-800 font-bold')}>You are in Queue</Text>
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
                <Text style={tw('text-lg font-bold text-slate-900')}>{apt.doctor}</Text>
                <Text style={tw('text-sm font-medium text-slate-500')}>{apt.specialty}</Text>
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
                <Text style={tw('text-slate-700 ml-2 text-sm font-medium')}>{apt.date}</Text>
              </View>
              <View style={tw('flex-row items-center w-1/2')}>
                <Clock color="#94a3b8" size={16} />
                <Text style={tw('text-slate-700 ml-2 text-sm font-medium')}>{apt.time}</Text>
              </View>
              <View style={tw('flex-row items-center w-1/2 mt-1')}>
                {apt.type === 'Video Call' ? <Video color="#94a3b8" size={16} /> : <MessageCircle color="#94a3b8" size={16} />}
                <Text style={tw('text-slate-700 ml-2 text-sm font-medium')}>{apt.type}</Text>
              </View>
            </View>

            <View style={tw('flex-row gap-3 mt-2')}>
              {apt.status === 'Queueing' ? (
                <TouchableOpacity 
                  onPress={() => router.push('/(patient)/video-call')}
                  style={tw('flex-1 bg-brand py-3.5 rounded-xl flex-row justify-center items-center')}
                >
                  <Text style={tw('text-white font-bold text-sm')}>Join Room</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity 
                  onPress={handleCancel}
                  style={tw('flex-1 bg-red-50 border border-red-100 py-3.5 rounded-xl flex-row justify-center items-center')}
                >
                  <Text style={tw('text-red-500 font-bold text-sm')}>Cancel</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}

        {activeTab === 'history' && historyAppointments.map((apt) => (
          <View key={apt.id} style={tw('bg-white rounded-3xl p-5 mb-5 border border-slate-200 shadow-sm opacity-80')}>
            <View style={tw('flex-row justify-between items-start mb-4')}>
              <View>
                <Text style={tw('text-lg font-bold text-slate-900')}>{apt.doctor}</Text>
                <Text style={tw('text-sm font-medium text-slate-500')}>{apt.specialty}</Text>
              </View>
              <View style={tw(`px-3 py-1 rounded-full ${apt.status === 'Completed' ? 'bg-emerald-100' : 'bg-slate-100'}`)}>
                <Text style={tw(`text-xs font-bold ${apt.status === 'Completed' ? 'text-emerald-600' : 'text-slate-600'}`)}>
                  {apt.status}
                </Text>
              </View>
            </View>

            <View style={tw('flex-row flex-wrap gap-y-3 mb-5')}>
              <View style={tw('flex-row items-center w-1/2')}>
                <Calendar color="#94a3b8" size={16} />
                <Text style={tw('text-slate-700 ml-2 text-sm font-medium')}>{apt.date}</Text>
              </View>
              <View style={tw('flex-row items-center w-1/2')}>
                <Clock color="#94a3b8" size={16} />
                <Text style={tw('text-slate-700 ml-2 text-sm font-medium')}>{apt.time}</Text>
              </View>
            </View>

            <TouchableOpacity 
              onPress={() => router.push(`/(patient)/doctor-chat`)}
              style={tw('bg-slate-50 border border-slate-200 py-3.5 rounded-xl flex-row justify-center items-center')}
            >
              <Text style={tw('text-slate-700 font-bold text-sm')}>View Log</Text>
            </TouchableOpacity>
          </View>
        ))}

      </ScrollView>
    </SafeAreaView>
  );
}
