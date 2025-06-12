'use client';

import * as React from 'react';
import { useHistory } from '@/contexts/HistoryContext';
import { Card, CardContent    } from '@/components/ui/card';
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
    Trash2
} from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import type { TaskRecord, HistoryMetadata } from '@/lib/types';
import { ImagePreviewDialog } from '@/components/image-preview-dialog';

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
    const { tasks, history, getImageSrc, handleDeleteHistoryItem } = useHistory();
    // 添加图片预览状态
    const [previewDialogOpen, setPreviewDialogOpen] = React.useState(false);
    const [selectedHistoryItem, setSelectedHistoryItem] = React.useState<HistoryMetadata | null>(null);
    const [selectedImageIndex, setSelectedImageIndex] = React.useState(0);

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

    // 处理图片点击事件
    const handleImageClick = (item: HistoryMetadata, imageIndex: number) => {
        setSelectedHistoryItem(item);
        setSelectedImageIndex(imageIndex);
        setPreviewDialogOpen(true);
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
        
        return (
            <div className="relative bg-card/50 rounded-md p-3 hover:bg-card/70 transition-colors shadow-sm">
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
                    <div className="w-full aspect-video flex flex-col items-center justify-center bg-red-900/10 rounded p-2">
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
        const images = item.images || [];
        const imageCount = images.length;
        const originalStorageMode = item.storageModeUsed || 'fs';
        const outputFormat = item.output_format || 'png';

        return (
            <div className="relative rounded-md overflow-hidden bg-background/50 hover:bg-background/70 transition-colors shadow-sm">
                {/* 顶部标题栏 - 显示时间和模式 */}
                <div className="flex items-center justify-between p-2 bg-card/30">
                    <div className="flex items-center gap-2 text-sm">
                        <Clock size={14} className="text-muted-foreground" />
                        <span className="text-muted-foreground">{formatDate(item.timestamp)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className={cn(
                            'flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] text-card-foreground',
                            item.mode === 'edit' ? 'bg-orange-600/80' : 'bg-blue-600/80'
                        )}>
                            {item.mode === 'edit' ? (
                                <Pencil size={12} />
                            ) : (
                                <Sparkles size={12} />
                            )}
                            {item.mode === 'edit' ? '编辑' : '创建'}
                        </div>
                        
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
                    <div className="flex items-start gap-2">
                        <MessageSquare size={14} className="text-muted-foreground mt-1 flex-shrink-0" />
                        <p className="text-xs text-muted-foreground line-clamp-2 overflow-x-auto whitespace-nowrap scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent pb-1">{item.prompt}</p>
                    </div>
                </div>
                
                {/* 图片网格区域 - 使用水平滚动 */}
                <div className="p-2 overflow-x-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
                    <div className="flex gap-2" style={{ minWidth: 'min-content' }}>
                        {images.map((img, index) => {
                            let thumbnailUrl: string | undefined;
                            if (originalStorageMode === 'indexeddb') {
                                thumbnailUrl = getImageSrc(img.filename);
                            } else {
                                thumbnailUrl = `/api/image/${img.filename}`;
                            }
                            
                            return (
                                <button
                                    key={img.filename}
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
                                                <ImageIcon size={24} className="text-muted-foreground opacity-50" />
                                            </div>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
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
                    </div>
                    
                    <div className="flex items-center gap-1">
                        <Layers size={14} className="text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{imageCount} 张图片</span>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <>
            <Card className="w-full h-full flex flex-col overflow-hidden">
                {/* <CardHeader className="px-4 py-3 border-b border-border flex-shrink-0">
                    <CardTitle className="text-lg font-medium">生成历史</CardTitle>
                </CardHeader> */}
                <CardContent className="flex-grow overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
                    {combinedItems.length === 0 ? (
                        <div className="flex h-full items-center justify-center text-muted-foreground bg-background/50">
                            <p>生成的图像将显示在这里</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4">
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
            
            {/* 图片预览对话框 */}
            <ImagePreviewDialog 
                isOpen={previewDialogOpen}
                onClose={() => setPreviewDialogOpen(false)}
                historyItem={selectedHistoryItem}
                selectedImageIndex={selectedImageIndex}
                getImageSrc={getImageSrc}
            />
        </>
    );
}