import React, {useEffect, useMemo, useState} from 'react';
import {ActivityIndicator, ScrollView, View} from 'react-native';

import {AppText} from '@/components/common/AppText';
import {SectionCard} from '@/components/common/SectionCard';
import {PieChart} from '@/components/charts/PieChart';
import {EmptyState} from '@/components/feedback/EmptyState';
import {ScreenContainer} from '@/components/layout/ScreenContainer';
import {useAppTheme} from '@/hooks/useAppTheme';
import {useTranslation} from '@/i18n';
import {
  localFileSystemBridge,
  type StorageAnalysisSegment,
} from '@/services/platform/LocalFileSystemBridge';
import {formatBytes} from '@/utils/formatBytes';

export const StorageAnalysisScreen = (): React.JSX.Element => {
  const theme = useAppTheme();
  const {t} = useTranslation();
  const [segments, setSegments] = useState<StorageAnalysisSegment[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const totalUsedBytes = useMemo(
    () => segments.reduce((total, segment) => total + segment.usedBytes, 0),
    [segments],
  );
  const segmentColors = useMemo<Record<string, string>>(
    () => ({
      Görseller: '#F97316',
      Videolar: '#2563EB',
      Ses: '#EF4444',
      Belgeler: '#0F766E',
      Uygulamalar: '#8B5CF6',
      Arşivler: '#F59E0B',
      Diğer: '#64748B',
    }),
    [],
  );

  useEffect(() => {
    let isActive = true;

    const loadAnalysis = async () => {
      try {
        setLoading(true);
        setErrorMessage(null);
        const result = await localFileSystemBridge.analyzeStorage();
        if (isActive) {
          setSegments(result);
        }
      } catch (error) {
        if (isActive) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : 'Depolama analizi tamamlanamadı.',
          );
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    void loadAnalysis();

    return () => {
      isActive = false;
    };
  }, []);

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false}>
        <SectionCard style={{marginBottom: theme.spacing.lg}}>
          <AppText style={{fontSize: theme.typography.title}} weight="bold">
            {t('analysis.title')}
          </AppText>
          <AppText tone="muted" style={{marginTop: theme.spacing.xs}}>
            {t('analysis.description')}
          </AppText>
        </SectionCard>

        {isLoading ? (
          <SectionCard>
            <View style={{paddingVertical: theme.spacing.xxl}}>
              <ActivityIndicator color={theme.colors.primary} />
            </View>
          </SectionCard>
        ) : errorMessage ? (
          <EmptyState
            description={errorMessage}
            icon="folder"
            title={t('explorer.empty.analysisFailed')}
          />
        ) : segments.length === 0 ? (
          <EmptyState
            description={t('analysis.noDataDescription')}
            icon="folder"
            title={t('analysis.noData')}
          />
        ) : (
          <>
            <SectionCard style={{marginBottom: theme.spacing.lg}}>
              <AppText weight="semibold">{t('analysis.usedTotal')}</AppText>
              <AppText style={{fontSize: theme.typography.title, marginTop: theme.spacing.sm}} weight="bold">
                {formatBytes(totalUsedBytes)}
              </AppText>
              <View style={{marginTop: theme.spacing.lg, alignItems: 'center'}}>
                <PieChart
                  segments={segments.map(segment => ({
                    color: segmentColors[segment.label] ?? '#64748B',
                    value: segment.usedBytes,
                  }))}
                />
              </View>
              <View style={{marginTop: theme.spacing.lg, gap: theme.spacing.sm}}>
                <AppText weight="semibold">{t('analysis.legend')}</AppText>
                {segments.map(segment => {
                  const percentage =
                    totalUsedBytes > 0
                      ? Math.round((segment.usedBytes / totalUsedBytes) * 100)
                      : 0;

                  return (
                    <View
                      key={`${segment.label}-legend`}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}>
                      <View style={{flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm}}>
                        <View
                          style={{
                            width: 12,
                            height: 12,
                            backgroundColor: segmentColors[segment.label] ?? '#64748B',
                          }}
                        />
                        <AppText>{segment.label}</AppText>
                      </View>
                      <AppText tone="muted">
                        {percentage}% • {formatBytes(segment.usedBytes)}
                      </AppText>
                    </View>
                  );
                })}
              </View>
            </SectionCard>
            {segments.map(segment => {
          const widthPercentage = Math.round(
            totalUsedBytes > 0 ? (segment.usedBytes / totalUsedBytes) * 100 : 0,
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
                    backgroundColor: segmentColors[segment.label] ?? theme.colors.accent,
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
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
};
