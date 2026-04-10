import React, {useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  type GestureResponderEvent,
  Image,
  Modal,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import {
  FileImage,
  FileText,
  Maximize2,
  Music,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  Square,
  Video,
  X,
} from 'lucide-react-native';

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
  onBack,
}: FilePreviewViewProps): React.JSX.Element => {
  const theme = useAppTheme();
  const previewMode = useMemo(() => getFileOpenMode(node), [node]);
  const [content, setContent] = useState<string>('');
  const [draftContent, setDraftContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(previewMode !== 'image-preview');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [mediaStatus, setMediaStatus] = useState<MediaPlaybackStatus | null>(null);
  const [isFullscreenOpen, setFullscreenOpen] = useState(false);
  const [imageZoom, setImageZoom] = useState(1);
  const [progressBarWidth, setProgressBarWidth] = useState(1);
  const lastImageTapRef = React.useRef(0);
  const isEditableText =
    previewMode === 'text-preview' || previewMode === 'html-preview';
  const isMediaPreview =
    previewMode === 'audio-preview' || previewMode === 'video-preview';
  const hasUnsavedChanges = isEditableText && draftContent !== content;

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

  const handleSave = async (): Promise<boolean> => {
    try {
      setIsSaving(true);
      await localFileSystemBridge.writeTextFile(node.path, draftContent);
      setContent(draftContent);
      return true;
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Dosya kaydedilemedi.',
      );
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleRequestBack = React.useCallback((): boolean => {
    if (!hasUnsavedChanges) {
      return false;
    }

    Alert.alert(
      'Değişiklikleri kaydetmek istiyor musunuz?',
      'Kaydetmeden çıkarsanız son düzenlemeler kaybolur.',
      [
        {
          text: 'Vazgeç',
          style: 'destructive',
          onPress: onBack,
        },
        {
          text: 'Kaydet',
          onPress: () => {
            void handleSave().then(saved => {
              if (saved) {
                onBack();
              }
            });
          },
        },
      ],
    );
    return true;
  }, [handleSave, hasUnsavedChanges, onBack]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (handleRequestBack()) {
        return true;
      }

      return false;
    });

    return () => subscription.remove();
  }, [handleRequestBack]);

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

  const handleSeekBy = async (deltaMs: number) => {
    try {
      const nextPosition = Math.max(0, (mediaStatus?.positionMs ?? 0) + deltaMs);
      setMediaStatus(await localFileSystemBridge.seekMediaPlayback(nextPosition));
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Sarma işlemi tamamlanamadı.',
      );
    }
  };

  const handleSeekToLocation = async (event: GestureResponderEvent) => {
    if (!mediaStatus?.durationMs) {
      return;
    }

    const ratio = Math.max(
      0,
      Math.min(1, event.nativeEvent.locationX / Math.max(progressBarWidth, 1)),
    );

    try {
      setMediaStatus(
        await localFileSystemBridge.seekMediaPlayback(
          Math.round(mediaStatus.durationMs * ratio),
        ),
      );
    } catch {
      // Seek hatası kullanıcıyı akıştan koparmasın; periyodik durum yenilemesi devam eder.
    }
  };

  const handleOpenFullscreen = async () => {
    if (previewMode === 'video-preview') {
      try {
        await localFileSystemBridge.openVideoPlayer(node.path);
        return;
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'Tam ekran video açılamadı.',
        );
      }
    }

    setFullscreenOpen(true);
  };

  const handleImageTap = () => {
    const now = Date.now();
    if (now - lastImageTapRef.current < 280) {
      setImageZoom(currentZoom => (currentZoom > 1 ? 1 : 2));
    }
    lastImageTapRef.current = now;
  };

  const renderImagePreview = (isFullscreen = false) => (
    <Pressable onPress={handleImageTap} style={{alignItems: 'center', justifyContent: 'center'}}>
      <Image
        resizeMode="contain"
        source={{uri: `file://${node.path}`}}
        style={{
          width: '100%',
          minHeight: isFullscreen ? '100%' : 320,
          transform: [{scale: imageZoom}],
          backgroundColor: isFullscreen ? '#020617' : theme.colors.surfaceMuted,
        }}
      />
    </Pressable>
  );

  const renderMediaControls = (isFullscreen = false) => (
    <View style={{gap: theme.spacing.lg, paddingVertical: theme.spacing.md}}>
      <View
        style={{
          minHeight: isFullscreen ? 280 : 180,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: isFullscreen ? '#020617' : theme.colors.surfaceMuted,
        }}>
        {previewMode === 'audio-preview' ? (
          <Music color={isFullscreen ? '#FFFFFF' : theme.colors.primary} size={44} />
        ) : (
          <Video color={isFullscreen ? '#FFFFFF' : theme.colors.primary} size={44} />
        )}
        <AppText
          tone={isFullscreen ? 'default' : 'muted'}
          style={{
            marginTop: theme.spacing.md,
            fontSize: theme.typography.caption,
            color: isFullscreen ? '#E5E7EB' : undefined,
          }}>
          {formatBytes(node.sizeBytes).toLowerCase()}
        </AppText>
      </View>
      <View>
        <View
          onLayout={event => setProgressBarWidth(event.nativeEvent.layout.width)}
          onMoveShouldSetResponder={() => true}
          onResponderGrant={event => {
            void handleSeekToLocation(event);
          }}
          onResponderMove={event => {
            void handleSeekToLocation(event);
          }}
          onStartShouldSetResponder={() => true}
          style={{
            height: 22,
            justifyContent: 'center',
          }}>
          <View
            style={{
            height: 6,
            backgroundColor: isFullscreen ? '#1F2937' : theme.colors.surfaceMuted,
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
            void handleSeekBy(-10_000);
          }}
          style={{padding: theme.spacing.sm}}>
          <RotateCcw color={isFullscreen ? '#FFFFFF' : theme.colors.text} size={20} />
        </Pressable>
        <Pressable
          onPress={() => {
            void (mediaStatus?.isPlaying ? handlePauseMedia() : handlePlayMedia());
          }}
          style={{
            alignItems: 'center',
            justifyContent: 'center',
            width: 46,
            height: 46,
            borderRadius: 23,
            borderWidth: 1,
            borderColor: isFullscreen ? '#334155' : theme.colors.border,
            backgroundColor: isFullscreen ? '#0F172A' : theme.colors.surface,
          }}>
          {mediaStatus?.isPlaying ? (
            <Pause color={theme.colors.primary} size={20} />
          ) : (
            <Play color={theme.colors.primary} size={20} />
          )}
        </Pressable>
        <Pressable
          onPress={() => {
            void handleSeekBy(10_000);
          }}
          style={{padding: theme.spacing.sm}}>
          <RotateCw color={isFullscreen ? '#FFFFFF' : theme.colors.text} size={20} />
        </Pressable>
        <Pressable
          onPress={() => {
            void handleStopMedia();
          }}
          style={{padding: theme.spacing.sm}}>
          <Square color={isFullscreen ? '#FFFFFF' : theme.colors.text} size={18} />
        </Pressable>
      </View>
    </View>
  );

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
          ) : previewMode === 'image-preview' || isMediaPreview ? (
            <Pressable
              onPress={() => {
                void handleOpenFullscreen();
              }}
              style={{
                borderWidth: 1,
                borderColor: theme.colors.border,
                paddingHorizontal: theme.spacing.md,
                paddingVertical: theme.spacing.sm,
              }}>
              <Maximize2 color={theme.colors.text} size={16} />
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
          renderImagePreview()
        ) : isMediaPreview ? (
          renderMediaControls()
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
      <Modal
        animationType="fade"
        onRequestClose={() => setFullscreenOpen(false)}
        presentationStyle="fullScreen"
        visible={isFullscreenOpen}>
        <View style={{flex: 1, backgroundColor: '#020617', padding: theme.spacing.md}}>
          <Pressable
            onPress={() => setFullscreenOpen(false)}
            style={{
              alignSelf: 'flex-end',
              padding: theme.spacing.md,
              zIndex: 2,
            }}>
            <X color="#FFFFFF" size={22} />
          </Pressable>
          <View style={{flex: 1, justifyContent: 'center'}}>
            {previewMode === 'image-preview'
              ? renderImagePreview(true)
              : isMediaPreview
                ? renderMediaControls(true)
                : null}
          </View>
        </View>
      </Modal>
    </View>
  );
};
