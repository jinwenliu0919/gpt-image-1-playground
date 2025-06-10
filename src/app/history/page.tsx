'use client';

import * as React from 'react';
import { useHistory } from '@/contexts/HistoryContext';
import { HistoryPanel } from '@/components/history-panel';
import { ImageOutput } from '@/components/image-output';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useRouter } from 'next/navigation';
import type { HistoryMetadata } from '@/lib/types';

export default function HistoryPage() {
    const historyContext = useHistory();
    const router = useRouter();
    const [imageOutputView, setImageOutputView] = React.useState<'grid' | number>('grid');

    const handleSelectAndNavigate = (item: HistoryMetadata) => {
        historyContext.handleHistorySelect(item);
        router.push('/');
    };

    return (
        <main className='container mx-auto p-4 md:p-8 w-full'>
            <div className='space-y-6'>
                {historyContext.error && (
                    <Alert variant='destructive' className='mb-4 border-red-500/50 bg-red-900/20 text-red-300'>
                        <AlertTitle className='text-red-200'>错误</AlertTitle>
                        <AlertDescription>{historyContext.error}</AlertDescription>
                    </Alert>
                )}
                {historyContext.latestImageBatch && (
                     <div className='flex h-[70vh] min-h-[600px] flex-col'>
                        <h2 className='text-xl font-semibold mb-4'>当前选择</h2>
                        <ImageOutput
                            imageBatch={historyContext.latestImageBatch}
                            viewMode={imageOutputView}
                            onViewChange={setImageOutputView}
                            altText='Selected history image'
                            isLoading={false}
                            onSendToEdit={() => {
                                // Maybe navigate to main page and set mode to edit?
                                // For now, do nothing.
                            }}
                            currentMode='generate' // or 'edit', doesn't matter much here
                        />
                    </div>
                )}
                <div>
                    <h1 className='text-2xl font-bold mb-4'>历史记录</h1>
                    <div className='min-h-[450px]'>
                        <HistoryPanel
                            history={historyContext.history}
                            onSelectImage={historyContext.handleHistorySelect}
                            onClearHistory={historyContext.handleClearHistory}
                            getImageSrc={historyContext.getImageSrc}
                            onDeleteItemRequest={historyContext.handleRequestDeleteItem}
                            itemPendingDeleteConfirmation={historyContext.itemToDeleteConfirm}
                            onConfirmDeletion={historyContext.handleConfirmDeletion}
                            onCancelDeletion={historyContext.handleCancelDeletion}
                            deletePreferenceDialogValue={historyContext.dialogCheckboxStateSkipConfirm}
                            onDeletePreferenceDialogChange={historyContext.setDialogCheckboxStateSkipConfirm}
                        />
                    </div>
                </div>
            </div>
        </main>
    );
} 