import React, {useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import {ArrowLeft, FileImage, FileText} from 'lucide-react-native';

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
  onBack,
}: FilePreviewViewProps): React.JSX.Element => {
  const theme = useAppTheme();
  const previewMode = useMemo(() => getFileOpenMode(node), [node]);
  const [content, setContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(previewMode !== 'image-preview');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

  return (
    <View style={{paddingBottom: theme.spacing.xxl}}>
      <SectionCard style={{marginBottom: theme.spacing.lg}}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: theme.spacing.md,
          }}>
          <View style={{flex: 1}}>
            <View
              style={{
                alignSelf: 'flex-start',
                borderRadius: theme.radii.lg,
                backgroundColor: theme.colors.primaryMuted,
                padding: theme.spacing.md,
                marginBottom: theme.spacing.md,
              }}>
              {previewMode === 'image-preview' ? (
                <FileImage color={theme.colors.primary} size={22} />
              ) : (
                <FileText color={theme.colors.primary} size={22} />
              )}
            </View>
            <AppText
              style={{fontSize: theme.typography.title, lineHeight: 30}}
              weight="bold">
              {node.name}
            </AppText>
            <AppText
              tone="muted"
              style={{marginTop: theme.spacing.xs, fontSize: theme.typography.caption}}>
              {previewMode === 'html-preview'
                ? 'HTML önizlemesi'
                : previewMode === 'image-preview'
                  ? 'Görsel önizlemesi'
                  : 'Metin önizlemesi'}
            </AppText>
          </View>
          <Pressable
            onPress={onBack}
            style={{
              borderRadius: theme.radii.lg,
              backgroundColor: theme.colors.surfaceMuted,
              padding: theme.spacing.md,
            }}>
            <ArrowLeft color={theme.colors.text} size={18} />
          </Pressable>
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
            <AppText
              style={{
                fontSize: theme.typography.body,
                lineHeight: 24,
                fontFamily: theme.typography.mono,
              }}>
              {content}
            </AppText>
          </ScrollView>
        )}
      </SectionCard>
    </View>
  );
};
