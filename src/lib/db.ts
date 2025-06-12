import Dexie, { type EntityTable } from 'dexie';
import type { TaskRecord } from './types';

export interface ImageRecord {
    filename: string;
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

        this.images = this.table('images');
        this.tasks = this.table('tasks');
        this.favorites = this.table('favorites');
    }
}

export const db = new ImageDB();
