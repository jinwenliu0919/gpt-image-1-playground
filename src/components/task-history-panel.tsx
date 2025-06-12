'use client';

import * as React from 'react';
import { useHistory } from '@/contexts/HistoryContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Loader2,
    Sparkles,
    Pencil,
    AlertCircle,
    CheckCircle,
    Layers,
    HardDrive,
    Database,
    FileImage,
    Image as ImageIcon,
    Clock,
    MessageSquare,
    Trash2,
    Copy,
    Check,
    Star,
    StarOff
} from 'lucide-react';
import Image from 'next/image';
import type { TaskRecord, HistoryMetadata } from '@/lib/types';
import { ImagePreviewDialog } from '@/components/image-preview-dialog';
import { DeleteConfirmationDialog } from '@/components/delete-confirmation-dialog';
import { DeleteTaskConfirmationDialog } from '@/components/delete-task-confirmation-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// 添加错误边界组件
class ErrorBoundary extends React.Component<
    { 
        children: React.ReactNode, 
        fallback: React.ReactNode | ((props: { error: Error | null, resetErrorBoundary: () => void }) => React.ReactNode) 
    },
    { hasError: boolean, error: Error | null }
> {
    constructor(props: { 
        children: React.ReactNode, 
        fallback: React.ReactNode | ((props: { error: Error | null, resetErrorBoundary: () => void }) => React.ReactNode) 
    }) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error) {
        // 更新状态，下次渲染时将显示降级UI
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        // 可以在这里记录错误信息
        console.error('组件错误:', error, errorInfo);
    }

    resetErrorBoundary = () => {
        this.setState({ hasError: false, error: null });
    }

    render() {
        if (this.state.hasError) {
            // 如果fallback是函数，传入error和reset方法
            if (typeof this.props.fallback === 'function') {
                return this.props.fallback({
                    error: this.state.error,
                    resetErrorBoundary: this.resetErrorBoundary
                });
            }
            // 显示降级UI
            return this.props.fallback;
        }

        return this.props.children;
    }
}

