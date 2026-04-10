import React, {useEffect, useMemo} from 'react';
import {FlatList, Pressable, View} from 'react-native';

import {appContainer} from '@/app/di/container';
import {AppText} from '@/components/common/AppText';
import {SectionCard} from '@/components/common/SectionCard';
import {ScreenContainer} from '@/components/layout/ScreenContainer';
import {useOperationQueueStore} from '@/features/operations/store/operation-queue.store';
import {useTransfersStore} from '@/features/transfers/store/transfers.store';
import {useAppTheme} from '@/hooks/useAppTheme';
import {formatBytes} from '@/utils/formatBytes';

export const TransfersScreen = (): React.JSX.Element => {
  const theme = useAppTheme();
  const activeJobs = useTransfersStore(state => state.activeJobs);
  const historyJobs = useTransfersStore(state => state.historyJobs);
  const hydrateFromJobs = useTransfersStore(state => state.hydrateFromJobs);
  const hydrateQueue = useOperationQueueStore(state => state.hydrate);
  const allJobs = useMemo(() => [...activeJobs, ...historyJobs], [activeJobs, historyJobs]);

  useEffect(() => {
    void appContainer.operationQueueProcessor.listJobs().then(jobs => {
      hydrateQueue(jobs);
      hydrateFromJobs(jobs);
    });

    const unsubscribe = appContainer.operationQueueProcessor.subscribe(jobs => {
      hydrateQueue(jobs);
      hydrateFromJobs(jobs);
    });

    return unsubscribe;
  }, [hydrateFromJobs, hydrateQueue]);

  return (
    <ScreenContainer>
      <SectionCard style={{marginBottom: theme.spacing.lg}}>
        <AppText style={{fontSize: theme.typography.title}} weight="bold">
          İşlem Kuyruğu
        </AppText>
        <AppText tone="muted" style={{marginTop: theme.spacing.xs}}>
          Kopyalama, taşıma, yeniden adlandırma ve klasör işlemleri burada izlenir.
        </AppText>
        <View
          style={{
            marginTop: theme.spacing.md,
            flexDirection: 'row',
            gap: theme.spacing.md,
          }}>
          <AppText tone="muted">Aktif: {activeJobs.length}</AppText>
          <AppText tone="muted">Geçmiş: {historyJobs.length}</AppText>
        </View>
      </SectionCard>

      <FlatList
        data={allJobs}
        keyExtractor={item => item.id}
        ItemSeparatorComponent={() => <View style={{height: theme.spacing.sm}} />}
        ListHeaderComponent={
          activeJobs.length > 0 ? (
            <AppText
              weight="semibold"
              style={{marginBottom: theme.spacing.sm, marginTop: theme.spacing.xs}}>
              Aktif İşler
            </AppText>
          ) : null
        }
        renderItem={({item, index}) => {
          const isHistoryBoundary = index === activeJobs.length && historyJobs.length > 0;

          return (
            <>
              {isHistoryBoundary ? (
                <AppText
                  weight="semibold"
                  style={{marginBottom: theme.spacing.sm, marginTop: theme.spacing.lg}}>
                  Geçmiş
                </AppText>
              ) : null}
              <SectionCard>
                <AppText weight="semibold">
                  {item.sourceItems.map(source => source.displayName).join(', ')}
                </AppText>
                <AppText tone="muted" style={{marginTop: theme.spacing.xs}}>
                  {item.type.toUpperCase()} • {item.status}
                </AppText>
                <View
                  style={{
                    marginTop: theme.spacing.md,
                    height: 8,
                    overflow: 'hidden',
                    borderRadius: theme.radii.pill,
                    backgroundColor: theme.colors.surfaceMuted,
                  }}>
                  <View
                    style={{
                      height: '100%',
                      width: `${item.progress.percentage}%`,
                      backgroundColor:
                        item.status === 'failed'
                          ? theme.colors.danger
                          : theme.colors.primary,
                    }}
                  />
                </View>
                <AppText tone="muted" style={{marginTop: theme.spacing.sm}}>
                  {item.progress.completedUnits} / {item.progress.totalUnits} adım
                  {'  '}•{'  '}
                  {formatBytes(
                    item.sourceItems.reduce(
                      (total, source) => total + (source.sizeBytes ?? 0),
                      0,
                    ),
                  )}
                </AppText>
                {item.error ? (
                  <AppText tone="muted" style={{marginTop: theme.spacing.sm}}>
                    Hata: {item.error.message}
                  </AppText>
                ) : null}
                {(item.status === 'running' ||
                  item.status === 'pending' ||
                  item.status === 'failed') ? (
                  <View
                    style={{
                      marginTop: theme.spacing.md,
                      flexDirection: 'row',
                      gap: theme.spacing.sm,
                    }}>
                    {item.status === 'failed' ? (
                      <Pressable
                        onPress={() => {
                          void appContainer.operationQueueProcessor.retry(item.id);
                        }}
                        style={{
                          borderRadius: theme.radii.md,
                          backgroundColor: theme.colors.primary,
                          paddingHorizontal: theme.spacing.md,
                          paddingVertical: theme.spacing.sm,
                        }}>
                        <AppText style={{color: '#FFFFFF'}} weight="semibold">
                          Tekrar dene
                        </AppText>
                      </Pressable>
                    ) : (
                      <Pressable
                        onPress={() => {
                          void appContainer.operationQueueProcessor.cancel(item.id);
                        }}
                        style={{
                          borderRadius: theme.radii.md,
                          backgroundColor: theme.colors.surfaceMuted,
                          paddingHorizontal: theme.spacing.md,
                          paddingVertical: theme.spacing.sm,
                        }}>
                        <AppText weight="semibold">İptal et</AppText>
                      </Pressable>
                    )}
                  </View>
                ) : null}
              </SectionCard>
            </>
          );
        }}
        ListEmptyComponent={
          <SectionCard>
            <AppText weight="semibold">Henüz işlem yok</AppText>
            <AppText tone="muted" style={{marginTop: theme.spacing.xs}}>
              Dosyalar ekranındaki kopyala, kes ve yapıştır işlemleri burada listelenir.
            </AppText>
          </SectionCard>
        }
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        updateCellsBatchingPeriod={16}
        windowSize={5}
        removeClippedSubviews
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{paddingBottom: theme.spacing.xxl}}
      />
    </ScreenContainer>
  );
};
