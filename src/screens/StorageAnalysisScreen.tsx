import React from 'react';
import {ScrollView, View} from 'react-native';

import {STORAGE_ANALYSIS_SEGMENTS} from '@/constants/app';
import {AppText} from '@/components/common/AppText';
import {SectionCard} from '@/components/common/SectionCard';
import {ScreenContainer} from '@/components/layout/ScreenContainer';
import {useAppTheme} from '@/hooks/useAppTheme';
import {formatBytes} from '@/utils/formatBytes';

const totalUsedBytes = STORAGE_ANALYSIS_SEGMENTS.reduce(
  (total, segment) => total + segment.usedBytes,
  0,
);

export const StorageAnalysisScreen = (): React.JSX.Element => {
  const theme = useAppTheme();

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false}>
        <SectionCard style={{marginBottom: theme.spacing.lg}}>
          <AppText style={{fontSize: theme.typography.title}} weight="bold">
            Depolama Analizi
          </AppText>
          <AppText tone="muted" style={{marginTop: theme.spacing.xs}}>
            Büyük klasörler, içerik dağılımı ve temizlenebilir alanlar burada özetlenir.
          </AppText>
        </SectionCard>

        {STORAGE_ANALYSIS_SEGMENTS.map(segment => {
          const widthPercentage = Math.round(
            (segment.usedBytes / totalUsedBytes) * 100,
          );

          return (
            <SectionCard
              key={segment.label}
              style={{marginBottom: theme.spacing.sm}}>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                }}>
                <AppText weight="semibold">{segment.label}</AppText>
                <AppText tone="muted">{formatBytes(segment.usedBytes)}</AppText>
              </View>
              <View
                style={{
                  marginTop: theme.spacing.md,
                  height: 10,
                  overflow: 'hidden',
                  borderRadius: theme.radii.pill,
                  backgroundColor: theme.colors.surfaceMuted,
                }}>
                <View
                  style={{
                    height: '100%',
                    width: `${widthPercentage}%`,
                    backgroundColor: theme.colors.accent,
                  }}
                />
              </View>
              <View style={{marginTop: theme.spacing.md, gap: theme.spacing.sm}}>
                {segment.breakdown.map(item => (
                  <View
                    key={item.label}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}>
                    <AppText tone="muted" style={{fontSize: theme.typography.caption}}>
                      {item.label}
                    </AppText>
                    <AppText tone="muted" style={{fontSize: theme.typography.caption}}>
                      {formatBytes(item.usedBytes)}
                    </AppText>
                  </View>
                ))}
              </View>
            </SectionCard>
          );
        })}
      </ScrollView>
    </ScreenContainer>
  );
};
