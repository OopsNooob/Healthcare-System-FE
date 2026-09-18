import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView, Image, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Send, Video, Phone, ImagePlus, Paperclip, AlertTriangle, CheckCircle, X, Star } from 'lucide-react-native';
import { tw } from '@/tw';

export default function DoctorChatScreen() {
  const router = useRouter();
  const [message, setMessage] = useState('');
  
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [endModalVisible, setEndModalVisible] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');

  const [messages, setMessages] = useState([
    { id: '1', text: "Hello Alex, how are you feeling today?", sender: 'doctor', time: '10:30 AM', hasAttachment: false },
    { id: '2', text: "The medicine you prescribed is working well, but I still feel a bit dizzy.", sender: 'user', time: '10:31 AM', hasAttachment: false },
    { id: '3', text: "Your test results look perfectly fine. No need to worry. The dizziness is a common side effect and should subside in a day or two.", sender: 'doctor', time: '10:32 AM', hasAttachment: false },
  ]);

  const handleSend = (isAttachment = false) => {
    if (!message.trim() && !isAttachment) return;
    
    setMessages(prev => [
      ...prev, 
      { id: Date.now().toString(), text: isAttachment ? '[Attachment]' : message, sender: 'user', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), hasAttachment: isAttachment }
    ]);
    setMessage('');
  };

  return (
    <SafeAreaView style={tw('flex-1 bg-white')}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={tw('flex-1')}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Header */}
        <View style={tw('flex-row items-center justify-between px-4 py-4 border-b border-gray-100')}>
          <View style={tw('flex-row items-center')}>
            <TouchableOpacity 
              style={tw('p-2')}
              onPress={() => router.back()}
            >
              <ArrowLeft color="#1E1E1E" size={24} />
            </TouchableOpacity>
            <View style={tw('flex-row items-center ml-2')}>
              <Image 
                source={{ uri: 'https://i.pravatar.cc/150?img=1' }} 
                style={tw('w-10 h-10 rounded-full bg-gray-200 mr-3')} 
              />
              <View>
                <Text style={tw('text-lg font-bold text-slate-900')}>Dr. Sarah Connor</Text>
                <Text style={tw('text-brand text-xs font-medium')}>Online</Text>
              </View>
            </View>
          </View>
          
          <View style={tw('flex-row gap-1')}>
            <TouchableOpacity onPress={() => setReportModalVisible(true)} style={tw('p-2')}>
              <AlertTriangle color="#ef4444" size={20} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setEndModalVisible(true)} style={tw('p-2')}>
              <Star color="#f59e0b" size={20} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Chat Area */}
        <ScrollView contentContainerStyle={tw('p-4 pb-20')} showsVerticalScrollIndicator={false}>
          {messages.map((msg) => (
            <View 
              key={msg.id} 
              style={tw(`mb-4 max-w-[80%] ${msg.sender === 'user' ? 'self-end' : 'self-start'}`)}
            >
              <View style={tw(`p-4 rounded-2xl ${msg.sender === 'user' ? 'bg-brand rounded-tr-sm' : 'bg-slate-100 rounded-tl-sm'}`)}>
                <Text style={tw(`text-base ${msg.sender === 'user' ? 'text-slate-900 font-medium' : 'text-slate-800'} ${msg.hasAttachment ? 'italic' : ''}`)}>
                  {msg.text}
                </Text>
              </View>
              <Text style={tw(`text-xs text-gray-400 mt-1 ${msg.sender === 'user' ? 'text-right' : 'text-left'}`)}>
                {msg.time}
              </Text>
            </View>
          ))}
        </ScrollView>

        {/* Input Area */}
        <View style={tw('p-4 border-t border-gray-100 bg-white flex-row items-center')}>
          <TouchableOpacity onPress={() => alert('Add Image clicked')} style={tw('p-3 bg-slate-100 rounded-full mr-2')}>
            <ImagePlus color="#64748b" size={20} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => alert('Add File clicked')} style={tw('p-3 bg-slate-100 rounded-full mr-3')}>
            <Paperclip color="#64748b" size={20} />
          </TouchableOpacity>
          <View style={tw('flex-1 bg-gray-100 rounded-3xl px-4 py-2 mr-3 flex-row items-center min-h-[48px]')}>
            <TextInput
              style={tw('flex-1 text-base text-gray-900 h-10')}
              placeholder="Type a message..."
              placeholderTextColor="#9ca3af"
              value={message}
              onChangeText={setMessage}
              multiline
            />
          </View>
          <TouchableOpacity 
            onPress={() => handleSend(false)}
            style={tw(`w-12 h-12 rounded-full items-center justify-center ${message.trim() ? 'bg-brand' : 'bg-slate-200'}`)}
            disabled={!message.trim()}
          >
            <Send color={message.trim() ? "#1e293b" : "#94a3b8"} size={20} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* End Consultation Modal */}
      <Modal visible={endModalVisible} transparent animationType="slide" onRequestClose={() => setEndModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={tw('flex-1 justify-end bg-black/40')}>
          <View style={tw('bg-white rounded-t-3xl p-6')}>
            <View style={tw('flex-row justify-between items-center mb-6')}>
              <Text style={tw('text-xl font-bold text-slate-900')}>Leave a Review</Text>
              <TouchableOpacity onPress={() => setEndModalVisible(false)}><X color="#64748b" size={24} /></TouchableOpacity>
            </View>
            
            <View style={tw('items-center mb-6')}>
              <Image source={{ uri: 'https://i.pravatar.cc/150?img=1' }} style={tw('w-16 h-16 rounded-full bg-gray-200 mb-3')} />
              <Text style={tw('text-lg font-bold text-slate-900')}>Dr. Sarah Connor</Text>
            </View>

            <View style={tw('flex-row justify-center gap-2 mb-6')}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setRating(star)}>
                  <Star color={star <= rating ? "#f59e0b" : "#e2e8f0"} fill={star <= rating ? "#f59e0b" : "transparent"} size={32} />
                </TouchableOpacity>
              ))}
            </View>

            <View style={tw('mb-4')}>
              <Text style={tw('text-sm font-semibold text-slate-700 mb-2')}>Leave a Review</Text>
              <TextInput
                value={review}
                onChangeText={setReview}
                placeholder="Share your experience..."
                style={tw('bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-900 h-24')}
                multiline
                textAlignVertical="top"
              />
            </View>
            <TouchableOpacity onPress={() => { setEndModalVisible(false); alert('Review Submitted'); }} style={tw('bg-brand py-4 rounded-xl items-center')}>
              <Text style={tw('text-slate-900 font-bold text-base')}>Submit Review</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Report Modal */}
      <Modal visible={reportModalVisible} transparent animationType="slide" onRequestClose={() => setReportModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={tw('flex-1 justify-end bg-black/40')}>
          <View style={tw('bg-white rounded-t-3xl p-6')}>
            <View style={tw('flex-row justify-between items-center mb-6')}>
              <Text style={tw('text-xl font-bold text-slate-900')}>Report Doctor</Text>
              <TouchableOpacity onPress={() => setReportModalVisible(false)}><X color="#64748b" size={24} /></TouchableOpacity>
            </View>
            <View style={tw('mb-4')}>
              <Text style={tw('text-sm font-semibold text-slate-700 mb-2')}>Reason for Report</Text>
              <TextInput
                value={reportReason}
                onChangeText={setReportReason}
                placeholder="Inappropriate behavior, spam..."
                style={tw('bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-900 h-32')}
                multiline
                textAlignVertical="top"
              />
            </View>
            <TouchableOpacity onPress={() => { setReportModalVisible(false); alert('Report Submitted'); }} style={tw('bg-red-500 py-4 rounded-xl items-center')}>
              <Text style={tw('text-white font-bold text-base')}>Submit Report</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
