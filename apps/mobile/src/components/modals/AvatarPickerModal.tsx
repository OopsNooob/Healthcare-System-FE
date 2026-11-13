import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, Image } from 'react-native';
import { useTranslation } from 'react-i18next';
import { X, Camera, Image as ImageIcon, CheckCircle2 } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { tw, twInstance } from '@/tw';
import { pickNativeImage } from '@/services/nativeMedia';

interface AvatarPickerModalProps {
  visible: boolean;
  onClose: () => void;
  currentAvatarUri?: string;
  onSelectAvatar: (newUri: string) => void;
}

export const AvatarPickerModal: React.FC<AvatarPickerModalProps> = ({
  visible,
  onClose,
  currentAvatarUri = 'https://i.pravatar.cc/150?img=1',
  onSelectAvatar,
}) => {
  const { t } = useTranslation();

  const [selectedUri, setSelectedUri] = useState(currentAvatarUri);
  const [isPicking, setIsPicking] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  useEffect(() => {
    if (visible) {
      setSelectedUri(currentAvatarUri);
      setIsPicking(false);
      setIsApplying(false);
    }
  }, [visible, currentAvatarUri]);

  const handleApply = () => {
    if (isApplying || isPicking) return;
    setIsApplying(true);
    try {
      onSelectAvatar(selectedUri);
      Toast.show({
        type: 'success',
        text1: t('mobile.success', 'Success'),
        text2: t('mobile.avatar_updated', 'Profile photo updated successfully'),
      });
      onClose();
    } finally {
      setIsApplying(false);
    }
  };

  const handleTakePhoto = async () => {
    if (isPicking || isApplying) return;
    setIsPicking(true);
    try {
      const result = await pickNativeImage('camera', { aspect: [1, 1], allowsEditing: true });
      if (result) {
        setSelectedUri(result.uri);
        Toast.show({
          type: 'success',
          text1: t('mobile.photo_captured', 'Photo Captured'),
          text2: t('mobile.photo_ready_apply', 'Tap Apply to save your new photo'),
        });
      }
    } finally {
      setIsPicking(false);
    }
  };

  const handleChooseFromLibrary = async () => {
    if (isPicking || isApplying) return;
    setIsPicking(true);
    try {
      const result = await pickNativeImage('gallery', { aspect: [1, 1], allowsEditing: true });
      if (result) {
        setSelectedUri(result.uri);
        Toast.show({
          type: 'success',
          text1: t('mobile.photo_captured', 'Photo Selected'),
          text2: t('mobile.photo_ready_apply', 'Tap Apply to save your new photo'),
        });
      }
    } finally {
      setIsPicking(false);
    }
  };

  return (
    <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={onClose}>
      <View style={tw('flex-1 justify-end bg-black/60')}>
        <View style={tw('bg-white dark:bg-slate-900 rounded-t-3xl border-t border-slate-200 dark:border-slate-800')}>
          {/* Header */}
          <View style={tw('p-5 border-b border-slate-100 dark:border-slate-800 flex-row items-center justify-between')}>
            <View style={tw('flex-row items-center flex-1 mr-3')}>
              <View style={tw('w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 items-center justify-center mr-3')}>
                <Camera color={twInstance.color('text-slate-700 dark:text-slate-300')} size={20} />
              </View>
              <View style={tw('flex-1')}>
                <Text style={tw('text-lg font-bold text-slate-900 dark:text-white')} numberOfLines={1}>
                  {t('mobile.change_profile_photo', 'Change Profile Photo')}
                </Text>
                <Text style={tw('text-xs text-slate-500 dark:text-slate-400')} numberOfLines={1}>
                  {t('mobile.upload_or_select_avatar', 'Take a new photo or choose from your library')}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              disabled={isApplying}
              style={tw('p-2 rounded-full bg-slate-100 dark:bg-slate-800')}
            >
              <X color={twInstance.color('text-slate-600 dark:text-slate-300')} size={20} />
            </TouchableOpacity>
          </View>

          <View style={tw('p-5 gap-5')}>
            {/* Active Preview */}
            <View style={tw('items-center my-2')}>
              <Image
                source={{ uri: selectedUri }}
                style={tw('w-28 h-28 rounded-full border-4 border-brand bg-slate-200 dark:bg-slate-800 shadow-md')}
              />
            </View>

            {/* Quick Actions */}
            <View style={tw('flex-row gap-3')}>
              <TouchableOpacity
                onPress={handleTakePhoto}
                disabled={isPicking || isApplying}
                style={tw(
                  `flex-1 bg-slate-100 dark:bg-slate-800 p-3.5 rounded-2xl flex-row items-center justify-center active:opacity-80 ${
                    isPicking || isApplying ? 'opacity-60' : ''
                  }`
                )}
              >
                <Camera color={twInstance.color('text-slate-700 dark:text-slate-300')} size={18} style={tw('mr-2')} />
                <Text style={tw('text-xs font-bold text-slate-700 dark:text-slate-300')}>
                  {t('mobile.take_photo', 'Take Photo')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleChooseFromLibrary}
                disabled={isPicking || isApplying}
                style={tw(
                  `flex-1 bg-slate-100 dark:bg-slate-800 p-3.5 rounded-2xl flex-row items-center justify-center active:opacity-80 ${
                    isPicking || isApplying ? 'opacity-60' : ''
                  }`
                )}
              >
                <ImageIcon color={twInstance.color('text-slate-700 dark:text-slate-300')} size={18} style={tw('mr-2')} />
                <Text style={tw('text-xs font-bold text-slate-700 dark:text-slate-300')}>
                  {t('mobile.choose_library', 'Choose Library')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Footer Actions */}
          <View style={tw('p-4 border-t border-slate-100 dark:border-slate-800 flex-row gap-3')}>
            <TouchableOpacity
              onPress={onClose}
              disabled={isApplying}
              style={tw('flex-1 bg-slate-100 dark:bg-slate-800 py-3.5 rounded-xl items-center')}
            >
              <Text style={tw('text-slate-700 dark:text-slate-300 font-bold text-sm')}>{t('mobile.cancel', 'Cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleApply}
              disabled={isApplying || isPicking}
              style={tw(
                `flex-1 bg-brand py-3.5 rounded-xl items-center flex-row justify-center ${
                  isApplying || isPicking ? 'opacity-60' : ''
                }`
              )}
            >
              <CheckCircle2 color="#0f172a" size={18} style={tw('mr-1.5')} />
              <Text style={tw('text-slate-900 font-bold text-sm')}>{t('mobile.apply_photo', 'Apply Photo')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
