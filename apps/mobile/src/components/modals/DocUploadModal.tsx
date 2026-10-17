import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { X, UploadCloud, FileCheck, CheckCircle2, Clock, Trash2, ShieldCheck, Camera, FileText } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { tw, twInstance } from '@/tw';
import { pickNativePdfDocument, pickNativeImage } from '@/services/nativeMedia';

export interface VerificationDocument {
  id: string;
  type: 'degree' | 'license' | 'id_card';
  title: string;
  fileName: string;
  fileSize: string;
  status: 'verified' | 'pending';
  uploadDate: string;
  uri?: string;
}

interface DocUploadModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (documents: VerificationDocument[]) => void;
  initialDocuments?: VerificationDocument[];
}

export const DocUploadModal: React.FC<DocUploadModalProps> = ({
  visible,
  onClose,
  onConfirm,
  initialDocuments,
}) => {
  const { t } = useTranslation();

  const defaultDocs: VerificationDocument[] = [
    {
      id: 'doc-1',
      type: 'degree',
      title: t('mobile.doc_medical_degree', 'Medical Degree / Diploma'),
      fileName: 'MD_Degree_Certificate_2018.pdf',
      fileSize: '3.4 MB',
      status: 'verified',
      uploadDate: '2026-09-12',
    },
    {
      id: 'doc-2',
      type: 'license',
      title: t('mobile.doc_practice_license', 'Medical Practice License'),
      fileName: 'MOH_Practice_License_Cardiology.pdf',
      fileSize: '2.1 MB',
      status: 'pending',
      uploadDate: '2026-10-05',
    },
  ];

  const [documents, setDocuments] = useState<VerificationDocument[]>(initialDocuments || defaultDocs);
  const [isUploading, setIsUploading] = useState(false);

  const handlePickNativePdf = async () => {
    setIsUploading(true);
    const result = await pickNativePdfDocument();
    setIsUploading(false);
    if (result) {
      const newDoc: VerificationDocument = {
        id: `doc-${Date.now()}`,
        type: 'license',
        title: t('mobile.doc_practice_license', 'Medical Practice License / Degree'),
        fileName: result.name,
        fileSize: result.size,
        status: 'pending',
        uploadDate: new Date().toISOString().split('T')[0],
        uri: result.uri,
      };
      setDocuments((prev) => [...prev, newDoc]);
      Toast.show({
        type: 'success',
        text1: t('mobile.document_added', 'Document Uploaded'),
        text2: result.name,
      });
    }
  };

  const handleCaptureDocPhoto = async () => {
    setIsUploading(true);
    const result = await pickNativeImage('camera', { allowsEditing: false, quality: 0.85 });
    setIsUploading(false);
    if (result) {
      const newDoc: VerificationDocument = {
        id: `doc-${Date.now()}`,
        type: 'id_card',
        title: t('mobile.doc_identity_card', 'Citizen ID / Certificate Photo'),
        fileName: result.name,
        fileSize: result.size,
        status: 'pending',
        uploadDate: new Date().toISOString().split('T')[0],
        uri: result.uri,
      };
      setDocuments((prev) => [...prev, newDoc]);
      Toast.show({
        type: 'success',
        text1: t('mobile.document_added', 'Document Uploaded'),
        text2: result.name,
      });
    }
  };

  const handleRemoveDoc = (id: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
    Toast.show({
      type: 'info',
      text1: t('mobile.document_removed', 'Document Removed'),
    });
  };

  const handleSave = () => {
    onConfirm(documents);
    Toast.show({
      type: 'success',
      text1: t('mobile.success', 'Success'),
      text2: t('mobile.docs_saved_desc', 'Verification documents updated'),
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
              <View style={tw('w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 items-center justify-center mr-3')}>
                <ShieldCheck color={twInstance.color('text-emerald-600 dark:text-emerald-400')} size={22} />
              </View>
              <View>
                <Text style={tw('text-lg font-bold text-slate-900 dark:text-white')}>
                  {t('mobile.professional_verification_docs', 'Professional Verification')}
                </Text>
                <Text style={tw('text-xs text-slate-500 dark:text-slate-400')}>
                  {t('mobile.upload_degree_and_license', 'Upload your degrees and practice license')}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={tw('p-2 rounded-full bg-slate-100 dark:bg-slate-800')}>
              <X color={twInstance.color('text-slate-600 dark:text-slate-300')} size={20} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={tw('p-5 gap-4')} showsVerticalScrollIndicator={false}>
            {/* Regulatory Notice */}
            <View style={tw('bg-emerald-50 dark:bg-emerald-950/30 p-3.5 rounded-2xl border border-emerald-200 dark:border-emerald-800/40')}>
              <Text style={tw('text-xs text-emerald-800 dark:text-emerald-200 leading-4')}>
                {t(
                  'mobile.verification_disclaimer',
                  'Ministry of Health regulations require doctors to hold valid medical degrees and certified practice licenses before consulting with patients.'
                )}
              </Text>
            </View>

            {/* Document List */}
            <View style={tw('gap-3')}>
              <Text style={tw('text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400')}>
                {t('mobile.uploaded_documents', 'Uploaded Documents')} ({documents.length})
              </Text>

              {documents.map((doc) => (
                <View
                  key={doc.id}
                  style={tw('p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex-row items-center gap-3')}
                >
                  <View style={tw('w-11 h-11 rounded-xl bg-slate-200 dark:bg-slate-800 items-center justify-center')}>
                    <FileCheck color={twInstance.color('text-emerald-600 dark:text-emerald-400')} size={22} />
                  </View>

                  <View style={tw('flex-1')}>
                    <Text style={tw('text-xs font-bold text-slate-900 dark:text-white mb-0.5')}>{doc.title}</Text>
                    <Text style={tw('text-[11px] text-slate-500 dark:text-slate-400')} numberOfLines={1}>
                      {doc.fileName} • {doc.fileSize}
                    </Text>
                    <View style={tw('flex-row items-center mt-1')}>
                      {doc.status === 'verified' ? (
                        <View style={tw('flex-row items-center')}>
                          <CheckCircle2 color="#10b981" size={12} style={tw('mr-1')} />
                          <Text style={tw('text-[10px] font-bold text-emerald-600 dark:text-emerald-400')}>
                            {t('mobile.status_verified', 'Verified')}
                          </Text>
                        </View>
                      ) : (
                        <View style={tw('flex-row items-center')}>
                          <Clock color="#f59e0b" size={12} style={tw('mr-1')} />
                          <Text style={tw('text-[10px] font-bold text-amber-600 dark:text-amber-400')}>
                            {t('mobile.status_under_review', 'Under Review')}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  <TouchableOpacity
                    onPress={() => handleRemoveDoc(doc.id)}
                    style={tw('p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40')}
                  >
                    <Trash2 color="#ef4444" size={16} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            {/* Native Document Upload Buttons */}
            <View style={tw('gap-2.5 pt-1')}>
              <TouchableOpacity
                onPress={handlePickNativePdf}
                disabled={isUploading}
                style={tw('border border-emerald-400 dark:border-emerald-700 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 p-3.5 items-center flex-row justify-center gap-2 active:opacity-80')}
              >
                {isUploading ? (
                  <ActivityIndicator size="small" color="#10b981" />
                ) : (
                  <>
                    <FileText color="#059669" size={18} />
                    <Text style={tw('text-xs font-bold text-emerald-800 dark:text-emerald-200')}>
                      {t('mobile.pick_pdf_document_from_device', '+ Pick PDF Document from Device')}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleCaptureDocPhoto}
                disabled={isUploading}
                style={tw('border border-slate-300 dark:border-slate-700 rounded-2xl bg-slate-50 dark:bg-slate-800/40 p-3.5 items-center flex-row justify-center gap-2 active:opacity-80')}
              >
                <Camera color={twInstance.color('text-slate-600 dark:text-slate-300')} size={18} />
                <Text style={tw('text-xs font-bold text-slate-700 dark:text-slate-300')}>
                  {t('mobile.capture_doc_photo', 'Scan / Take Photo of Certificate')}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* Footer Actions */}
          <View style={tw('p-4 border-t border-slate-100 dark:border-slate-800 flex-row gap-3')}>
            <TouchableOpacity onPress={onClose} style={tw('flex-1 bg-slate-100 dark:bg-slate-800 py-3.5 rounded-xl items-center')}>
              <Text style={tw('text-slate-700 dark:text-slate-300 font-bold text-sm')}>{t('mobile.cancel', 'Cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSave}
              style={tw('flex-1 bg-emerald-500 py-3.5 rounded-xl items-center flex-row justify-center')}
            >
              <CheckCircle2 color="#ffffff" size={18} style={tw('mr-2')} />
              <Text style={tw('text-white font-bold text-sm')}>{t('mobile.confirm_save', 'Confirm & Save')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
