import React, {useEffect} from 'react';
import {ActivityIndicator, FlatList, View} from 'react-native';

import {appContainer} from '@/app/di/container';
import {EmptyState} from '@/components/feedback/EmptyState';
import {ScreenContainer} from '@/components/layout/ScreenContainer';
import {SectionCard} from '@/components/common/SectionCard';
import {AppText} from '@/components/common/AppText';
import {FileListItem} from '@/features/explorer/components/FileListItem';
import {useFavoritesStore} from '@/features/favorites/store/favorites.store';
import {useAppTheme} from '@/hooks/useAppTheme';

export const FavoritesScreen = (): React.JSX.Element => {
  const theme = useAppTheme();
  const items = useFavoritesStore(state => state.items);
  const isLoading = useFavoritesStore(state => state.isLoading);
  const setItems = useFavoritesStore(state => state.setItems);
  const setLoading = useFavoritesStore(state => state.setLoading);

  useEffect(() => {
    const loadFavorites = async () => {
      setLoading(true);
      const favorites = await appContainer.getFavoriteNodesUseCase.execute();
      setItems(favorites);
      setLoading(false);
    };

    void loadFavorites();
  }, [setItems, setLoading]);

  return (
    <ScreenContainer>
      <SectionCard style={{marginBottom: theme.spacing.lg}}>
        <AppText style={{fontSize: theme.typography.title}} weight="bold">
          Favoriler
        </AppText>
        <AppText tone="muted" style={{marginTop: theme.spacing.xs}}>
          Hizli erisim gereken klasorler ve belgeler burada toplanir.
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
            <FileListItem
              node={item}
              onLongPress={() => undefined}
              onPress={() => undefined}
              selected={false}
            />
          )}
          ItemSeparatorComponent={() => <View style={{height: theme.spacing.sm}} />}
          ListEmptyComponent={
            <EmptyState
              description="Favori islemleri baglandiginda burada kalici olarak saklanacak."
              title="Favori oge bulunmuyor"
            />
          }
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          updateCellsBatchingPeriod={16}
          windowSize={5}
          removeClippedSubviews
          showsVerticalScrollIndicator={false}
        />
      )}
    </ScreenContainer>
  );
};
