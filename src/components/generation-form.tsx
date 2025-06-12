'use client';

import { ModeToggle } from '@/components/mode-toggle';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
    Square,
    RectangleHorizontal,
    RectangleVertical,
    Sparkles,
    Eraser,
    ShieldCheck,
    ShieldAlert,
    FileImage,
    Tally1,
    Tally2,
    Tally3,
    Loader2,
    BrickWall,
    Lock,
    LockOpen,
    Link,
    Unlink,
    Upload,
    X
} from 'lucide-react';
import * as React from 'react';

export type AspectRatio = '1:1' | '16:9' | '4:3' | '3:2' | '3:4' | '2:3' | '9:16' | 'custom';

export type GenerationFormData = {
    prompt: string;
    n: number;
    size: '1024x1024' | '1536x1024' | '1024x1536' | 'auto';
    aspectRatio: AspectRatio;
    width?: number;
    height?: number;
    quality: 'low' | 'medium' | 'high' | 'auto';
    output_format: 'png' | 'jpeg' | 'webp';
    output_compression?: number;
    background: 'transparent' | 'opaque' | 'auto';
    moderation: 'low' | 'auto';
    reference_images?: File[];
};

type GenerationFormProps = {
    onSubmit: (data: GenerationFormData) => void;
    isLoading: boolean;
    currentMode: 'generate' | 'edit' | 'completion';
    onModeChange: (mode: 'generate' | 'edit') => void;
    isPasswordRequiredByBackend: boolean | null;
    clientPasswordHash: string | null;
    onOpenPasswordDialog: () => void;
    prompt: string;
    setPrompt: React.Dispatch<React.SetStateAction<string>>;
    n: number[];
    setN: React.Dispatch<React.SetStateAction<number[]>>;
    size: GenerationFormData['size'];
    setSize: React.Dispatch<React.SetStateAction<GenerationFormData['size']>>;
    aspectRatio: AspectRatio;
    setAspectRatio: React.Dispatch<React.SetStateAction<AspectRatio>>;
    width: number;
    setWidth: React.Dispatch<React.SetStateAction<number>>;
    height: number;
    setHeight: React.Dispatch<React.SetStateAction<number>>;
    quality: GenerationFormData['quality'];
    setQuality: React.Dispatch<React.SetStateAction<GenerationFormData['quality']>>;
    outputFormat: GenerationFormData['output_format'];
    setOutputFormat: React.Dispatch<React.SetStateAction<GenerationFormData['output_format']>>;
    compression: number[];
    setCompression: React.Dispatch<React.SetStateAction<number[]>>;
    background: GenerationFormData['background'];
    setBackground: React.Dispatch<React.SetStateAction<GenerationFormData['background']>>;
    moderation: GenerationFormData['moderation'];
    setModeration: React.Dispatch<React.SetStateAction<GenerationFormData['moderation']>>;
    referenceImage: File | null;
    setReferenceImage: React.Dispatch<React.SetStateAction<File | null>>;
    referenceImages: File[];
    setReferenceImages: React.Dispatch<React.SetStateAction<File[]>>;
};

const RadioItemWithIcon = ({
    value,
    id,
    label,
    Icon
}: {
    value: string;
    id: string;
    label: string;
    Icon: React.ElementType;
}) => (
    <div className='flex items-center space-x-2'>
        <RadioGroupItem
            value={value}
            id={id}
            className='border-muted-foreground text-card-foreground data-[state=checked]:border-card-foreground data-[state=checked]:text-card-foreground'
        />
        <Label htmlFor={id} className='flex cursor-pointer items-center gap-2 text-sm text-muted-foreground'>
            <Icon className='h-4 w-4 text-muted-foreground' />
            {label}
        </Label>
    </div>
);

