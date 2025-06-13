'use client';

import * as React from 'react';
import { db, type ImageRecord, type FavoriteRecord } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import type { HistoryMetadata, TaskRecord, TaskStatus } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

// Determine storage mode once
const explicitModeClient = process.env.NEXT_PUBLIC_IMAGE_STORAGE_MODE;
const vercelEnvClient = process.env.NEXT_PUBLIC_VERCEL_ENV;
const isOnVercelClient = vercelEnvClient === 'production' || vercelEnvClient === 'preview';

let effectiveStorageModeClient: 'fs' | 'indexeddb' | 's3';
if (explicitModeClient === 'fs') {
    effectiveStorageModeClient = 'fs';
} else if (explicitModeClient === 'indexeddb') {
    effectiveStorageModeClient = 'indexeddb';
} else if (explicitModeClient === 's3') {
    effectiveStorageModeClient = 's3';
} else if (isOnVercelClient) {
    effectiveStorageModeClient = 'indexeddb';
} else {
    effectiveStorageModeClient = 'fs';
}
console.log(
    `HistoryContext Effective Storage Mode: ${effectiveStorageModeClient} (Explicit: ${explicitModeClient || 'unset'}, Vercel Env: ${vercelEnvClient || 'N/A'})`
);

// 获取S3公共域名
const s3PublicDomain = process.env.NEXT_PUBLIC_OSS_DOMAIN;

type HistoryContextType = {
    history: HistoryMetadata[];
    tasks: TaskRecord[];
    favorites: FavoriteRecord[];
    favoriteItems: HistoryMetadata[];
    addHistoryEntry: (entry: HistoryMetadata) => void;
    clearHistory: () => void;
    getImageSrc: (filename: string, storageMode?: 'indexeddb' | 's3') => string | undefined;
    handleHistorySelect: (item: HistoryMetadata) => void;
    handleDeleteHistoryItem: (item: HistoryMetadata) => void;
    itemToDeleteConfirm: HistoryMetadata | null;
    confirmDeletion: () => void;
    cancelDeletion: () => void;
    skipDeleteConfirmation: boolean;
    dialogCheckboxStateSkipConfirm: boolean;
    setDialogCheckboxStateSkipConfirm: (value: boolean) => void;
    isPasswordRequiredByBackend: boolean | null;
    clientPasswordHash: string | null;
    latestImageBatch: { path: string; filename: string }[] | null;
    setLatestImageBatch: React.Dispatch<React.SetStateAction<{ path: string; filename: string }[] | null>>;
    error: string | null;
    setError: React.Dispatch<React.SetStateAction<string | null>>;
    createTask: (params: Omit<TaskRecord, 'id' | 'timestamp' | 'status'>) => string;
    updateTaskStatus: (id: string, status: TaskStatus, error?: string) => void;
    completeTaskWithImages: (taskId: string, historyEntry: HistoryMetadata) => void;
    handleDeleteTask: (task: TaskRecord) => void;
    itemToDeleteTaskConfirm: TaskRecord | null;
    confirmTaskDeletion: () => void;
    cancelTaskDeletion: () => void;
    addToFavorites: (item: HistoryMetadata, note?: string) => Promise<void>;
    removeFromFavorites: (favoriteId: string) => Promise<void>;
    isFavorite: (timestamp: number) => boolean;
    getFavoriteId: (timestamp: number) => string | undefined;
    updateFavoriteNote: (favoriteId: string, note: string) => Promise<void>;
    applyFavoriteParams: (item: HistoryMetadata) => void;
};

const HistoryContext = React.createContext<HistoryContextType | undefined>(undefined);

