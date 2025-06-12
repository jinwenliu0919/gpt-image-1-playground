'use client';

import * as React from 'react';
import { useHistory } from '@/contexts/HistoryContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ImagePreviewDialog } from '@/components/image-preview-dialog';
import { FavoriteDetailsDialog } from '@/components/favorite-details-dialog';
import {
    Star,
    Trash2,
    MessageSquare,
    ArrowLeft,
    Grid3X3,
    List
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import type { HistoryMetadata } from '@/lib/types';

export default function FavoritesPage() {
    const {
        favoriteItems,
        getImageSrc,
        error,
        removeFromFavorites,
        getFavoriteId
    } = useHistory();

    const [viewMode, setViewMode] = React.useState<'grid' | 'list'>('grid');
    const [previewDialogOpen, setPreviewDialogOpen] = React.useState(false);
    const [detailsDialogOpen, setDetailsDialogOpen] = React.useState(false);
    const [selectedItem, setSelectedItem] = React.useState<HistoryMetadata | null>(null);
    const [selectedImageIndex, setSelectedImageIndex] = React.useState(0);

    // 处理图片点击事件
    const handleImageClick = (item: HistoryMetadata, imageIndex: number) => {
        setSelectedItem(item);
        setSelectedImageIndex(imageIndex);
        setPreviewDialogOpen(true);
    };

    // 处理查看详情事件
    const handleViewDetails = (item: HistoryMetadata) => {
        setSelectedItem(item);
        setDetailsDialogOpen(true);
    };

    // 处理移除收藏
    const handleRemoveFavorite = async (item: HistoryMetadata) => {
        try {
            const favoriteId = getFavoriteId(item.timestamp);
            if (favoriteId) {
                await removeFromFavorites(favoriteId);
            }
        } catch (err) {
            console.error('移除收藏失败:', err);
        }
    };

    // 渲染网格视图
    const renderGridView = () => {
        if (favoriteItems.length === 0) {
            return (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                    <p>暂无收藏作品</p>
                </div>
            );
        }

        return (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-1">
                {favoriteItems.map((item) => {
                    const firstImage = item.images[0];
                    let thumbnailUrl: string | undefined;
                    
                    if (item.storageModeUsed === 'indexeddb') {
                        thumbnailUrl = getImageSrc(firstImage.filename);
                    } else {
                        thumbnailUrl = `/api/image/${firstImage.filename}`;
                    }

                    return (
                        <div 
                            key={item.timestamp}
                            className="relative group rounded-md overflow-hidden bg-card/30 hover:bg-card/50 transition-colors"
                        >
                            <div className="aspect-[3/4] relative overflow-hidden">
                                {thumbnailUrl ? (
                                    <Image
                                        src={thumbnailUrl}
                                        alt={`图片生成于 ${new Date(item.timestamp).toLocaleString()}`}
                                        fill
                                        className="object-cover"
                                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 40vw, 33vw"
                                        onClick={() => handleImageClick(item, 0)}
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-muted">
                                        <span className="text-muted-foreground">图片不可用</span>
                                    </div>
                                )}
                            </div>
                            
                            {/* 悬停时显示的操作按钮 */}
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-4">
                                <p className="text-white text-sm line-clamp-2 mb-2">{item.prompt}</p>
                                <div className="flex gap-2">
                                    <Button 
                                        variant="secondary" 
                                        size="sm"
                                        onClick={() => handleViewDetails(item)}
                                    >
                                        查看详情
                                    </Button>
                                    <Button 
                                        variant="destructive" 
                                        size="sm"
                                        onClick={() => handleRemoveFavorite(item)}
                                    >
                                        <Trash2 size={14} className="mr-1" />
                                        移除
                                    </Button>
                                </div>
                            </div>
                            
                            {/* 底部信息栏 */}
                            <div className="absolute bottom-0 left-0 right-0 bg-black/70 p-2 text-xs text-white">
                                <div className="flex justify-between items-center">
                                    <span>{new Date(item.timestamp).toLocaleDateString()}</span>
                                    <span>{item.images.length}张图片</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    // 渲染列表视图
    const renderListView = () => {
        if (favoriteItems.length === 0) {
            return (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                    <p>暂无收藏作品</p>
                </div>
            );
        }

        return (
            <div className="flex flex-col gap-4">
                {favoriteItems.map((item) => {
                    const images = item.images || [];
                    const originalStorageMode = item.storageModeUsed || 'fs';

                    return (
                        <div 
                            key={item.timestamp}
                            className="relative rounded-md overflow-hidden bg-card/30 hover:bg-card/50 transition-colors p-4"
                        >
                            <div className="flex flex-col md:flex-row gap-4">
                                {/* 图片预览区域 */}
                                <div className="flex-shrink-0 flex gap-2 overflow-x-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
                                    {images.map((img, index) => {
                                        let imgUrl: string | undefined;
                                        if (originalStorageMode === 'indexeddb') {
                                            imgUrl = getImageSrc(img.filename);
                                        } else {
                                            imgUrl = `/api/image/${img.filename}`;
                                        }

                                        return (
                                            <button
                                                key={img.filename}
                                                onClick={() => handleImageClick(item, index)}
                                                className="relative rounded-md overflow-hidden hover:bg-card/80 focus:outline-none focus:ring-1 focus:ring-primary flex-shrink-0"
                                            >
                                                <div className="flex items-center justify-center">
                                                    {imgUrl ? (
                                                        <Image
                                                            src={imgUrl}
                                                            alt={`图片 ${index + 1}，生成于 ${new Date(item.timestamp).toLocaleString()}`}
                                                            width={120}
                                                            height={120}
                                                            className="w-auto h-auto object-contain"
                                                            style={{ maxHeight: '120px', maxWidth: '120px' }}
                                                            unoptimized
                                                        />
                                                    ) : (
                                                        <div className="flex h-[120px] w-[120px] items-center justify-center bg-card/10 text-card-foreground">
                                                            <span className="text-muted-foreground">不可用</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* 信息区域 */}
                                <div className="flex-grow">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Star size={16} className="text-yellow-400 fill-yellow-400" />
                                        <h3 className="text-sm font-medium">收藏于 {new Date(item.timestamp).toLocaleString()}</h3>
                                    </div>
                                    
                                    <div className="flex items-center gap-2 mb-2">
                                        <MessageSquare size={14} className="text-muted-foreground flex-shrink-0" />
                                        <p className="text-xs text-muted-foreground line-clamp-2 overflow-hidden break-words">{item.prompt}</p>
                                    </div>
                                    
                                    <div className="flex items-center gap-2 mt-4">
                                        <Button 
                                            variant="outline" 
                                            size="sm"
                                            onClick={() => handleViewDetails(item)}
                                        >
                                            查看详情
                                        </Button>
                                        <Button 
                                            variant="destructive" 
                                            size="sm"
                                            onClick={() => handleRemoveFavorite(item)}
                                        >
                                            <Trash2 size={14} className="mr-1" />
                                            移除收藏
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <main className="w-full bg-background p-4 text-foreground min-h-[calc(100vh-80px)]">
            <div className="max-w-7xl mx-auto">
                {/* 页面标题 */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                        <Link href="/" className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
                            <ArrowLeft size={16} />
                            <span className='text-xl'>返回</span>
                        </Link>
                        <h1 className="text-xl font-bold ml-4">我的收藏</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant={viewMode === 'grid' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setViewMode('grid')}
                            className="h-8 w-8 p-0"
                        >
                            <Grid3X3 size={16} />
                        </Button>
                        <Button
                            variant={viewMode === 'list' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setViewMode('list')}
                            className="h-8 w-8 p-0"
                        >
                            <List size={16} />
                        </Button>
                    </div>
                </div>

                {/* 错误提示 */}
                {error && (
                    <Alert variant="destructive" className="mb-4 border-red-500/50 bg-red-900/20 text-red-300">
                        <AlertTitle className="text-red-200">错误</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                {/* 内容区域 */}
                <Card className="w-full">
                    <CardContent className="p-4">
                        {viewMode === 'grid' ? renderGridView() : renderListView()}
                    </CardContent>
                </Card>
            </div>

            {/* 图片预览对话框 */}
            <ImagePreviewDialog
                isOpen={previewDialogOpen}
                onClose={() => setPreviewDialogOpen(false)}
                historyItem={selectedItem}
                selectedImageIndex={selectedImageIndex}
                getImageSrc={getImageSrc}
            />

            {/* 收藏详情对话框 */}
            <FavoriteDetailsDialog
                isOpen={detailsDialogOpen}
                onClose={() => setDetailsDialogOpen(false)}
                historyItem={selectedItem}
            />
        </main>
    );
} 