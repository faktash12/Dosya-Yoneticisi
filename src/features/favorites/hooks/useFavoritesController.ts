import {Alert} from 'react-native';
import {useCallback, useEffect} from 'react';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';

import {appContainer} from '@/app/di/container';
import type {RootStackParamList} from '@/app/navigation/types';
import type {FileSystemNode} from '@/domain/entities/FileSystemNode';
import {useExplorerStore} from '@/features/explorer/store/explorer.store';
import {getFileOpenMode} from '@/features/explorer/utils/fileOpenSupport';
import {useFavoritesStore} from '@/features/favorites/store/favorites.store';
import {appDiagnostics} from '@/services/logging/AppDiagnostics';
import {localFileSystemBridge} from '@/services/platform/LocalFileSystemBridge';

export const useFavoritesController = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const items = useFavoritesStore(state => state.items);
  const isLoading = useFavoritesStore(state => state.isLoading);
  const setItems = useFavoritesStore(state => state.setItems);
  const setLoading = useFavoritesStore(state => state.setLoading);
  const removeFavorite = useFavoritesStore(state => state.removeFavorite);

  useEffect(() => {
    const loadFavorites = async () => {
      try {
        setLoading(true);
        const favorites = await appContainer.getFavoriteNodesUseCase.execute();
        setItems(favorites);
        void appDiagnostics.recordBreadcrumb('Favorites', 'Favorites loaded', {
          count: favorites.length,
        });
      } catch (error) {
        void appDiagnostics.recordError('Favorites', error);
      } finally {
        setLoading(false);
      }
    };

    void loadFavorites();
  }, [setItems, setLoading]);

  const openFavorite = useCallback(
    (item: FileSystemNode) => {
      void appDiagnostics.recordBreadcrumb('Favorites', 'Favorite pressed', {
        itemId: item.id,
        path: item.path,
        kind: item.kind,
      });

      const explorerState = useExplorerStore.getState();
      explorerState.clearSelection();

      if (item.kind === 'directory') {
        explorerState.openBrowser(item.path);
        navigation.navigate('Explorer');
        return;
      }

      const fileOpenMode = getFileOpenMode(item);
      explorerState.recordRecentNode(item);

      if (
        fileOpenMode === 'text-preview' ||
        fileOpenMode === 'html-preview' ||
        fileOpenMode === 'image-preview'
      ) {
        explorerState.openPreview(item);
        navigation.navigate('Explorer');
        return;
      }

      void localFileSystemBridge
        .openFile(item.path)
        .catch(error => {
          const message =
            error instanceof Error
              ? error.message
              : `${item.name} için önizleme henüz eklenmedi.`;

          Alert.alert('Önizleme hazır değil', message);

          appContainer.logger.info({
            scope: 'Favorites',
            message: 'Favorite file could not be opened',
            data: {itemId: item.id, path: item.path},
          });
        });
    },
    [navigation],
  );

  const removeFavoriteItem = useCallback(
    (item: FileSystemNode) => {
      removeFavorite(item.id);
      void appDiagnostics.recordBreadcrumb('Favorites', 'Favorite removed', {
        itemId: item.id,
        path: item.path,
      });
    },
    [removeFavorite],
  );

  return {
    items,
    isLoading,
    openFavorite,
    removeFavoriteItem,
  };
};
