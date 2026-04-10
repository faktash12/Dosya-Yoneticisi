import React from 'react';
import {ActivityIndicator, FlatList, View} from 'react-native';

import {AppText} from '@/components/common/AppText';
import {SectionCard} from '@/components/common/SectionCard';
import {EmptyState} from '@/components/feedback/EmptyState';
import {ScreenContainer} from '@/components/layout/ScreenContainer';
import {FavoriteSwipeRow} from '@/features/favorites/components/FavoriteSwipeRow';
import {useFavoritesController} from '@/features/favorites/hooks/useFavoritesController';
import {useAppTheme} from '@/hooks/useAppTheme';

export const FavoritesScreen = (): React.JSX.Element => {
  const theme = useAppTheme();
  const {items, isLoading, openFavorite, removeFavoriteItem} =
    useFavoritesController();

  return (
    <ScreenContainer>
      <SectionCard style={{marginBottom: theme.spacing.xl}}>
        <AppText tone="accent" style={{fontSize: theme.typography.caption}} weight="semibold">
          Favoriler
        </AppText>
        <AppText
          style={{fontSize: theme.typography.title, marginTop: theme.spacing.sm}}
          weight="bold">
          Hızlı erişim öğeleri
        </AppText>
        <AppText tone="muted" style={{marginTop: theme.spacing.md, lineHeight: 22}}>
          Sık kullandığınız klasörleri ve belgeleri tek kaydırma hareketiyle
          yönetebilirsiniz.
        </AppText>
      </SectionCard>

      {isLoading ? (
        <View style={{paddingTop: theme.spacing.xxl}}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={item => item.id}
          renderItem={({item}) => (
            <FavoriteSwipeRow
              item={item}
              onOpen={openFavorite}
              onRemove={removeFavoriteItem}
            />
          )}
          ItemSeparatorComponent={() => <View style={{height: theme.spacing.sm}} />}
          ListEmptyComponent={
            <EmptyState
              description="Sağdan sola kaydırarak favoriden kaldırabilir, dokunarak Explorer içinde açabilirsiniz."
              icon="recent"
              supportingText="Favoriler listeniz boş olsa bile ekran yapısı stabil ve açıklayıcı kalır."
              title="Favori öğe bulunmuyor"
            />
          }
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          updateCellsBatchingPeriod={16}
          windowSize={5}
          removeClippedSubviews
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{paddingBottom: theme.spacing.xxl, flexGrow: 1}}
        />
      )}
    </ScreenContainer>
  );
};
