'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Loader2, Send, Grid } from 'lucide-react';
import Image from 'next/image';

type ImageInfo = {
    path: string;
    filename: string;
};

type ImageOutputProps = {
    imageBatch: ImageInfo[] | null;
    viewMode: 'grid' | number;
    onViewChange: (view: 'grid' | number) => void;
    altText?: string;
    isLoading: boolean;
    onSendToEdit: (filename: string) => void;
    currentMode: 'generate' | 'edit';
    baseImagePreviewUrl?: string | null;
};

const getGridColsClass = (count: number): string => {
    if (count <= 1) return 'grid-cols-1';
    if (count <= 4) return 'grid-cols-2';
    if (count <= 9) return 'grid-cols-3';
    return 'grid-cols-3';
};

export function ImageOutput({
    imageBatch,
    viewMode,
    onViewChange,
    altText = 'Generated image output',
    isLoading,
    onSendToEdit,
    currentMode,
    baseImagePreviewUrl
}: ImageOutputProps) {
    const handleSendClick = () => {
        // Send to edit only works when a single image is selected
        if (typeof viewMode === 'number' && imageBatch && imageBatch[viewMode]) {
            onSendToEdit(imageBatch[viewMode].filename);
        }
    };

    const showCarousel = imageBatch && imageBatch.length > 1;
    const isSingleImageView = typeof viewMode === 'number';
    const canSendToEdit = !isLoading && isSingleImageView && imageBatch && imageBatch[viewMode];

    return (
        <div className='flex h-full min-h-[300px] w-full flex-col items-center justify-between gap-4 overflow-hidden rounded-lg border border-border bg-card p-4'>
            <div className='relative flex h-full w-full flex-grow items-center justify-center overflow-hidden'>
                {isLoading ? (
                    currentMode === 'edit' && baseImagePreviewUrl ? (
                        <div className='relative flex h-full w-full items-center justify-center'>
                            <Image
                                src={baseImagePreviewUrl}
                                alt='Base image for editing'
                                fill
                                style={{ objectFit: 'contain' }}
                                className='blur-md filter'
                                unoptimized
                            />
                            <div className='absolute inset-0 flex flex-col items-center justify-center bg-background/50 text-card-foreground/80'>
                                <Loader2 className='mb-2 h-8 w-8 animate-spin' />
                                <p>图像编辑中...</p>
                            </div>
                        </div>
                    ) : (
                        <div className='flex flex-col items-center justify-center text-muted-foreground'>
                            <Loader2 className='mb-2 h-8 w-8 animate-spin' />
                            <p>生成图像中...</p>
                        </div>
                    )
                ) : imageBatch && imageBatch.length > 0 ? (
                    viewMode === 'grid' ? (
                        <div
                            className={`grid ${getGridColsClass(imageBatch.length)} max-h-full w-full max-w-full gap-1 p-1`}>
                            {imageBatch.map((img, index) => (
                                <div
                                    key={img.filename}
                                    className='relative aspect-square overflow-hidden rounded border border-border'>
                                    <Image
                                        src={img.path}
                                        alt={`生成的图像 ${index + 1}`}
                                        fill
                                        style={{ objectFit: 'contain' }}
                                        sizes='(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw'
                                        unoptimized
                                    />
                                </div>
                            ))}
                        </div>
                    ) : imageBatch[viewMode] ? (
                        <Image
                            src={imageBatch[viewMode].path}
                            alt={altText}
                            width={512}
                            height={512}
                            className='max-h-full max-w-full object-contain'
                            unoptimized
                        />
                    ) : (
                        <div className='text-center text-muted-foreground'>
                            <p>显示图像时出错。</p>
                        </div>
                    )
                ) : (
                    <div className='text-center text-muted-foreground'>
                        <p>您生成的图像将显示在这里。</p>
                    </div>
                )}
            </div>

            <div className='flex h-10 w-full shrink-0 items-center justify-center gap-4'>
                {showCarousel && (
                    <div className='flex items-center gap-1.5 rounded-md border border-border bg-card/50 p-1'>
                        <Button
                            variant='ghost'
                            size='icon'
                            className={cn(
                                'h-8 w-8 rounded p-1',
                                viewMode === 'grid'
                                    ? 'bg-primary/20 text-card-foreground'
                                    : 'text-muted-foreground hover:bg-card/10 hover:text-card-foreground/80'
                            )}
                            onClick={() => onViewChange('grid')}
                            aria-label='显示网格视图'>
                            <Grid className='h-4 w-4' />
                        </Button>
                        {imageBatch.map((img, index) => (
                            <Button
                                key={img.filename}
                                variant='ghost'
                                size='icon'
                                className={cn(
                                    'h-8 w-8 overflow-hidden rounded p-0.5',
                                    viewMode === index
                                        ? 'ring-2 ring-white ring-offset-1 ring-offset-black'
                                        : 'opacity-60 hover:opacity-100'
                                )}
                                onClick={() => onViewChange(index)}
                                aria-label={`Select image ${index + 1}`}>
                                <Image
                                    src={img.path}
                                    alt={`Thumbnail ${index + 1}`}
                                    width={28}
                                    height={28}
                                    className='h-full w-full object-cover'
                                    unoptimized
                                />
                            </Button>
                        ))}
                    </div>
                )}

                <Button
                    variant='outline'
                    size='sm'
                    onClick={handleSendClick}
                    disabled={!canSendToEdit}
                    className={cn(
                        'shrink-0 border-border text-muted-foreground hover:bg-card/10 hover:text-card-foreground disabled:pointer-events-none disabled:opacity-50',
                        // Hide button completely if grid view is active and there are multiple images
                        showCarousel && viewMode === 'grid' ? 'invisible' : 'visible'
                    )}>
                    <Send className='mr-2 h-4 w-4' />
                    发送到编辑
                </Button>
            </div>
        </div>
    );
}
