import React, {useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import {FileImage, FileText} from 'lucide-react-native';

import {AppText} from '@/components/common/AppText';
import {SectionCard} from '@/components/common/SectionCard';
import {EmptyState} from '@/components/feedback/EmptyState';
import type {FileSystemNode} from '@/domain/entities/FileSystemNode';
import {getFileOpenMode} from '@/features/explorer/utils/fileOpenSupport';
import {useAppTheme} from '@/hooks/useAppTheme';
import {localFileSystemBridge} from '@/services/platform/LocalFileSystemBridge';

interface FilePreviewViewProps {
  node: FileSystemNode;
  onBack: () => void;
}

export const FilePreviewView = ({
  node,
}: FilePreviewViewProps): React.JSX.Element => {
  const theme = useAppTheme();
  const previewMode = useMemo(() => getFileOpenMode(node), [node]);
  const [content, setContent] = useState<string>('');
  const [draftContent, setDraftContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(previewMode !== 'image-preview');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isEditableText =
    previewMode === 'text-preview' || previewMode === 'html-preview';

  useEffect(() => {
    if (previewMode === 'image-preview') {
      setIsLoading(false);
      setContent('');
      setErrorMessage(null);
      return;
    }

    let isActive = true;

    const loadTextPreview = async () => {
      try {
        setIsLoading(true);
        setErrorMessage(null);
        const text = await localFileSystemBridge.readTextFile(node.path);

        if (!isActive) {
          return;
        }

        setContent(text);
        setDraftContent(text);
      } catch (error) {
        if (!isActive) {
          return;
        }

        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'Dosya içeriği okunamadı.',
        );
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    void loadTextPreview();

    return () => {
      isActive = false;
    };
  }, [node.path, previewMode]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await localFileSystemBridge.writeTextFile(node.path, draftContent);
      setContent(draftContent);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Dosya kaydedilemedi.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={{paddingBottom: theme.spacing.xxl}}>
      <SectionCard style={{marginBottom: theme.spacing.lg}}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: theme.spacing.md,
          }}>
          <View style={{flex: 1, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm}}>
            <View
              style={{
                borderRadius: theme.radii.md,
                backgroundColor: theme.colors.primaryMuted,
                padding: theme.spacing.sm,
              }}>
              {previewMode === 'image-preview' ? (
                <FileImage color={theme.colors.primary} size={18} />
              ) : (
                <FileText color={theme.colors.primary} size={18} />
              )}
            </View>
            <View style={{flex: 1}}>
              <AppText
                style={{fontSize: theme.typography.body, lineHeight: 20}}
                numberOfLines={1}>
                {node.name}
              </AppText>
              <AppText
                tone="muted"
                style={{marginTop: theme.spacing.xs, fontSize: theme.typography.caption}}>
                {previewMode === 'html-preview'
                  ? 'HTML belgesi'
                  : previewMode === 'image-preview'
                    ? 'Görsel önizlemesi'
                    : 'Metin belgesi'}
              </AppText>
            </View>
          </View>
          {isEditableText ? (
            <Pressable
              onPress={() => {
                void handleSave();
              }}
              style={{
                borderWidth: 1,
                borderColor: theme.colors.border,
                paddingHorizontal: theme.spacing.md,
                paddingVertical: theme.spacing.sm,
              }}>
              <AppText style={{fontSize: theme.typography.caption}} weight="semibold">
                {isSaving ? 'Kaydediliyor' : 'Kaydet'}
              </AppText>
            </Pressable>
          ) : null}
        </View>
      </SectionCard>

      <SectionCard>
        {isLoading ? (
          <View style={{paddingVertical: theme.spacing.xxl}}>
            <ActivityIndicator color={theme.colors.primary} />
          </View>
        ) : errorMessage ? (
          <EmptyState
            title="Önizleme açılamadı"
            description={errorMessage}
            supportingText="Dosyayı daha sonra başka bir uygulamayla açmayı deneyebilirsiniz."
            icon="documents"
          />
        ) : previewMode === 'image-preview' ? (
          <Image
            resizeMode="contain"
            source={{uri: `file://${node.path}`}}
            style={{
              width: '100%',
              minHeight: 320,
              borderRadius: theme.radii.lg,
              backgroundColor: theme.colors.surfaceMuted,
            }}
          />
        ) : (
          <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
            {isEditableText ? (
              <TextInput
                multiline
                onChangeText={setDraftContent}
                style={{
                  color: theme.colors.text,
                  fontSize: theme.typography.body,
                  lineHeight: 24,
                  minHeight: 320,
                  textAlignVertical: 'top',
                }}
                value={draftContent}
              />
            ) : (
              <AppText
                style={{
                  fontSize: theme.typography.body,
                  lineHeight: 24,
                  fontFamily: theme.typography.mono,
                }}>
                {content}
              </AppText>
            )}
          </ScrollView>
        )}
      </SectionCard>
    </View>
  );
};