export function HistoryProvider({ children }: { children: React.ReactNode }) {
    const [history, setHistory] = React.useState<HistoryMetadata[]>([]);
    const [isInitialLoad, setIsInitialLoad] = React.useState(true);
    const [blobUrlCache, setBlobUrlCache] = React.useState<Record<string, string>>({});
    const [skipDeleteConfirmation, setSkipDeleteConfirmation] = React.useState<boolean>(false);
    const [itemToDeleteConfirm, setItemToDeleteConfirm] = React.useState<HistoryMetadata | null>(null);
    const [itemToDeleteTaskConfirm, setItemToDeleteTaskConfirm] = React.useState<TaskRecord | null>(null);
    const [dialogCheckboxStateSkipConfirm, setDialogCheckboxStateSkipConfirm] = React.useState<boolean>(false);
    const [isPasswordRequiredByBackend, setIsPasswordRequiredByBackend] = React.useState<boolean | null>(null);
    const [clientPasswordHash, setClientPasswordHash] = React.useState<string | null>(null);
    const [latestImageBatch, setLatestImageBatch] = React.useState<{ path: string; filename: string }[] | null>(null);
    const [error, setError] = React.useState<string | null>(null);

    const allDbImages = useLiveQuery<ImageRecord[] | undefined>(() => db.images.toArray(), []);
    const tasks = useLiveQuery<TaskRecord[] | undefined>(() => db.tasks.orderBy('timestamp').reverse().toArray(), []) || [];
    const favorites = useLiveQuery<FavoriteRecord[] | undefined>(() => db.favorites.orderBy('addedAt').reverse().toArray(), []) || [];

    // 收藏项目列表
    const favoriteItems = React.useMemo(() => {
        return history.filter(item => 
            favorites.some(fav => fav.historyItemTimestamp === item.timestamp)
        );
    }, [history, favorites]);

    const getImageSrc = React.useCallback(
        (filename: string, storageMode?: 'indexeddb' | 's3'): string | undefined => {
            console.log(`[getImageSrc] 开始获取图片URL: ${filename}, 存储模式: ${storageMode || '未配置'}, S3域名: ${s3PublicDomain || '未配置'}`);
            
            // S3存储模式下直接返回S3 URL
            if (storageMode === 's3' && s3PublicDomain) {
                const s3Url = `${s3PublicDomain}/${filename}`;
                console.log(`[getImageSrc] 返回S3 URL: ${s3Url}`);
                return s3Url;
            }
            
            // IndexedDB模式
            if (blobUrlCache[filename]) {
                console.log(`[getImageSrc] 返回缓存的Blob URL: ${blobUrlCache[filename]}`);
                return blobUrlCache[filename];
            }

            const record = allDbImages?.find((img) => img.filename === filename);
            if (record?.blob) {
                const url = URL.createObjectURL(record.blob);
                // NOTE: This technically breaks the rules of hooks/renders, but it's for a cache.
                // It's a pragmatic solution to avoid re-renders.
                setBlobUrlCache((prev) => ({...prev, [filename]: url}));
                console.log(`[getImageSrc] 创建并返回新的Blob URL: ${url}`);
                return url;
            }

            console.log(`[getImageSrc] 未找到图片: ${filename}`);
            return undefined;
        },
        [allDbImages, blobUrlCache, effectiveStorageModeClient, s3PublicDomain]
    );

    React.useEffect(() => {
        return () => {
            console.log('Revoking blob URLs from context:', Object.keys(blobUrlCache).length);
            Object.values(blobUrlCache).forEach((url) => {
                if (url.startsWith('blob:')) {
                    URL.revokeObjectURL(url);
                }
            });
        };
    }, [blobUrlCache]);

    React.useEffect(() => {
        try {
            const storedHistory = localStorage.getItem('openaiImageHistory');
            if (storedHistory) {
                const parsedHistory: HistoryMetadata[] = JSON.parse(storedHistory);
                if (Array.isArray(parsedHistory)) {
                    setHistory(parsedHistory);
                } else {
                    localStorage.removeItem('openaiImageHistory');
                }
            }
        } catch (e) {
            console.error('Failed to load or parse history from localStorage:', e);
            localStorage.removeItem('openaiImageHistory');
        }
        setIsInitialLoad(false);
    }, []);

    React.useEffect(() => {
        if (!isInitialLoad) {
            try {
                localStorage.setItem('openaiImageHistory', JSON.stringify(history));
            } catch (e) {
                console.error('Failed to save history to localStorage:', e);
            }
        }
    }, [history, isInitialLoad]);

    React.useEffect(() => {
        const fetchAuthStatus = async () => {
            try {
                const response = await fetch('/api/auth-status');
                if (!response.ok) throw new Error('Failed to fetch auth status');
                const data = await response.json();
                setIsPasswordRequiredByBackend(data.passwordRequired);
            } catch (error) {
                console.error('Error fetching auth status:', error);
                setIsPasswordRequiredByBackend(false);
            }
        };

        fetchAuthStatus();
        const storedHash = localStorage.getItem('clientPasswordHash');
        if (storedHash) {
            setClientPasswordHash(storedHash);
        }
    }, []);
    
    React.useEffect(() => {
        const storedPref = localStorage.getItem('imageGenSkipDeleteConfirm');
        if (storedPref === 'true') {
            setSkipDeleteConfirmation(true);
        } else if (storedPref === 'false') {
            setSkipDeleteConfirmation(false);
        }
    }, []);

    React.useEffect(() => {
        localStorage.setItem('imageGenSkipDeleteConfirm', String(skipDeleteConfirmation));
    }, [skipDeleteConfirmation]);

    const addHistoryEntry = (entry: HistoryMetadata) => {
        setHistory((prevHistory) => [entry, ...prevHistory]);
    };
    
    const handleHistorySelect = (item: HistoryMetadata) => {
        console.log(
            `Selecting history item from ${new Date(item.timestamp).toISOString()}, stored via: ${item.storageModeUsed}`
        );
        const originalStorageMode = item.storageModeUsed || 'fs' as 'fs' | 'indexeddb' | 's3';

        const selectedBatchPromises = item.images.map(async (imgInfo) => {
            let path: string | undefined;
            if (originalStorageMode === 'indexeddb') {
                path = getImageSrc(imgInfo.filename);
            } else if (originalStorageMode === 's3') {
                // S3存储时直接使用公共URL或通过API获取
                if (s3PublicDomain) {
                    path = `${s3PublicDomain}/${imgInfo.filename}`;
                } else {
                    path = `/api/s3-image/${imgInfo.filename}`;
                }
            } else {
                path = `/api/image/${imgInfo.filename}`;
            }

            if (path) {
                return { path, filename: imgInfo.filename };
            } else {
                console.warn(
                    `Could not get image source for history item: ${imgInfo.filename} (mode: ${originalStorageMode})`
                );
                setError(`Image ${imgInfo.filename} could not be loaded.`);
                return null;
            }
        });

        Promise.all(selectedBatchPromises).then((resolvedBatch) => {
            const validImages = resolvedBatch.filter(Boolean) as { path: string; filename: string }[];

            if (validImages.length !== item.images.length && !error) {
                setError(
                    'Some images from this history entry could not be loaded (they might have been cleared or are missing).'
                );
            } else if (validImages.length === item.images.length) {
                setError(null);
            }
            
            setLatestImageBatch(validImages.length > 0 ? validImages : null);
        });
    };

    const executeDeleteItem = async (item: HistoryMetadata) => {
        if (!item) return;
        setError(null); 

        const { images: imagesInEntry, storageModeUsed, timestamp } = item;
        const filenamesToDelete = imagesInEntry.map((img) => img.filename);

        try {
            if (storageModeUsed === 'indexeddb') {
                await db.images.where('filename').anyOf(filenamesToDelete).delete();
                setBlobUrlCache((prevCache) => {
                    const newCache = { ...prevCache };
                    filenamesToDelete.forEach((fn) => delete newCache[fn]);
                    return newCache;
                });
            } else if (storageModeUsed === 'fs') {
                const apiPayload: { filenames: string[]; passwordHash?: string } = { filenames: filenamesToDelete };
                if (isPasswordRequiredByBackend && clientPasswordHash) {
                    apiPayload.passwordHash = clientPasswordHash;
                }

                const response = await fetch('/api/image-delete', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(apiPayload)
                });

                const result = await response.json();
                if (!response.ok) {
                    throw new Error(result.error || `API deletion failed with status ${response.status}`);
                }
            }

            setHistory((prevHistory) => prevHistory.filter((h) => h.timestamp !== timestamp));
            if (latestImageBatch && latestImageBatch.some((img) => filenamesToDelete.includes(img.filename))) {
                setLatestImageBatch(null); 
            }
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'An unexpected error occurred during deletion.');
        } finally {
            setItemToDeleteConfirm(null);
        }
    };
    
    const handleDeleteHistoryItem = (item: HistoryMetadata) => {
        if (skipDeleteConfirmation) {
            executeDeleteItem(item);
        } else {
            setItemToDeleteConfirm(item);
        }
    };
    
    const handleConfirmDeletion = () => {
        if (itemToDeleteConfirm) {
            executeDeleteItem(itemToDeleteConfirm);
            setSkipDeleteConfirmation(dialogCheckboxStateSkipConfirm);
        }
    };

    const handleCancelDeletion = () => {
        setItemToDeleteConfirm(null);
    };

    const handleClearHistory = async () => {
        const confirmationMessage =
            effectiveStorageModeClient === 'indexeddb'
                ? 'Are you sure you want to clear the entire image history? In IndexedDB mode, this will also permanently delete all stored images. This cannot be undone.'
                : 'Are you sure you want to clear the entire image history? This cannot be undone.';

        if (window.confirm(confirmationMessage)) {
            setHistory([]);
            setLatestImageBatch(null);
            setError(null);

            try {
                localStorage.removeItem('openaiImageHistory');
                if (effectiveStorageModeClient === 'indexeddb') {
                    await db.images.clear();
                    setBlobUrlCache({});
                }
            } catch (e) {
                setError(`Failed to clear history: ${e instanceof Error ? e.message : String(e)}`);
            }
        }
    };

    const createTask = (params: Omit<TaskRecord, 'id' | 'timestamp' | 'status'>) => {
        const taskId = uuidv4();
        const newTask: TaskRecord = {
            id: taskId,
            timestamp: Date.now(),
            status: 'pending',
            ...params
        };
        
        db.tasks.put(newTask).catch(err => {
            console.error('Failed to create task:', err);
            setError('创建任务失败');
        });
        
        return taskId;
    };
    
    const updateTaskStatus = async (id: string, status: TaskStatus, error?: string) => {
        try {
            const task = await db.tasks.get(id);
            if (task) {
                await db.tasks.update(id, { status, ...(error ? { error } : {}) });
            }
        } catch (err) {
            console.error('Failed to update task status:', err);
            setError('更新任务状态失败');
        }
    };
    
    const completeTaskWithImages = async (taskId: string, historyEntry: HistoryMetadata) => {
        try {
            // 更新任务状态
            await updateTaskStatus(taskId, 'completed');
            
            // 添加关联的历史记录
            const entryWithTaskId = {
                ...historyEntry,
                taskId
            };
            
            addHistoryEntry(entryWithTaskId);
        } catch (err) {
            console.error('Failed to complete task with images:', err);
            setError('完成任务失败');
        }
    };

    // 删除任务的函数
    const executeDeleteTask = async (task: TaskRecord) => {
        if (!task) return;
        setError(null);

        try {
            // 从数据库中删除任务
            await db.tasks.delete(task.id);
            console.log(`Task ${task.id} deleted successfully`);
        } catch (e) {
            console.error('Failed to delete task:', e);
            setError(e instanceof Error ? e.message : 'An unexpected error occurred during task deletion.');
        } finally {
            setItemToDeleteTaskConfirm(null);
        }
    };

    const handleDeleteTask = (task: TaskRecord) => {
        if (skipDeleteConfirmation) {
            executeDeleteTask(task);
        } else {
            setItemToDeleteTaskConfirm(task);
        }
    };

    const handleConfirmTaskDeletion = () => {
        if (itemToDeleteTaskConfirm) {
            executeDeleteTask(itemToDeleteTaskConfirm);
            setSkipDeleteConfirmation(dialogCheckboxStateSkipConfirm);
        }
    };

    const handleCancelTaskDeletion = () => {
        setItemToDeleteTaskConfirm(null);
    };

    // 添加到收藏
    const addToFavorites = async (item: HistoryMetadata, note?: string) => {
        try {
            const favoriteId = uuidv4();
            const newFavorite: FavoriteRecord = {
                id: favoriteId,
                historyItemTimestamp: item.timestamp,
                addedAt: Date.now(),
                note
            };
            
            await db.favorites.add(newFavorite);
            console.log(`Added item to favorites: ${favoriteId}`);
            return;
        } catch (e) {
            console.error('Failed to add to favorites:', e);
            setError(e instanceof Error ? e.message : '添加收藏失败');
            throw e;
        }
    };
    
    // 从收藏中移除
    const removeFromFavorites = async (favoriteId: string) => {
        try {
            await db.favorites.delete(favoriteId);
            console.log(`Removed item from favorites: ${favoriteId}`);
            return;
        } catch (e) {
            console.error('Failed to remove from favorites:', e);
            setError(e instanceof Error ? e.message : '移除收藏失败');
            throw e;
        }
    };
    
    // 检查是否已收藏
    const isFavorite = (timestamp: number) => {
        return favorites.some(fav => fav.historyItemTimestamp === timestamp);
    };
    
    // 获取收藏ID
    const getFavoriteId = (timestamp: number) => {
        const favorite = favorites.find(fav => fav.historyItemTimestamp === timestamp);
        return favorite?.id;
    };
    
    // 更新收藏备注
    const updateFavoriteNote = async (favoriteId: string, note: string) => {
        try {
            await db.favorites.update(favoriteId, { note });
            console.log(`Updated favorite note: ${favoriteId}`);
            return;
        } catch (e) {
            console.error('Failed to update favorite note:', e);
            setError(e instanceof Error ? e.message : '更新收藏备注失败');
            throw e;
        }
    };
    
    // 应用收藏项目的参数
    const applyFavoriteParams = (item: HistoryMetadata) => {
        // 这个函数将在收藏页面中调用，用于将收藏项目的参数应用到表单中
        console.log('Applying favorite params:', item);
        // 具体实现将在页面组件中处理
    };

    const value = {
        history,
        tasks,
        favorites,
        favoriteItems,
        addHistoryEntry,
        clearHistory: handleClearHistory,
        getImageSrc,
        handleHistorySelect,
        handleDeleteHistoryItem,
        itemToDeleteConfirm,
        confirmDeletion: handleConfirmDeletion,
        cancelDeletion: handleCancelDeletion,
        skipDeleteConfirmation,
        dialogCheckboxStateSkipConfirm,
        setDialogCheckboxStateSkipConfirm,
        isPasswordRequiredByBackend,
        clientPasswordHash,
        latestImageBatch,
        setLatestImageBatch,
        error,
        setError,
        createTask,
        updateTaskStatus,
        completeTaskWithImages,
        handleDeleteTask,
        itemToDeleteTaskConfirm,
        confirmTaskDeletion: handleConfirmTaskDeletion,
        cancelTaskDeletion: handleCancelTaskDeletion,
        addToFavorites,
        removeFromFavorites,
        isFavorite,
        getFavoriteId,
        updateFavoriteNote,
        applyFavoriteParams
    };

    return <HistoryContext.Provider value={value}>{children}</HistoryContext.Provider>;
}

export function useHistory() {
    const context = React.useContext(HistoryContext);
    if (context === undefined) {
        throw new Error('useHistory must be used within a HistoryProvider');
    }
    return context;
} 