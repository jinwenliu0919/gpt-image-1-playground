'use client';

import type { HistoryMetadata } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
    DialogClose
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
    Copy,
    Check,
    Layers,
    DollarSign,
    Pencil,
    Sparkles as SparklesIcon,
    HardDrive,
    Database,
    FileImage,
    Trash2
} from 'lucide-react';
import Image from 'next/image';
import * as React from 'react';

type HistoryPanelProps = {
    history: HistoryMetadata[];
    onSelectImage: (item: HistoryMetadata) => void;
    onClearHistory: () => void;
    getImageSrc: (filename: string) => string | undefined;
    onDeleteItemRequest: (item: HistoryMetadata) => void;
    itemPendingDeleteConfirmation: HistoryMetadata | null;
    onConfirmDeletion: () => void;
    onCancelDeletion: () => void;
    deletePreferenceDialogValue: boolean;
    onDeletePreferenceDialogChange: (isChecked: boolean) => void;
};

const formatDuration = (ms: number): string => {
    if (ms < 1000) {
        return `${ms}ms`;
    }
    return `${(ms / 1000).toFixed(1)}s`;
};

const calculateCost = (value: number, rate: number): string => {
    const cost = value * rate;
    return isNaN(cost) ? 'N/A' : cost.toFixed(4);
};