export function GenerationForm({
    onSubmit,
    isLoading,
    currentMode,
    onModeChange,
    isPasswordRequiredByBackend,
    clientPasswordHash,
    onOpenPasswordDialog,
    prompt,
    setPrompt,
    n,
    setN,
    size,
    setSize,
    aspectRatio,
    setAspectRatio,
    width,
    setWidth,
    height,
    setHeight,
    quality,
    setQuality,
    outputFormat,
    setOutputFormat,
    compression,
    setCompression,
    background,
    setBackground,
    moderation,
    setModeration,
    referenceImage,
    setReferenceImage,
    referenceImages,
    setReferenceImages
}: GenerationFormProps) {
    const showCompression = outputFormat === 'jpeg' || outputFormat === 'webp';
    const [isCustomSize, setIsCustomSize] = React.useState(aspectRatio === 'custom');
    const [maintainAspectRatio, setMaintainAspectRatio] = React.useState(true);
    const [referenceImagePreviews, setReferenceImagePreviews] = React.useState<string[]>([]);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    React.useEffect(() => {
        setIsCustomSize(aspectRatio === 'custom');
    }, [aspectRatio]);

    // 兼容单张图片的情况
    React.useEffect(() => {
        if (referenceImage) {
            setReferenceImages([referenceImage]);
        } else if (referenceImages.length === 0) {
            // 如果referenceImages为空且referenceImage为null，不做操作
        } else {
            // 如果referenceImage为null但referenceImages不为空，则清空referenceImages
            setReferenceImages([]);
        }
    }, [referenceImage]);

    // 生成预览图片
    React.useEffect(() => {
        // 清除旧的预览URL
        referenceImagePreviews.forEach(url => {
            if (url.startsWith('blob:')) {
                URL.revokeObjectURL(url);
            }
        });
        
        setReferenceImagePreviews([]);
        
        if (referenceImages.length > 0) {
            const newPreviews = referenceImages.map(file => {
                return URL.createObjectURL(file);
            });
            setReferenceImagePreviews(newPreviews);
        }
        
        return () => {
            // 组件卸载时清除所有预览URL
            referenceImagePreviews.forEach(url => {
                if (url.startsWith('blob:')) {
                    URL.revokeObjectURL(url);
                }
            });
        };
    }, [referenceImages]);

    // 根据宽高比例计算尺寸
    React.useEffect(() => {
        if (aspectRatio !== 'custom' && aspectRatio !== undefined) {
            const [widthRatio, heightRatio] = aspectRatio.split(':').map(Number);
            if (widthRatio && heightRatio) {
                // 根据比例选择最接近的支持尺寸
                if (widthRatio > heightRatio) {
                    // 横向，使用 1536x1024
                    setWidth(1536);
                    setHeight(1024);
                    setSize('1536x1024');
                } else if (widthRatio < heightRatio) {
                    // 纵向，使用 1024x1536
                    setWidth(1024);
                    setHeight(1536);
                    setSize('1024x1536');
                } else {
                    // 正方形，使用 1024x1024
                    setWidth(1024);
                    setHeight(1024);
                    setSize('1024x1024');
                }
            }
        }
    }, [aspectRatio, setWidth, setHeight, setSize]);

    // 处理自定义宽度变化
    const handleWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newWidth = parseInt(e.target.value, 10) || 0;
        setWidth(newWidth);
        
        // 自定义尺寸时，使用auto
        setSize('auto');
    };

    // 处理自定义高度变化
    const handleHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newHeight = parseInt(e.target.value, 10) || 0;
        setHeight(newHeight);
        
        // 自定义尺寸时，使用auto
        setSize('auto');
    };

    const handleReferenceImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const newFiles = Array.from(e.target.files);
            setReferenceImages(prev => [...prev, ...newFiles]);
            
            // 为了兼容性，同时设置单张图片状态
            if (referenceImages.length === 0 && newFiles.length > 0) {
                setReferenceImage(newFiles[0]);
            }
        }
    };

    const handleRemoveReferenceImage = (indexToRemove: number) => {
        setReferenceImages(prev => prev.filter((_, index) => index !== indexToRemove));
        
        // 如果删除后没有图片，同时更新单张图片状态
        if (referenceImages.length <= 1) {
            setReferenceImage(null);
        }
        
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        
        // 确保使用支持的尺寸
        let finalSize = size;
        
        // 如果是自定义尺寸，使用auto，并传递width和height参数
        if (aspectRatio === 'custom') {
            finalSize = 'auto';
        }
        
        const formData: GenerationFormData = {
            prompt,
            n: n[0],
            size: finalSize,
            aspectRatio,
            width,
            height,
            quality,
            output_format: outputFormat,
            background,
            moderation,
            reference_images: referenceImages
        };
        if (showCompression) {
            formData.output_compression = compression[0];
        }
        onSubmit(formData);
    };

    return (
        <Card className='flex h-full w-full flex-col overflow-hidden rounded-lg border border-border bg-card gap-2'>
            <CardHeader className='flex items-start justify-between border-b border-border pb-2'>
                <div>
                    <div className='flex items-center'>
                        <CardTitle className='py-1 text-base font-medium text-card-foreground'>生成图像</CardTitle>
                        {isPasswordRequiredByBackend && (
                            <Button
                                variant='ghost'
                                size='icon'
                                onClick={onOpenPasswordDialog}
                                className='ml-2 text-muted-foreground hover:text-card-foreground'
                                aria-label='配置密码'>
                                {clientPasswordHash ? <Lock className='h-3.5 w-3.5' /> : <LockOpen className='h-3.5 w-3.5' />}
                            </Button>
                        )}
                    </div>
                    <CardDescription className='mt-1 text-xs text-muted-foreground'>
                        使用 gpt-image-1 从文本提示创建新图像。
                    </CardDescription>
                </div>
                <ModeToggle currentMode={currentMode} onModeChange={onModeChange} />
            </CardHeader>
            <form onSubmit={handleSubmit} className='flex h-full flex-1 flex-col overflow-hidden'>
                <CardContent className='flex-1 space-y-4 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent'>
                    <div className='space-y-1'>
                        <Label htmlFor='prompt' className='text-sm text-card-foreground'>
                            提示词
                        </Label>
                        <Textarea
                            id='prompt'
                            placeholder='例如：一只逼真的猫咪宇航员在太空中漂浮'
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            required
                            disabled={isLoading}
                            className='min-h-[80px] text-sm rounded-md border border-border bg-card text-card-foreground placeholder:text-muted-foreground focus:border-ring focus:ring-ring'
                        />
                    </div>

                    <div className='space-y-2'>
                        <Label className='block text-sm text-card-foreground'>参考图片</Label>
                        <Label
                            htmlFor='reference-image'
                            className='flex w-full cursor-pointer items-center justify-between rounded-md border border-border bg-card px-3 py-2 text-sm transition-colors hover:bg-card/5'>
                            <span className='truncate pr-2 text-card-foreground/60'>
                                {referenceImages.length > 0 
                                    ? `已选择 ${referenceImages.length} 张图片` 
                                    : '未选择图片'}
                            </span>
                            <span className='flex shrink-0 items-center gap-1.5 rounded-md bg-card/10 px-3 py-1 text-xs font-medium text-card-foreground/80 hover:bg-card/20'>
                                <Upload className='h-3 w-3' /> 浏览...
                            </span>
                        </Label>
                        <input
                            type='file'
                            id='reference-image'
                            ref={fileInputRef}
                            onChange={handleReferenceImageUpload}
                            accept='image/png, image/jpeg, image/webp'
                            className='sr-only'
                            multiple
                            disabled={isLoading}
                        />
                        {referenceImagePreviews.length > 0 && (
                            <div className='flex flex-wrap gap-2 mt-2 overflow-y-auto max-h-40 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent'>
                                {referenceImagePreviews.map((preview, index) => (
                                    <div key={index} className='relative w-16 h-16 rounded-md overflow-hidden border border-border'>
                                        <img
                                            src={preview}
                                            alt={`参考图片预览 ${index + 1}`}
                                            className='object-cover w-full h-full'
                                        />
                                        <Button
                                            type='button'
                                            variant='destructive'
                                            size='icon'
                                            className='absolute top-0 right-0 h-5 w-5 rounded-full bg-destructive p-0.5 text-destructive-foreground hover:bg-destructive/90'
                                            onClick={() => handleRemoveReferenceImage(index)}
                                            disabled={isLoading}
                                            aria-label={`移除参考图片 ${index + 1}`}>
                                            <X className='h-3 w-3' />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className='space-y-1.5'>
                        <Label htmlFor='n-slider' className='text-sm text-card-foreground'>
                            图像数量: {n[0]}
                        </Label>
                        <Slider
                            id='n-slider'
                            min={1}
                            max={10}
                            step={1}
                            value={n}
                            onValueChange={setN}
                            disabled={isLoading}
                            className='mt-2 [&>button]:border-background [&>button]:bg-primary [&>button]:ring-offset-background [&>span:first-child]:h-1 [&>span:first-child>span]:bg-primary'
                        />
                    </div>

                    <div className='space-y-2'>
                        <Label className='block text-sm text-card-foreground'>图片比例</Label>
                        <RadioGroup
                            value={aspectRatio}
                            onValueChange={(value) => setAspectRatio(value as AspectRatio)}
                            disabled={isLoading}
                            className='flex flex-wrap gap-x-4 gap-y-2'>
                            <RadioItemWithIcon value='1:1' id='ratio-1-1' label='1:1 (1024x1024)' Icon={Square} />
                            <RadioItemWithIcon value='3:2' id='ratio-3-2' label='3:2 (1536x1024)' Icon={RectangleHorizontal} />
                            <RadioItemWithIcon value='2:3' id='ratio-2-3' label='2:3 (1024x1536)' Icon={RectangleVertical} />
                            <RadioItemWithIcon value='custom' id='ratio-custom' label='自定义 (auto)' Icon={Sparkles} />
                        </RadioGroup>
                    </div>

                    {isCustomSize && (
                        <div className='space-y-2'>
                            <div className='flex items-center justify-between'>
                                <Label className='block text-sm text-card-foreground'>自定义尺寸</Label>
                                <Button
                                    type='button'
                                    variant='ghost'
                                    size='sm'
                                    onClick={() => setMaintainAspectRatio(!maintainAspectRatio)}
                                    className='h-8 px-2 text-xs'>
                                    {maintainAspectRatio ? (
                                        <Link className='mr-1 h-3.5 w-3.5' />
                                    ) : (
                                        <Unlink className='mr-1 h-3.5 w-3.5' />
                                    )}
                                    {maintainAspectRatio ? '保持比例' : '自由比例'}
                                </Button>
                            </div>
                            <div className='flex gap-2'>
                                <div className='w-1/2'>
                                    <Label htmlFor='width' className='text-xs text-muted-foreground'>
                                        宽度
                                    </Label>
                                    <Input
                                        id='width'
                                        type='number'
                                        min='512'
                                        max='1536'
                                        value={width}
                                        onChange={handleWidthChange}
                                        disabled={isLoading}
                                        className='h-8 text-sm'
                                    />
                                </div>
                                <div className='w-1/2'>
                                    <Label htmlFor='height' className='text-xs text-muted-foreground'>
                                        高度
                                    </Label>
                                    <Input
                                        id='height'
                                        type='number'
                                        min='512'
                                        max='1536'
                                        value={height}
                                        onChange={handleHeightChange}
                                        disabled={isLoading}
                                        className='h-8 text-sm'
                                    />
                                </div>
                            </div>
                            <p className='text-xs text-muted-foreground'>
                                尺寸: {width} x {height} (将使用 auto 模式)
                            </p>
                            <p className='text-xs text-muted-foreground'>
                                注意: 支持的固定尺寸仅有 1024x1024, 1536x1024, 1024x1536
                            </p>
                        </div>
                    )}

                    <div className='space-y-2'>
                        <Label className='block text-sm text-card-foreground'>质量</Label>
                        <RadioGroup
                            value={quality}
                            onValueChange={(value) => setQuality(value as GenerationFormData['quality'])}
                            disabled={isLoading}
                            className='flex flex-wrap gap-x-4 gap-y-2'>
                            <RadioItemWithIcon value='auto' id='quality-auto' label='自动' Icon={Sparkles} />
                            <RadioItemWithIcon value='low' id='quality-low' label='低' Icon={Tally1} />
                            <RadioItemWithIcon value='medium' id='quality-medium' label='中' Icon={Tally2} />
                            <RadioItemWithIcon value='high' id='quality-high' label='高' Icon={Tally3} />
                        </RadioGroup>
                    </div>

                    <div className='space-y-2'>
                        <Label className='block text-sm text-card-foreground'>背景</Label>
                        <RadioGroup
                            value={background}
                            onValueChange={(value) => setBackground(value as GenerationFormData['background'])}
                            disabled={isLoading}
                            className='flex flex-wrap gap-x-4 gap-y-2'>
                            <RadioItemWithIcon value='auto' id='bg-auto' label='自动' Icon={Sparkles} />
                            <RadioItemWithIcon value='opaque' id='bg-opaque' label='不透明' Icon={BrickWall} />
                            <RadioItemWithIcon
                                value='transparent'
                                id='bg-transparent'
                                label='透明'
                                Icon={Eraser}
                            />
                        </RadioGroup>
                    </div>

                    <div className='space-y-2'>
                        <Label className='block text-sm text-card-foreground'>输出格式</Label>
                        <RadioGroup
                            value={outputFormat}
                            onValueChange={(value) => setOutputFormat(value as GenerationFormData['output_format'])}
                            disabled={isLoading}
                            className='flex flex-wrap gap-x-4 gap-y-2'>
                            <RadioItemWithIcon value='png' id='format-png' label='PNG' Icon={FileImage} />
                            <RadioItemWithIcon value='jpeg' id='format-jpeg' label='JPEG' Icon={FileImage} />
                            <RadioItemWithIcon value='webp' id='format-webp' label='WebP' Icon={FileImage} />
                        </RadioGroup>
                    </div>

                    {showCompression && (
                        <div className='space-y-1.5 pt-2 transition-opacity duration-300'>
                            <Label htmlFor='compression-slider' className='text-sm text-card-foreground'>
                                压缩率: {compression[0]}%
                            </Label>
                            <Slider
                                id='compression-slider'
                                min={0}
                                max={100}
                                step={1}
                                value={compression}
                                onValueChange={setCompression}
                                disabled={isLoading}
                                className='mt-2 [&>button]:border-background [&>button]:bg-primary [&>button]:ring-offset-background [&>span:first-child]:h-1 [&>span:first-child>span]:bg-primary'
                            />
                        </div>
                    )}

                    <div className='space-y-2'>
                        <Label className='block text-sm text-card-foreground'>内容审核级别</Label>
                        <RadioGroup
                            value={moderation}
                            onValueChange={(value) => setModeration(value as GenerationFormData['moderation'])}
                            disabled={isLoading}
                            className='flex flex-wrap gap-x-4 gap-y-2'>
                            <RadioItemWithIcon value='auto' id='mod-auto' label='自动' Icon={ShieldCheck} />
                            <RadioItemWithIcon value='low' id='mod-low' label='低' Icon={ShieldAlert} />
                        </RadioGroup>
                    </div>
                </CardContent>
                <CardFooter className='border-t border-border p-4'>
                    <Button
                        type='submit'
                        disabled={isLoading || !prompt}
                        className='flex w-full items-center justify-center gap-2 rounded-md bg-primary text-sm text-primary-foreground hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground'>
                        {isLoading && <Loader2 className='h-3.5 w-3.5 animate-spin' />}
                        {isLoading ? '请求已发送...' : '生成'}
                    </Button>
                </CardFooter>
            </form>
        </Card>
    );
}
