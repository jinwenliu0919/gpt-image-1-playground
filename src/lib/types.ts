import type { GenerationFormData } from '@/components/generation-form';
import type { CostDetails } from '@/lib/cost-utils';

type HistoryImage = {
    filename: string;
    url?: string; // 添加可选的url属性，用于S3存储模式
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
    sourceImageUrls?: string[]; // 临时URL，页面刷新后会失效
    sourceImages?: { filename: string; s3Url?: string; }[]; // 存储原始上传图片的信息
    sourceStorageMode?: 'fs' | 'indexeddb' | 's3'; // 源图片存储模式
    n?: number; // 添加图片数量字段
    size?: string; // 添加尺寸字段
};

export type HistoryMetadata = {
    timestamp: number;
    images: HistoryImage[];
    storageModeUsed?: 'fs' | 'indexeddb' | 's3';
    durationMs: number;
    quality: GenerationFormData['quality'];
    background: GenerationFormData['background'];
    moderation: GenerationFormData['moderation'];
    prompt: string;
    mode: 'generate' | 'edit' | 'completion';
    costDetails: CostDetails | null;
    output_format?: GenerationFormData['output_format'];
    taskId?: string; // 关联的任务ID
    n?: number; // 添加图片数量字段
    size?: string; // 添加尺寸字段
    sourceStorageMode?: 'fs' | 'indexeddb' | 's3'; // 源图片存储模式
}; 