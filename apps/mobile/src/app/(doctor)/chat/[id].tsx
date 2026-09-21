import { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView, Image, Modal } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import { ArrowLeft, Send, Activity, X, Info, ImagePlus, Paperclip, AlertTriangle, CheckCircle, Phone, Video } from 'lucide-react-native';
import { tw } from '@/tw';

export default function DoctorChatSessionScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  
  const [message, setMessage] = useState('');
  const [showProfile, setShowProfile] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [endModalVisible, setEndModalVisible] = useState(false);
  
  const [reportReason, setReportReason] = useState('');
  const [doctorNote, setDoctorNote] = useState('');
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summary, setSummary] = useState('');
  
  const [messages, setMessages] = useState([
    { id: '1', text: "I still feel a bit dizzy after taking the medicine.", sender: 'user', time: '10:31 AM', hasAttachment: false },
  ]);

  const handleSummarize = () => {
    setIsSummarizing(true);
    setTimeout(() => {
      setSummary("Patient is experiencing dizziness after taking prescribed medication. Heart rate is slightly elevated (82 bpm) but blood pressure remains normal (120/80). Recommend monitoring or adjusting dosage.");
      setIsSummarizing(false);
    }, 1500);
  };

  const handleSend = (isAttachment = false) => {
    if (!message.trim() && !isAttachment) return;
    
    setMessages(prev => [
      ...prev, 
      { id: Date.now().toString(), text: isAttachment ? '[Attachment]' : message, sender: 'doctor', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), hasAttachment: isAttachment }
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
        <View style={tw('flex-row items-center justify-between px-4 py-4 border-b border-slate-100')}>
          <View style={tw('flex-row items-center')}>
            <TouchableOpacity 
              style={tw('p-2')}
              onPress={() => router.back()}
            >
              <ArrowLeft color="#1E1E1E" size={24} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowProfile(true)} style={tw('flex-row items-center ml-2')}>
              <Image 
                source={{ uri: 'https://i.pravatar.cc/150?img=12' }} 
                style={tw('w-10 h-10 rounded-full bg-slate-200 mr-3')} 
              />
              <View>
                <Text style={tw('text-lg font-bold text-slate-900')}>Alex Johnson</Text>
                <Text style={tw('text-brand text-xs font-medium')}>Online</Text>
              </View>
            </TouchableOpacity>
          </View>
          
          <View style={tw('flex-row gap-1')}>
            <TouchableOpacity style={tw('p-2')}>
              <Phone color="#1E1E1E" size={20} />
            </TouchableOpacity>
            <TouchableOpacity style={tw('p-2')} onPress={() => router.push('/(doctor)/video-call')}>
              <Video color="#1E1E1E" size={20} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={tw('p-2')}
              onPress={() => setReportModalVisible(true)}
            >
              <AlertTriangle color="#ef4444" size={20} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={tw('p-2')}
              onPress={() => setEndModalVisible(true)}
            >
              <CheckCircle color="#64748b" size={20} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Chat Area */}
        <ScrollView contentContainerStyle={tw('p-4')} showsVerticalScrollIndicator={false}>
          {messages.map((msg) => (
            <View 
              key={msg.id} 
              style={tw(`mb-4 max-w-[80%] ${msg.sender === 'doctor' ? 'self-end' : 'self-start'}`)}
            >
              <View style={tw(`p-4 rounded-2xl ${msg.sender === 'doctor' ? 'bg-brand rounded-tr-sm' : 'bg-slate-100 rounded-tl-sm'}`)}>
                <Text style={tw(`text-base ${msg.sender === 'doctor' ? 'text-slate-900 font-medium' : 'text-slate-800'} ${msg.hasAttachment ? 'italic' : ''}`)}>
                  {msg.text}
                </Text>
              </View>
              <Text style={tw(`text-xs text-slate-400 mt-1 ${msg.sender === 'doctor' ? 'text-right' : 'text-left'}`)}>
                {msg.time}
              </Text>
            </View>
          ))}
        </ScrollView>

        {/* Input Area */}
        <View style={tw('p-4 border-t border-gray-100 bg-white flex-row items-center')}>
          <TouchableOpacity onPress={() => Toast.show({ type: 'info', text1: 'Info', text2: 'Add Image clicked' })} style={tw('p-3 bg-slate-100 rounded-full mr-2')}>
            <ImagePlus color="#64748b" size={20} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => Toast.show({ type: 'info', text1: 'Info', text2: 'Add File clicked' })} style={tw('p-3 bg-slate-100 rounded-full mr-3')}>
            <Paperclip color="#64748b" size={20} />
          </TouchableOpacity>
          <View style={tw('flex-1 bg-slate-100 rounded-3xl px-4 py-2 mr-3 flex-row items-center min-h-[48px]')}>
            <TextInput
              style={tw('flex-1 text-base text-slate-900 h-10')}
              placeholder="Type a message..."
              placeholderTextColor="#94a3b8"
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

      {/* Health Profile Modal */}
      <Modal
        visible={showProfile}
        animationType="slide"
        presentationStyle="formSheet"
        onRequestClose={() => setShowProfile(false)}
      >
        <SafeAreaView style={tw('flex-1 bg-slate-50')}>
          <View style={tw('flex-row items-center justify-between p-4 bg-white border-b border-slate-100')}>
            <Text style={tw('text-xl font-bold text-slate-900')}>Health Profile</Text>
            <TouchableOpacity onPress={() => setShowProfile(false)} style={tw('p-2')}>
              <X color="#64748b" size={24} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={tw('p-6 gap-4')} showsVerticalScrollIndicator={false}>
            {/* Patient Info */}
            <View style={tw('bg-white p-4 rounded-2xl border border-slate-100 shadow-sm')}>
              <Text style={tw('text-lg font-bold text-slate-900 mb-2')}>Alex Johnson</Text>
              <Text style={tw('text-sm text-slate-600 mb-1')}>Birthday: Oct 12, 1990</Text>
              <Text style={tw('text-sm text-slate-600 mb-1')}>Gender: Male</Text>
              <Text style={tw('text-sm text-slate-600')}>Patient's note: Feeling dizzy occasionally.</Text>
            </View>

            {/* AI Summary */}
            <View style={tw('bg-white p-4 rounded-2xl border border-slate-100 shadow-sm')}>
              <View style={tw('flex-row justify-between items-center mb-3')}>
                <Text style={tw('text-xs font-bold uppercase tracking-widest text-slate-400')}>AI Summary</Text>
                <TouchableOpacity 
                  onPress={handleSummarize}
                  disabled={isSummarizing || summary.length > 0}
                  style={tw(`px-3 py-1 rounded-full border ${summary ? 'border-slate-200 bg-slate-50' : 'border-ai bg-ai-light'}`)}
                >
                  <Text style={tw(`text-xs font-bold ${summary ? 'text-slate-400' : 'text-ai'}`)}>
                    {isSummarizing ? 'Summarizing...' : 'Summarize'}
                  </Text>
                </TouchableOpacity>
              </View>
              
              <Text style={tw('text-sm text-slate-600 leading-5')}>
                {summary ? summary : "Click summarize to generate an AI assessment of the patient's recent health metrics."}
              </Text>
            </View>

            {/* Vitals */}
            <View>
              <Text style={tw('text-xs font-bold uppercase tracking-widest text-slate-400 mb-3')}>Current Vitals</Text>
              
              <View style={tw('bg-white p-4 rounded-2xl border border-slate-100 shadow-sm mb-3')}>
                <View style={tw('flex-row justify-between mb-2')}>
                  <Text style={tw('text-slate-500 font-medium')}>Heart Rate</Text>
                  <Activity color="#ef4444" size={20} />
                </View>
                <Text style={tw('text-2xl font-bold text-slate-900')}>82 <Text style={tw('text-sm text-slate-500')}>bpm</Text></Text>
              </View>

              <View style={tw('bg-white p-4 rounded-2xl border border-slate-100 shadow-sm mb-3')}>
                <View style={tw('flex-row justify-between mb-2')}>
                  <Text style={tw('text-slate-500 font-medium')}>Blood Pressure</Text>
                  <Activity color="#3b82f6" size={20} />
                </View>
                <Text style={tw('text-2xl font-bold text-slate-900')}>120/80 <Text style={tw('text-sm text-slate-500')}>mmHg</Text></Text>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* End Consultation Modal */}
      <Modal visible={endModalVisible} transparent animationType="slide" onRequestClose={() => setEndModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={tw('flex-1 justify-end bg-black/40')}>
          <View style={tw('bg-white rounded-t-3xl p-6')}>
            <View style={tw('flex-row justify-between items-center mb-6')}>
              <Text style={tw('text-xl font-bold text-slate-900')}>End Consultation</Text>
              <TouchableOpacity onPress={() => setEndModalVisible(false)}><X color="#64748b" size={24} /></TouchableOpacity>
            </View>
            <View style={tw('mb-4')}>
              <Text style={tw('text-sm font-semibold text-slate-700 mb-2')}>Doctor's Note</Text>
              <TextInput
                value={doctorNote}
                onChangeText={setDoctorNote}
                placeholder="Write your diagnostic notes here..."
                style={tw('bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-900 h-32')}
                multiline
                textAlignVertical="top"
              />
            </View>
            <TouchableOpacity onPress={() => { setEndModalVisible(false); Toast.show({ type: 'success', text1: 'Success', text2: 'Consultation Ended' }); router.back(); }} style={tw('bg-brand py-4 rounded-xl items-center')}>
              <Text style={tw('text-slate-900 font-bold text-base')}>End Consultation</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Report Modal */}
      <Modal visible={reportModalVisible} transparent animationType="slide" onRequestClose={() => setReportModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={tw('flex-1 justify-end bg-black/40')}>
          <View style={tw('bg-white rounded-t-3xl p-6')}>
            <View style={tw('flex-row justify-between items-center mb-6')}>
              <Text style={tw('text-xl font-bold text-slate-900')}>Report Patient</Text>
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
            <TouchableOpacity onPress={() => { setReportModalVisible(false); Toast.show({ type: 'success', text1: 'Success', text2: 'Report Submitted' }); }} style={tw('bg-red-500 py-4 rounded-xl items-center')}>
              <Text style={tw('text-white font-bold text-base')}>Submit Report</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
