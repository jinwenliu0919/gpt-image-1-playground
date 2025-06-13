'use client';

import * as React from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, ZoomIn, ZoomOut, X, Maximize2, AlertCircle } from 'lucide-react';
import type { HistoryMetadata } from '@/lib/types';
import { VisuallyHidden } from './ui/visually-hidden';

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
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const [imageSize, setImageSize] = React.useState<{ width: number, height: number } | null>(null);
  const [imageError, setImageError] = React.useState<string | null>(null);
  const imageRef = React.useRef<HTMLImageElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  
  // 重置状态当对话框打开或切换图片时
  React.useEffect(() => {
    if (isOpen) {
      setCurrentImageIndex(selectedImageIndex);
      setScale(1);
      setImageSize(null);
      setImageError(null);
    }
  }, [isOpen, selectedImageIndex]);

  // 当切换全屏模式时，确保容器居中
  React.useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTo(0, 0);
    }
  }, [isFullscreen]);

  // 安全检查：如果没有历史记录项或图片，则不显示对话框
  if (!historyItem) {
    return null;
  }

  // 安全检查：确保images数组存在
  const images = historyItem.images || [];
  if (images.length === 0) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="p-4 bg-background">
          <DialogTitle>图片预览错误</DialogTitle>
          <div className="flex flex-col items-center justify-center p-8 gap-4">
            <AlertCircle className="h-12 w-12 text-red-500" />
            <p className="text-center">无法加载图片，未找到图片数据</p>
            <Button onClick={onClose}>关闭</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // 安全检查：确保当前索引有效
  const safeIndex = Math.max(0, Math.min(currentImageIndex, images.length - 1));
  if (safeIndex !== currentImageIndex) {
    setCurrentImageIndex(safeIndex);
  }
  
  // 安全检查：确保当前图片对象存在
  const currentImage = images[safeIndex];
  if (!currentImage) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="p-4 bg-background">
          <DialogTitle>图片预览错误</DialogTitle>
          <div className="flex flex-col items-center justify-center p-8 gap-4">
            <AlertCircle className="h-12 w-12 text-red-500" />
            <p className="text-center">无法加载图片，图片数据不完整</p>
            <Button onClick={onClose}>关闭</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }
  
  // 安全检查：确保filename存在
  if (!currentImage.filename) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="p-4 bg-background">
          <DialogTitle>图片预览错误</DialogTitle>
          <div className="flex flex-col items-center justify-center p-8 gap-4">
            <AlertCircle className="h-12 w-12 text-red-500" />
            <p className="text-center">无法加载图片，文件名缺失</p>
            <Button onClick={onClose}>关闭</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }
  
  // 获取当前图片的URL
  let imageUrl: string | undefined;
  try {
    console.log(`[图片预览] 当前图片信息:`, {
      filename: currentImage.filename,
      storageModeUsed: historyItem.storageModeUsed,
      hasUrl: !!currentImage.url,
      url: currentImage.url
    });
    
    if (historyItem.storageModeUsed === 'indexeddb') {
      imageUrl = getImageSrc(currentImage.filename);
      console.log(`[图片预览] IndexedDB模式 - 获取到URL: ${imageUrl}`);
    } else if (historyItem.storageModeUsed === 's3') {
      // 使用S3 URL
      imageUrl = getImageSrc(currentImage.filename);
      console.log(`[图片预览] S3模式 - 获取到URL: ${imageUrl}`);
      
      // 如果getImageSrc没有返回URL但图片对象有url属性，则直接使用它
      if (!imageUrl && currentImage.url) {
        imageUrl = currentImage.url;
        console.log(`[图片预览] S3模式 - 使用图片对象自带的URL: ${imageUrl}`);
      }
    } else {
      imageUrl = `/api/image/${currentImage.filename}`;
      console.log(`[图片预览] 文件系统模式 - 使用API路径: ${imageUrl}`);
    }
  } catch (error) {
    console.error('获取图片URL时出错:', error);
    setImageError('获取图片URL时出错');
  }

  // 处理缩放功能
  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.25, 3)); // 最大放大3倍
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.25, 0.5)); // 最小缩小到0.5倍
  };

  // 处理全屏功能
  const toggleFullscreen = () => {
    setIsFullscreen(prev => !prev);
    setScale(1); // 重置缩放
  };

  // 处理图片加载完成，获取尺寸
  const handleImageLoad = () => {
    if (imageRef.current) {
      setImageSize({
        width: imageRef.current.naturalWidth,
        height: imageRef.current.naturalHeight
      });
      setImageError(null);
    }
  };

  // 处理图片加载错误
  const handleImageError = () => {
    setImageError('图片加载失败');
    console.error('图片加载失败:', currentImage.filename);
  };

  // 处理下载功能
  const handleDownload = async () => {
    if (!imageUrl || !currentImage.filename) {
      setImageError('无法下载图片，URL或文件名缺失');
      return;
    }
    
    try {
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
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
      setImageError('下载图片失败');
    }
  };

  // 处理图片切换
  const handlePrevImage = () => {
    if (images.length <= 1) return;
    
    const newIndex = safeIndex > 0 ? safeIndex - 1 : images.length - 1;
    setCurrentImageIndex(newIndex);
    setScale(1); // 重置缩放
    setImageSize(null); // 重置图片尺寸
    setImageError(null); // 重置错误状态
  };

  const handleNextImage = () => {
    if (images.length <= 1) return;
    
    const newIndex = safeIndex < images.length - 1 ? safeIndex + 1 : 0;
    setCurrentImageIndex(newIndex);
    setScale(1); // 重置缩放
    setImageSize(null); // 重置图片尺寸
    setImageError(null); // 重置错误状态
  };

  // 计算图片容器样式，根据图片尺寸和窗口大小调整
  const getImageContainerStyle = () => {
    if (!imageSize) return {};
    
    // 获取视窗尺寸
    const viewportWidth = isFullscreen 
      ? window.innerWidth * 0.95 // 全屏模式使用95%宽度
      : window.innerWidth * 0.9; // 普通模式使用90%宽度
    
    const viewportHeight = isFullscreen 
      ? window.innerHeight * 0.9 // 全屏模式使用90%高度
      : window.innerHeight * 0.85; // 普通模式使用85%高度
    
    // 计算图片比例
    const imageRatio = imageSize.width / imageSize.height;
    
    // 如果图片宽度大于高度
    if (imageRatio > 1) {
      // 如果图片宽度超过视窗宽度
      if (imageSize.width > viewportWidth) {
        return {
          width: `${viewportWidth}px`,
          height: 'auto',
        };
      }
    } else {
      // 如果图片高度超过视窗高度
      if (imageSize.height > viewportHeight) {
        return {
          width: 'auto',
          height: `${viewportHeight}px`,
        };
      }
    }
    
    // 如果图片尺寸小于视窗，保持原始尺寸
    return {
      width: `${imageSize.width}px`,
      height: `${imageSize.height}px`,
    };
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent 
        className={`p-0 overflow-hidden bg-black/90 border-border ${
          isFullscreen 
            ? 'max-w-none w-screen h-screen max-h-screen fixed inset-0 rounded-none' 
            : 'max-w-5xl w-[90vw] max-h-[90vh]'
        }`}
      >
        <VisuallyHidden>
          <DialogTitle>图片预览</DialogTitle>
        </VisuallyHidden>
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
            onClick={toggleFullscreen}
          >
            <Maximize2 className="h-5 w-5" />
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
            {safeIndex + 1} / {images.length}
          </div>
        )}
        
        {/* 图片显示区域 */}
        <div 
          ref={containerRef}
          className="w-full h-full flex items-center justify-center overflow-auto"
          style={{ 
            cursor: scale > 1 ? 'move' : 'default',
          }}
        >
          {imageUrl && !imageError ? (
            <div 
              className="relative transition-transform duration-200 ease-out flex items-center justify-center min-h-full min-w-full"
              style={{ 
                transform: `scale(${scale})`,
              }}
            >
              <img
                ref={imageRef}
                src={imageUrl}
                alt={`图片 ${safeIndex + 1}，生成于 ${new Date(historyItem.timestamp).toLocaleString()}`}
                className="object-contain"
                style={{ 
                  ...getImageContainerStyle(),
                  margin: 'auto',
                }}
                onLoad={handleImageLoad}
                onError={handleImageError}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 gap-4">
              <AlertCircle className="h-12 w-12 text-red-500" />
              <div className="text-white text-center">{imageError || '图片加载失败'}</div>
              <Button variant="outline" onClick={onClose}>关闭</Button>
            </div>
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