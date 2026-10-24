import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, TextInput, TouchableOpacity, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView, Image, Modal } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeRouter as useRouter } from '@/utils/useSafeRouter';
import Toast from 'react-native-toast-message';
import { ArrowLeft, Send, Activity, X, Info, ImagePlus, Paperclip, AlertTriangle, CheckCircle, Phone, Video, FileText, ZoomIn, Eye } from 'lucide-react-native';
import { tw, twInstance } from '@/tw';
import { AttachmentPickerModal, ImageViewerModal, DocViewerModal } from '@/components/modals';

interface ChatMessage {
  id: string;
  text: string;
  sender: 'doctor' | 'user';
  time: string;
  hasAttachment?: boolean;
  attachmentType?: 'image' | 'file';
  attachmentName?: string;
  attachmentSize?: string;
  attachmentUri?: string;
}

export default function DoctorChatSessionScreen() {
  const { t, i18n } = useTranslation();
  const isVi = i18n.language === 'vi';

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
  const [attachmentModalVisible, setAttachmentModalVisible] = useState(false);
  const [attachmentMode, setAttachmentMode] = useState<'image' | 'file'>('image');

  // Preview Modals
  const [selectedImagePreview, setSelectedImagePreview] = useState<{ uri: string; name: string; size: string } | null>(null);
  const [selectedDocPreview, setSelectedDocPreview] = useState<{ name: string; size: string; uri?: string } | null>(null);

  const initialMessages: ChatMessage[] = [
    {
      id: '1',
      text: isVi ? "Bác sĩ ơi, tôi gửi kèm kết quả xét nghiệm máu mới nhận sáng nay:" : "Doctor, here is my recent blood test panel from this morning:",
      sender: 'user',
      time: '10:31 AM',
      hasAttachment: true,
      attachmentType: 'image',
      attachmentName: 'Blood_Test_Panel_Oct2026.jpg',
      attachmentSize: '2.4 MB',
      attachmentUri: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?q=80&w=600&auto=format&fit=crop',
    },
    {
      id: '2',
      text: isVi ? "Bác sĩ đã xem phiếu xét nghiệm. Các chỉ số đều rất tốt. Tôi gửi đơn thuốc và hướng dẫn theo dõi bên dưới nhé:" : "I reviewed your blood panel. Results look great. I have attached the updated care directives below:",
      sender: 'doctor',
      time: '10:33 AM',
      hasAttachment: true,
      attachmentType: 'file',
      attachmentName: 'Cardiology_Telemetry_Report_Q3.pdf',
      attachmentSize: '1.2 MB',
      attachmentUri: '',
    },
  ];
  
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);

  const handleSummarize = () => {
    setIsSummarizing(true);
    setTimeout(() => {
      setSummary("Patient is experiencing dizziness after taking prescribed medication. Heart rate is slightly elevated (82 bpm) but blood pressure remains normal (120/80). Recommend monitoring or adjusting dosage.");
      setIsSummarizing(false);
    }, 1500);
  };

  const handleSend = () => {
    if (!message.trim()) return;
    
    setMessages(prev => [
      ...prev, 
      {
        id: Date.now().toString(),
        text: message.trim(),
        sender: 'doctor',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        hasAttachment: false,
      }
    ]);
    setMessage('');
  };

  const handleSendAttachment = (item: { name: string; uri: string; type: 'image' | 'file'; size: string }) => {
    setMessages(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        text: item.type === 'image'
          ? (isVi ? 'Đã gửi hình ảnh y tế đính kèm.' : 'Medical image attachment sent.')
          : (isVi ? 'Đã gửi tài liệu y khoa đính kèm.' : 'Medical document attachment sent.'),
        sender: 'doctor',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        hasAttachment: true,
        attachmentType: item.type,
        attachmentName: item.name,
        attachmentSize: item.size,
        attachmentUri: item.uri,
      }
    ]);
  };

  return (
    <SafeAreaView style={tw('flex-1 bg-white dark:bg-slate-900')}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={tw('flex-1')}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Header */}
        <View style={tw('flex-row items-center justify-between px-3 py-3 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900')}>
          <View style={tw('flex-row items-center flex-1 mr-2')}>
            <TouchableOpacity 
              style={tw('p-2 -ml-1')}
              onPress={() => router.back('/(doctor)/consultations')}
            >
              <ArrowLeft color={twInstance.color('text-slate-900 dark:text-slate-100')} size={22} />
            </TouchableOpacity>
            <View style={tw('flex-row items-center ml-1 flex-1')}>
              <Image 
                source={{ uri: 'https://i.pravatar.cc/150?img=11' }} 
                style={tw('w-10 h-10 rounded-full bg-slate-200 mr-2.5')} 
              />
              <View style={tw('flex-1')}>
                <Text style={tw('text-base font-bold text-slate-900 dark:text-white')} numberOfLines={1}>Alex Johnson</Text>
                <Text style={tw('text-emerald-500 text-xs font-semibold')}>{t('mobile.patient', `Patient`)} • {t('mobile.online', `Online`)}</Text>
              </View>
            </View>
          </View>
          
          <View style={tw('flex-row items-center gap-1')}>
            {/* Video Call Button */}
            <TouchableOpacity 
              style={tw('w-9 h-9 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 items-center justify-center active:opacity-75')}
              onPress={() => router.push('/(doctor)/video-call')}
              accessibilityLabel={t('mobile.video_call', 'Gọi video')}
            >
              <Video color="#10b981" size={18} />
            </TouchableOpacity>

            {/* Voice Call Button */}
            <TouchableOpacity 
              style={tw('w-9 h-9 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/60 items-center justify-center active:opacity-75')}
              onPress={() => router.push('/(doctor)/video-call')}
              accessibilityLabel={t('mobile.call', 'Gọi điện')}
            >
              <Phone color="#3b82f6" size={17} />
            </TouchableOpacity>

            {/* Clinical Profile Info */}
            <TouchableOpacity 
              style={tw('w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 items-center justify-center active:opacity-75')}
              onPress={() => setShowProfile(!showProfile)}
            >
              <Info color={twInstance.color('text-slate-600 dark:text-slate-300')} size={18} />
            </TouchableOpacity>

            {/* Report Patient */}
            <TouchableOpacity 
              style={tw('w-9 h-9 rounded-full bg-red-50 dark:bg-red-950/50 items-center justify-center active:opacity-75')}
              onPress={() => setReportModalVisible(true)}
            >
              <AlertTriangle color="#ef4444" size={17} />
            </TouchableOpacity>

            {/* End Session */}
            <TouchableOpacity 
              style={tw('w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 items-center justify-center active:opacity-75')}
              onPress={() => setEndModalVisible(true)}
            >
              <CheckCircle color={twInstance.color('text-slate-600 dark:text-slate-300')} size={17} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Teleconsultation Quick Action Banner */}
        <View style={tw('bg-emerald-50/80 dark:bg-emerald-950/40 px-4 py-2 border-b border-emerald-100 dark:border-emerald-900/40 flex-row items-center justify-between')}>
          <View style={tw('flex-row items-center flex-1 mr-3')}>
            <View style={tw('w-2 h-2 rounded-full bg-emerald-500 mr-2')} />
            <Text style={tw('text-xs text-emerald-900 dark:text-emerald-200 font-semibold')} numberOfLines={1}>
              {isVi ? 'Phòng khám trực tuyến sẵn sàng' : 'Teleconsultation room ready'}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/(doctor)/video-call')}
            style={tw('bg-emerald-600 dark:bg-emerald-500 px-3 py-1.5 rounded-full flex-row items-center active:opacity-85 shadow-sm')}
          >
            <Video color="#ffffff" size={13} style={tw('mr-1.5')} />
            <Text style={tw('text-white text-xs font-bold')}>
              {t('mobile.video_call', 'Gọi video')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Chat Area */}
        <ScrollView contentContainerStyle={tw('p-4 pb-16')} showsVerticalScrollIndicator={false}>
          {messages.map((msg) => (
            <View 
              key={msg.id} 
              style={tw(`mb-4 max-w-[85%] ${msg.sender === 'doctor' ? 'self-end' : 'self-start'}`)}
            >
              <View style={tw(`p-3.5 rounded-2xl ${msg.sender === 'doctor' ? 'bg-brand rounded-tr-sm' : 'bg-slate-100 dark:bg-slate-800 rounded-tl-sm'}`)}>
                {/* 1. Image Attachment Preview */}
                {msg.attachmentType === 'image' && msg.attachmentUri && (
                  <TouchableOpacity
                    activeOpacity={0.88}
                    onPress={() => setSelectedImagePreview({
                      uri: msg.attachmentUri!,
                      name: msg.attachmentName || 'Photo.jpg',
                      size: msg.attachmentSize || '2.1 MB',
                    })}
                    style={tw('mb-2.5 rounded-xl overflow-hidden border border-black/10 dark:border-white/10 bg-slate-200 dark:bg-slate-700 relative')}
                  >
                    <Image
                      source={{ uri: msg.attachmentUri }}
                      style={tw('w-60 h-44 rounded-xl')}
                      resizeMode="cover"
                    />
                    <View style={tw('absolute bottom-2 right-2 bg-black/70 px-2 py-1 rounded-md flex-row items-center')}>
                      <ZoomIn color="#ffffff" size={12} style={tw('mr-1')} />
                      <Text style={tw('text-[10px] text-white font-medium')}>
                        {msg.attachmentSize || 'Photo'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}

                {/* 2. PDF Document Attachment Card */}
                {msg.attachmentType === 'file' && (
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => setSelectedDocPreview({
                      name: msg.attachmentName || 'Medical_Record.pdf',
                      size: msg.attachmentSize || '1.2 MB',
                      uri: msg.attachmentUri,
                    })}
                    style={tw(
                      `mb-2.5 p-3 rounded-xl border flex-row items-center gap-3 ${
                        msg.sender === 'doctor'
                          ? 'bg-slate-900/10 border-slate-900/20'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700'
                      }`
                    )}
                  >
                    <View style={tw('w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30 items-center justify-center')}>
                      <FileText color="#ef4444" size={22} />
                    </View>
                    <View style={tw('flex-1 mr-1')}>
                      <Text
                        numberOfLines={1}
                        style={tw(
                          `text-xs font-bold ${
                            msg.sender === 'doctor' ? 'text-slate-900' : 'text-slate-900 dark:text-white'
                          }`
                        )}
                      >
                        {msg.attachmentName || 'Document.pdf'}
                      </Text>
                      <Text style={tw('text-[10px] text-slate-500 dark:text-slate-400 mt-0.5')}>
                        {msg.attachmentSize || 'PDF Document'} • {isVi ? 'Nhấn để xem' : 'Tap to view'}
                      </Text>
                    </View>
                    <Eye color={msg.sender === 'doctor' ? '#0f172a' : '#64748b'} size={18} />
                  </TouchableOpacity>
                )}

                {/* Text Message */}
                <Text style={tw(`text-sm leading-5 ${msg.sender === 'doctor' ? 'text-slate-900 font-medium' : 'text-slate-800 dark:text-slate-100'}`)}>
                  {msg.text}
                </Text>
              </View>
              <Text style={tw(`text-[11px] text-slate-400 mt-1 ${msg.sender === 'doctor' ? 'text-right' : 'text-left'}`)}>
                {msg.time}
              </Text>
            </View>
          ))}
        </ScrollView>

        {/* Input Area */}
        <View style={tw('p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex-row items-center')}>
          <TouchableOpacity 
            onPress={() => {
              setAttachmentMode('image');
              setAttachmentModalVisible(true);
            }} 
            style={tw('p-3 bg-slate-100 dark:bg-slate-800 rounded-full mr-2 active:opacity-80')}
          >
            <ImagePlus color="#64748b" size={20} />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => {
              setAttachmentMode('file');
              setAttachmentModalVisible(true);
            }} 
            style={tw('p-3 bg-slate-100 dark:bg-slate-800 rounded-full mr-3 active:opacity-80')}
          >
            <Paperclip color="#64748b" size={20} />
          </TouchableOpacity>
          <View style={tw('flex-1 bg-slate-100 dark:bg-slate-800 rounded-3xl px-4 py-2 mr-3 flex-row items-center min-h-[48px]')}>
            <TextInput
              style={tw('flex-1 text-base text-slate-900 dark:text-white h-10')}
              placeholder={t('mobile.type_a_message', 'Type a message...')}
              placeholderTextColor="#94a3b8"
              value={message}
              onChangeText={setMessage}
              multiline
            />
          </View>
          <TouchableOpacity 
            onPress={handleSend}
            style={tw(`w-12 h-12 rounded-full items-center justify-center ${message.trim() ? 'bg-brand' : 'bg-slate-200 dark:bg-slate-700'}`)}
            disabled={!message.trim()}
          >
            <Send color={message.trim() ? "#1e293b" : "#94a3b8"} size={20} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Patient Profile / Vitals Peek Sheet */}
      <Modal visible={showProfile} animationType="slide" transparent onRequestClose={() => setShowProfile(false)}>
        <View style={tw('flex-1 justify-end bg-black/40')}>
          <View style={tw('bg-white dark:bg-slate-900 rounded-t-3xl p-6')}>
            <View style={tw('flex-row justify-between items-center mb-4')}>
              <Text style={tw('text-xl font-bold text-slate-900 dark:text-white')}>{t('mobile.patient_vitals', `Patient Vitals & Info`)}</Text>
              <TouchableOpacity onPress={() => setShowProfile(false)}><X color="#64748b" size={24} /></TouchableOpacity>
            </View>
            <View style={tw('bg-slate-50 dark:bg-slate-800 p-4 rounded-xl mb-4')}>
              <Text style={tw('text-slate-500 dark:text-slate-400 text-xs mb-1')}>{t('mobile.recent_bp', `Recent Blood Pressure`)}</Text>
              <Text style={tw('text-xl font-bold text-slate-900 dark:text-white')}>120/80 mmHg</Text>
              <Text style={tw('text-emerald-500 text-xs font-semibold mt-1')}>{t('mobile.normal', `Normal`)} • {t('mobile.measured_1h_ago', `Measured 1h ago`)}</Text>
            </View>
            <View style={tw('bg-slate-50 dark:bg-slate-800 p-4 rounded-xl mb-6')}>
              <Text style={tw('text-slate-500 dark:text-slate-400 text-xs mb-1')}>{t('mobile.heart_rate', `Heart Rate`)}</Text>
              <Text style={tw('text-xl font-bold text-slate-900 dark:text-white')}>82 bpm</Text>
              <Text style={tw('text-amber-500 text-xs font-semibold mt-1')}>{t('mobile.slightly_elevated', `Slightly Elevated`)}</Text>
            </View>
            <TouchableOpacity onPress={() => setShowProfile(false)} style={tw('bg-brand py-4 rounded-xl items-center')}>
              <Text style={tw('text-slate-900 font-bold text-base')}>{t('mobile.close', `Close`)}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* End Consultation Modal */}
      <Modal visible={endModalVisible} animationType="slide" transparent onRequestClose={() => setEndModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={tw('flex-1 justify-end bg-black/40')}>
          <View style={tw('bg-white dark:bg-slate-900 rounded-t-3xl p-6')}>
            <View style={tw('flex-row justify-between items-center mb-6')}>
              <Text style={tw('text-xl font-bold text-slate-900 dark:text-white')}>{t('mobile.end_consultation', `End Consultation`)}</Text>
              <TouchableOpacity onPress={() => setEndModalVisible(false)}><X color="#64748b" size={24} /></TouchableOpacity>
            </View>
            
            <View style={tw('mb-4')}>
              <View style={tw('flex-row justify-between items-center mb-2')}>
                <Text style={tw('text-sm font-semibold text-slate-700 dark:text-slate-200')}>{t('mobile.clinical_summary', `Clinical Summary`)}</Text>
                <TouchableOpacity onPress={handleSummarize} disabled={isSummarizing}>
                  <Text style={tw('text-brand text-xs font-bold')}>{isSummarizing ? t('mobile.generating', 'Generating...') : t('mobile.ai_summarize', '✨ AI Summarize')}</Text>
                </TouchableOpacity>
              </View>
              {summary ? (
                <View style={tw('bg-slate-50 dark:bg-slate-800 p-3 rounded-xl mb-2')}>
                  <Text style={tw('text-slate-700 dark:text-slate-300 text-xs')}>{summary}</Text>
                </View>
              ) : null}
              <TextInput
                value={doctorNote}
                onChangeText={setDoctorNote}
                placeholder={t('mobile.enter_doctor_notes', "Enter diagnosis, prescription, or doctor's note...")}
                style={tw('bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-slate-900 dark:text-white h-24')}
                multiline
                textAlignVertical="top"
              />
            </View>
            
            <TouchableOpacity onPress={() => { setEndModalVisible(false); Toast.show({ type: 'success', text1: t('mobile.success', 'Success'), text2: t('mobile.consultation_ended', 'Consultation Ended') }); router.back('/(doctor)/consultations'); }} style={tw('bg-brand py-4 rounded-xl items-center')}>
              <Text style={tw('text-slate-900 font-bold text-base')}>{t('mobile.complete_and_close', `Complete & Close`)}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Report Modal */}
      <Modal visible={reportModalVisible} transparent animationType="slide" onRequestClose={() => setReportModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={tw('flex-1 justify-end bg-black/40')}>
          <View style={tw('bg-white dark:bg-slate-900 rounded-t-3xl p-6')}>
            <View style={tw('flex-row justify-between items-center mb-6')}>
              <Text style={tw('text-xl font-bold text-slate-900 dark:text-white')}>{t('mobile.report_patient', `Report Patient`)}</Text>
              <TouchableOpacity onPress={() => setReportModalVisible(false)}><X color="#64748b" size={24} /></TouchableOpacity>
            </View>
            <View style={tw('mb-4')}>
              <Text style={tw('text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2')}>{t('mobile.reason_for_report', `Reason for Report`)}</Text>
              <TextInput
                value={reportReason}
                onChangeText={setReportReason}
                placeholder={t('mobile.inappropriate_behavior', 'Inappropriate behavior, spam...')}
                style={tw('bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-slate-900 dark:text-white h-32')}
                multiline
                textAlignVertical="top"
              />
            </View>
            <TouchableOpacity onPress={() => { setReportModalVisible(false); Toast.show({ type: 'success', text1: t('mobile.success', 'Success'), text2: t('mobile.report_submitted', 'Report Submitted') }); }} style={tw('bg-red-500 py-4 rounded-xl items-center')}>
              <Text style={tw('text-white font-bold text-base')}>{t('mobile.submit_report', `Submit Report`)}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Attachment Picker Modal */}
      <AttachmentPickerModal
        visible={attachmentModalVisible}
        onClose={() => setAttachmentModalVisible(false)}
        initialMode={attachmentMode}
        onSendAttachment={handleSendAttachment}
      />

      {/* Lightbox Image Preview Modal */}
      <ImageViewerModal
        visible={!!selectedImagePreview}
        onClose={() => setSelectedImagePreview(null)}
        imageUri={selectedImagePreview?.uri}
        imageName={selectedImagePreview?.name}
        imageSize={selectedImagePreview?.size}
      />

      {/* PDF Document Viewer Modal */}
      <DocViewerModal
        visible={!!selectedDocPreview}
        onClose={() => setSelectedDocPreview(null)}
        fileName={selectedDocPreview?.name}
        fileSize={selectedDocPreview?.size}
        fileUri={selectedDocPreview?.uri}
      />
    </SafeAreaView>
  );
}
