'use client';

import { ModeToggle } from '@/components/mode-toggle';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
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
    LockOpen
} from 'lucide-react';
import * as React from 'react';

export type GenerationFormData = {
    prompt: string;
    n: number;
    size: '1024x1024' | '1536x1024' | '1024x1536' | 'auto';
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

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formData: GenerationFormData = {
            prompt,
            n: n[0],
            size,
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
                        <Label className='block text-sm text-card-foreground'>尺寸</Label>
                        <RadioGroup
                            value={size}
                            onValueChange={(value) => setSize(value as GenerationFormData['size'])}
                            disabled={isLoading}
                            className='flex flex-wrap gap-x-4 gap-y-2'>
                            <RadioItemWithIcon value='auto' id='size-auto' label='自动' Icon={Sparkles} />
                            <RadioItemWithIcon value='1024x1024' id='size-square' label='正方形' Icon={Square} />
                            <RadioItemWithIcon
                                value='1536x1024'
                                id='size-landscape'
                                label='横向'
                                Icon={RectangleHorizontal}
                            />
                            <RadioItemWithIcon
                                value='1024x1536'
                                id='size-portrait'
                                label='纵向'
                                Icon={RectangleVertical}
                            />
                        </RadioGroup>
                    </div>

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
