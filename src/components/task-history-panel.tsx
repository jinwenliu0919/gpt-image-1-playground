'use client';

import * as React from 'react';
import { useHistory } from '@/contexts/HistoryContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    Image as ImageIcon
} from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import type { TaskRecord, HistoryMetadata } from '@/lib/types';

interface TaskHistoryPanelProps {
    onSelectImage: (item: HistoryMetadata) => void;
    onSelectTask: (taskId: string) => void;
}

const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
};

export function TaskHistoryPanel({ onSelectImage, onSelectTask }: TaskHistoryPanelProps) {
    const { tasks, history, getImageSrc, handleDeleteHistoryItem } = useHistory();

    // 合并任务和历史记录数据，按时间排序
    const combinedItems = React.useMemo(() => {
        const taskItems = tasks.map(task => ({ 
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
        
        return (
            <div className="relative bg-card/30 rounded-md border border-border p-3 hover:border-primary/50 transition-colors">
                <div className="flex items-center justify-between mb-2">
                    <div className={`flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] text-card-foreground ${statusClass}`}>
                        <StatusIcon size={12} className={isLoading ? 'animate-spin' : ''} />
                        <span>{statusText}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">{formatDate(task.timestamp)}</div>
                </div>
                
                <div className="flex items-center gap-2 mb-2">
                    {task.mode === 'edit' ? (
                        <Pencil size={14} className="text-orange-500" />
                    ) : (
                        <Sparkles size={14} className="text-blue-500" />
                    )}
                    <span className="text-sm font-medium text-card-foreground">
                        {task.mode === 'edit' ? '编辑图像' : '生成图像'}
                    </span>
                </div>
                
                <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{task.prompt}</p>
                
                {task.status === 'pending' || task.status === 'processing' ? (
                    <div className="w-full aspect-video flex items-center justify-center bg-background/50 rounded">
                        <ImageIcon size={24} className="text-muted-foreground opacity-50" />
                    </div>
                ) : task.status === 'failed' ? (
                    <div className="w-full aspect-video flex flex-col items-center justify-center bg-red-900/10 rounded border border-red-500/30 p-2">
                        <AlertCircle size={24} className="text-red-500/70 mb-2" />
                        <p className="text-xs text-red-400 text-center line-clamp-2">{task.error || '处理失败'}</p>
                    </div>
                ) : null}
                
                <Button 
                    variant="ghost" 
                    size="sm" 
                    className="mt-2 w-full text-xs"
                    onClick={() => onSelectTask(task.id)}
                    disabled={task.status === 'pending' || task.status === 'processing'}
                >
                    {task.status === 'completed' ? '查看结果' : task.status === 'failed' ? '查看详情' : '等待中...'}
                </Button>
            </div>
        );
    };

    const renderHistoryItem = (item: HistoryMetadata) => {
        const firstImage = item.images?.[0];
        const imageCount = item.images?.length ?? 0;
        const isMultiImage = imageCount > 1;
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
            <div className="relative group">
                <button
                    onClick={() => onSelectImage(item)}
                    className="relative block w-full overflow-hidden rounded-md border border-border transition-all duration-150 group-hover:border-primary focus:ring-2 focus:ring-border focus:ring-offset-2 focus:ring-offset-black focus:outline-none"
                    aria-label={`查看图像批次，生成于 ${new Date(item.timestamp).toLocaleString()}`}
                >
                    <div className="aspect-video">
                        {thumbnailUrl ? (
                            <Image
                                src={thumbnailUrl}
                                alt={`批次预览，生成于 ${new Date(item.timestamp).toLocaleString()}`}
                                fill
                                className="object-cover"
                                unoptimized
                            />
                        ) : (
                            <div className="flex h-full w-full items-center justify-center bg-card/10 text-card-foreground">
                                ?
                            </div>
                        )}
                    </div>
                    
                    <div
                        className={cn(
                            'absolute top-1 left-1 z-10 flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] text-card-foreground',
                            item.mode === 'edit' ? 'bg-orange-600/80' : 'bg-blue-600/80'
                        )}
                    >
                        {item.mode === 'edit' ? (
                            <Pencil size={12} />
                        ) : (
                            <Sparkles size={12} />
                        )}
                        {item.mode === 'edit' ? '编辑' : '创建'}
                    </div>
                    
                    {isMultiImage && (
                        <div className='absolute right-1 bottom-1 z-10 flex items-center gap-1 rounded-full bg-black/70 px-1.5 py-0.5 text-[12px] text-card-foreground'>
                            <Layers size={16} />
                            {imageCount}
                        </div>
                    )}
                    
                    <div className='absolute bottom-1 left-1 z-10 flex items-center gap-1'>
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
                    
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="absolute bottom-2 right-2">
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                className="bg-card/80 text-xs text-card-foreground hover:bg-card"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteHistoryItem(item);
                                }}
                            >
                                删除
                            </Button>
                        </div>
                    </div>
                </button>
                
                <div className="mt-1 text-xs text-muted-foreground truncate">
                    {formatDate(item.timestamp)}
                </div>
            </div>
        );
    };

    return (
        <Card className="w-full h-full flex flex-col overflow-hidden">
            <CardHeader className="px-4 py-3 border-b border-border">
                <CardTitle className="text-lg font-medium">生成历史</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow overflow-y-auto p-4">
                {combinedItems.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                        <p>生成的图像将显示在这里</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
    );
} 