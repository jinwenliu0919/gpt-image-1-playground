'use client';

import * as React from 'react';
import { db, type ImageRecord } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import type { HistoryMetadata } from '@/lib/types';

// Determine storage mode once
const explicitModeClient = process.env.NEXT_PUBLIC_IMAGE_STORAGE_MODE;
const vercelEnvClient = process.env.NEXT_PUBLIC_VERCEL_ENV;
const isOnVercelClient = vercelEnvClient === 'production' || vercelEnvClient === 'preview';

let effectiveStorageModeClient: 'fs' | 'indexeddb';
if (explicitModeClient === 'fs') {
    effectiveStorageModeClient = 'fs';
} else if (explicitModeClient === 'indexeddb') {
    effectiveStorageModeClient = 'indexeddb';
} else if (isOnVercelClient) {
    effectiveStorageModeClient = 'indexeddb';
} else {
    effectiveStorageModeClient = 'fs';
}
console.log(
    `HistoryContext Effective Storage Mode: ${effectiveStorageModeClient} (Explicit: ${explicitModeClient || 'unset'}, Vercel Env: ${vercelEnvClient || 'N/A'})`
);

type HistoryContextType = {
    history: HistoryMetadata[];
    addHistoryEntry: (entry: HistoryMetadata) => void;
    getImageSrc: (filename: string) => string | undefined;
    handleClearHistory: () => Promise<void>;
    handleRequestDeleteItem: (item: HistoryMetadata) => void;
    itemToDeleteConfirm: HistoryMetadata | null;
    handleConfirmDeletion: () => void;
    handleCancelDeletion: () => void;
    dialogCheckboxStateSkipConfirm: boolean;
    setDialogCheckboxStateSkipConfirm: (value: boolean) => void;
    isPasswordRequiredByBackend: boolean | null;
    clientPasswordHash: string | null;
    latestImageBatch: { path: string; filename: string }[] | null;
    setLatestImageBatch: React.Dispatch<React.SetStateAction<{ path: string; filename: string }[] | null>>;
    handleHistorySelect: (item: HistoryMetadata) => void;
    error: string | null;
    setError: React.Dispatch<React.SetStateAction<string | null>>;
};

const HistoryContext = React.createContext<HistoryContextType | undefined>(undefined);

export function HistoryProvider({ children }: { children: React.ReactNode }) {
    const [history, setHistory] = React.useState<HistoryMetadata[]>([]);
    const [isInitialLoad, setIsInitialLoad] = React.useState(true);
    const [blobUrlCache, setBlobUrlCache] = React.useState<Record<string, string>>({});
    const [skipDeleteConfirmation, setSkipDeleteConfirmation] = React.useState<boolean>(false);
    const [itemToDeleteConfirm, setItemToDeleteConfirm] = React.useState<HistoryMetadata | null>(null);
    const [dialogCheckboxStateSkipConfirm, setDialogCheckboxStateSkipConfirm] = React.useState<boolean>(false);
    const [isPasswordRequiredByBackend, setIsPasswordRequiredByBackend] = React.useState<boolean | null>(null);
    const [clientPasswordHash, setClientPasswordHash] = React.useState<string | null>(null);
    const [latestImageBatch, setLatestImageBatch] = React.useState<{ path: string; filename: string }[] | null>(null);
    const [imageOutputView, setImageOutputView] = React.useState<'grid' | number>('grid');
    const [error, setError] = React.useState<string | null>(null);

    const allDbImages = useLiveQuery<ImageRecord[] | undefined>(() => db.images.toArray(), []);

    const getImageSrc = React.useCallback(
        (filename: string): string | undefined => {
            if (blobUrlCache[filename]) {
                return blobUrlCache[filename];
            }

            const record = allDbImages?.find((img) => img.filename === filename);
            if (record?.blob) {
                const url = URL.createObjectURL(record.blob);
                // NOTE: This technically breaks the rules of hooks/renders, but it's for a cache.
                // It's a pragmatic solution to avoid re-renders.
                setBlobUrlCache((prev) => ({...prev, [filename]: url}));
                return url;
            }

            return undefined;
        },
        [allDbImages, blobUrlCache]
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
        const originalStorageMode = item.storageModeUsed || 'fs';

        const selectedBatchPromises = item.images.map(async (imgInfo) => {
            let path: string | undefined;
            if (originalStorageMode === 'indexeddb') {
                path = getImageSrc(imgInfo.filename);
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
    
    const handleRequestDeleteItem = (item: HistoryMetadata) => {
        if (!skipDeleteConfirmation) {
            setDialogCheckboxStateSkipConfirm(skipDeleteConfirmation);
            setItemToDeleteConfirm(item);
        } else {
            executeDeleteItem(item);
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

    const value = {
        history,
        addHistoryEntry,
        getImageSrc,
        handleClearHistory,
        handleRequestDeleteItem,
        itemToDeleteConfirm,
        handleConfirmDeletion,
        handleCancelDeletion,
        dialogCheckboxStateSkipConfirm,
        setDialogCheckboxStateSkipConfirm,
        isPasswordRequiredByBackend,
        clientPasswordHash,
        latestImageBatch,
        setLatestImageBatch,
        handleHistorySelect,
        error,
        setError,
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