import React from 'react';
import {Dimensions, Pressable, ScrollView, View} from 'react-native';
import {
  FolderOpen,
  HardDrive,
  History,
  Home,
  MonitorSmartphone,
  Star,
  StarOff,
  Trash2,
  X,
} from 'lucide-react-native';

import {AppText} from '@/components/common/AppText';
import type {FileSystemNode} from '@/domain/entities/FileSystemNode';
import {useAppTheme} from '@/hooks/useAppTheme';

type ExplorerDrawerTab = 'locations' | 'favorites' | 'recent';

interface DrawerLocationItem {
  id: 'home' | 'internal-storage' | 'system' | 'trash';
  title: string;
  subtitle: string;
  icon: typeof Home;
}

interface ExplorerSideDrawerProps {
  activeTab: ExplorerDrawerTab;
  favorites: FileSystemNode[];
  recentItems: FileSystemNode[];
  onClose: () => void;
  onSelectTab: (tab: ExplorerDrawerTab) => void;
  onOpenLocation: (locationId: DrawerLocationItem['id']) => void;
  onOpenNode: (node: FileSystemNode) => void;
  onRemoveFavorite: (node: FileSystemNode) => void;
  onClearRecent: () => void;
  onLongPressRecent: (node: FileSystemNode) => void;
}

const drawerLocations: DrawerLocationItem[] = [
  {
    id: 'home',
    title: 'Ana Ekran',
    subtitle: 'Başlangıç panosuna dön',
    icon: Home,
  },
  {
    id: 'internal-storage',
    title: 'Ana Bellek',
    subtitle: 'Gerçek cihaz depolamasını aç',
    icon: HardDrive,
  },
  {
    id: 'system',
    title: 'Sistem',
    subtitle: 'Korunan alan bilgilerini görüntüle',
    icon: MonitorSmartphone,
  },
  {
    id: 'trash',
    title: 'Çöp Kutusu',
    subtitle: 'Silinmiş öğe akışını aç',
    icon: Trash2,
  },
];

const drawerTabs = [
  {id: 'locations' as const, icon: FolderOpen, label: 'Konumlar'},
  {id: 'favorites' as const, icon: Star, label: 'Favoriler'},
  {id: 'recent' as const, icon: History, label: 'Son Açılanlar'},
];

const DrawerNodeRow = ({
  node,
  onPress,
  onRemove,
  onLongPress,
  showPath = true,
}: {
  node: FileSystemNode;
  onPress: (node: FileSystemNode) => void;
  onRemove?: (node: FileSystemNode) => void;
  onLongPress?: (node: FileSystemNode) => void;
  showPath?: boolean;
}): React.JSX.Element => {
  const theme = useAppTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
      }}>
      <Pressable
        delayLongPress={220}
        onLongPress={onLongPress ? () => onLongPress(node) : undefined}
        onPress={() => onPress(node)}
        style={({pressed}) => ({
          flex: 1,
          backgroundColor: pressed
            ? theme.colors.primaryMuted
            : theme.colors.surfaceMuted,
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.md,
        })}>
        <AppText>{node.name}</AppText>
        {showPath ? (
          <AppText
            tone="muted"
            style={{marginTop: theme.spacing.xs, fontSize: theme.typography.caption}}>
            {node.path}
          </AppText>
        ) : null}
      </Pressable>
      {onRemove ? (
        <Pressable
          onPress={() => onRemove(node)}
          style={({pressed}) => ({
            borderRadius: theme.radii.md,
            backgroundColor: pressed
              ? theme.colors.primaryMuted
              : theme.colors.surfaceMuted,
            padding: theme.spacing.sm,
          })}>
          <StarOff color={theme.colors.textMuted} size={18} />
        </Pressable>
      ) : null}
    </View>
  );
};

