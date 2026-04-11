import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import {
  FileText,
  Music,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  Square,
  Video,
  X,
} from 'lucide-react-native';
import ImageViewing from 'react-native-image-viewing';

import {AppText} from '@/components/common/AppText';
import {SectionCard} from '@/components/common/SectionCard';
import {EmptyState} from '@/components/feedback/EmptyState';
import type {FileSystemNode} from '@/domain/entities/FileSystemNode';
import {getFileOpenMode} from '@/features/explorer/utils/fileOpenSupport';
import {isImageNode} from '@/features/explorer/utils/mediaClassification';
import {useAppTheme} from '@/hooks/useAppTheme';
import {useTranslation} from '@/i18n';
import {
  localFileSystemBridge,
  type MediaPlaybackStatus,
} from '@/services/platform/LocalFileSystemBridge';
import {formatBytes} from '@/utils/formatBytes';

interface FilePreviewViewProps {
  node: FileSystemNode;
  previewNodes?: FileSystemNode[];
  initialIndex?: number;
  onBack: () => void;
}

export const FilePreviewView = ({
  node,
  previewNodes = [],
  initialIndex = 0,
  onBack,
}: FilePreviewViewProps): React.JSX.Element => {
  const theme = useAppTheme();
  const {locale, t} = useTranslation();
  const previewMode = useMemo(() => getFileOpenMode(node), [node]);
  const imagePreviewNodes = useMemo(
    () => {
      if (previewMode !== 'image-preview') {
        return [];
      }

      const matchingImages = previewNodes.filter(isImageNode);
      return matchingImages.length > 0 ? matchingImages : isImageNode(node) ? [node] : [];
    },
    [node, previewMode, previewNodes],
  );
  const [imageIndex, setImageIndex] = useState(
    Math.max(0, Math.min(initialIndex, Math.max(imagePreviewNodes.length - 1, 0))),
  );
  const [content, setContent] = useState('');
  const [draftContent, setDraftContent] = useState('');
  const [isLoading, setIsLoading] = useState(previewMode !== 'image-preview');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [mediaStatus, setMediaStatus] = useState<MediaPlaybackStatus | null>(null);
  const isEditableText =
    previewMode === 'text-preview' || previewMode === 'html-preview';
  const isMediaPreview =
    previewMode === 'audio-preview' || previewMode === 'video-preview';
  const hasUnsavedChanges = isEditableText && draftContent !== content;

  useEffect(() => {
    setImageIndex(
      Math.max(0, Math.min(initialIndex, Math.max(imagePreviewNodes.length - 1, 0))),
    );
  }, [imagePreviewNodes.length, initialIndex]);

  useEffect(() => {
    if (previewMode === 'image-preview' || isMediaPreview) {
      setIsLoading(false);
      setContent('');
      setDraftContent('');
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
            : locale === 'en'
              ? 'File content could not be read.'
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
  }, [isMediaPreview, locale, node.path, previewMode]);

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

  const handleSave = useCallback(async (): Promise<boolean> => {
    try {
      setIsSaving(true);
      await localFileSystemBridge.writeTextFile(node.path, draftContent);
      setContent(draftContent);
      return true;
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : locale === 'en'
            ? 'The file could not be saved.'
            : 'Dosya kaydedilemedi.',
      );
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [draftContent, locale, node.path]);

  const handleRequestBack = useCallback((): boolean => {
    if (!hasUnsavedChanges) {
      return false;
    }

    Alert.alert(
      locale === 'en'
        ? 'Do you want to save your changes?'
        : 'Değişiklikleri kaydetmek istiyor musunuz?',
      locale === 'en'
        ? 'If you leave without saving, your latest changes will be lost.'
        : 'Kaydetmeden çıkarsanız son düzenlemeler kaybolur.',
      [
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
        {
          text: locale === 'en' ? 'Discard' : 'Vazgeç',
          style: 'destructive',
          onPress: onBack,
        },
        {
          text: t('common.save'),
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
  }, [handleSave, hasUnsavedChanges, locale, onBack, t]);

  useEffect(() => {
    if (previewMode === 'image-preview') {
      return;
    }

    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => handleRequestBack(),
    );

    return () => subscription.remove();
  }, [handleRequestBack, previewMode]);

  const formatDuration = (valueMs: number): string => {
    const totalSeconds = Math.max(0, Math.floor(valueMs / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handlePlayMedia = async () => {
    try {
      setErrorMessage(null);
      const nextStatus =
        mediaStatus?.path === node.path
          ? await localFileSystemBridge.resumeMediaPlayback()
          : await localFileSystemBridge.startMediaFile(node.path);
      setMediaStatus(nextStatus);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : locale === 'en'
            ? 'The media file could not be played.'
            : 'Medya dosyası oynatılamadı.',
      );
    }
  };

  const handlePauseMedia = async () => {
    try {
      setMediaStatus(await localFileSystemBridge.pauseMediaPlayback());
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : locale === 'en'
            ? 'Playback could not be paused.'
            : 'Oynatma duraklatılamadı.',
      );
    }
  };

  const handleStopMedia = async () => {
    try {
      setMediaStatus(await localFileSystemBridge.stopMediaPlayback());
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : locale === 'en'
            ? 'Playback could not be stopped.'
            : 'Oynatma durdurulamadı.',
      );
    }
  };

  const handleSeekBy = async (deltaMs: number) => {
    try {
      const nextPosition = Math.max(0, (mediaStatus?.positionMs ?? 0) + deltaMs);
      setMediaStatus(await localFileSystemBridge.seekMediaPlayback(nextPosition));
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : locale === 'en'
            ? 'Seeking failed.'
            : 'Sarma işlemi tamamlanamadı.',
      );
    }
  };

  const renderMediaControls = () => (
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
          style={{
            marginTop: theme.spacing.md,
            fontSize: theme.typography.caption,
          }}>
          {formatBytes(node.sizeBytes).toLowerCase()}
        </AppText>
      </View>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'center',
          gap: theme.spacing.md,
        }}>
        <Pressable
          onPress={() => {
            void handleSeekBy(-10_000);
          }}
          style={{padding: theme.spacing.sm}}>
          <RotateCcw color={theme.colors.text} size={20} />
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
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.surface,
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
          <RotateCw color={theme.colors.text} size={20} />
        </Pressable>
        <Pressable
          onPress={() => {
            void handleStopMedia();
          }}
          style={{padding: theme.spacing.sm}}>
          <Square color={theme.colors.text} size={18} />
        </Pressable>
      </View>
      <View
        style={{
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
  );

  if (previewMode === 'image-preview') {
    if (imagePreviewNodes.length === 0) {
      return (
        <SectionCard>
          <EmptyState
            title={t('explorer.empty.previewTitle')}
            description={
              locale === 'en'
                ? 'No image could be opened for preview.'
                : 'Önizleme için açılabilecek görsel bulunamadı.'
            }
            supportingText={t('explorer.empty.previewSupporting')}
            icon="images"
          />
        </SectionCard>
      );
    }

    return (
      <ImageViewing
        animationType="fade"
        backgroundColor="#020617"
        doubleTapToZoomEnabled
        imageIndex={imageIndex}
        images={imagePreviewNodes.map(imageNode => ({uri: `file://${imageNode.path}`}))}
        keyExtractor={(_, index) => imagePreviewNodes[index]?.path ?? String(index)}
        onImageIndexChange={nextIndex => {
          if (typeof nextIndex === 'number') {
            setImageIndex(nextIndex);
          }
        }}
        onRequestClose={onBack}
        presentationStyle="fullScreen"
        swipeToCloseEnabled={false}
        visible
        HeaderComponent={({imageIndex: activeIndex}) => (
          <View
            style={{
              paddingHorizontal: theme.spacing.md,
              paddingTop: theme.spacing.xxl,
              paddingBottom: theme.spacing.md,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
            <AppText style={{color: '#FFFFFF'}} weight="semibold">
              {activeIndex + 1} / {imagePreviewNodes.length}
            </AppText>
            <Pressable onPress={onBack} style={{padding: theme.spacing.sm}}>
              <X color="#FFFFFF" size={22} />
            </Pressable>
          </View>
        )}
        FooterComponent={({imageIndex: activeIndex}) => (
          <View
            style={{
              paddingHorizontal: theme.spacing.md,
              paddingBottom: theme.spacing.xxl,
              paddingTop: theme.spacing.md,
            }}>
            <AppText
              numberOfLines={1}
              style={{color: '#FFFFFF', fontSize: theme.typography.caption}}
              weight="semibold">
              {imagePreviewNodes[activeIndex]?.name ?? node.name}
            </AppText>
          </View>
        )}
      />
    );
  }

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
          <View
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              gap: theme.spacing.sm,
            }}>
            <View
              style={{
                borderRadius: theme.radii.md,
                backgroundColor: theme.colors.primaryMuted,
                padding: theme.spacing.sm,
              }}>
              {previewMode === 'audio-preview' ? (
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
                style={{
                  marginTop: theme.spacing.xs,
                  fontSize: theme.typography.caption,
                }}>
                {previewMode === 'html-preview'
                  ? 'HTML belgesi'
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
              <AppText
                style={{fontSize: theme.typography.caption}}
                weight="semibold">
                {isSaving
                  ? locale === 'en'
                    ? 'Saving'
                    : 'Kaydediliyor'
                  : t('common.save')}
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
            title={t('explorer.empty.previewTitle')}
            description={errorMessage}
            supportingText={t('explorer.empty.previewSupporting')}
            icon={previewMode === 'audio-preview' ? 'audio' : 'documents'}
          />
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
    </View>
  );
};
