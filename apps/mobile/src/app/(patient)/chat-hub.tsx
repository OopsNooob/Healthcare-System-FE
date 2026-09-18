import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Sparkles, MessageCircle, ChevronRight } from 'lucide-react-native';
import { tw } from '@/tw';

export default function ChatHubScreen() {
  const router = useRouter();

  const doctorChats = [
    {
      id: 1,
      name: 'Dr. Sarah Connor',
      lastMessage: 'Your test results look perfectly fine. No need to worry.',
      time: '10:32 AM',
      unread: 2,
      image: 'https://i.pravatar.cc/150?img=1',
      online: true,
    },
    {
      id: 2,
      name: 'Dr. Michael Chen',
      lastMessage: 'Please remember to take the medicine after meal.',
      time: 'Yesterday',
      unread: 0,
      image: 'https://i.pravatar.cc/150?img=3',
      online: false,
    }
  ];

  return (
    <SafeAreaView style={tw('flex-1 bg-slate-50')}>
      <ScrollView contentContainerStyle={tw('pb-20')} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={tw('px-6 pt-6 pb-6')}>
          <Text style={tw('text-2xl font-bold text-[#313A34]')}>Messages</Text>
        </View>

        {/* AI Assistant Banner */}
        <View style={tw('px-6 mb-8')}>
          <TouchableOpacity 
            style={tw('bg-slate-900 rounded-3xl p-5 shadow-md overflow-hidden relative border border-slate-800')}
            onPress={() => router.push('/(patient)/ai-chat')}
          >
            <View style={tw('absolute -right-4 -top-4 opacity-20')}>
              <Sparkles color="#ffffff" size={100} />
            </View>
            
            <View style={tw('flex-row items-center gap-4 relative z-10')}>
              <View style={tw('w-14 h-14 bg-white/20 rounded-2xl items-center justify-center')}>
                <Sparkles color="#ffffff" size={28} />
              </View>
              <View style={tw('flex-1')}>
                <Text style={tw('text-white text-xl font-bold mb-1')}>AI Assistant</Text>
                <Text style={tw('text-emerald-50 text-sm')}>Ask anything about your health, 24/7</Text>
              </View>
              <ChevronRight color="#ffffff" size={24} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Doctor Chats */}
        <View style={tw('px-6')}>
          <Text style={tw('text-lg font-bold text-[#313A34] mb-4')}>Doctor Conversations</Text>
          
          <View style={tw('gap-4')}>
            {doctorChats.map((chat) => (
              <TouchableOpacity 
                key={chat.id}
                style={tw('flex-row bg-white rounded-3xl p-4 shadow-sm border border-gray-100 items-center')}
                onPress={() => router.push('/(patient)/doctor-chat')}
              >
                <View style={tw('relative')}>
                  <Image source={{ uri: chat.image }} style={tw('w-16 h-16 rounded-full bg-gray-200')} />
                  {chat.online && (
                    <View style={tw('absolute bottom-0 right-0 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white')} />
                  )}
                </View>
                
                <View style={tw('flex-1 ml-4')}>
                  <View style={tw('flex-row justify-between items-center mb-1')}>
                    <Text style={tw('text-base font-bold text-[#313A34]')}>{chat.name}</Text>
                    <Text style={tw(`text-xs ${chat.unread > 0 ? 'text-emerald-500 font-bold' : 'text-gray-400'}`)}>
                      {chat.time}
                    </Text>
                  </View>
                  
                  <View style={tw('flex-row justify-between items-center')}>
                    <Text style={tw('text-sm text-gray-500 flex-1 mr-4')} numberOfLines={1}>
                      {chat.lastMessage}
                    </Text>
                    {chat.unread > 0 && (
                      <View style={tw('w-5 h-5 bg-emerald-500 rounded-full items-center justify-center')}>
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
