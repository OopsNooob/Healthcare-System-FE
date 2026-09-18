import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Sparkles, MessageSquare, Plus, ChevronRight } from 'lucide-react-native';
import { tw } from '@/tw';

export default function AiChatHistoryScreen() {
  const router = useRouter();
  const { prefill } = useLocalSearchParams<{ prefill?: string }>();

  // If we receive a prefill from Health Metrics, automatically start a new session
  useEffect(() => {
    if (prefill) {
      router.push({
        pathname: '/(patient)/ai-chat/[id]',
        params: { id: 'new-session', prefill }
      });
    }
  }, [prefill, router]);

  const history = [
    { id: 'session-1', title: 'Headache & Fatigue Analysis', date: 'Oct 12, 2023', preview: "Based on your symptoms, it's recommended to rest..." },
    { id: 'session-2', title: 'Dietary Recommendations', date: 'Oct 05, 2023', preview: "For better blood sugar control, consider adding..." },
    { id: 'session-3', title: 'Blood Pressure Evaluation', date: 'Sep 28, 2023', preview: "Your recent BP of 120/80 is perfectly normal..." },
  ];

  return (
    <SafeAreaView style={tw('flex-1 bg-slate-50')}>
      {/* Header */}
      <View style={tw('flex-row items-center px-6 py-4 bg-white border-b border-slate-100')}>
        <View style={tw('w-10 h-10 bg-ai-light rounded-full items-center justify-center mr-3')}>
          <Sparkles color="#6366f1" size={20} />
        </View>
        <View>
          <Text style={tw('text-xl font-bold text-slate-900')}>AI Consultations</Text>
          <Text style={tw('text-slate-500 text-sm')}>Your health analysis history</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={tw('p-6 pb-24')} showsVerticalScrollIndicator={false}>
        {history.map((session) => (
          <TouchableOpacity 
            key={session.id}
            onPress={() => router.push(`/(patient)/ai-chat/${session.id}`)}
            style={tw('bg-white p-4 rounded-2xl mb-3 border border-slate-100 flex-row items-center justify-between shadow-sm')}
          >
            <View style={tw('flex-1 mr-4')}>
              <Text style={tw('text-base font-bold text-slate-900 mb-1')} numberOfLines={1}>{session.title}</Text>
              <Text style={tw('text-sm text-slate-500')} numberOfLines={1}>{session.preview}</Text>
              <Text style={tw('text-xs text-slate-400 mt-2')}>{session.date}</Text>
            </View>
            <View style={tw('w-8 h-8 bg-slate-50 rounded-full items-center justify-center')}>
              <ChevronRight color="#94a3b8" size={20} />
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* FAB - New Consultation */}
      <TouchableOpacity 
        onPress={() => router.push('/(patient)/ai-chat/new')}
        style={[
          tw('absolute bottom-8 right-6 bg-ai flex-row items-center justify-center rounded-full px-5 py-4 shadow-lg'),
          { shadowColor: '#6366f1', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } }
        ]}
      >
        <Plus color="#ffffff" size={24} style={tw('mr-2')} />
        <Text style={tw('text-white font-bold text-base')}>New Chat</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
