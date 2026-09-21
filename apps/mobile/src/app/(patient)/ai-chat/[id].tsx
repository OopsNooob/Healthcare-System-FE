import { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, KeyboardAvoidingView, Platform, SafeAreaView, Modal } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import { ArrowLeft, Send, Sparkles, Paperclip, AlertTriangle, X } from 'lucide-react-native';
import { tw } from '@/tw';

export default function AiChatSessionScreen() {
  const router = useRouter();
  const { id, prefill } = useLocalSearchParams<{ id: string; prefill?: string }>();
  
  const [message, setMessage] = useState('');
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportReason, setReportReason] = useState('');
  
  const [messages, setMessages] = useState([
    { id: '1', text: "Hello! I'm your AI Healthcare Assistant. How can I help you today?", sender: 'ai', time: '10:00 AM', hasAttachment: false },
  ]);

  useEffect(() => {
    if (prefill && messages.length === 1) {
      setMessages(prev => [
        ...prev, 
        { id: Date.now().toString(), text: prefill, sender: 'user', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), hasAttachment: false }
      ]);
      // Simulate AI response
      setTimeout(() => {
        setMessages(prev => [
          ...prev, 
          { id: (Date.now() + 1).toString(), text: "I've analyzed your health metric. Everything looks to be in normal range, but if you feel unwell, please consult your doctor.", sender: 'ai', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), hasAttachment: false }
        ]);
      }, 1000);
    }
  }, [prefill]);

  const handleSend = (isAttachment: boolean = false) => {
    if (!message.trim() && !isAttachment) return;
    
    setMessages(prev => [
      ...prev, 
      { id: Date.now().toString(), text: isAttachment ? '[Image Attached]' : message, sender: 'user', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), hasAttachment: isAttachment }
    ]);
    setMessage('');
    
    // Simulate AI response
    setTimeout(() => {
      setMessages(prev => [
        ...prev, 
        { id: (Date.now() + 1).toString(), text: isAttachment ? "I received your attachment. I will analyze it." : "Thank you for the information. I've recorded it.", sender: 'ai', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), hasAttachment: false }
      ]);
    }, 1000);
  }

  const submitReport = () => {
    setReportModalVisible(false);
    setReportReason('');
    // Mock submit report
    setTimeout(() => {
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Report submitted successfully.'
      });
    }, 500);
  };

  return (
    <SafeAreaView style={tw('flex-1 bg-white')}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={tw('flex-1')}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Header */}
        <View style={tw('flex-row items-center justify-between px-4 py-4 border-b border-slate-100')}>
          <View style={tw('flex-row items-center')}>
            <TouchableOpacity 
              style={tw('p-2')}
              onPress={() => router.back()}
            >
              <ArrowLeft color="#1E1E1E" size={24} />
            </TouchableOpacity>
            <View style={tw('flex-row items-center ml-2')}>
              <View style={tw('w-10 h-10 bg-ai-light rounded-full items-center justify-center mr-3')}>
                <Sparkles color="#6366f1" size={20} />
              </View>
              <View>
                <Text style={tw('text-lg font-bold text-slate-900')}>AI Assistant</Text>
                <Text style={tw('text-ai text-xs font-medium')}>Online 24/7</Text>
              </View>
            </View>
          </View>
          
          <TouchableOpacity 
            style={tw('p-2 bg-red-50 rounded-full')}
            onPress={() => setReportModalVisible(true)}
          >
            <AlertTriangle color="#ef4444" size={20} />
          </TouchableOpacity>
        </View>

        {/* Chat Area */}
        <ScrollView contentContainerStyle={tw('p-4 pb-10')} showsVerticalScrollIndicator={false}>
          {messages.map((msg) => (
            <View 
              key={msg.id} 
              style={tw(`mb-4 max-w-[80%] ${msg.sender === 'user' ? 'self-end' : 'self-start'}`)}
            >
              <View style={tw(`p-4 rounded-2xl ${msg.sender === 'user' ? 'bg-brand rounded-tr-sm' : 'bg-slate-100 rounded-tl-sm'}`)}>
                <Text style={tw(`text-base ${msg.sender === 'user' ? (msg.hasAttachment ? 'text-slate-900 italic' : 'text-slate-900 font-medium') : 'text-slate-800'}`)}>
                  {msg.text}
                </Text>
              </View>
              <Text style={tw(`text-xs text-slate-400 mt-1 ${msg.sender === 'user' ? 'text-right' : 'text-left'}`)}>
                {msg.time}
              </Text>
            </View>
          ))}
        </ScrollView>

        {/* Input Area */}
        <View style={tw('p-4 border-t border-slate-100 bg-white flex-row items-center')}>
          <TouchableOpacity 
            onPress={() => handleSend(true)}
            style={tw('p-3 bg-slate-100 rounded-full mr-2')}
          >
            <Paperclip color="#64748b" size={20} />
          </TouchableOpacity>
          <View style={tw('flex-1 bg-slate-100 rounded-3xl px-4 py-1 mr-2 flex-row items-center min-h-[48px]')}>
            <TextInput
              style={tw('flex-1 text-base text-slate-900 h-10')}
              placeholder="Ask anything..."
              placeholderTextColor="#94a3b8"
              value={message}
              onChangeText={setMessage}
              multiline
            />
          </View>
          <TouchableOpacity 
            onPress={() => handleSend(false)}
            style={tw(`w-12 h-12 rounded-full items-center justify-center ${message.trim() ? 'bg-ai' : 'bg-slate-200'}`)}
            disabled={!message.trim()}
          >
            <Send color={message.trim() ? "#ffffff" : "#94a3b8"} size={20} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Report Modal */}
      <Modal
        visible={reportModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setReportModalVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={tw('flex-1 justify-end bg-black/40')}
        >
          <View style={tw('bg-white rounded-t-3xl p-6')}>
            <View style={tw('flex-row justify-between items-center mb-6')}>
              <Text style={tw('text-xl font-bold text-slate-900')}>
                Report AI Chat
              </Text>
              <TouchableOpacity onPress={() => setReportModalVisible(false)}>
                <X color="#64748b" size={24} />
              </TouchableOpacity>
            </View>

            <View style={tw('gap-4')}>
              <View>
                <Text style={tw('text-sm font-semibold text-slate-700 mb-2')}>Reason for reporting</Text>
                <TextInput
                  value={reportReason}
                  onChangeText={setReportReason}
                  placeholder="Inaccurate medical advice, inappropriate language..."
                  style={tw('bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-medium h-32')}
                  multiline
                  textAlignVertical="top"
                />
              </View>

              <TouchableOpacity 
                onPress={submitReport}
                style={tw('bg-red-500 py-4 rounded-xl items-center mt-2')}
              >
                <Text style={tw('text-white font-bold text-base')}>Submit Report</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
