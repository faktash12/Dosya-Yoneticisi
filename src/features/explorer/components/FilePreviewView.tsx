import React, {useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import {FileImage, FileText, Music, Pause, Play, Square, Video} from 'lucide-react-native';

import {AppText} from '@/components/common/AppText';
import {SectionCard} from '@/components/common/SectionCard';
import {EmptyState} from '@/components/feedback/EmptyState';
import type {FileSystemNode} from '@/domain/entities/FileSystemNode';
import {getFileOpenMode} from '@/features/explorer/utils/fileOpenSupport';
import {useAppTheme} from '@/hooks/useAppTheme';
import {localFileSystemBridge} from '@/services/platform/LocalFileSystemBridge';
import type {MediaPlaybackStatus} from '@/services/platform/LocalFileSystemBridge';
import {formatBytes} from '@/utils/formatBytes';

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
  const [mediaStatus, setMediaStatus] = useState<MediaPlaybackStatus | null>(null);
  const isEditableText =
    previewMode === 'text-preview' || previewMode === 'html-preview';
  const isMediaPreview =
    previewMode === 'audio-preview' || previewMode === 'video-preview';

  useEffect(() => {
    if (previewMode === 'image-preview' || isMediaPreview) {
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
  }, [isMediaPreview, node.path, previewMode]);

  useEffect(() => {
    if (!isMediaPreview) {
      return;
    }

    const intervalId = setInterval(() => {
      localFileSystemBridge
        .getMediaPlaybackStatus()
        .then(setMediaStatus)
        .catch(() => undefined);
    }, 1000);

    return () => {
      clearInterval(intervalId);
      void localFileSystemBridge.stopMediaPlayback().catch(() => undefined);
    };
  }, [isMediaPreview]);

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

  const formatDuration = (valueMs: number): string => {
    const totalSeconds = Math.max(0, Math.floor(valueMs / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handlePlayMedia = async () => {
    try {
      setErrorMessage(null);
      const nextStatus = mediaStatus?.path === node.path
        ? await localFileSystemBridge.resumeMediaPlayback()
        : await localFileSystemBridge.startMediaFile(node.path);
      setMediaStatus(nextStatus);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Medya dosyası oynatılamadı.',
      );
    }
  };

  const handlePauseMedia = async () => {
    try {
      setMediaStatus(await localFileSystemBridge.pauseMediaPlayback());
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Oynatma duraklatılamadı.',
      );
    }
  };

  const handleStopMedia = async () => {
    try {
      setMediaStatus(await localFileSystemBridge.stopMediaPlayback());
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Oynatma durdurulamadı.',
      );
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
              ) : previewMode === 'audio-preview' ? (
                <Music color={theme.colors.primary} size={18} />
              ) : previewMode === 'video-preview' ? (
                <Video color={theme.colors.primary} size={18} />
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
                    : previewMode === 'audio-preview'
                      ? 'Ses oynatıcı'
                      : previewMode === 'video-preview'
                        ? 'Video oynatıcı'
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
        ) : isMediaPreview ? (
          <View style={{gap: theme.spacing.lg, paddingVertical: theme.spacing.md}}>
            <View
              style={{
                minHeight: 180,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: theme.colors.surfaceMuted,
              }}>
              {previewMode === 'audio-preview' ? (
                <Music color={theme.colors.primary} size={44} />
              ) : (
                <Video color={theme.colors.primary} size={44} />
              )}
              <AppText
                tone="muted"
                style={{marginTop: theme.spacing.md, fontSize: theme.typography.caption}}>
                {formatBytes(node.sizeBytes).toLowerCase()}
              </AppText>
            </View>
            <View>
              <View
                style={{
                  height: 5,
                  backgroundColor: theme.colors.surfaceMuted,
                  overflow: 'hidden',
                }}>
                <View
                  style={{
                    height: '100%',
                    width: `${
                      mediaStatus?.durationMs
                        ? Math.min(
                            100,
                            (mediaStatus.positionMs / mediaStatus.durationMs) * 100,
                          )
                        : 0
                    }%`,
                    backgroundColor: theme.colors.primary,
                  }}
                />
              </View>
              <View
                style={{
                  marginTop: theme.spacing.sm,
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                }}>
                <AppText tone="muted" style={{fontSize: theme.typography.caption}}>
                  {formatDuration(mediaStatus?.positionMs ?? 0)}
                </AppText>
                <AppText tone="muted" style={{fontSize: theme.typography.caption}}>
                  {formatDuration(mediaStatus?.durationMs ?? 0)}
                </AppText>
              </View>
            </View>
            <View style={{flexDirection: 'row', justifyContent: 'center', gap: theme.spacing.md}}>
              <Pressable
                onPress={() => {
                  void (mediaStatus?.isPlaying ? handlePauseMedia() : handlePlayMedia());
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: theme.spacing.sm,
                  backgroundColor: theme.colors.primary,
                  paddingHorizontal: theme.spacing.lg,
                  paddingVertical: theme.spacing.sm,
                }}>
                {mediaStatus?.isPlaying ? (
                  <Pause color="#FFFFFF" size={16} />
                ) : (
                  <Play color="#FFFFFF" size={16} />
                )}
                <AppText style={{color: '#FFFFFF'}} weight="semibold">
                  {mediaStatus?.isPlaying ? 'Duraklat' : 'Oynat'}
                </AppText>
              </Pressable>
              <Pressable
                onPress={() => {
                  void handleStopMedia();
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: theme.spacing.sm,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  paddingHorizontal: theme.spacing.lg,
                  paddingVertical: theme.spacing.sm,
                }}>
                <Square color={theme.colors.text} size={14} />
                <AppText>Durdur</AppText>
              </Pressable>
            </View>
          </View>
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
