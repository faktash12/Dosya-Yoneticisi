import type {TransferTask} from '@/domain/entities/TransferTask';
import {appLogger} from '@/services/logging/AppLogger';

const mockTasks: TransferTask[] = [
  {
    id: 'transfer-1',
    type: 'copy',
    status: 'running',
    source: {
      nodeId: 'download-apk',
      name: 'MyTool-release.apk',
      path: '/storage/emulated/0/Download/MyTool-release.apk',
      providerId: 'local',
      sizeBytes: 56_400_000,
    },
    destination: {
      nodeId: 'documents',
      name: 'Documents',
      path: '/storage/emulated/0/Documents',
      providerId: 'local',
    },
    priority: 1,
    createdAt: '2026-04-09T08:00:00.000Z',
    updatedAt: '2026-04-09T08:06:00.000Z',
    conflictPolicy: 'rename',
    progress: {
      totalBytes: 56_400_000,
      transferredBytes: 31_000_000,
      percentage: 55,
      startedAt: '2026-04-09T08:01:00.000Z',
      updatedAt: '2026-04-09T08:06:00.000Z',
    },
  },
  {
    id: 'transfer-2',
    type: 'upload',
    status: 'queued',
    source: {
      nodeId: 'proposal-docx',
      name: 'client-proposal.docx',
      path: '/storage/emulated/0/Documents/client-proposal.docx',
      providerId: 'local',
      sizeBytes: 1_400_000,
    },
    destination: {
      nodeId: 'google-drive-root',
      name: 'Google Drive',
      path: '/',
      providerId: 'google-drive',
    },
    priority: 2,
    createdAt: '2026-04-09T08:10:00.000Z',
    updatedAt: '2026-04-09T08:10:00.000Z',
    conflictPolicy: 'skip',
    progress: {
      totalBytes: 1_400_000,
      transferredBytes: 0,
      percentage: 0,
    },
  },
];

export class TransferQueueService {
  getSnapshot(): TransferTask[] {
    return mockTasks;
  }

  enqueue(task: TransferTask): TransferTask[] {
    appLogger.info({
      scope: 'TransferQueueService',
      message: 'Task queued',
      data: {taskId: task.id, type: task.type},
    });

    return [...mockTasks, task];
  }
}

