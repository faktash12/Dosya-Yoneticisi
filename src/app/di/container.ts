import {AndroidLocalFileSystemDataSource} from '@/data/datasources/AndroidLocalFileSystemDataSource';
import {GoogleDriveCloudProvider} from '@/data/datasources/cloud/GoogleDriveCloudProvider';
import {PhaseTwoPlaceholderCloudProvider} from '@/data/datasources/cloud/PhaseTwoPlaceholderCloudProvider';
import {YandexDiskCloudProvider} from '@/data/datasources/cloud/YandexDiskCloudProvider';
import {AndroidLocalOperationExecutor} from '@/data/executors/AndroidLocalOperationExecutor';
import {MockFileSystemDataSource} from '@/data/datasources/MockFileSystemDataSource';
import {MockOperationExecutor} from '@/data/executors/MockOperationExecutor';
import {OperationExecutorRegistry} from '@/data/executors/OperationExecutorRegistry';
import {HybridFileExplorerRepository} from '@/data/repositories/HybridFileExplorerRepository';
import {CloudProviderRegistry} from '@/data/repositories/cloud/CloudProviderRegistry';
import {InMemoryOperationJobRepository} from '@/data/repositories/InMemoryOperationJobRepository';
import {cloudProviderConfigs} from '@/config/cloudConfig';
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
import {OAuthService} from '@/services/auth/OAuthService';
import {AsyncStorageSecureTokenStore} from '@/services/auth/SecureTokenStore';
import {CloudHttpClient} from '@/services/cloud/CloudHttpClient';
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
    new AndroidLocalOperationExecutor(),
    new MockOperationExecutor(),
  ]);
  private readonly operationRetryPolicy = new OperationRetryPolicy();
  private readonly operationCancellationRegistry =
    new OperationCancellationRegistry();
  private readonly fileRepository = new HybridFileExplorerRepository(
    this.androidLocalFileSystemDataSource,
    this.fileSystemDataSource,
  );
  private readonly secureTokenStore = new AsyncStorageSecureTokenStore();
  private readonly oauthService = new OAuthService(this.secureTokenStore);
  private readonly cloudHttpClient = new CloudHttpClient(this.oauthService);
  private readonly cloudProviders = [
    new GoogleDriveCloudProvider(
      cloudProviderConfigs.google_drive,
      this.oauthService,
      this.cloudHttpClient,
    ),
    new PhaseTwoPlaceholderCloudProvider('onedrive', 'OneDrive'),
    new PhaseTwoPlaceholderCloudProvider('dropbox', 'Dropbox'),
    new YandexDiskCloudProvider(
      cloudProviderConfigs.yandex_disk,
      this.oauthService,
      this.cloudHttpClient,
    ),
  ];
  readonly cloudProviderRegistry = new CloudProviderRegistry(this.cloudProviders);

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
