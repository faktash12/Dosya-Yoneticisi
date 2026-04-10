import {AndroidLocalFileSystemDataSource} from '@/data/datasources/AndroidLocalFileSystemDataSource';
import {MockFileSystemDataSource} from '@/data/datasources/MockFileSystemDataSource';
import {MockOperationExecutor} from '@/data/executors/MockOperationExecutor';
import {OperationExecutorRegistry} from '@/data/executors/OperationExecutorRegistry';
import {GoogleDriveProviderStub} from '@/data/providers/GoogleDriveProviderStub';
import {HybridFileExplorerRepository} from '@/data/repositories/HybridFileExplorerRepository';
import {OneDriveProviderStub} from '@/data/providers/OneDriveProviderStub';
import {YandexDiskProviderStub} from '@/data/providers/YandexDiskProviderStub';
import {InMemoryOperationJobRepository} from '@/data/repositories/InMemoryOperationJobRepository';
import {CommitClipboardPasteUseCase} from '@/domain/usecases/CommitClipboardPasteUseCase';
import {BrowseDirectoryUseCase} from '@/domain/usecases/BrowseDirectoryUseCase';
import {GetAvailableProvidersUseCase} from '@/domain/usecases/GetAvailableProvidersUseCase';
import {GetFavoriteNodesUseCase} from '@/domain/usecases/GetFavoriteNodesUseCase';
import {QueueCopyJobUseCase} from '@/domain/usecases/QueueCopyJobUseCase';
import {QueueCreateFolderJobUseCase} from '@/domain/usecases/QueueCreateFolderJobUseCase';
import {QueueDeleteJobUseCase} from '@/domain/usecases/QueueDeleteJobUseCase';
import {QueueMoveJobUseCase} from '@/domain/usecases/QueueMoveJobUseCase';
import {QueueRenameJobUseCase} from '@/domain/usecases/QueueRenameJobUseCase';
import {appLogger} from '@/services/logging/AppLogger';
import {OperationCancellationRegistry} from '@/services/operations/OperationCancellationRegistry';
import {OperationClipboardService} from '@/services/operations/OperationClipboardService';
import {OperationQueueProcessor} from '@/services/operations/OperationQueueProcessor';
import {OperationRetryPolicy} from '@/services/operations/OperationRetryPolicy';
import {TransferQueueService} from '@/services/queue/TransferQueueService';

class AppContainer {
  private readonly androidLocalFileSystemDataSource =
    new AndroidLocalFileSystemDataSource();
  private readonly fileSystemDataSource = new MockFileSystemDataSource();
  private readonly operationJobRepository = new InMemoryOperationJobRepository();
  private readonly operationExecutorRegistry = new OperationExecutorRegistry([
    new MockOperationExecutor(),
  ]);
  private readonly operationRetryPolicy = new OperationRetryPolicy();
  private readonly operationCancellationRegistry =
    new OperationCancellationRegistry();
  private readonly fileRepository = new HybridFileExplorerRepository(
    this.androidLocalFileSystemDataSource,
    this.fileSystemDataSource,
  );
  private readonly cloudProviders = [
    new GoogleDriveProviderStub(),
    new OneDriveProviderStub(),
    new YandexDiskProviderStub(),
  ];

  readonly browseDirectoryUseCase = new BrowseDirectoryUseCase(
    this.fileRepository,
  );
  readonly operationClipboardService = new OperationClipboardService();
  readonly operationQueueProcessor = new OperationQueueProcessor(
    this.operationJobRepository,
    this.operationExecutorRegistry,
    this.operationRetryPolicy,
    this.operationCancellationRegistry,
    this.operationClipboardService,
  );
  readonly queueCopyJobUseCase = new QueueCopyJobUseCase(
    this.operationQueueProcessor,
  );
  readonly queueMoveJobUseCase = new QueueMoveJobUseCase(
    this.operationQueueProcessor,
  );
  readonly queueRenameJobUseCase = new QueueRenameJobUseCase(
    this.operationQueueProcessor,
  );
  readonly queueDeleteJobUseCase = new QueueDeleteJobUseCase(
    this.operationQueueProcessor,
  );
  readonly queueCreateFolderJobUseCase = new QueueCreateFolderJobUseCase(
    this.operationQueueProcessor,
  );
  readonly commitClipboardPasteUseCase = new CommitClipboardPasteUseCase(
    this.operationClipboardService,
    this.queueCopyJobUseCase,
    this.queueMoveJobUseCase,
  );
  readonly getFavoriteNodesUseCase = new GetFavoriteNodesUseCase(
    this.fileRepository,
  );
  readonly getAvailableProvidersUseCase = new GetAvailableProvidersUseCase(
    this.cloudProviders,
  );
  readonly transferQueueService = new TransferQueueService();
  readonly logger = appLogger;
}

export const appContainer = new AppContainer();
