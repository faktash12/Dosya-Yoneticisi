import React from 'react';
import {ScrollView, Share, TouchableOpacity, View} from 'react-native';

import {AppText} from '@/components/common/AppText';
import {SectionCard} from '@/components/common/SectionCard';
import type {DiagnosticEntry} from '@/services/logging/AppDiagnostics';
import {useAppTheme} from '@/hooks/useAppTheme';

interface ExplorerDiagnosticsPanelProps {
  entries: DiagnosticEntry[];
  onRefresh: () => void;
  onClear: () => void;
  summary?: string;
}

export const ExplorerDiagnosticsPanel = ({
  entries,
  onRefresh,
  onClear,
  summary,
}: ExplorerDiagnosticsPanelProps): React.JSX.Element => {
  const theme = useAppTheme();
  const [isExpanded, setIsExpanded] = React.useState(false);

  const diagnosticsText = entries
    .map(entry =>
      [
        `[${entry.level.toUpperCase()}] ${entry.scope}`,
        entry.message,
        entry.timestamp,
        entry.details ?? '',
      ]
        .filter(Boolean)
        .join('\n'),
    )
    .join('\n\n----------------\n\n');

  const handleShare = async () => {
    await Share.share({
      title: 'File Manager Pro Tanı Kayıtları',
      message:
        summary
          ? `${summary}\n\n${diagnosticsText.length > 0 ? diagnosticsText : ''}`.trim()
          : diagnosticsText.length > 0
          ? diagnosticsText
          : 'Henüz tanı kaydı yok.',
    });
  };

  return (
    <SectionCard style={{marginTop: theme.spacing.lg}}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: theme.spacing.md,
        }}>
        <View style={{flex: 1}}>
          <AppText weight="semibold">Tanı kayıtları</AppText>
          <AppText tone="muted" style={{marginTop: theme.spacing.xs}}>
            Son hata ve breadcrumb kayıtları burada görünür.
          </AppText>
        </View>
        <View style={{flexDirection: 'row', gap: theme.spacing.sm}}>
          <TouchableOpacity
            activeOpacity={0.82}
            onPress={() => setIsExpanded(current => !current)}
            style={{
              borderRadius: theme.radii.md,
              backgroundColor: theme.colors.surfaceMuted,
              paddingHorizontal: theme.spacing.sm,
              paddingVertical: theme.spacing.sm,
            }}>
            <AppText weight="semibold">
              {isExpanded ? 'Gizle' : 'Göster'}
            </AppText>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.82}
            onPress={handleShare}
            style={{
              borderRadius: theme.radii.md,
              backgroundColor: theme.colors.surfaceMuted,
              paddingHorizontal: theme.spacing.sm,
              paddingVertical: theme.spacing.sm,
            }}>
            <AppText weight="semibold">Paylaş</AppText>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.82}
            onPress={onRefresh}
            style={{
              borderRadius: theme.radii.md,
              backgroundColor: theme.colors.surfaceMuted,
              paddingHorizontal: theme.spacing.sm,
              paddingVertical: theme.spacing.sm,
            }}>
            <AppText weight="semibold">Yenile</AppText>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.82}
            onPress={onClear}
            style={{
              borderRadius: theme.radii.md,
              backgroundColor: theme.colors.surfaceMuted,
              paddingHorizontal: theme.spacing.sm,
              paddingVertical: theme.spacing.sm,
            }}>
            <AppText weight="semibold">Temizle</AppText>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        style={{marginTop: theme.spacing.md, maxHeight: 220}}>
        {summary ? (
          <View
            style={{
              borderRadius: theme.radii.md,
              backgroundColor: theme.colors.primaryMuted,
              padding: theme.spacing.sm,
              marginBottom: theme.spacing.sm,
            }}>
            <AppText weight="semibold">Canlı durum</AppText>
            <AppText tone="muted" style={{marginTop: theme.spacing.xs}}>
              {summary}
            </AppText>
          </View>
        ) : null}
        {!isExpanded ? (
          <AppText tone="muted">
            Ayrıntılı breadcrumb ve hata kayıtları için Göster düğmesini kullanın.
          </AppText>
        ) : entries.length === 0 ? (
          <AppText tone="muted">Henüz tanı kaydı yok.</AppText>
        ) : (
          <View style={{gap: theme.spacing.sm}}>
            {entries.map(entry => (
              <View
                key={entry.id}
                style={{
                  borderRadius: theme.radii.md,
                  backgroundColor: theme.colors.surfaceMuted,
                  padding: theme.spacing.sm,
                }}>
                <AppText weight="semibold">
                  [{entry.level.toUpperCase()}] {entry.scope}
                </AppText>
                <AppText tone="muted" style={{marginTop: theme.spacing.xs}}>
                  {entry.message}
                </AppText>
                <AppText tone="muted" style={{marginTop: theme.spacing.xs, fontSize: 11}}>
                  {entry.timestamp}
                </AppText>
                {entry.details ? (
                  <AppText
                    style={{marginTop: theme.spacing.xs, fontSize: 11}}
                    tone="muted">
                    {entry.details}
                  </AppText>
                ) : null}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SectionCard>
  );
};
