import type {OperationTargetRef} from '@/domain/entities/OperationJob';
import type {QueueCopyJobUseCase} from '@/domain/usecases/QueueCopyJobUseCase';
import type {QueueMoveJobUseCase} from '@/domain/usecases/QueueMoveJobUseCase';
import type {OperationClipboardService} from '@/services/operations/OperationClipboardService';

export interface CommitClipboardPasteRequest {
  destination: OperationTargetRef;
}

export class CommitClipboardPasteUseCase {
  constructor(
    private readonly clipboardService: OperationClipboardService,
    private readonly queueCopyJobUseCase: QueueCopyJobUseCase,
    private readonly queueMoveJobUseCase: QueueMoveJobUseCase,
  ) {}

  async execute(request: CommitClipboardPasteRequest): Promise<string | null> {
    const clipboard = this.clipboardService.getSnapshot();

    if (!clipboard || clipboard.items.length === 0) {
      return null;
    }

    if (clipboard.mode === 'copy') {
      return this.queueCopyJobUseCase.execute({
        sourceItems: clipboard.items,
        destination: request.destination,
        metadata: {
          clipboardBufferId: clipboard.id,
          origin: 'clipboard-paste',
        },
      });
    }

    return this.queueMoveJobUseCase.execute({
      sourceItems: clipboard.items,
      destination: request.destination,
      metadata: {
        clipboardBufferId: clipboard.id,
        origin: 'clipboard-paste',
      },
    });
  }
}
