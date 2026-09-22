import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, Image, RefreshControl } from 'react-native';
import { useSafeRouter as useRouter } from '@/utils/useSafeRouter';
import { Sparkles, MessageCircle, ChevronRight, MessageSquareOff } from 'lucide-react-native';
import { tw } from '@/tw';
import { useThemeContext } from '@/context/ThemeContext';

export default function ChatHubScreen() {
  const { t } = useTranslation();
  useThemeContext();

  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [chats, setChats] = useState<any[]>([]);

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

  useEffect(() => {
    // Simulate loading
    setTimeout(() => {
      setChats(doctorChats);
      setLoading(false);
    }, 1200);
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1200);
  };

  const renderSkeleton = () => (
    <View style={tw('flex-row bg-white dark:bg-slate-900 rounded-3xl p-4 shadow-sm border border-gray-100 dark:border-gray-800 items-center mb-4')}>
      <View style={tw('w-16 h-16 rounded-full bg-slate-200 dark:bg-slate-700')} />
      <View style={tw('flex-1 ml-4')}>
        <View style={tw('flex-row justify-between items-center mb-2')}>
          <View style={tw('w-24 h-5 bg-slate-200 dark:bg-slate-700 rounded')} />
          <View style={tw('w-12 h-4 bg-slate-200 dark:bg-slate-700 rounded')} />
        </View>
        <View style={tw('w-3/4 h-4 bg-slate-200 dark:bg-slate-700 rounded')} />
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={tw('items-center justify-center py-10')}>
      <View style={tw('w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full items-center justify-center mb-4')}>
        <MessageSquareOff color="#94a3b8" size={32} />
      </View>
      <Text style={tw('text-lg font-bold text-slate-900 dark:text-white mb-2 text-center')}>{t('mobile.no_active_conversations', `No active conversations`)}</Text>
      <Text style={tw('text-slate-500 dark:text-slate-400 dark:text-slate-500 text-center mb-6')}>{t('mobile.you_dont_have_any_messages_wit', `You don't have any messages with doctors yet.`)}</Text>
      <TouchableOpacity 
        onPress={() => router.push('/(patient)/my-doctors')}
        style={tw('bg-brand px-6 py-3 rounded-2xl')}
      >
        <Text style={tw('text-slate-900 dark:text-white font-bold')}>{t('mobile.find_a_doctor', `Find a Doctor`)}</Text>
      </TouchableOpacity>
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
        <View style={tw('px-6 pt-6 pb-6')}>
          <Text style={tw('text-2xl font-bold text-[#313A34] dark:text-slate-100')}>{t('mobile.messages', `Messages`)}</Text>
        </View>

        {/* AI Assistant Banner */}
        <View style={tw('px-6 mb-8')}>
          <TouchableOpacity 
            style={tw('bg-slate-900 rounded-3xl p-5 shadow-md overflow-hidden relative border border-slate-800')}
            onPress={() => router.push('/(patient)/ai-chat')}
          >
            <View style={tw('absolute -right-4 -top-4 opacity-20')}>
              <Sparkles color="#a3e635" size={100} />
            </View>
            
            <View style={tw('flex-row items-center gap-4 relative z-10')}>
              <View style={tw('w-14 h-14 bg-ai rounded-2xl items-center justify-center')}>
                <Sparkles color="#ffffff" size={28} />
              </View>
              <View style={tw('flex-1')}>
                <Text style={tw('text-white text-xl font-bold mb-1')}>{t('mobile.ai_assistant', `AI Assistant`)}</Text>
                <Text style={tw('text-emerald-50 text-sm')}>{t('mobile.ask_anything_about_your_health', `Ask anything about your health, 24/7`)}</Text>
              </View>
              <ChevronRight color="#ffffff" size={24} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Doctor Chats */}
        <View style={tw('px-6')}>
          <Text style={tw('text-lg font-bold text-[#313A34] dark:text-slate-100 mb-4')}>{t('mobile.doctor_conversations', `Doctor Conversations`)}</Text>
          
          <View style={tw('gap-4')}>
            {loading ? (
              <>
                {renderSkeleton()}
                {renderSkeleton()}
              </>
            ) : chats.length > 0 ? (
              chats.map((chat) => (
                <TouchableOpacity 
                  key={chat.id}
                  style={tw('flex-row bg-white dark:bg-slate-900 rounded-3xl p-4 shadow-sm border border-gray-100 dark:border-gray-800 items-center')}
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
                      <Text style={tw('text-base font-bold text-[#313A34] dark:text-slate-100')}>{chat.name}</Text>
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
              ))
            ) : (
              renderEmptyState()
            )}
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
