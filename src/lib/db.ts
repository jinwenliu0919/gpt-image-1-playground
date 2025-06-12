import Dexie, { type EntityTable } from 'dexie';
import type { TaskRecord } from './types';

export interface ImageRecord {
    filename: string;
    blob: Blob;
}

export class ImageDB extends Dexie {
    images!: EntityTable<ImageRecord, 'filename'>;
    tasks!: EntityTable<TaskRecord, 'id'>;

    constructor() {
        super('ImageDB');

        this.version(1).stores({
            images: '&filename'
        });

        this.version(2).stores({
            images: '&filename',
            tasks: '&id, status, timestamp'
        });

        this.images = this.table('images');
        this.tasks = this.table('tasks');
    }
}

export const db = new ImageDB();
