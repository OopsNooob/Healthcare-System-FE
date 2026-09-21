import { View, Text, ScrollView, TouchableOpacity, Image, TextInput, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { Search, Bell, Calendar, ChevronRight, Star, Heart, Activity, Crown } from 'lucide-react-native';
import { tw } from '@/tw';

export default function PatientHomeScreen() {
  const router = useRouter();

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

  return (
    <SafeAreaView style={tw('flex-1 bg-slate-50')}>
      <ScrollView contentContainerStyle={tw('pb-20')} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={tw('flex-row justify-between items-center px-6 pt-6 pb-4')}>
          <View>
            <Text style={tw('text-gray-500 text-sm')}>Good morning,</Text>
            <Text style={tw('text-2xl font-bold text-[#313A34]')}>Alex Johnson</Text>
          </View>
          <TouchableOpacity 
            style={tw('p-2 bg-white rounded-full shadow-sm border border-gray-100 relative')}
            onPress={() => router.push('/(patient)/notifications')}
          >
            <Bell color="#1E1E1E" size={24} />
            <View style={tw('absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white')} />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={tw('px-6 mb-6')}>
          <View style={tw('flex-row items-center bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-100')}>
            <Search color="#9ca3af" size={20} />
            <TextInput
              style={tw('flex-1 ml-3 text-base text-gray-900')}
              placeholder="Search doctor, specialties..."
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
                <Text style={tw('text-white font-bold text-lg')}>Upgrade Premium</Text>
              </View>
              <Text style={tw('text-amber-50 text-sm leading-tight')}>Unlimited AI chats & priority doctor queue</Text>
            </View>
            <View style={tw('bg-white/20 p-2 rounded-full')}>
              <ChevronRight color="#ffffff" size={24} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Upcoming Appointment */}
        <View style={tw('px-6 mb-8')}>
          <View style={tw('flex-row justify-between items-end mb-4')}>
            <Text style={tw('text-lg font-bold text-[#313A34]')}>Upcoming Appointment</Text>
            <TouchableOpacity onPress={() => router.push('/(patient)/chat-hub')}>
              <Text style={tw('text-sm font-medium text-emerald-500')}>See all</Text>
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
              <TouchableOpacity style={tw('w-10 h-10 bg-white/20 rounded-full items-center justify-center')}>
                <View style={tw('w-10 h-10 bg-white rounded-full items-center justify-center')}>
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
          <Text style={tw('text-lg font-bold text-[#313A34] mb-4')}>Specialties</Text>
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
            <Text style={tw('text-lg font-bold text-[#313A34]')}>Top Doctors</Text>
            <TouchableOpacity onPress={() => router.push('/(patient)/my-doctors')}>
              <Text style={tw('text-sm font-medium text-emerald-500')}>See all</Text>
            </TouchableOpacity>
          </View>

          <View style={tw('gap-4')}>
            {topDoctors.map((doc) => (
              <TouchableOpacity 
                key={doc.id} 
                style={tw('flex-row bg-white rounded-2xl p-4 shadow-sm border border-gray-100')}
                onPress={() => {}}
              >
                <Image source={{ uri: doc.image }} style={tw('w-20 h-20 rounded-xl bg-gray-200')} />
                <View style={tw('ml-4 flex-1 justify-center')}>
                  <View style={tw('flex-row justify-between items-start mb-1')}>
                    <Text style={tw('text-base font-bold text-[#313A34]')} numberOfLines={1}>{doc.name}</Text>
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
            ))}
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
