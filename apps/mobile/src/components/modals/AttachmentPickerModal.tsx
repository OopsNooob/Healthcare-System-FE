import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, Image, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { X, Image as ImageIcon, FileText, Send, CheckCircle, Camera, FileCheck, UploadCloud } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { tw, twInstance } from '@/tw';
import { pickNativeImage, pickNativePdfDocument } from '@/services/nativeMedia';

interface AttachmentPickerModalProps {
  visible: boolean;
  onClose: () => void;
  initialMode?: 'image' | 'file';
  onSendAttachment: (item: { name: string; uri: string; type: 'image' | 'file'; size: string }) => void;
}

export const AttachmentPickerModal: React.FC<AttachmentPickerModalProps> = ({
  visible,
  onClose,
  initialMode = 'image',
  onSendAttachment,
}) => {
  const { t } = useTranslation();
  const [mode, setMode] = useState<'image' | 'file'>(initialMode);

  const initialImages = [
    { name: 'Blood_Test_Panel.jpg', uri: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?q=80&w=600&auto=format&fit=crop', size: '2.4 MB' },
    { name: 'Prescription_Scan_Oct.png', uri: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?q=80&w=600&auto=format&fit=crop', size: '1.8 MB' },
    { name: 'Skin_Rash_Monitor.jpg', uri: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?q=80&w=600&auto=format&fit=crop', size: '3.1 MB' },
  ];

  const initialFiles = [
    { name: 'Cardiology_Telemetry_Report_Q3.pdf', uri: '', size: '1.2 MB' },
    { name: 'Complete_Blood_Count_Lab_Results.pdf', uri: '', size: '850 KB' },
    { name: 'Discharge_Summary_Medical_Center.pdf', uri: '', size: '2.1 MB' },
  ];

  const [imagesList, setImagesList] = useState(initialImages);
  const [filesList, setFilesList] = useState(initialFiles);

  const [selectedImage, setSelectedImage] = useState(imagesList[0]);
  const [selectedFile, setSelectedFile] = useState(filesList[0]);

  const handlePickNativePhoto = async (source: 'camera' | 'gallery') => {
    const result = await pickNativeImage(source, { allowsEditing: false, quality: 0.8 });
    if (result) {
      const newItem = { name: result.name, uri: result.uri, size: result.size };
      setImagesList((prev) => [newItem, ...prev]);
      setSelectedImage(newItem);
      Toast.show({
        type: 'success',
        text1: t('mobile.photo_selected', 'Photo Selected'),
        text2: result.name,
      });
    }
  };

  const handlePickNativeDoc = async () => {
    const result = await pickNativePdfDocument();
    if (result) {
      const newItem = { name: result.name, uri: result.uri, size: result.size };
      setFilesList((prev) => [newItem, ...prev]);
      setSelectedFile(newItem);
      Toast.show({
        type: 'success',
        text1: t('mobile.file_selected', 'PDF File Selected'),
        text2: result.name,
      });
    }
  };

  const handleSend = () => {
    if (mode === 'image') {
      onSendAttachment({
        name: selectedImage.name,
        uri: selectedImage.uri,
        type: 'image',
        size: selectedImage.size,
      });
    } else {
      onSendAttachment({
        name: selectedFile.name,
        uri: selectedFile.uri,
        type: 'file',
        size: selectedFile.size,
      });
    }
    Toast.show({
      type: 'success',
      text1: t('mobile.success', 'Success'),
      text2: t('mobile.attachment_sent', 'Attachment attached to chat message'),
    });
    onClose();
  };

  return (
    <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={onClose}>
      <View style={tw('flex-1 justify-end bg-black/60')}>
        <View style={tw('bg-white dark:bg-slate-900 rounded-t-3xl max-h-[85%] border-t border-slate-200 dark:border-slate-800')}>
          {/* Header */}
          <View style={tw('p-5 border-b border-slate-100 dark:border-slate-800 flex-row items-center justify-between')}>
            <View style={tw('flex-row items-center')}>
              <View style={tw('w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-900/40 items-center justify-center mr-3')}>
                {mode === 'image' ? (
                  <ImageIcon color={twInstance.color('text-blue-600 dark:text-blue-400')} size={20} />
                ) : (
                  <FileText color={twInstance.color('text-blue-600 dark:text-blue-400')} size={20} />
                )}
              </View>
              <View>
                <Text style={tw('text-lg font-bold text-slate-900 dark:text-white')}>
                  {mode === 'image' ? t('mobile.attach_image', 'Attach Medical Image') : t('mobile.attach_file', 'Attach Document')}
                </Text>
                <Text style={tw('text-xs text-slate-500 dark:text-slate-400')}>
                  {t('mobile.select_attachment_to_send', 'Select an attachment to share with consultation')}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={tw('p-2 rounded-full bg-slate-100 dark:bg-slate-800')}>
              <X color={twInstance.color('text-slate-600 dark:text-slate-300')} size={20} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={tw('p-5 gap-4')} showsVerticalScrollIndicator={false}>
            {/* Mode Switcher */}
            <View style={tw('flex-row bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl')}>
              <TouchableOpacity
                onPress={() => setMode('image')}
                style={tw(`flex-1 py-2.5 rounded-xl items-center flex-row justify-center ${mode === 'image' ? 'bg-white dark:bg-slate-900 shadow-sm' : ''}`)}
              >
                <Camera color={mode === 'image' ? '#3b82f6' : '#94a3b8'} size={16} style={tw('mr-1.5')} />
                <Text style={tw(`text-xs font-bold ${mode === 'image' ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`)}>
                  {t('mobile.images', 'Photos / Scans')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setMode('file')}
                style={tw(`flex-1 py-2.5 rounded-xl items-center flex-row justify-center ${mode === 'file' ? 'bg-white dark:bg-slate-900 shadow-sm' : ''}`)}
              >
                <FileCheck color={mode === 'file' ? '#3b82f6' : '#94a3b8'} size={16} style={tw('mr-1.5')} />
                <Text style={tw(`text-xs font-bold ${mode === 'file' ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`)}>
                  {t('mobile.documents', 'PDF Documents')}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Image Mode */}
            {mode === 'image' && (
              <View style={tw('gap-3')}>
                {/* Native Device Picker Buttons */}
                <View style={tw('flex-row gap-2.5')}>
                  <TouchableOpacity
                    onPress={() => handlePickNativePhoto('camera')}
                    style={tw('flex-1 bg-slate-100 dark:bg-slate-800 p-3 rounded-2xl flex-row items-center justify-center active:opacity-80 border border-slate-200 dark:border-slate-700')}
                  >
                    <Camera color={twInstance.color('text-slate-700 dark:text-slate-300')} size={16} style={tw('mr-2')} />
                    <Text style={tw('text-xs font-bold text-slate-700 dark:text-slate-300')}>
                      {t('mobile.take_photo', 'Take Photo')}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handlePickNativePhoto('gallery')}
                    style={tw('flex-1 bg-slate-100 dark:bg-slate-800 p-3 rounded-2xl flex-row items-center justify-center active:opacity-80 border border-slate-200 dark:border-slate-700')}
                  >
                    <ImageIcon color={twInstance.color('text-slate-700 dark:text-slate-300')} size={16} style={tw('mr-2')} />
                    <Text style={tw('text-xs font-bold text-slate-700 dark:text-slate-300')}>
                      {t('mobile.choose_library', 'Choose Library')}
                    </Text>
                  </TouchableOpacity>
                </View>

                <Text style={tw('text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-1')}>
                  {t('mobile.available_scans', 'Recent Scans & Camera Photos')}
                </Text>

                {imagesList.map((img, idx) => (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => setSelectedImage(img)}
                    style={tw(
                      `p-3 rounded-2xl border flex-row items-center gap-3 ${
                        selectedImage.name === img.name
                          ? 'border-brand bg-brand/10 dark:bg-brand/20'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950'
                      }`
                    )}
                  >
                    <Image source={{ uri: img.uri }} style={tw('w-14 h-14 rounded-xl bg-slate-200 dark:bg-slate-700')} />
                    <View style={tw('flex-1')}>
                      <Text style={tw('text-xs font-bold text-slate-900 dark:text-white mb-0.5')}>{img.name}</Text>
                      <Text style={tw('text-[11px] text-slate-500')}>{img.size}</Text>
                    </View>
                    {selectedImage.name === img.name && (
                      <CheckCircle color="#10b981" size={18} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Document File Mode */}
            {mode === 'file' && (
              <View style={tw('gap-3')}>
                {/* Native PDF Device Picker Button */}
                <TouchableOpacity
                  onPress={handlePickNativeDoc}
                  style={tw('bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/50 p-3.5 rounded-2xl flex-row items-center justify-center active:opacity-80')}
                >
                  <UploadCloud color={twInstance.color('text-indigo-600 dark:text-indigo-300')} size={20} style={tw('mr-2')} />
                  <Text style={tw('text-xs font-bold text-indigo-700 dark:text-indigo-300')}>
                    {t('mobile.pick_pdf_from_device', '+ Pick PDF Document from Device')}
                  </Text>
                </TouchableOpacity>

                <Text style={tw('text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-1')}>
                  {t('mobile.available_pdfs', 'Medical Records & PDF Documents')}
                </Text>

                {filesList.map((doc, idx) => (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => setSelectedFile(doc)}
                    style={tw(
                      `p-3.5 rounded-2xl border flex-row items-center gap-3 ${
                        selectedFile.name === doc.name
                          ? 'border-brand bg-brand/10 dark:bg-brand/20'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950'
                      }`
                    )}
                  >
                    <View style={tw('w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900/30 items-center justify-center')}>
                      <FileText color="#ef4444" size={22} />
                    </View>
                    <View style={tw('flex-1')}>
                      <Text style={tw('text-xs font-bold text-slate-900 dark:text-white mb-0.5')}>{doc.name}</Text>
                      <Text style={tw('text-[11px] text-slate-500')}>{doc.size} • PDF</Text>
                    </View>
                    {selectedFile.name === doc.name && (
                      <CheckCircle color="#10b981" size={18} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </ScrollView>

          {/* Footer Actions */}
          <View style={tw('p-4 border-t border-slate-100 dark:border-slate-800 flex-row gap-3')}>
            <TouchableOpacity onPress={onClose} style={tw('flex-1 bg-slate-100 dark:bg-slate-800 py-3.5 rounded-xl items-center')}>
              <Text style={tw('text-slate-700 dark:text-slate-300 font-bold text-sm')}>{t('mobile.cancel', 'Cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSend}
              style={tw('flex-1 bg-brand py-3.5 rounded-xl items-center flex-row justify-center')}
            >
              <Send color="#0f172a" size={16} style={tw('mr-1.5')} />
              <Text style={tw('text-slate-900 font-bold text-sm')}>{t('mobile.send_attachment', 'Attach & Send')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
