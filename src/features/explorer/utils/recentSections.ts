import type {FileSystemNode} from '@/domain/entities/FileSystemNode';

export interface RecentFileSection {
  title: string;
  data: FileSystemNode[];
}

const pad = (value: number) => value.toString().padStart(2, '0');

export const formatRecentSectionTitle = (value: string): string => {
  const date = new Date(value);

  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}`;
};

export const groupRecentNodesByDay = (
  nodes: FileSystemNode[],
): RecentFileSection[] => {
  const groups = new Map<string, FileSystemNode[]>();

  nodes.forEach(node => {
    const title = formatRecentSectionTitle(node.modifiedAt);
    const currentGroup = groups.get(title);

    if (currentGroup) {
      currentGroup.push(node);
      return;
    }

    groups.set(title, [node]);
  });

  return Array.from(groups.entries()).map(([title, data]) => ({
    title,
    data,
  }));
};
