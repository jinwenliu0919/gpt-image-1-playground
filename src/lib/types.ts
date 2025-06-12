import type { GenerationFormData } from '@/components/generation-form';
import type { CostDetails } from '@/lib/cost-utils';

type HistoryImage = {
    filename: string;
};

export type TaskStatus = 'pending' | 'processing' | 'completed' | 'failed';

export type TaskRecord = {
    id: string;
    timestamp: number;
    prompt: string;
    mode: 'generate' | 'edit' | 'completion';
    status: TaskStatus;
    error?: string;
    quality: GenerationFormData['quality'];
    background?: GenerationFormData['background'];
    moderation?: GenerationFormData['moderation'];
    output_format?: GenerationFormData['output_format'];
};

export type HistoryMetadata = {
    timestamp: number;
    images: HistoryImage[];
    storageModeUsed?: 'fs' | 'indexeddb';
    durationMs: number;
    quality: GenerationFormData['quality'];
    background: GenerationFormData['background'];
    moderation: GenerationFormData['moderation'];
    prompt: string;
    mode: 'generate' | 'edit' | 'completion';
    costDetails: CostDetails | null;
    output_format?: GenerationFormData['output_format'];
    taskId?: string; // 关联的任务ID
}; 