import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Search } from 'lucide-react-native';
import { tw } from '@/tw';

export default function DoctorChatScreen() {
  const router = useRouter();

  const patientChats = [
    {
      id: 1,
      name: 'Alex Johnson',
      lastMessage: 'I still feel a bit dizzy after taking the medicine.',
      time: '10:31 AM',
      unread: 1,
      image: 'https://i.pravatar.cc/150?img=12',
      online: true,
    },
    {
      id: 2,
      name: 'Maria Garcia',
      lastMessage: 'Thank you doctor! See you next week.',
      time: 'Yesterday',
      unread: 0,
      image: 'https://i.pravatar.cc/150?img=5',
      online: false,
    }
  ];

  return (
    <SafeAreaView style={tw('flex-1 bg-slate-50')}>
      <ScrollView contentContainerStyle={tw('pb-20')} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={tw('px-6 pt-6 pb-6 flex-row justify-between items-center')}>
          <Text style={tw('text-2xl font-bold text-[#313A34]')}>Messages</Text>
          <TouchableOpacity style={tw('w-10 h-10 bg-white rounded-full items-center justify-center shadow-sm border border-gray-100')}>
            <Search color="#1E1E1E" size={20} />
          </TouchableOpacity>
        </View>

        {/* Patient Chats */}
        <View style={tw('px-6')}>
          <View style={tw('gap-4')}>
            {patientChats.map((chat) => (
              <TouchableOpacity 
                key={chat.id}
                style={tw('flex-row bg-white rounded-3xl p-4 shadow-sm border border-slate-100 items-center')}
                onPress={() => router.push(`/(doctor)/chat/${chat.id}`)}
              >
                <View style={tw('relative')}>
                  <Image source={{ uri: chat.image }} style={tw('w-16 h-16 rounded-full bg-slate-200')} />
                  {chat.online && (
                    <View style={tw('absolute bottom-0 right-0 w-4 h-4 bg-brand rounded-full border-2 border-white')} />
                  )}
                </View>
                
                <View style={tw('flex-1 ml-4')}>
                  <View style={tw('flex-row justify-between items-center mb-1')}>
                    <Text style={tw('text-base font-bold text-slate-900')}>{chat.name}</Text>
                    <Text style={tw(`text-xs ${chat.unread > 0 ? 'text-blue-500 font-bold' : 'text-slate-400'}`)}>
                      {chat.time}
                    </Text>
                  </View>
                  
                  <View style={tw('flex-row justify-between items-center')}>
                    <Text style={tw(`text-sm flex-1 mr-4 ${chat.unread > 0 ? 'text-slate-800 font-medium' : 'text-slate-500'}`)} numberOfLines={1}>
                      {chat.lastMessage}
                    </Text>
                    {chat.unread > 0 && (
                      <View style={tw('w-5 h-5 bg-blue-500 rounded-full items-center justify-center')}>
                        <Text style={tw('text-white text-xs font-bold')}>{chat.unread}</Text>
                      </View>
                    )}
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
