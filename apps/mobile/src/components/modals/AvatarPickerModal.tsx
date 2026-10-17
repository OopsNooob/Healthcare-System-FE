import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, Image, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { X, Camera, Image as ImageIcon, Check, CheckCircle2 } from 'lucide-react-native';
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

  const presetAvatars = [
    'https://i.pravatar.cc/150?img=1',
    'https://i.pravatar.cc/150?img=12',
    'https://i.pravatar.cc/150?img=33',
    'https://i.pravatar.cc/150?img=47',
    'https://i.pravatar.cc/150?img=60',
    'https://i.pravatar.cc/150?img=68',
  ];

  const [selectedUri, setSelectedUri] = useState(currentAvatarUri);

  const handleApply = () => {
    onSelectAvatar(selectedUri);
    Toast.show({
      type: 'success',
      text1: t('mobile.success', 'Success'),
      text2: t('mobile.avatar_updated', 'Profile photo updated successfully'),
    });
    onClose();
  };

  const handleTakePhoto = async () => {
    const result = await pickNativeImage('camera', { aspect: [1, 1], allowsEditing: true });
    if (result) {
      setSelectedUri(result.uri);
      Toast.show({
        type: 'success',
        text1: t('mobile.photo_captured', 'Photo Captured'),
        text2: t('mobile.photo_ready_apply', 'Tap Apply to save your new photo'),
      });
    }
  };

  const handleChooseFromLibrary = async () => {
    const result = await pickNativeImage('gallery', { aspect: [1, 1], allowsEditing: true });
    if (result) {
      setSelectedUri(result.uri);
      Toast.show({
        type: 'success',
        text1: t('mobile.photo_captured', 'Photo Selected'),
        text2: t('mobile.photo_ready_apply', 'Tap Apply to save your new photo'),
      });
    }
  };

  return (
    <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={onClose}>
      <View style={tw('flex-1 justify-end bg-black/60')}>
        <View style={tw('bg-white dark:bg-slate-900 rounded-t-3xl border-t border-slate-200 dark:border-slate-800')}>
          {/* Header */}
          <View style={tw('p-5 border-b border-slate-100 dark:border-slate-800 flex-row items-center justify-between')}>
            <View style={tw('flex-row items-center')}>
              <View style={tw('w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 items-center justify-center mr-3')}>
                <Camera color={twInstance.color('text-slate-700 dark:text-slate-300')} size={20} />
              </View>
              <View>
                <Text style={tw('text-lg font-bold text-slate-900 dark:text-white')}>
                  {t('mobile.change_profile_photo', 'Change Profile Photo')}
                </Text>
                <Text style={tw('text-xs text-slate-500 dark:text-slate-400')}>
                  {t('mobile.upload_or_select_avatar', 'Upload a photo or choose an avatar')}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={tw('p-2 rounded-full bg-slate-100 dark:bg-slate-800')}>
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
                style={tw('flex-1 bg-slate-100 dark:bg-slate-800 p-3.5 rounded-2xl flex-row items-center justify-center active:opacity-80')}
              >
                <Camera color={twInstance.color('text-slate-700 dark:text-slate-300')} size={18} style={tw('mr-2')} />
                <Text style={tw('text-xs font-bold text-slate-700 dark:text-slate-300')}>
                  {t('mobile.take_photo', 'Take Photo')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleChooseFromLibrary}
                style={tw('flex-1 bg-slate-100 dark:bg-slate-800 p-3.5 rounded-2xl flex-row items-center justify-center active:opacity-80')}
              >
                <ImageIcon color={twInstance.color('text-slate-700 dark:text-slate-300')} size={18} style={tw('mr-2')} />
                <Text style={tw('text-xs font-bold text-slate-700 dark:text-slate-300')}>
                  {t('mobile.choose_library', 'Choose Library')}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Preset Avatars Grid */}
            <View>
              <Text style={tw('text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3')}>
                {t('mobile.preset_avatars', 'Preset Avatars')}
              </Text>
              <View style={tw('flex-row justify-between')}>
                {presetAvatars.map((uri, idx) => (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => setSelectedUri(uri)}
                    style={tw('relative')}
                  >
                    <Image
                      source={{ uri }}
                      style={tw(
                        `w-12 h-12 rounded-full border-2 ${
                          selectedUri === uri ? 'border-brand' : 'border-slate-200 dark:border-slate-700'
                        }`
                      )}
                    />
                    {selectedUri === uri && (
                      <View style={tw('absolute bottom-0 right-0 w-4 h-4 bg-brand rounded-full items-center justify-center')}>
                        <Check color="#0f172a" size={10} />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Footer Actions */}
          <View style={tw('p-4 border-t border-slate-100 dark:border-slate-800 flex-row gap-3')}>
            <TouchableOpacity onPress={onClose} style={tw('flex-1 bg-slate-100 dark:bg-slate-800 py-3.5 rounded-xl items-center')}>
              <Text style={tw('text-slate-700 dark:text-slate-300 font-bold text-sm')}>{t('mobile.cancel', 'Cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleApply}
              style={tw('flex-1 bg-brand py-3.5 rounded-xl items-center flex-row justify-center')}
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