export const ExplorerSideDrawer = ({
  activeTab,
  favorites,
  recentItems,
  onClose,
  onSelectTab,
  onOpenLocation,
  onOpenNode,
  onRemoveFavorite,
  onClearRecent,
  onLongPressRecent,
}: ExplorerSideDrawerProps): React.JSX.Element => {
  const theme = useAppTheme();
  const drawerWidth = Math.min(344, Math.max(286, Dimensions.get('window').width * 0.72));

  return (
    <View
      style={{
        width: drawerWidth,
        height: '100%',
        backgroundColor: theme.colors.surface,
        borderTopRightRadius: theme.radii.md,
        borderBottomRightRadius: theme.radii.md,
        borderRightWidth: 1,
        borderColor: theme.colors.border,
        paddingHorizontal: theme.spacing.lg,
        paddingTop: theme.spacing.lg,
        paddingBottom: theme.spacing.xxl,
      }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: theme.spacing.lg,
        }}>
        <View>
          <AppText style={{fontSize: theme.typography.heading}} weight="bold">
            Dosya Yöneticisi
          </AppText>
          <AppText
            tone="muted"
            style={{marginTop: theme.spacing.xs, fontSize: theme.typography.caption}}>
            Hızlı gezinme paneli
          </AppText>
        </View>
        <Pressable
          onPress={onClose}
          style={{
            borderRadius: theme.radii.md,
            backgroundColor: theme.colors.surfaceMuted,
            padding: theme.spacing.sm,
          }}>
          <X color={theme.colors.text} size={18} />
        </Pressable>
      </View>

      <View
        style={{
          flexDirection: 'row',
          borderRadius: theme.radii.md,
          backgroundColor: theme.colors.surfaceMuted,
          padding: theme.spacing.xs,
          gap: theme.spacing.xs,
        }}>
        {drawerTabs.map(tab => {
          const Icon = tab.icon;
          const isActive = tab.id === activeTab;

          return (
            <Pressable
              key={tab.id}
              onPress={() => onSelectTab(tab.id)}
              style={{
                flex: 1,
                borderRadius: theme.radii.md,
                backgroundColor: isActive
                  ? theme.colors.surface
                  : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: theme.spacing.sm,
              }}>
              <Icon
                color={isActive ? theme.colors.primary : theme.colors.textMuted}
                size={18}
              />
            </Pressable>
          );
        })}
      </View>

      <ScrollView
        contentContainerStyle={{paddingTop: theme.spacing.lg, gap: theme.spacing.sm, flexGrow: 1}}
        showsVerticalScrollIndicator={false}>
        {activeTab === 'locations'
          ? drawerLocations.map(item => {
              const Icon = item.icon;

              return (
                <Pressable
                  key={item.id}
                  onPress={() => onOpenLocation(item.id)}
                  style={({pressed}) => ({
                    borderRadius: theme.radii.md,
                    backgroundColor: pressed
                      ? theme.colors.primaryMuted
                      : theme.colors.surfaceMuted,
                    paddingHorizontal: theme.spacing.md,
                    paddingVertical: theme.spacing.md,
                  })}>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: theme.spacing.sm,
                    }}>
                    <Icon color={theme.colors.primary} size={18} />
                    <View style={{flex: 1}}>
                      <AppText>{item.title}</AppText>
                      <AppText
                        tone="muted"
                        style={{
                          marginTop: theme.spacing.xs,
                          fontSize: theme.typography.caption,
                        }}>
                        {item.subtitle}
                      </AppText>
                    </View>
                  </View>
                </Pressable>
              );
            })
          : null}

        {activeTab === 'favorites'
          ? favorites.length > 0
            ? favorites.map(item => (
                <DrawerNodeRow
                  key={item.id}
                  node={item}
                  onPress={onOpenNode}
                  onRemove={onRemoveFavorite}
                  showPath={false}
                />
              ))
            : (
                <View
                  style={{
                    borderRadius: theme.radii.md,
                    backgroundColor: theme.colors.surfaceMuted,
                    padding: theme.spacing.md,
                  }}>
                  <AppText>Henüz favori yok</AppText>
                  <AppText
                    tone="muted"
                    style={{
                      marginTop: theme.spacing.xs,
                      fontSize: theme.typography.caption,
                    }}>
                    Favorilere eklenen dosya ve klasörler burada görünecek.
                  </AppText>
                </View>
              )
          : null}

        {activeTab === 'recent'
          ? recentItems.length > 0
            ? recentItems.map(item => (
                <DrawerNodeRow
                  key={item.id}
                  node={item}
                  onLongPress={onLongPressRecent}
                  onPress={onOpenNode}
                  showPath={false}
                />
              ))
            : (
                <View
                  style={{
                    borderRadius: theme.radii.md,
                    backgroundColor: theme.colors.surfaceMuted,
                    padding: theme.spacing.md,
                  }}>
                  <AppText style={{fontSize: theme.typography.caption}}>
                    Henüz son açılan dosya yok
                  </AppText>
                  <AppText
                    tone="muted"
                    style={{
                      marginTop: theme.spacing.xs,
                      fontSize: theme.typography.caption,
                    }}>
                    Açtığınız dosyalar burada kısayol olarak listelenecek.
                  </AppText>
                </View>
              )
          : null}

        {activeTab === 'recent' && recentItems.length > 0 ? (
          <Pressable
            onPress={onClearRecent}
            style={({pressed}) => ({
              marginTop: theme.spacing.sm,
              backgroundColor: pressed
                ? theme.colors.primaryMuted
                : theme.colors.surfaceMuted,
              paddingHorizontal: theme.spacing.md,
              paddingVertical: theme.spacing.md,
            })}>
            <AppText
              style={{fontSize: theme.typography.caption}}
              tone="muted">
              Son listeyi temizle
            </AppText>
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );
};
