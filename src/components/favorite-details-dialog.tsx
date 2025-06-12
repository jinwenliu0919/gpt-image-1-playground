'use client';

import * as React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useHistory } from '@/contexts/HistoryContext';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
    Star,
    MessageSquare,
    Calendar,
    Settings,
    FileType,
    Copy,
    Check,
    Paintbrush
} from 'lucide-react';
import type { HistoryMetadata } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { Badge } from './ui/badge';

interface FavoriteDetailsDialogProps {
    isOpen: boolean;
    onClose: () => void;
    historyItem: HistoryMetadata | null;
}

export function FavoriteDetailsDialog({ isOpen, onClose, historyItem }: FavoriteDetailsDialogProps) {
    const router = useRouter();
    const { getFavoriteId, updateFavoriteNote, favorites } = useHistory();
    const [note, setNote] = React.useState('');
    const [isSaving, setIsSaving] = React.useState(false);
    const [isCopied, setIsCopied] = React.useState(false);

    // 当选中的项目变化时，更新备注
    React.useEffect(() => {
        if (historyItem) {
            const favoriteId = getFavoriteId(historyItem.timestamp);
            const favorite = favorites.find(f => f.id === favoriteId);
            setNote(favorite?.note || '');
        } else {
            setNote('');
        }
    }, [historyItem, favorites, getFavoriteId]);

    // 保存备注
    const handleSaveNote = async () => {
        if (!historyItem) return;
        
        const favoriteId = getFavoriteId(historyItem.timestamp);
        if (!favoriteId) return;
        
        setIsSaving(true);
        try {
            await updateFavoriteNote(favoriteId, note);
        } catch (err) {
            console.error('保存备注失败:', err);
        } finally {
            setIsSaving(false);
        }
    };

    // 复制提示词
    const handleCopyPrompt = async () => {
        if (!historyItem?.prompt) return;
        
        try {
            await navigator.clipboard.writeText(historyItem.prompt);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        } catch (err) {
            console.error('复制提示词失败:', err);
        }
    };

    // 应用参数到生成表单
    const handleApplyToForm = () => {
        if (!historyItem) return;
        
        // 将参数存储到 localStorage，然后跳转到首页
        localStorage.setItem('applyFavoriteParams', JSON.stringify({
            prompt: historyItem.prompt,
            mode: historyItem.mode,
            quality: historyItem.quality,
            background: historyItem.background,
            moderation: historyItem.moderation,
            output_format: historyItem.output_format
        }));
        
        // 关闭对话框并跳转到首页
        onClose();
        router.push('/');
    };

    if (!historyItem) return null;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Star size={18} className="text-yellow-400 fill-yellow-400" />
                        收藏详情
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 mt-2">
                    {/* 提示词部分 */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <MessageSquare size={16} className="text-muted-foreground" />
                            <h3 className="text-sm font-medium">提示词</h3>
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                className="ml-auto h-7 px-2"
                                onClick={handleCopyPrompt}
                            >
                                {isCopied ? (
                                    <>
                                        <Check size={14} className="mr-1" />
                                        已复制
                                    </>
                                ) : (
                                    <>
                                        <Copy size={14} className="mr-1" />
                                        复制
                                    </>
                                )}
                            </Button>
                        </div>
                        <div className="bg-muted p-3 rounded-md text-sm max-h-[250px] overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
                            {historyItem.prompt}
                        </div>
                    </div>

                    {/* 参数信息 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <Settings size={16} className="text-muted-foreground" />
                                <h3 className="text-sm font-medium">生成参数</h3>
                            </div>
                            <div className="bg-muted p-3 rounded-md space-y-2">
                                <div className="flex justify-between text-xs">
                                    <span className="text-muted-foreground">模式:</span>
                                    <Badge variant="outline">
                                        {historyItem.mode === 'edit' ? '编辑图像' : historyItem.mode === 'completion' ? '图像补全' : '生成图像'}
                                    </Badge>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-muted-foreground">质量:</span>
                                    <Badge variant="outline">{historyItem.quality}</Badge>
                                </div>
                                {historyItem.background && (
                                    <div className="flex justify-between text-xs">
                                        <span className="text-muted-foreground">背景:</span>
                                        <Badge variant="outline">{historyItem.background}</Badge>
                                    </div>
                                )}
                                {historyItem.moderation && (
                                    <div className="flex justify-between text-xs">
                                        <span className="text-muted-foreground">内容审核:</span>
                                        <Badge variant="outline">{historyItem.moderation}</Badge>
                                    </div>
                                )}
                                {historyItem.output_format && (
                                    <div className="flex justify-between text-xs">
                                        <span className="text-muted-foreground">输出格式:</span>
                                        <Badge variant="outline">{historyItem.output_format}</Badge>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <FileType size={16} className="text-muted-foreground" />
                                <h3 className="text-sm font-medium">图片信息</h3>
                            </div>
                            <div className="bg-muted p-3 rounded-md space-y-2">
                                <div className="flex justify-between text-xs">
                                    <span className="text-muted-foreground">图片数量:</span>
                                    <Badge variant="outline">{historyItem.images.length}张</Badge>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-muted-foreground">生成时间:</span>
                                    <Badge variant="outline">{new Date(historyItem.timestamp).toLocaleString()}</Badge>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-muted-foreground">处理耗时:</span>
                                    <Badge variant="outline">{(historyItem.durationMs / 1000).toFixed(1)}秒</Badge>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-muted-foreground">存储模式:</span>
                                    <Badge variant="outline">{historyItem.storageModeUsed === 'indexeddb' ? '浏览器数据库' : '文件系统'}</Badge>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 备注部分 */}
                    {false && (<div className="space-y-2">
                        <Label htmlFor="note" className="flex items-center gap-2">
                            <Calendar size={16} className="text-muted-foreground" />
                            备注
                        </Label>
                        <Textarea 
                            id="note"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="添加备注..."
                            className="min-h-[80px]"
                        />
                        <div className="flex justify-end">
                            <Button 
                                variant="outline" 
                                size="sm"
                                onClick={handleSaveNote}
                                disabled={isSaving}
                            >
                                {isSaving ? '保存中...' : '保存备注'}
                            </Button>
                        </div>
                    </div>)}

                    {/* 操作按钮 */}
                    <div className="flex justify-between pt-4 border-t">
                        <Button variant="outline" onClick={onClose}>
                            关闭
                        </Button>
                        <Button onClick={handleApplyToForm} className="gap-1">
                            <Paintbrush size={16} />
                            应用参数到表单
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
} 