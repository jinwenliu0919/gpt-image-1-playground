'use client';

import * as React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, ZoomIn, ZoomOut, X } from 'lucide-react';
import type { HistoryMetadata } from '@/lib/types';

interface ImagePreviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  historyItem: HistoryMetadata | null;
  selectedImageIndex?: number;
  getImageSrc: (filename: string) => string | undefined;
}

export function ImagePreviewDialog({
  isOpen,
  onClose,
  historyItem,
  selectedImageIndex = 0,
  getImageSrc
}: ImagePreviewDialogProps) {
  const [currentImageIndex, setCurrentImageIndex] = React.useState(selectedImageIndex);
  const [scale, setScale] = React.useState(1);
  
  // 重置状态当对话框打开或切换图片时
  React.useEffect(() => {
    if (isOpen) {
      setCurrentImageIndex(selectedImageIndex);
      setScale(1);
    }
  }, [isOpen, selectedImageIndex]);

  // 如果没有历史记录项或图片，则不显示对话框
  if (!historyItem || !historyItem.images || historyItem.images.length === 0) {
    return null;
  }

  const images = historyItem.images;
  const currentImage = images[currentImageIndex];
  
  // 获取当前图片的URL
  let imageUrl: string | undefined;
  if (historyItem.storageModeUsed === 'indexeddb') {
    imageUrl = getImageSrc(currentImage.filename);
  } else {
    imageUrl = `/api/image/${currentImage.filename}`;
  }

  // 处理缩放功能
  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.25, 3)); // 最大放大3倍
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.25, 0.5)); // 最小缩小到0.5倍
  };

  // 处理下载功能
  const handleDownload = async () => {
    if (!imageUrl) return;
    
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = currentImage.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // 清理Blob URL
      setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
    } catch (error) {
      console.error('下载图片失败:', error);
    }
  };

  // 处理图片切换
  const handlePrevImage = () => {
    setCurrentImageIndex(prev => (prev > 0 ? prev - 1 : images.length - 1));
    setScale(1); // 重置缩放
  };

  const handleNextImage = () => {
    setCurrentImageIndex(prev => (prev < images.length - 1 ? prev + 1 : 0));
    setScale(1); // 重置缩放
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl w-[90vw] max-h-[90vh] p-0 overflow-hidden bg-black/90 border-border">
        {/* 关闭按钮 */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 z-50 text-white bg-black/40 hover:bg-black/60 rounded-full"
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </Button>
        
        {/* 工具栏 */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-2 bg-black/60 rounded-full px-4 py-2 z-40">
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white hover:bg-white/20 rounded-full"
            onClick={handleZoomOut}
          >
            <ZoomOut className="h-5 w-5" />
          </Button>
          
          <span className="text-white text-xs px-2">{Math.round(scale * 100)}%</span>
          
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white hover:bg-white/20 rounded-full"
            onClick={handleZoomIn}
          >
            <ZoomIn className="h-5 w-5" />
          </Button>
          
          <div className="w-px h-6 bg-white/30 mx-2" />
          
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white hover:bg-white/20 rounded-full"
            onClick={handleDownload}
          >
            <Download className="h-5 w-5" />
          </Button>
        </div>
        
        {/* 图片导航 (如果有多张图片) */}
        {images.length > 1 && (
          <div className="absolute bottom-4 right-4 bg-black/60 rounded-full px-3 py-1 text-white text-xs">
            {currentImageIndex + 1} / {images.length}
          </div>
        )}
        
        {/* 图片显示区域 */}
        <div 
          className="w-full h-full flex items-center justify-center overflow-auto"
          style={{ 
            cursor: scale > 1 ? 'move' : 'default',
          }}
        >
          {imageUrl ? (
            <div 
              className="relative transition-transform duration-200 ease-out"
              style={{ 
                transform: `scale(${scale})`,
              }}
            >
              <img
                src={imageUrl}
                alt={`图片 ${currentImageIndex + 1}，生成于 ${new Date(historyItem.timestamp).toLocaleString()}`}
                className="max-h-[85vh] max-w-full object-contain"
                style={{ 
                  margin: '0 auto',
                }}
              />
            </div>
          ) : (
            <div className="text-white">图片加载失败</div>
          )}
        </div>
        
        {/* 左右箭头 (如果有多张图片) */}
        {images.length > 1 && (
          <>
            <Button 
              variant="ghost" 
              className="absolute left-2 top-1/2 -translate-y-1/2 text-white bg-black/40 hover:bg-black/60 h-10 w-10 rounded-full p-0"
              onClick={handlePrevImage}
            >
              &lt;
            </Button>
            <Button 
              variant="ghost" 
              className="absolute right-2 top-1/2 -translate-y-1/2 text-white bg-black/40 hover:bg-black/60 h-10 w-10 rounded-full p-0"
              onClick={handleNextImage}
            >
              &gt;
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
} 