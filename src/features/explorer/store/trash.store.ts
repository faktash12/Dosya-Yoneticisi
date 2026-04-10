import AsyncStorage from '@react-native-async-storage/async-storage';
import {create} from 'zustand';
import {createJSONStorage, persist} from 'zustand/middleware';

interface TrashEntry {
  trashPath: string;
  originalPath: string;
  deletedAt: string;
}

interface TrashState {
  entries: TrashEntry[];
  upsertEntry: (entry: TrashEntry) => void;
  removeEntry: (trashPath: string) => void;
  removeExpiredEntries: (currentIsoDate: string) => TrashEntry[];
  findEntry: (trashPath: string) => TrashEntry | undefined;
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export const useTrashStore = create<TrashState>()(
  persist(
    (set, get) => ({
      entries: [],
      upsertEntry: entry =>
        set(state => ({
          entries: [
            entry,
            ...state.entries.filter(currentEntry => currentEntry.trashPath !== entry.trashPath),
          ],
        })),
      removeEntry: trashPath =>
        set(state => ({
          entries: state.entries.filter(entry => entry.trashPath !== trashPath),
        })),
      removeExpiredEntries: currentIsoDate => {
        const now = new Date(currentIsoDate).getTime();
        const expiredEntries = get().entries.filter(
          entry => now - new Date(entry.deletedAt).getTime() >= THIRTY_DAYS_MS,
        );

        if (expiredEntries.length > 0) {
          set(state => ({
            entries: state.entries.filter(
              entry =>
                !expiredEntries.some(expiredEntry => expiredEntry.trashPath === entry.trashPath),
            ),
          }));
        }

        return expiredEntries;
      },
      findEntry: trashPath =>
        get().entries.find(entry => entry.trashPath === trashPath),
    }),
    {
      name: 'trash-items',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: state => ({
        entries: state.entries,
      }),
    },
  ),
);
