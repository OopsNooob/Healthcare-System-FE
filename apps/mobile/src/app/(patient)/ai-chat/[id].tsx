import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, TouchableOpacity, ScrollView, TextInput, KeyboardAvoidingView, Platform, SafeAreaView, Modal } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeRouter as useRouter } from '@/utils/useSafeRouter';
import Toast from 'react-native-toast-message';
import { ArrowLeft, Send, Sparkles, Paperclip, AlertTriangle, X, ShieldAlert, BookOpen, Crown } from 'lucide-react-native';
import { tw, twInstance } from '@/tw';

type Citation = {
  id: number;
  source: string;
  url: string;
};

type Message = {
  id: string;
  text: string;
  sender: 'ai' | 'user';
  time: string;
  hasAttachment?: boolean;
  isFallback?: boolean;
  citations?: Citation[];
};

export default function AiChatSessionScreen() {
  const { t, i18n } = useTranslation();
  const isVi = i18n.language === 'vi';
  const router = useRouter();
  const { id, prefill } = useLocalSearchParams<{ id: string; prefill?: string }>();
  const scrollViewRef = useRef<ScrollView>(null);
  
  const [message, setMessage] = useState('');
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportReason, setReportReason] = useState('');
  
  const [messages, setMessages] = useState<Message[]>([
    { 
      id: '1', 
      text: isVi ? "Xin chào! Tôi là Trợ lý AI Y tế. Tôi có thể giúp gì cho bạn hôm nay?" : "Hello! I'm your AI Healthcare Assistant. How can I help you today?", 
      sender: 'ai', 
      time: '10:00 AM' 
    },
  ]);

  useEffect(() => {
    if (prefill && messages.length === 1) {
      setMessages(prev => [
        ...prev, 
        { id: Date.now().toString(), text: prefill, sender: 'user', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
      ]);
      // Simulate AI response for prefill
      setTimeout(() => {
        setMessages(prev => [
          ...prev, 
          { 
            id: (Date.now() + 1).toString(), 
            text: isVi 
              ? "Dựa trên dữ liệu, các chỉ số của bạn nằm trong ngưỡng bình thường. Nếu bạn thấy mệt, vui lòng liên hệ bác sĩ." 
              : "I've analyzed your health metric. Everything looks to be in normal range, but if you feel unwell, please consult your doctor.", 
            sender: 'ai', 
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            citations: [
              { id: 1, source: "Quy chuẩn Sinh hiệu Bộ Y Tế 2024", url: "#" },
              { id: 2, source: "WHO Hypertension Guidelines", url: "#" }
            ]
          }
        ]);
      }, 1000);
    }
  }, [prefill]);

  const handleSend = (isAttachment: boolean = false) => {
    if (!message.trim() && !isAttachment) return;
    
    const userMsg = message.trim();
    setMessages(prev => [
      ...prev, 
      { id: Date.now().toString(), text: isAttachment ? '[Image Attached]' : userMsg, sender: 'user', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), hasAttachment: isAttachment }
    ]);
    setMessage('');
    
    // Simulate AI response logic (Fallback check vs Normal)
    setTimeout(() => {
      const isDangerousPrompt = userMsg.toLowerCase().includes('kê đơn') || 
                                userMsg.toLowerCase().includes('chẩn đoán') || 
                                userMsg.toLowerCase().includes('thuốc gì') ||
                                userMsg.toLowerCase().includes('prescribe') ||
                                userMsg.toLowerCase().includes('diagnose');
      
      if (isDangerousPrompt) {
        setMessages(prev => [
          ...prev, 
          { 
            id: (Date.now() + 1).toString(), 
            text: isVi 
              ? "Vì lý do an toàn, AI không được phép chẩn đoán bệnh hoặc kê đơn thuốc. Vui lòng đặt lịch khám với bác sĩ chuyên khoa để được tư vấn chính xác nhất." 
              : "For safety reasons, I cannot diagnose conditions or prescribe medications. Please consult a qualified healthcare professional.", 
            sender: 'ai', 
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isFallback: true
          }
        ]);
      } else {
        setMessages(prev => [
          ...prev, 
          { 
            id: (Date.now() + 1).toString(), 
            text: isVi ? "Cảm ơn thông tin của bạn. Tôi đã ghi nhận và phân tích dữ liệu." : "Thank you for the information. I've recorded and analyzed it.", 
            sender: 'ai', 
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            citations: [
              { id: 1, source: "Bài viết: Quản lý sức khỏe cơ bản", url: "#" }
            ]
          }
        ]);
      }
    }, 1200);
  }

  const submitReport = () => {
    setReportModalVisible(false);
    setReportReason('');
    Toast.show({
      type: 'success',
      text1: t('mobile.success', 'Success'),
      text2: t('mobile.report_submitted', 'Report submitted successfully.')
    });
  };

  return (
    <SafeAreaView style={tw('flex-1 bg-white dark:bg-slate-900')}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={tw('flex-1')}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Header */}
        <View style={tw('flex-row items-center justify-between px-4 py-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 z-10')}>
          <View style={tw('flex-row items-center')}>
            <TouchableOpacity style={tw('p-2')} onPress={() => router.back()}>
              <ArrowLeft color={twInstance.color('text-slate-900 dark:text-slate-100')} size={24} />
            </TouchableOpacity>
            <View style={tw('flex-row items-center ml-2')}>
              <View style={tw('w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-full items-center justify-center mr-3')}>
                <Sparkles color={twInstance.color('text-indigo-600 dark:text-indigo-400')} size={20} />
              </View>
              <View>
                <Text style={tw('text-lg font-bold text-slate-900 dark:text-white')}>{t('mobile.ai_assistant', `AI Assistant`)}</Text>
                <Text style={tw('text-indigo-600 dark:text-indigo-400 text-xs font-medium')}>{t('mobile.online_247', `Online 24/7`)}</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity style={tw('p-2 bg-red-50 dark:bg-red-900/20 rounded-full')} onPress={() => setReportModalVisible(true)}>
            <AlertTriangle color={twInstance.color('text-red-500')} size={20} />
          </TouchableOpacity>
        </View>

        {/* Quota Banner */}
        <View style={tw('bg-amber-50 dark:bg-amber-900/20 px-4 py-2 flex-row items-center justify-between')}>
          <View style={tw('flex-row items-center flex-1 mr-2')}>
            <Crown color={twInstance.color('text-amber-500')} size={16} />
            <Text style={tw('text-amber-700 dark:text-amber-400 text-xs font-medium ml-2')} numberOfLines={1}>
              {t('mobile.ai_quota_warning', 'Bạn còn 2 lượt chat hôm nay. Nâng cấp Plus để không giới hạn.')}
            </Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/(patient)/premium')} style={tw('bg-amber-500 px-3 py-1 rounded-full')}>
            <Text style={tw('text-white text-xs font-bold')}>{t('mobile.upgrade', 'Nâng cấp')}</Text>
          </TouchableOpacity>
        </View>

        {/* Chat Area */}
        <ScrollView 
          ref={scrollViewRef}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          contentContainerStyle={tw('p-4 pb-10')} 
          showsVerticalScrollIndicator={false}
        >
          {messages.map((msg) => (
            <View key={msg.id} style={tw(`mb-4 max-w-[85%] ${msg.sender === 'user' ? 'self-end' : 'self-start'}`)}>
              {msg.isFallback ? (
                // Fallback UI
                <View style={tw('p-4 rounded-2xl bg-orange-50 dark:bg-orange-900/20 rounded-tl-sm border border-orange-200 dark:border-orange-800/50')}>
                  <View style={tw('flex-row items-center mb-2')}>
                    <ShieldAlert color={twInstance.color('text-orange-500')} size={18} />
                    <Text style={tw('text-orange-800 dark:text-orange-400 font-bold ml-2')}>{t('mobile.ai_refusal', 'Từ chối trả lời')}</Text>
                  </View>
                  <Text style={tw('text-orange-900 dark:text-orange-200 leading-5')}>{msg.text}</Text>
                </View>
              ) : (
                // Normal AI or User Message
                <View style={tw(`p-4 rounded-2xl ${msg.sender === 'user' ? 'bg-indigo-600 rounded-tr-sm' : 'bg-slate-100 dark:bg-slate-800 rounded-tl-sm'}`)}>
                  <Text style={tw(`text-base ${msg.sender === 'user' ? (msg.hasAttachment ? 'text-indigo-100 italic' : 'text-white') : 'text-slate-800 dark:text-slate-200'} leading-6`)}>
                    {msg.text}
                  </Text>
                </View>
              )}

              {/* Citations (if any) */}
              {msg.citations && msg.citations.length > 0 && (
                <View style={tw('mt-2 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700')}>
                  <View style={tw('flex-row items-center mb-1')}>
                    <BookOpen color={twInstance.color('text-slate-400')} size={14} />
                    <Text style={tw('text-xs text-slate-500 dark:text-slate-400 font-bold ml-1 uppercase')}>{t('mobile.citations', 'Nguồn tham khảo:')}</Text>
                  </View>
                  {msg.citations.map((cite, idx) => (
                    <Text key={idx} style={tw('text-xs text-indigo-600 dark:text-indigo-400 mt-1')}>
                      [{cite.id}] {cite.source}
                    </Text>
                  ))}
                </View>
              )}

              <Text style={tw(`text-xs text-slate-400 dark:text-slate-500 mt-1 ${msg.sender === 'user' ? 'text-right' : 'text-left'}`)}>
                {msg.time}
              </Text>
            </View>
          ))}
        </ScrollView>

        {/* Input Area */}
        <View style={tw('p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex-row items-center')}>
          <TouchableOpacity 
            onPress={() => handleSend(true)}
            style={tw('p-3 bg-slate-100 dark:bg-slate-800 rounded-full mr-2')}
          >
            <Paperclip color={twInstance.color('text-slate-500 dark:text-slate-400')} size={20} />
          </TouchableOpacity>
          <View style={tw('flex-1 bg-slate-100 dark:bg-slate-800 rounded-3xl px-4 py-1 mr-2 flex-row items-center min-h-[48px]')}>
            <TextInput
              style={tw('flex-1 text-base text-slate-900 dark:text-white h-10')}
              placeholder={t('mobile.ask_anything', 'Hỏi AI... (Thử gõ "kê đơn")')}
              placeholderTextColor="#94a3b8"
              value={message}
              onChangeText={setMessage}
              multiline
            />
          </View>
          <TouchableOpacity 
            onPress={() => handleSend(false)}
            style={tw(`w-12 h-12 rounded-full items-center justify-center ${message.trim() ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'}`)}
            disabled={!message.trim()}
          >
            <Send color={message.trim() ? "#ffffff" : twInstance.color('text-slate-400')} size={20} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Report Modal */}
      <Modal visible={reportModalVisible} animationType="slide" transparent={true}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={tw('flex-1 justify-end bg-black/60')}>
          <View style={tw('bg-white dark:bg-slate-900 rounded-t-3xl p-6')}>
            <View style={tw('flex-row justify-between items-center mb-6')}>
              <Text style={tw('text-xl font-bold text-slate-900 dark:text-white')}>{t('mobile.report_ai_chat', `Report AI Chat`)}</Text>
              <TouchableOpacity onPress={() => setReportModalVisible(false)}>
                <X color={twInstance.color('text-slate-500')} size={24} />
              </TouchableOpacity>
            </View>

            <View style={tw('gap-4')}>
              <View>
                <Text style={tw('text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2')}>{t('mobile.reason_for_reporting', `Reason for reporting`)}</Text>
                <TextInput
                  value={reportReason}
                  onChangeText={setReportReason}
                  placeholder={t('mobile.report_placeholder', 'Inaccurate medical advice, inappropriate language...')}
                  style={tw('bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white font-medium h-32')}
                  multiline
                  textAlignVertical="top"
                />
              </View>

              <TouchableOpacity onPress={submitReport} style={tw('bg-red-500 py-4 rounded-xl items-center mt-2')}>
                <Text style={tw('text-white font-bold text-base')}>{t('mobile.submit_report', `Submit Report`)}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
