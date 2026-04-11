import type {
  CloudFolderPage,
  CloudItem,
  CloudProviderAccount,
} from '@/domain/entities/CloudProvider';
import type {
  CloudListFolderRequest,
  CloudUploadRequest,
} from '@/domain/repositories/CloudStorageRepository';
import {BaseCloudProvider} from '@/data/datasources/cloud/BaseCloudProvider';
import type {CloudProviderConfig} from '@/config/cloudConfig';
import type {OAuthService} from '@/services/auth/OAuthService';
import type {CloudHttpClient} from '@/services/cloud/CloudHttpClient';
import {buildCloudPath} from '@/services/cloud/cloudPath';
import {localFileSystemBridge} from '@/services/platform/LocalFileSystemBridge';

interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  parents?: string[];
  thumbnailLink?: string;
  shared?: boolean;
}

interface GoogleDriveListResponse {
  files: GoogleDriveFile[];
  nextPageToken?: string;
}

interface GoogleDriveAboutResponse {
  user?: {
    displayName?: string;
    emailAddress?: string;
    permissionId?: string;
  };
  storageQuota?: {
    usage?: string;
    limit?: string;
  };
}

const folderMimeType = 'application/vnd.google-apps.folder';

export class GoogleDriveCloudProvider extends BaseCloudProvider {
  constructor(
    config: CloudProviderConfig,
    oauthService: OAuthService,
    httpClient: CloudHttpClient,
  ) {
    super('google_drive', 'Google Drive', config, oauthService, httpClient);
  }

  async getAccountInfo(): Promise<CloudProviderAccount> {
    const about = await this.request<GoogleDriveAboutResponse>({
      url: 'https://www.googleapis.com/drive/v3/about',
      params: {
        fields:
          'user(displayName,emailAddress,permissionId),storageQuota(usage,limit)',
      },
    });

    return {
      accountId: about.user?.permissionId ?? about.user?.emailAddress ?? 'google_drive',
      displayName: about.user?.displayName ?? 'Google Drive hesabı',
      ...(about.user?.emailAddress ? {email: about.user.emailAddress} : {}),
      ...(about.storageQuota?.usage
        ? {usedBytes: Number(about.storageQuota.usage)}
        : {}),
      ...(about.storageQuota?.limit
        ? {totalBytes: Number(about.storageQuota.limit)}
        : {}),
    };
  }

  async listFolder(request: CloudListFolderRequest): Promise<CloudFolderPage> {
    const folderId = request.folderId || 'root';
    const response = await this.request<GoogleDriveListResponse>({
      url: 'https://www.googleapis.com/drive/v3/files',
      params: {
        q: `'${folderId}' in parents and trashed = false`,
        pageToken: request.cursor,
        pageSize: 100,
        fields:
          'nextPageToken,files(id,name,mimeType,size,modifiedTime,parents,thumbnailLink,shared)',
        orderBy: 'folder,name',
      },
    });

    return {
      items: response.files.map(file => this.mapFile(file, folderId)),
      ...(response.nextPageToken ? {nextCursor: response.nextPageToken} : {}),
    };
  }

  async uploadFile(request: CloudUploadRequest): Promise<CloudItem> {
    const fileName = request.fileName ?? request.localPath.split('/').pop() ?? 'dosya';
    const parentId = request.parentId || 'root';
    const metadata = {
      name: fileName,
      parents: [parentId],
    };
    const boundary = `dosyaYoneticisi${Date.now()}`;
    const localMimeType = 'application/octet-stream';
    const bodyHeader =
      `--${boundary}\r\n` +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      `${JSON.stringify(metadata)}\r\n` +
      `--${boundary}\r\n` +
      `Content-Type: ${localMimeType}\r\n\r\n`;
    const bodyFooter = `\r\n--${boundary}--`;
    const uploaded = await localFileSystemBridge.uploadFileToUrl(
      'POST',
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,modifiedTime,parents,thumbnailLink,shared',
      {
        Authorization: `Bearer ${(await this.requireSession()).accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      request.localPath,
      bodyHeader,
      bodyFooter,
    );
    const file = JSON.parse(uploaded.body) as GoogleDriveFile;
    return this.mapFile(file, parentId);
  }

  protected async resolveDownloadUrl(
    fileId: string,
  ): Promise<{url: string; headers?: Record<string, string>}> {
    const session = await this.requireSession();
    return {
      url: `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
        fileId,
      )}?alt=media`,
      headers: {Authorization: `Bearer ${session.accessToken}`},
    };
  }

  private mapFile(file: GoogleDriveFile, parentId?: string): CloudItem {
    const isDirectory = file.mimeType === folderMimeType;

    const resolvedParentId = file.parents?.[0] ?? parentId;

    return {
      id: file.id,
      providerId: this.providerId,
      name: file.name,
      path: buildCloudPath(this.providerId, file.id),
      kind: isDirectory ? 'directory' : 'file',
      mimeType: file.mimeType,
      modifiedAt: this.normalizeModifiedAt(file.modifiedTime),
      ...(resolvedParentId ? {parentId: resolvedParentId} : {}),
      ...(file.size ? {sizeBytes: Number(file.size)} : {}),
      ...(file.thumbnailLink ? {thumbnailUrl: file.thumbnailLink} : {}),
      ...(typeof file.shared === 'boolean' ? {isShared: file.shared} : {}),
    };
  }
}