export function HistoryPanel({
    history,
    onSelectImage,
    onClearHistory,
    getImageSrc,
    onDeleteItemRequest,
    itemPendingDeleteConfirmation,
    onConfirmDeletion,
    onCancelDeletion,
    deletePreferenceDialogValue,
    onDeletePreferenceDialogChange
}: HistoryPanelProps) {
    const [openPromptDialogTimestamp, setOpenPromptDialogTimestamp] = React.useState<number | null>(null);
    const [openCostDialogTimestamp, setOpenCostDialogTimestamp] = React.useState<number | null>(null);
    const [isTotalCostDialogOpen, setIsTotalCostDialogOpen] = React.useState(false);
    const [copiedTimestamp, setCopiedTimestamp] = React.useState<number | null>(null);

    const { totalCost, totalImages } = React.useMemo(() => {
        let cost = 0;
        let images = 0;
        history.forEach((item) => {
            if (item.costDetails) {
                cost += item.costDetails.estimated_cost_usd;
            }
            images += item.images?.length ?? 0;
        });

        return { totalCost: Math.round(cost * 10000) / 10000, totalImages: images };
    }, [history]);

    const averageCost = totalImages > 0 ? totalCost / totalImages : 0;

    const handleCopy = async (text: string | null | undefined, timestamp: number) => {
        if (!text) return;
        try {
            await navigator.clipboard.writeText(text);
            setCopiedTimestamp(timestamp);
            setTimeout(() => setCopiedTimestamp(null), 1500);
        } catch (err) {
            console.error('Failed to copy text: ', err);
        }
    };

    return (
        <Card className='flex h-full w-full flex-col overflow-hidden rounded-lg border border-border bg-card'>
            <CardHeader className='flex flex-row items-center justify-between gap-4 border-b border-border px-4 py-3'>
                <div className='flex items-center gap-2'>
                    <CardTitle className='text-lg font-medium text-card-foreground'>历史记录</CardTitle>
                    {totalCost > 0 && (
                        <Dialog open={isTotalCostDialogOpen} onOpenChange={setIsTotalCostDialogOpen}>
                            <DialogTrigger asChild>
                                <button
                                    className='mt-0.5 flex items-center gap-1 rounded-full bg-green-600/80 px-1.5 py-0.5 text-[12px] text-primary-foreground transition-colors hover:bg-green-500/90'
                                    aria-label='显示总成本摘要'>
                                    总成本: ${totalCost.toFixed(4)}
                                </button>
                            </DialogTrigger>
                            <DialogContent className='border-border bg-card text-card-foreground sm:max-w-[450px]'>
                                <DialogHeader>
                                    <DialogTitle className='text-card-foreground'>总成本摘要</DialogTitle>
                                    {/* Add sr-only description for accessibility */}
                                    <DialogDescription className='sr-only'>
                                        历史记录中所有生成图像的总估计成本摘要。
                                    </DialogDescription>
                                </DialogHeader>
                                <div className='space-y-1 pt-1 text-xs text-card-foreground'>
                                    <p>gpt-image-1 的定价:</p>
                                    <ul className='list-disc pl-4'>
                                        <li>文本输入: $5 / 1M tokens</li>
                                        <li>图像输入: $10 / 1M tokens</li>
                                        <li>图像输出: $40 / 1M tokens</li>
                                    </ul>
                                </div>
                                <div className='space-y-2 py-4 text-sm text-card-foreground'>
                                    <div className='flex justify-between'>
                                        <span>已生成图像总数:</span> <span>{totalImages.toLocaleString()}</span>
                                    </div>
                                    <div className='flex justify-between'>
                                        <span>每张图像平均成本:</span> <span>${averageCost.toFixed(4)}</span>
                                    </div>
                                    <hr className='my-2 border-border' />
                                    <div className='flex justify-between font-medium text-card-foreground'>
                                        <span>总估计成本:</span>
                                        <span>${totalCost.toFixed(4)}</span>
                                    </div>
                                </div>
                                <DialogFooter>
                                    <DialogClose asChild>
                                        <Button
                                            type='button'
                                            variant='secondary'
                                            size='sm'
                                            className='bg-border text-card-foreground hover:bg-border'>
                                            关闭
                                        </Button>
                                    </DialogClose>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    )}
                </div>
                {history.length > 0 && (
                    <Button
                        variant='ghost'
                        size='sm'
                        onClick={onClearHistory}
                        className='h-auto rounded-md px-2 py-1 text-card-foreground/60 hover:bg-card/10 hover:text-card-foreground'>
                        清空
                    </Button>
                )}
            </CardHeader>
            <CardContent className='flex-grow overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent'>
                {history.length === 0 ? (
                    <div className='flex h-full items-center justify-center text-card-foreground/40'>
                        <p>生成的图像将显示在这里。</p>
                    </div>
                ) : (
                    <div className='grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'>
                        {[...history].map((item) => {
                            const firstImage = item.images?.[0];
                            const imageCount = item.images?.length ?? 0;
                            const isMultiImage = imageCount > 1;
                            const itemKey = item.timestamp;
                            const originalStorageMode = item.storageModeUsed || 'fs';
                            const outputFormat = item.output_format || 'png';

                            let thumbnailUrl: string | undefined;
                            if (firstImage) {
                                if (originalStorageMode === 'indexeddb') {
                                    thumbnailUrl = getImageSrc(firstImage.filename);
                                } else {
                                    thumbnailUrl = `/api/image/${firstImage.filename}`;
                                }
                            }

                            return (
                                <div key={itemKey} className='flex flex-col'>
                                    <div className='group relative'>
                                        <button
                                            onClick={() => onSelectImage(item)}
                                            className='relative block aspect-square w-full overflow-hidden rounded-t-md border border-border transition-all duration-150 group-hover:border-border focus:ring-2 focus:ring-border focus:ring-offset-2 focus:ring-offset-black focus:outline-none'
                                            aria-label={`View image batch from ${new Date(item.timestamp).toLocaleString()}`}>
                                            {thumbnailUrl ? (
                                                <Image
                                                    src={thumbnailUrl}
                                                    alt={`Preview for batch generated at ${new Date(item.timestamp).toLocaleString()}`}
                                                    width={150}
                                                    height={150}
                                                    className='h-full w-full object-cover'
                                                    unoptimized
                                                />
                                            ) : (
                                                <div className='flex h-full w-full items-center justify-center bg-card/10 text-card-foreground'>
                                                    ?
                                                </div>
                                            )}
                                            <div
                                                className={cn(
                                                    'pointer-events-none absolute top-1 left-1 z-10 flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] text-card-foreground',
                                                    item.mode === 'edit' ? 'bg-orange-600/80' : 'bg-blue-600/80'
                                                )}>
                                                {item.mode === 'edit' ? (
                                                    <Pencil size={12} />
                                                ) : (
                                                    <SparklesIcon size={12} />
                                                )}
                                                {item.mode === 'edit' ? '编辑' : '创建'}
                                            </div>
                                            {isMultiImage && (
                                                <div className='pointer-events-none absolute right-1 bottom-1 z-10 flex items-center gap-1 rounded-full bg-black/70 px-1.5 py-0.5 text-[12px] text-card-foreground'>
                                                    <Layers size={16} />
                                                    {imageCount}
                                                </div>
                                            )}
                                            <div className='pointer-events-none absolute bottom-1 left-1 z-10 flex items-center gap-1'>
                                                <div className='flex items-center gap-1 rounded-full border border-border bg-card/80 px-1 py-0.5 text-[11px] text-card-foreground/70'>
                                                    {originalStorageMode === 'fs' ? (
                                                        <HardDrive size={12} className='text-card-foreground/40' />
                                                    ) : (
                                                        <Database size={12} className='text-blue-400' />
                                                    )}
                                                    <span>{originalStorageMode === 'fs' ? 'file' : 'db'}</span>
                                                </div>
                                                {item.output_format && (
                                                    <div className='flex items-center gap-1 rounded-full border border-border bg-card/80 px-1 py-0.5 text-[11px] text-card-foreground/70'>
                                                        <FileImage size={12} className='text-card-foreground/40' />
                                                        <span>{outputFormat.toUpperCase()}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </button>
                                        {item.costDetails && (
                                            <Dialog
                                                open={openCostDialogTimestamp === itemKey}
                                                onOpenChange={(isOpen) => !isOpen && setOpenCostDialogTimestamp(null)}>
                                                <DialogTrigger asChild>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setOpenCostDialogTimestamp(itemKey);
                                                        }}
                                                        className='absolute top-1 right-1 z-20 flex items-center gap-0.5 rounded-full bg-green-600/80 px-1.5 py-0.5 text-[11px] text-card-foreground transition-colors hover:bg-green-500/90'
                                                        aria-label='Show cost breakdown'>
                                                        <DollarSign size={12} />
                                                        {item.costDetails.estimated_cost_usd.toFixed(4)}
                                                    </button>
                                                </DialogTrigger>
                                                <DialogContent className='border-border bg-card text-card-foreground sm:max-w-[450px]'>
                                                    <DialogHeader>
                                                        <DialogTitle className='text-card-foreground'>Cost Breakdown</DialogTitle>
                                                        <DialogDescription className='sr-only'>
                                                            Estimated cost breakdown for this image generation.
                                                        </DialogDescription>
                                                    </DialogHeader>
                                                    <div className='space-y-1 pt-1 text-xs text-card-foreground'>
                                                        <p>Pricing for gpt-image-1:</p>
                                                        <ul className='list-disc pl-4'>
                                                            <li>Text Input: $5 / 1M tokens</li>
                                                            <li>Image Input: $10 / 1M tokens</li>
                                                            <li>Image Output: $40 / 1M tokens</li>
                                                        </ul>
                                                    </div>
                                                    <div className='space-y-2 py-4 text-sm text-card-foreground'>
                                                        <div className='flex justify-between'>
                                                            <span>Text Input Tokens:</span>{' '}
                                                            <span>
                                                                {item.costDetails.text_input_tokens.toLocaleString()}{' '}
                                                                (~$
                                                                {calculateCost(
                                                                    item.costDetails.text_input_tokens,
                                                                    0.000005
                                                                )}
                                                                )
                                                            </span>
                                                        </div>
                                                        {item.costDetails.image_input_tokens > 0 && (
                                                            <div className='flex justify-between'>
                                                                <span>Image Input Tokens:</span>{' '}
                                                                <span>
                                                                    {item.costDetails.image_input_tokens.toLocaleString()}{' '}
                                                                    (~$
                                                                    {calculateCost(
                                                                        item.costDetails.image_input_tokens,
                                                                        0.00001
                                                                    )}
                                                                    )
                                                                </span>
                                                            </div>
                                                        )}
                                                        <div className='flex justify-between'>
                                                            <span>Image Output Tokens:</span>{' '}
                                                            <span>
                                                                {item.costDetails.image_output_tokens.toLocaleString()}{' '}
                                                                (~$
                                                                {calculateCost(
                                                                    item.costDetails.image_output_tokens,
                                                                    0.00004
                                                                )}
                                                                )
                                                            </span>
                                                        </div>
                                                        <hr className='my-2 border-border' />
                                                        <div className='flex justify-between font-medium text-card-foreground'>
                                                            <span>Total Estimated Cost:</span>
                                                            <span>
                                                                ${item.costDetails.estimated_cost_usd.toFixed(4)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <DialogFooter>
                                                        <DialogClose asChild>
                                                            <Button
                                                                type='button'
                                                                variant='secondary'
                                                                size='sm'
                                                                className='bg-border text-card-foreground hover:bg-border'>
                                                                Close
                                                            </Button>
                                                        </DialogClose>
                                                    </DialogFooter>
                                                </DialogContent>
                                            </Dialog>
                                        )}
                                    </div>

                                    <div className='space-y-1 rounded-b-md border border-t-0 border-border bg-card p-2 text-xs text-card-foreground/60'>
                                        <p title={`Generated on: ${new Date(item.timestamp).toLocaleString()}`}>
                                            <span className='font-medium text-card-foreground/80'>时间:</span>{' '}
                                            {formatDuration(item.durationMs)}
                                        </p>
                                        <p>
                                            <span className='font-medium text-card-foreground/80'>质量:</span> {item.quality}
                                        </p>
                                        <p>
                                            <span className='font-medium text-card-foreground/80'>背景:</span> {item.background}
                                        </p>
                                        <p>
                                            <span className='font-medium text-card-foreground/80'>审核:</span> {item.moderation}
                                        </p>
                                        <div className='mt-2 flex items-center gap-1'>
                                            <Dialog
                                                open={openPromptDialogTimestamp === itemKey}
                                                onOpenChange={(isOpen) =>
                                                    !isOpen && setOpenPromptDialogTimestamp(null)
                                                }>
                                                <DialogTrigger asChild>
                                                    <Button
                                                        variant='outline'
                                                        size='sm'
                                                        className='h-6 flex-grow border-border px-2 py-1 text-xs text-card-foreground/70 hover:bg-card/10 hover:text-card-foreground'
                                                        onClick={() => setOpenPromptDialogTimestamp(itemKey)}>
                                                        显示提示词
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent className='border-border bg-card text-card-foreground sm:max-w-[625px]'>
                                                    <DialogHeader>
                                                        <DialogTitle className='text-card-foreground'>提示词</DialogTitle>
                                                        <DialogDescription className='sr-only'>
                                                            用于生成此批次图像的完整提示词。
                                                        </DialogDescription>
                                                    </DialogHeader>
                                                    <div className='max-h-[400px] overflow-y-auto rounded-md border border-border bg-card p-3 py-4 text-sm text-card-foreground scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent'>
                                                        {item.prompt || '未记录提示词。'}
                                                    </div>
                                                    <DialogFooter>
                                                        <Button
                                                            variant='outline'
                                                            size='sm'
                                                            onClick={() => handleCopy(item.prompt, itemKey)}
                                                            className='border-border text-card-foreground hover:bg-card/10 hover:text-card-foreground'>
                                                            {copiedTimestamp === itemKey ? (
                                                                <Check className='mr-2 h-4 w-4 text-green-400' />
                                                            ) : (
                                                                <Copy className='mr-2 h-4 w-4' />
                                                            )}
                                                            {copiedTimestamp === itemKey ? '已复制!' : '复制'}
                                                        </Button>
                                                        <DialogClose asChild>
                                                            <Button
                                                                type='button'
                                                                variant='secondary'
                                                                size='sm'
                                                                className='bg-border text-card-foreground hover:bg-border'>
                                                                关闭
                                                            </Button>
                                                        </DialogClose>
                                                    </DialogFooter>
                                                </DialogContent>
                                            </Dialog>
                                            <Dialog
                                                open={itemPendingDeleteConfirmation?.timestamp === item.timestamp}
                                                onOpenChange={(isOpen) => {
                                                    if (!isOpen) onCancelDeletion();
                                                }}>
                                                <DialogTrigger asChild>
                                                    <Button
                                                        className='h-6 w-6 bg-red-700/60 text-card-foreground hover:bg-red-600/60'
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onDeleteItemRequest(item);
                                                        }}
                                                        aria-label='Delete history item'>
                                                        <Trash2 size={14} />
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent className='border-border bg-card text-card-foreground sm:max-w-md'>
                                                    <DialogHeader>
                                                        <DialogTitle className='text-card-foreground'>
                                                            确认删除
                                                        </DialogTitle>
                                                        <DialogDescription className='pt-2 text-card-foreground'>
                                                            您确定要删除此历史记录条目吗？这将删除 {item.images.length} 张图像。此操作无法撤消。
                                                        </DialogDescription>
                                                    </DialogHeader>
                                                    <div className='flex items-center space-x-2 py-2'>
                                                        <Checkbox
                                                            id={`dont-ask-${item.timestamp}`}
                                                            checked={deletePreferenceDialogValue}
                                                            onCheckedChange={(checked) =>
                                                                onDeletePreferenceDialogChange(!!checked)
                                                            }
                                                            className='border-border bg-card data-[state=checked]:border-card data-[state=checked]:bg-card data-[state=checked]:text-card dark:border-border dark:!bg-card'
                                                        />
                                                        <label
                                                            htmlFor={`dont-ask-${item.timestamp}`}
                                                            className='text-sm leading-none font-medium text-card-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-70'>
                                                            不再询问
                                                        </label>
                                                    </div>
                                                    <DialogFooter className='gap-2 sm:justify-end'>
                                                        <Button
                                                            type='button'
                                                            variant='outline'
                                                            size='sm'
                                                            onClick={onCancelDeletion}
                                                            className='border-border text-card-foreground hover:bg-card hover:text-card-foreground'>
                                                            取消
                                                        </Button>
                                                        <Button
                                                            type='button'
                                                            variant='destructive'
                                                            size='sm'
                                                            onClick={onConfirmDeletion}
                                                            className='bg-red-600 text-card-foreground hover:bg-red-500'>
                                                            删除
                                                        </Button>
                                                    </DialogFooter>
                                                </DialogContent>
                                            </Dialog>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
