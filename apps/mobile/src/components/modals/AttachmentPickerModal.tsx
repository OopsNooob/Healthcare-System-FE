import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, Image, ScrollView, ActivityIndicator } from 'react-native';
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
  const [pickedImage, setPickedImage] = useState<{ name: string; uri: string; size: string } | null>(null);
  const [pickedFile, setPickedFile] = useState<{ name: string; uri: string; size: string } | null>(null);
  const [isPicking, setIsPicking] = useState(false);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (visible) {
      setMode(initialMode);
      setPickedImage(null);
      setPickedFile(null);
      setIsPicking(false);
      setIsSending(false);
    }
  }, [visible, initialMode]);

  const handlePickNativePhoto = async (source: 'camera' | 'gallery') => {
    if (isPicking || isSending) return;
    setIsPicking(true);
    try {
      const result = await pickNativeImage(source, { allowsEditing: false, quality: 0.8 });
      if (result) {
        setPickedImage({ name: result.name, uri: result.uri, size: result.size });
        Toast.show({
          type: 'success',
          text1: t('mobile.photo_selected', 'Photo Selected'),
          text2: result.name,
        });
      }
    } finally {
      setIsPicking(false);
    }
  };

  const handlePickNativeDoc = async () => {
    if (isPicking || isSending) return;
    setIsPicking(true);
    try {
      const result = await pickNativePdfDocument();
      if (result) {
        setPickedFile({ name: result.name, uri: result.uri, size: result.size });
        Toast.show({
          type: 'success',
          text1: t('mobile.file_selected', 'PDF File Selected'),
          text2: result.name,
        });
      }
    } finally {
      setIsPicking(false);
    }
  };

  const canSend = (mode === 'image' && !!pickedImage) || (mode === 'file' && !!pickedFile);

  const handleSend = () => {
    if (!canSend || isSending || isPicking) return;
    setIsSending(true);
    try {
      if (mode === 'image' && pickedImage) {
        onSendAttachment({
          name: pickedImage.name,
          uri: pickedImage.uri,
          type: 'image',
          size: pickedImage.size,
        });
      } else if (mode === 'file' && pickedFile) {
        onSendAttachment({
          name: pickedFile.name,
          uri: pickedFile.uri,
          type: 'file',
          size: pickedFile.size,
        });
      }
      Toast.show({
        type: 'success',
        text1: t('mobile.success', 'Success'),
        text2: t('mobile.attachment_sent', 'Attachment attached to chat message'),
      });
      onClose();
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={onClose}>
      <View style={tw('flex-1 justify-end bg-black/60')}>
        <View style={tw('bg-white dark:bg-slate-900 rounded-t-3xl max-h-[85%] border-t border-slate-200 dark:border-slate-800')}>
          {/* Header */}
          <View style={tw('p-5 border-b border-slate-100 dark:border-slate-800 flex-row items-center justify-between')}>
            <View style={tw('flex-row items-center flex-1 mr-3')}>
              <View style={tw('w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-900/40 items-center justify-center mr-3')}>
                {mode === 'image' ? (
                  <ImageIcon color={twInstance.color('text-blue-600 dark:text-blue-400')} size={20} />
                ) : (
                  <FileText color={twInstance.color('text-blue-600 dark:text-blue-400')} size={20} />
                )}
              </View>
              <View style={tw('flex-1')}>
                <Text style={tw('text-lg font-bold text-slate-900 dark:text-white')} numberOfLines={1}>
                  {mode === 'image' ? t('mobile.attach_image', 'Attach Medical Image') : t('mobile.attach_file', 'Attach Document')}
                </Text>
                <Text style={tw('text-xs text-slate-500 dark:text-slate-400')} numberOfLines={1}>
                  {t('mobile.select_attachment_to_send', 'Select an attachment to share with consultation')}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              disabled={isSending}
              style={tw('p-2 rounded-full bg-slate-100 dark:bg-slate-800')}
            >
              <X color={twInstance.color('text-slate-600 dark:text-slate-300')} size={20} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={tw('p-5 gap-4')} showsVerticalScrollIndicator={false}>
            {/* Mode Switcher */}
            <View style={tw('flex-row bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl')}>
              <TouchableOpacity
                onPress={() => setMode('image')}
                disabled={isPicking || isSending}
                style={tw(`flex-1 py-2.5 rounded-xl items-center flex-row justify-center ${mode === 'image' ? 'bg-white dark:bg-slate-900 shadow-sm' : ''}`)}
              >
                <Camera color={mode === 'image' ? '#3b82f6' : '#94a3b8'} size={16} style={tw('mr-1.5')} />
                <Text style={tw(`text-xs font-bold ${mode === 'image' ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`)}>
                  {t('mobile.images', 'Photos / Scans')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setMode('file')}
                disabled={isPicking || isSending}
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
                <View style={tw('flex-row gap-2.5')}>
                  <TouchableOpacity
                    onPress={() => handlePickNativePhoto('camera')}
                    disabled={isPicking || isSending}
                    style={tw(
                      `flex-1 bg-slate-100 dark:bg-slate-800 p-3.5 rounded-2xl flex-row items-center justify-center active:opacity-80 border border-slate-200 dark:border-slate-700 ${
                        isPicking ? 'opacity-60' : ''
                      }`
                    )}
                  >
                    <Camera color={twInstance.color('text-slate-700 dark:text-slate-300')} size={16} style={tw('mr-2')} />
                    <Text style={tw('text-xs font-bold text-slate-700 dark:text-slate-300')}>
                      {t('mobile.take_photo', 'Take Photo')}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handlePickNativePhoto('gallery')}
                    disabled={isPicking || isSending}
                    style={tw(
                      `flex-1 bg-slate-100 dark:bg-slate-800 p-3.5 rounded-2xl flex-row items-center justify-center active:opacity-80 border border-slate-200 dark:border-slate-700 ${
                        isPicking ? 'opacity-60' : ''
                      }`
                    )}
                  >
                    <ImageIcon color={twInstance.color('text-slate-700 dark:text-slate-300')} size={16} style={tw('mr-2')} />
                    <Text style={tw('text-xs font-bold text-slate-700 dark:text-slate-300')}>
                      {t('mobile.choose_library', 'Choose Library')}
                    </Text>
                  </TouchableOpacity>
                </View>

                {pickedImage ? (
                  <View style={tw('p-3 rounded-2xl border border-brand bg-brand/10 dark:bg-brand/20 flex-row items-center gap-3')}>
                    <Image source={{ uri: pickedImage.uri }} style={tw('w-16 h-16 rounded-xl bg-slate-200 dark:bg-slate-700')} />
                    <View style={tw('flex-1')}>
                      <Text style={tw('text-xs font-bold text-slate-900 dark:text-white mb-0.5')} numberOfLines={1}>
                        {pickedImage.name}
                      </Text>
                      <Text style={tw('text-[11px] text-slate-500 dark:text-slate-400')}>{pickedImage.size}</Text>
                    </View>
                    <CheckCircle color="#10b981" size={18} />
                    <TouchableOpacity
                      onPress={() => setPickedImage(null)}
                      style={tw('p-1.5 rounded-full bg-slate-200/70 dark:bg-slate-700/70')}
                    >
                      <X color={twInstance.color('text-slate-600 dark:text-slate-300')} size={14} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={tw('p-5 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-950/60 items-center')}>
                    <ImageIcon color="#94a3b8" size={26} style={tw('mb-2')} />
                    <Text style={tw('text-xs text-slate-500 dark:text-slate-400 text-center leading-4')}>
                      {t('mobile.no_image_selected_prompt')}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Document File Mode */}
            {mode === 'file' && (
              <View style={tw('gap-3')}>
                <TouchableOpacity
                  onPress={handlePickNativeDoc}
                  disabled={isPicking || isSending}
                  style={tw(
                    `bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/50 p-3.5 rounded-2xl flex-row items-center justify-center active:opacity-80 ${
                      isPicking ? 'opacity-60' : ''
                    }`
                  )}
                >
                  {isPicking ? (
                    <ActivityIndicator size="small" color={twInstance.color('text-indigo-600 dark:text-indigo-300')} style={tw('mr-2')} />
                  ) : (
                    <UploadCloud color={twInstance.color('text-indigo-600 dark:text-indigo-300')} size={20} style={tw('mr-2')} />
                  )}
                  <Text style={tw('text-xs font-bold text-indigo-700 dark:text-indigo-300')}>
                    {t('mobile.pick_pdf_from_device', '+ Pick PDF Document from Device')}
                  </Text>
                </TouchableOpacity>

                {pickedFile ? (
                  <View style={tw('p-3.5 rounded-2xl border border-brand bg-brand/10 dark:bg-brand/20 flex-row items-center gap-3')}>
                    <View style={tw('w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900/30 items-center justify-center')}>
                      <FileText color="#ef4444" size={22} />
                    </View>
                    <View style={tw('flex-1')}>
                      <Text style={tw('text-xs font-bold text-slate-900 dark:text-white mb-0.5')} numberOfLines={1}>
                        {pickedFile.name}
                      </Text>
                      <Text style={tw('text-[11px] text-slate-500 dark:text-slate-400')}>{pickedFile.size} • PDF</Text>
                    </View>
                    <CheckCircle color="#10b981" size={18} />
                    <TouchableOpacity
                      onPress={() => setPickedFile(null)}
                      style={tw('p-1.5 rounded-full bg-slate-200/70 dark:bg-slate-700/70')}
                    >
                      <X color={twInstance.color('text-slate-600 dark:text-slate-300')} size={14} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={tw('p-5 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-950/60 items-center')}>
                    <FileText color="#94a3b8" size={26} style={tw('mb-2')} />
                    <Text style={tw('text-xs text-slate-500 dark:text-slate-400 text-center leading-4')}>
                      {t('mobile.no_pdf_selected_prompt')}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </ScrollView>

          {/* Footer Actions */}
          <View style={tw('p-4 border-t border-slate-100 dark:border-slate-800 flex-row gap-3')}>
            <TouchableOpacity
              onPress={onClose}
              disabled={isSending}
              style={tw('flex-1 bg-slate-100 dark:bg-slate-800 py-3.5 rounded-xl items-center')}
            >
              <Text style={tw('text-slate-700 dark:text-slate-300 font-bold text-sm')}>{t('mobile.cancel', 'Cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSend}
              disabled={!canSend || isSending || isPicking}
              style={tw(
                `flex-1 py-3.5 rounded-xl items-center flex-row justify-center ${
                  canSend && !isSending && !isPicking ? 'bg-brand' : 'bg-slate-200 dark:bg-slate-800 opacity-60'
                }`
              )}
            >
              {isSending ? (
                <ActivityIndicator size="small" color="#0f172a" style={tw('mr-1.5')} />
              ) : (
                <Send color={canSend ? '#0f172a' : '#64748b'} size={16} style={tw('mr-1.5')} />
              )}
              <Text style={tw(`font-bold text-sm ${canSend ? 'text-slate-900' : 'text-slate-500 dark:text-slate-400'}`)}>
                {t('mobile.send_attachment', 'Attach & Send')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
