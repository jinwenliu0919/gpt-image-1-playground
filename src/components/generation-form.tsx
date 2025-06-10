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
    Unlink
} from 'lucide-react';
import * as React from 'react';

export type AspectRatio = '1:1' | '16:9' | '4:3' | '3:2' | '3:4' | '2:3' | '9:16' | 'custom';

export type GenerationFormData = {
    prompt: string;
    n: number;
    size: '1024x1024' | '1536x1024' | '1024x1536' | 'auto' | string;
    aspectRatio: AspectRatio;
    width?: number;
    height?: number;
    quality: 'low' | 'medium' | 'high' | 'auto';
    output_format: 'png' | 'jpeg' | 'webp';
    output_compression?: number;
    background: 'transparent' | 'opaque' | 'auto';
    moderation: 'low' | 'auto';
};

type GenerationFormProps = {
    onSubmit: (data: GenerationFormData) => void;
    isLoading: boolean;
    currentMode: 'generate' | 'edit';
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
    setModeration
}: GenerationFormProps) {
    const showCompression = outputFormat === 'jpeg' || outputFormat === 'webp';
    const [isCustomSize, setIsCustomSize] = React.useState(aspectRatio === 'custom');
    const [maintainAspectRatio, setMaintainAspectRatio] = React.useState(true);

    React.useEffect(() => {
        setIsCustomSize(aspectRatio === 'custom');
    }, [aspectRatio]);

    // 根据宽高比例计算尺寸
    React.useEffect(() => {
        if (aspectRatio !== 'custom' && aspectRatio !== undefined) {
            const [widthRatio, heightRatio] = aspectRatio.split(':').map(Number);
            if (widthRatio && heightRatio) {
                let newWidth, newHeight;
                
                // 根据比例设置合适的尺寸，确保最长边不超过1536，最短边不小于1024
                if (widthRatio >= heightRatio) {
                    newWidth = 1536;
                    newHeight = Math.round((newWidth / widthRatio) * heightRatio);
                    if (newHeight < 1024) {
                        newHeight = 1024;
                        newWidth = Math.round((newHeight / heightRatio) * widthRatio);
                    }
                } else {
                    newHeight = 1536;
                    newWidth = Math.round((newHeight / heightRatio) * widthRatio);
                    if (newWidth < 1024) {
                        newWidth = 1024;
                        newHeight = Math.round((newWidth / widthRatio) * heightRatio);
                    }
                }
                
                setWidth(newWidth);
                setHeight(newHeight);
                setSize(`${newWidth}x${newHeight}`);
            }
        }
    }, [aspectRatio, setWidth, setHeight, setSize]);

    // 处理自定义宽度变化
    const handleWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newWidth = parseInt(e.target.value, 10) || 0;
        setWidth(newWidth);
        
        if (maintainAspectRatio && aspectRatio !== 'custom' && aspectRatio) {
            const [widthRatio, heightRatio] = aspectRatio.split(':').map(Number);
            if (widthRatio && heightRatio) {
                const newHeight = Math.round((newWidth / widthRatio) * heightRatio);
                setHeight(newHeight);
                setSize(`${newWidth}x${newHeight}`);
            }
        } else {
            setSize(`${newWidth}x${height}`);
        }
    };

    // 处理自定义高度变化
    const handleHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newHeight = parseInt(e.target.value, 10) || 0;
        setHeight(newHeight);
        
        if (maintainAspectRatio && aspectRatio !== 'custom' && aspectRatio) {
            const [widthRatio, heightRatio] = aspectRatio.split(':').map(Number);
            if (widthRatio && heightRatio) {
                const newWidth = Math.round((newHeight / heightRatio) * widthRatio);
                setWidth(newWidth);
                setSize(`${newWidth}x${newHeight}`);
            }
        } else {
            setSize(`${width}x${newHeight}`);
        }
    };

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        
        // 确保尺寸格式正确
        let finalSize = size;
        if (aspectRatio === 'custom') {
            finalSize = `${width}x${height}`;
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
            moderation
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
                <CardContent className='flex-1 space-y-4 overflow-y-auto p-4'>
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
                            <RadioItemWithIcon value='1:1' id='ratio-1-1' label='1:1' Icon={Square} />
                            <RadioItemWithIcon value='16:9' id='ratio-16-9' label='16:9' Icon={RectangleHorizontal} />
                            <RadioItemWithIcon value='4:3' id='ratio-4-3' label='4:3' Icon={RectangleHorizontal} />
                            <RadioItemWithIcon value='3:2' id='ratio-3-2' label='3:2' Icon={RectangleHorizontal} />
                            <RadioItemWithIcon value='3:4' id='ratio-3-4' label='3:4' Icon={RectangleVertical} />
                            <RadioItemWithIcon value='2:3' id='ratio-2-3' label='2:3' Icon={RectangleVertical} />
                            <RadioItemWithIcon value='9:16' id='ratio-9-16' label='9:16' Icon={RectangleVertical} />
                            <RadioItemWithIcon value='custom' id='ratio-custom' label='自定义' Icon={Sparkles} />
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
                                尺寸: {width} x {height} ({size})
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
                        {isLoading ? '生成中...' : '生成'}
                    </Button>
                </CardFooter>
            </form>
        </Card>
    );
}