// 错误回退组件
const ImagePreviewErrorFallback = ({ onClose, error, resetErrorBoundary }: { 
    onClose: () => void, 
    error: Error | null, 
    resetErrorBoundary?: () => void 
}) => {
    return (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
            <div className="flex flex-col items-center justify-center gap-4 p-4">
                <AlertCircle className="h-12 w-12 text-red-500" />
                <h3 className="text-lg font-medium">图片预览出现错误</h3>
                <p className="text-sm text-center text-muted-foreground">
                    {error ? `错误信息: ${error.message}` : '图片预览加载失败，请稍后再试'}
                </p>
                <div className="flex gap-2">
                    <Button onClick={onClose}>关闭</Button>
                    {resetErrorBoundary && (
                        <Button variant="outline" onClick={resetErrorBoundary}>
                            重试
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
};

interface TaskHistoryPanelProps {
    onSelectTask: (taskId: string) => void;
}

const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleString(undefined, {
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

export function TaskHistoryPanel({ onSelectTask }: TaskHistoryPanelProps) {
    const {
        tasks,
        history,
        getImageSrc,
        handleDeleteHistoryItem,
        itemToDeleteConfirm,
        confirmDeletion,
        cancelDeletion,
        dialogCheckboxStateSkipConfirm,
        setDialogCheckboxStateSkipConfirm,
        handleDeleteTask,
        itemToDeleteTaskConfirm,
        confirmTaskDeletion,
        cancelTaskDeletion,
        addToFavorites,
        removeFromFavorites,
        isFavorite,
        getFavoriteId
    } = useHistory();

    // 添加图片预览状态
    const [previewDialogOpen, setPreviewDialogOpen] = React.useState(false);
    const [selectedHistoryItem, setSelectedHistoryItem] = React.useState<HistoryMetadata | null>(null);
    const [selectedImageIndex, setSelectedImageIndex] = React.useState(0);

    // 添加复制提示词状态
    const [copiedItemId, setCopiedItemId] = React.useState<string | null>(null);

    // 合并任务和历史记录数据，按时间排序
    const combinedItems = React.useMemo(() => {
        // 只保留未完成的任务（pending, processing 或 failed 状态）
        const taskItems = tasks
            .filter(task => task.status !== 'completed')
            .map(task => ({
                type: 'task' as const,
                data: task,
                timestamp: task.timestamp
            }));

        const historyItems = history.map(item => ({
            type: 'history' as const,
            data: item,
            timestamp: item.timestamp
        }));

        return [...taskItems, ...historyItems]
            .sort((a, b) => b.timestamp - a.timestamp);
    }, [tasks, history]);

    // 处理图片点击事件
    const handleImageClick = (item: HistoryMetadata, imageIndex: number) => {
        // 安全检查：确保历史项和图片数组存在
        if (!item || !item.images || !Array.isArray(item.images) || item.images.length === 0) {
            console.error('无效的历史记录项或图片数组', item);
            return;
        }

        // 安全检查：确保图片索引有效
        if (imageIndex < 0 || imageIndex >= item.images.length) {
            console.error('图片索引超出范围', imageIndex, item.images.length);
            return;
        }

        // 安全检查：确保图片对象有效
        const imageItem = item.images[imageIndex];
        if (!imageItem || !imageItem.filename) {
            console.error('图片对象无效或缺少文件名', imageItem);
            return;
        }

        setSelectedHistoryItem(item);
        setSelectedImageIndex(imageIndex);
        setPreviewDialogOpen(true);
    };

    // 处理复制提示词
    const handleCopyPrompt = async (prompt: string | undefined, itemId: string) => {
        if (!prompt) return;
        try {
            await navigator.clipboard.writeText(prompt);
            setCopiedItemId(itemId);
            setTimeout(() => setCopiedItemId(null), 1500);
        } catch (err) {
            console.error('复制提示词失败: ', err);
        }
    };

    // 处理收藏和取消收藏
    const handleToggleFavorite = async (e: React.MouseEvent, item: HistoryMetadata) => {
        e.stopPropagation();
        try {
            if (isFavorite(item.timestamp)) {
                const favoriteId = getFavoriteId(item.timestamp);
                if (favoriteId) {
                    await removeFromFavorites(favoriteId);
                }
            } else {
                await addToFavorites(item);
            }
        } catch (err) {
            console.error('收藏操作失败:', err);
        }
    };

    const renderTaskItem = (task: TaskRecord) => {
        // 获取任务状态图标
        let StatusIcon = Loader2;
        let statusText = '等待中';
        let statusClass = 'bg-yellow-600/80';

        if (task.status === 'processing') {
            statusText = '处理中';
            statusClass = 'bg-blue-600/80';
        } else if (task.status === 'completed') {
            StatusIcon = CheckCircle;
            statusText = '已完成';
            statusClass = 'bg-green-600/80';
        } else if (task.status === 'failed') {
            StatusIcon = AlertCircle;
            statusText = '失败';
            statusClass = 'bg-red-600/80';
        }

        // 添加任务旋转动画
        const isLoading = task.status === 'pending' || task.status === 'processing';

        // 为任务生成唯一ID
        const taskItemId = `task-${task.id}`;

        return (
            <div className="relative bg-card/50 rounded-md p-3 hover:bg-card/70 transition-colors shadow-sm">
                <div className="flex items-center justify-between mb-2">
                    <div className={`flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] text-card-foreground ${statusClass}`}>
                        <StatusIcon size={12} className={isLoading ? 'animate-spin' : ''} />
                        <span>{statusText}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="text-xs text-muted-foreground">{formatDate(task.timestamp)}</div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteTask(task);
                            }}
                        >
                            <Trash2 size={14} className="text-muted-foreground hover:text-red-400" />
                        </Button>
                    </div>
                </div>

                <div className="flex items-center gap-2 mb-2">
                    {task.mode === 'edit' ? (
                        <Pencil size={14} className="text-orange-500" />
                    ) : (
                        <Sparkles size={14} className="text-blue-500" />
                    )}
                    <span className="text-sm font-medium text-card-foreground">
                        {task.mode === 'edit' ? '图生图' : '文生图'}
                    </span>
                </div>

                <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{task.prompt}</p>

                {task.status === 'pending' || task.status === 'processing' ? (
                    <div className="flex items-center justify-center bg-background/50 rounded">
                        <div className="flex h-20 w-20 items-center justify-center">
                            <ImageIcon size={24} className="text-muted-foreground opacity-50" />
                        </div>
                    </div>
                ) : task.status === 'failed' ? (
                    <div className="flex items-center justify-center bg-red-900/10 rounded">
                        <div className="flex h-20 w-20 flex-col items-center justify-center p-2">
                            <AlertCircle size={24} className="text-red-500/70 mb-2" />
                            <p className="text-xs text-red-400 text-center line-clamp-2">{task.error || '处理失败'}</p>
                        </div>
                    </div>
                ) : null}

                <div className="flex items-center gap-2 mt-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="flex-grow text-xs"
                        onClick={() => onSelectTask(task.id)}
                        disabled={task.status === 'pending' || task.status === 'processing'}
                    >
                        {task.status === 'completed' ? '查看结果' : task.status === 'failed' ? '查看详情' : '等待中...'}
                    </Button>

                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 flex-shrink-0"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleCopyPrompt(task.prompt, taskItemId);
                        }}
                        title="复制提示词"
                        disabled={!task.prompt}
                    >
                        {copiedItemId === taskItemId ? (
                            <Check size={14} className="text-green-500" />
                        ) : (
                            <Copy size={14} className="text-muted-foreground hover:text-primary" />
                        )}
                    </Button>
                </div>
            </div>
        );
    };

    const renderHistoryItem = (item: HistoryMetadata) => {
        // 安全检查：确保images数组存在且有效
        const images = item.images || [];
        const imageCount = images.length;
        const originalStorageMode = item.storageModeUsed || 'fs';
        const outputFormat = item.output_format || 'png';

        // 为每个历史记录项生成唯一ID
        const itemId = `history-${item.timestamp}`;
        const isItemFavorite = isFavorite(item.timestamp);

        return (
            <div className="relative rounded-md overflow-hidden bg-background/50 hover:bg-background/70 transition-colors shadow-sm">
                {/* 顶部标题栏 - 显示时间和模式 */}
                <div className="flex items-center justify-between p-2 bg-card/30">
                    <div className="flex items-center gap-2 text-sm">
                        <Clock size={14} className="text-muted-foreground" />
                        <span className="text-muted-foreground">{formatDate(item.timestamp)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={(e) => handleToggleFavorite(e, item)}
                                    >
                                        {isItemFavorite ? (
                                            <Star size={14} className="text-yellow-400 fill-yellow-400" />
                                        ) : (
                                            <StarOff size={14} className="text-muted-foreground hover:text-yellow-400" />
                                        )}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    {isItemFavorite ? '取消收藏' : '添加到收藏'}
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>

                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteHistoryItem(item);
                            }}
                        >
                            <Trash2 size={14} className="text-muted-foreground hover:text-red-400" />
                        </Button>
                    </div>
                </div>

                {/* 提示词区域 */}
                <div className="p-2 bg-card/30">
                    <div className="flex items-center gap-2">
                        <MessageSquare size={14} className="text-muted-foreground flex-shrink-0" />
                        <p className="text-xs text-muted-foreground line-clamp-2 overflow-hidden break-words pb-1">{'提示词：'}{item.prompt}</p>
                    </div>
                </div>

                {/* 图片网格区域 - 使用水平滚动 */}
                <div className="p-2 overflow-x-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
                    <div className="flex gap-2" style={{ minWidth: 'min-content' }}>
                        {images.map((img, index) => {
                            // 安全检查：确保图片对象有效
                            if (!img || !img.filename) {
                                console.warn('跳过无效的图片对象', img);
                                return null;
                            }

                            let thumbnailUrl: string | undefined;
                            try {
                                if (originalStorageMode === 'indexeddb') {
                                    thumbnailUrl = getImageSrc(img.filename);
                                } else {
                                    thumbnailUrl = `/api/image/${img.filename}`;
                                }
                            } catch (error) {
                                console.error('获取图片URL时出错:', error, img.filename);
                                thumbnailUrl = undefined;
                            }

                            return (
                                <button
                                    key={img.filename || `img-${index}`}
                                    onClick={() => handleImageClick(item, index)}
                                    className="relative rounded-md overflow-hidden hover:bg-card/80 focus:outline-none focus:ring-1 focus:ring-primary flex-shrink-0 bg-card/30"
                                >
                                    <div className="flex items-center justify-center">
                                        {thumbnailUrl ? (
                                            <Image
                                                src={thumbnailUrl}
                                                alt={`图片 ${index + 1}，生成于 ${new Date(item.timestamp).toLocaleString()}`}
                                                width={500}
                                                height={500}
                                                className="w-auto h-auto object-contain"
                                                style={{ maxHeight: '160px', maxWidth: '160px' }}
                                                unoptimized
                                            />
                                        ) : (
                                            <div className="flex h-20 w-20 items-center justify-center bg-card/10 text-card-foreground">
                                                <AlertCircle size={24} className="text-red-400 opacity-70" />
                                            </div>
                                        )}
                                    </div>
                                </button>
                            );
                        }).filter(Boolean)} {/* 过滤掉null项 */}
                    </div>
                </div>

                {/* 底部信息区域 */}
                <div className="flex items-center justify-between p-2 bg-card/30">
                    <div className="flex items-center gap-1">
                        <div className='flex items-center gap-1 rounded-full bg-card/80 px-1 py-0.5 text-[10px] text-card-foreground/70'>
                            {originalStorageMode === 'fs' ? (
                                <HardDrive size={10} className='text-card-foreground/40' />
                            ) : (
                                <Database size={10} className='text-blue-400' />
                            )}
                            <span>{originalStorageMode === 'fs' ? 'file' : 'db'}</span>
                        </div>
                        {outputFormat && (
                            <div className='flex items-center gap-1 rounded-full bg-card/80 px-1 py-0.5 text-[10px] text-card-foreground/70'>
                                <FileImage size={10} className='text-card-foreground/40' />
                                <span>{outputFormat.toUpperCase()}</span>
                            </div>
                        )}
                        <div className='flex items-center gap-1'>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-full"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleCopyPrompt(item.prompt, itemId);
                                }}
                                title="复制提示词"
                            >
                                {copiedItemId === itemId ? (
                                    <div className='flex items-center gap-1 rounded-full bg-card/80 px-1 py-0.5 text-[10px] text-card-foreground/70'>
                                        <Check size={10} className="text-green-500" />
                                        <span>已复制</span>
                                    </div>
                                ) : (
                                    <div className='flex items-center gap-1 rounded-full bg-card/80 px-1 py-0.5 text-[10px] text-card-foreground/70'>
                                        <Copy size={10} className='text-card-foreground/40' />
                                        <span>复制提示词</span>
                                    </div>
                                )}
                            </Button>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                            <Layers size={14} className="text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">{imageCount} 张图片</span>
                        </div>


                    </div>
                </div>
            </div>
        );
    };

    return (
        <>
            <Card className="w-full h-full flex flex-col overflow-hidden">
                <CardContent className="flex-grow overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
                    {combinedItems.length === 0 ? (
                        <div className="flex h-full items-center justify-center text-muted-foreground bg-background/50">
                            <p>生成的图像将显示在这里</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-2">
                            {combinedItems.map((item) => (
                                <div key={`${item.type}-${item.timestamp}`}>
                                    {item.type === 'task'
                                        ? renderTaskItem(item.data)
                                        : renderHistoryItem(item.data)}
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* 使用错误边界包裹图片预览对话框 */}
            <ErrorBoundary 
                fallback={({ error, resetErrorBoundary }) => (
                    <ImagePreviewErrorFallback 
                        onClose={() => setPreviewDialogOpen(false)} 
                        error={error} 
                        resetErrorBoundary={resetErrorBoundary}
                    />
                )}
            >
                {/* 图片预览对话框 */}
                <ImagePreviewDialog
                    isOpen={previewDialogOpen}
                    onClose={() => setPreviewDialogOpen(false)}
                    historyItem={selectedHistoryItem}
                    selectedImageIndex={selectedImageIndex}
                    getImageSrc={getImageSrc}
                />
            </ErrorBoundary>

            {/* 删除确认对话框 */}
            <DeleteConfirmationDialog
                isOpen={!!itemToDeleteConfirm}
                onClose={cancelDeletion}
                onConfirm={confirmDeletion}
                item={itemToDeleteConfirm}
                skipConfirmation={dialogCheckboxStateSkipConfirm}
                setSkipConfirmation={setDialogCheckboxStateSkipConfirm}
            />

            {/* 任务删除确认对话框 */}
            <DeleteTaskConfirmationDialog
                isOpen={!!itemToDeleteTaskConfirm}
                onClose={cancelTaskDeletion}
                onConfirm={confirmTaskDeletion}
                task={itemToDeleteTaskConfirm}
                skipConfirmation={dialogCheckboxStateSkipConfirm}
                setSkipConfirmation={setDialogCheckboxStateSkipConfirm}
            />
        </>
    );
}