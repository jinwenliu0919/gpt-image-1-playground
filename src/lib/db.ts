import Dexie, { type EntityTable } from 'dexie';
import type { TaskRecord } from './types';

export interface ImageRecord {
    filename: string;
    blob: Blob;
}

export interface SourceImageRecord {
    filename: string;
    taskId: string; // 关联的任务ID
    blob: Blob;
}

export interface FavoriteRecord {
    id: string;
    historyItemTimestamp: number;
    addedAt: number;
    note?: string;
}

export class ImageDB extends Dexie {
    images!: EntityTable<ImageRecord, 'filename'>;
    sourceImages!: EntityTable<SourceImageRecord, 'filename'>; // 添加源图片表
    tasks!: EntityTable<TaskRecord, 'id'>;
    favorites!: EntityTable<FavoriteRecord, 'id'>;

    constructor() {
        super('ImageDB');

        this.version(1).stores({
            images: '&filename'
        });

        this.version(2).stores({
            images: '&filename',
            tasks: '&id, status, timestamp'
        });
        
        this.version(3).stores({
            images: '&filename',
            tasks: '&id, status, timestamp',
            favorites: '&id, historyItemTimestamp, addedAt'
        });
        
        // 添加版本4，增加sourceImages表
        this.version(4).stores({
            images: '&filename',
            tasks: '&id, status, timestamp',
            favorites: '&id, historyItemTimestamp, addedAt',
            sourceImages: '&filename, taskId'
        });

        this.images = this.table('images');
        this.sourceImages = this.table('sourceImages');
        this.tasks = this.table('tasks');
        this.favorites = this.table('favorites');
    }
}

export const db = new ImageDB();
