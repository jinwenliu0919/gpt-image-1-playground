'use client';

import { EditingForm, type EditingFormData } from '@/components/editing-form';
import { GenerationForm, type GenerationFormData } from '@/components/generation-form';
import { TaskHistoryPanel } from '@/components/task-history-panel';
import { PasswordDialog } from '@/components/password-dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { calculateApiCost } from '@/lib/cost-utils';
import { db } from '@/lib/db';
import * as React from 'react';
import { useHistory } from '@/contexts/HistoryContext';
import type { TaskRecord, HistoryMetadata } from '@/lib/types';

const explicitModeClient = process.env.NEXT_PUBLIC_IMAGE_STORAGE_MODE;
const vercelEnvClient = process.env.NEXT_PUBLIC_VERCEL_ENV;
const isOnVercelClient = vercelEnvClient === 'production' || vercelEnvClient === 'preview';

let effectiveStorageModeClient: 'fs' | 'indexeddb';

if (explicitModeClient === 'fs') {
    effectiveStorageModeClient = 'fs';
} else if (explicitModeClient === 'indexeddb') {
    effectiveStorageModeClient = 'indexeddb';
} else if (isOnVercelClient) {
    effectiveStorageModeClient = 'indexeddb';
} else {
    effectiveStorageModeClient = 'fs';
}
console.log(
    `Client Effective Storage Mode: ${effectiveStorageModeClient} (Explicit: ${explicitModeClient || 'unset'}, Vercel Env: ${vercelEnvClient || 'N/A'})`
);

type ApiImageResponseItem = {
    filename: string;
    b64_json?: string;
    output_format: string;
    path?: string;
};

type DrawnPoint = {
    x: number;
    y: number;
    size: number;
};

const MAX_EDIT_IMAGES = 10;

export default function HomePage() {
    const [mode, setMode] = React.useState<'generate' | 'edit' | 'completion'>('generate');
    
    const { 
        error, 
        setError, 
        isPasswordRequiredByBackend,
        clientPasswordHash,
        createTask,
        updateTaskStatus,
        completeTaskWithImages,
        getImageSrc,
        tasks
    } = useHistory();

    const [isPasswordDialogOpen, setIsPasswordDialogOpen] = React.useState(false);
    const [passwordDialogContext, setPasswordDialogContext] = React.useState<'initial' | 'retry'>('initial');
    const [lastApiCallArgs, setLastApiCallArgs] = React.useState<[GenerationFormData | EditingFormData] | null>(null);

    const [editImageFiles, setEditImageFiles] = React.useState<File[]>([]);
    const [editSourceImagePreviewUrls, setEditSourceImagePreviewUrls] = React.useState<string[]>([]);
    const [editPrompt, setEditPrompt] = React.useState('');
    const [editN, setEditN] = React.useState([4]);
    const [editSize, setEditSize] = React.useState<EditingFormData['size']>('auto');
    const [editQuality, setEditQuality] = React.useState<EditingFormData['quality']>('auto');
    const [editBrushSize, setEditBrushSize] = React.useState([20]);
    const [editShowMaskEditor, setEditShowMaskEditor] = React.useState(false);
    const [editGeneratedMaskFile, setEditGeneratedMaskFile] = React.useState<File | null>(null);
    const [editIsMaskSaved, setEditIsMaskSaved] = React.useState(false);
    const [editOriginalImageSize, setEditOriginalImageSize] = React.useState<{ width: number; height: number } | null>(
        null
    );
    const [editDrawnPoints, setEditDrawnPoints] = React.useState<DrawnPoint[]>([]);
    const [editMaskPreviewUrl, setEditMaskPreviewUrl] = React.useState<string | null>(null);

    const [genPrompt, setGenPrompt] = React.useState('');
    const [genN, setGenN] = React.useState([1]);
    const [genSize, setGenSize] = React.useState<GenerationFormData['size']>('auto');
    const [genAspectRatio, setGenAspectRatio] = React.useState<'1:1' | '16:9' | '9:16' | '4:3' | '3:4' | '3:2' | '2:3' | 'custom'>('1:1');
    const [genWidth, setGenWidth] = React.useState(1024);
    const [genHeight, setGenHeight] = React.useState(1024);
    const [genQuality, setGenQuality] = React.useState<GenerationFormData['quality']>('auto');
    const [genOutputFormat, setGenOutputFormat] = React.useState<GenerationFormData['output_format']>('png');
    const [genCompression, setGenCompression] = React.useState([100]);
    const [genBackground, setGenBackground] = React.useState<GenerationFormData['background']>('auto');
    const [genModeration, setGenModeration] = React.useState<GenerationFormData['moderation']>('auto');
    const [genReferenceImage, setGenReferenceImage] = React.useState<File | null>(null);
    const [genReferenceImages, setGenReferenceImages] = React.useState<File[]>([]);

    // 检查是否有从收藏页面应用的参数
    React.useEffect(() => {
        const applyParamsStr = localStorage.getItem('applyFavoriteParams');
        if (applyParamsStr) {
            try {
                const params = JSON.parse(applyParamsStr);
                
                // 设置模式
                if (params.mode) {
                    setMode(params.mode);
                }
                
                // 根据模式应用不同参数
                if (params.mode === 'edit') {
                    setEditPrompt(params.prompt || '');
                    setEditQuality(params.quality || 'auto');
                    // 设置图片数量
                    if (params.n) {
                        setEditN([params.n]);
                    }
                    // 设置图片尺寸
                    if (params.size) {
                        setEditSize(params.size);
                    }
                } else {
                    // 生成模式参数
                    setGenPrompt(params.prompt || '');
                    setGenQuality(params.quality || 'auto');
                    setGenBackground(params.background || 'auto');
                    setGenModeration(params.moderation || 'auto');
                    if (params.output_format) {
                        setGenOutputFormat(params.output_format);
                    }
                    // 设置图片数量
                    if (params.n) {
                        setGenN([params.n]);
                    }
                    // 设置图片尺寸
                    if (params.size) {
                        setGenSize(params.size);
                    }
                }
                
                // 清除应用的参数
                localStorage.removeItem('applyFavoriteParams');
            } catch (err) {
                console.error('解析收藏参数失败:', err);
                localStorage.removeItem('applyFavoriteParams');
            }
        }
    }, []);

    React.useEffect(() => {
        return () => {
            editSourceImagePreviewUrls.forEach((url) => URL.revokeObjectURL(url));
        };
    }, [editSourceImagePreviewUrls]);

    React.useEffect(() => {
        const handlePaste = (event: ClipboardEvent) => {
            if (mode !== 'edit' || !event.clipboardData) {
                return;
            }

            if (editImageFiles.length >= MAX_EDIT_IMAGES) {
                alert(`Cannot paste: Maximum of ${MAX_EDIT_IMAGES} images reached.`);
                return;
            }

            const items = event.clipboardData.items;
            let imageFound = false;
            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image') !== -1) {
                    const file = items[i].getAsFile();
                    if (file) {
                        event.preventDefault();
                        imageFound = true;

                        const previewUrl = URL.createObjectURL(file);

                        setEditImageFiles((prevFiles) => [...prevFiles, file]);
                        setEditSourceImagePreviewUrls((prevUrls) => [...prevUrls, previewUrl]);

                        console.log('Pasted image added:', file.name);

                        break;
                    }
                }
            }
            if (!imageFound) {
                console.log('Paste event did not contain a recognized image file.');
            }
        };

        window.addEventListener('paste', handlePaste);

        return () => {
            window.removeEventListener('paste', handlePaste);
        };
    }, [mode, editImageFiles.length]);

    async function sha256Client(text: string): Promise<string> {
        const encoder = new TextEncoder();
        const data = encoder.encode(text);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
        return hashHex;
    }

    const handleSavePassword = async (password: string) => {
        if (!password.trim()) {
            setError('Password cannot be empty.');
            return;
        }
        try {
            const hash = await sha256Client(password);
            localStorage.setItem('clientPasswordHash', hash);
            window.location.reload(); 
            
            setError(null);
            setIsPasswordDialogOpen(false);
            if (passwordDialogContext === 'retry' && lastApiCallArgs) {
                console.log('Retrying API call after password save...');
                await handleApiCall(...lastApiCallArgs);
            }
        } catch (e) {
            console.error('Error hashing password:', e);
            setError('Failed to save password due to a hashing error.');
        }
    };

    const handleOpenPasswordDialog = () => {
        setPasswordDialogContext('initial');
        setIsPasswordDialogOpen(true);
    };

    const getMimeTypeFromFormat = (format: string): string => {
        if (format === 'jpeg') return 'image/jpeg';
        if (format === 'webp') return 'image/webp';

        return 'image/png';
    };

    const handleApiCall = async (formData: GenerationFormData | EditingFormData) => {
        const startTime = Date.now();
        let durationMs = 0;

        setError(null);
        
        const apiFormData = new FormData();
        if (isPasswordRequiredByBackend && clientPasswordHash) {
            apiFormData.append('passwordHash', clientPasswordHash);
        } else if (isPasswordRequiredByBackend && !clientPasswordHash) {
            setError('Password is required. Please configure the password by clicking the lock icon.');
            setPasswordDialogContext('initial');
            setIsPasswordDialogOpen(true);
            return;
        }
        apiFormData.append('mode', mode);

        let taskPrompt = '';
        let taskQuality: GenerationFormData['quality'] = 'auto';
        let taskBackground: GenerationFormData['background'] = 'auto';
        let taskModeration: GenerationFormData['moderation'] = 'auto';
        let taskOutputFormat: GenerationFormData['output_format'] = 'png';
        let taskN: number = 1;
        let taskSize: string = 'auto';
        const taskSourceImageUrls: string[] = [];
        const taskData: { sourceImages?: { filename: string }[] } = {};

        // 创建一个Promise数组来跟踪所有源图片的保存操作
        const saveSourceImagePromises: Promise<void>[] = [];
        
        // 定义taskId变量，以便在try-catch的不同部分都可以访问
        let taskId: string | undefined = undefined;

        if (mode === 'generate' || mode === 'completion') {
            const genData = formData as GenerationFormData;
            apiFormData.append('prompt', genPrompt);
            apiFormData.append('n', genN[0].toString());
            apiFormData.append('size', genSize);
            
            if (genAspectRatio === 'custom' && genWidth && genHeight) {
                apiFormData.append('width', genWidth.toString());
                apiFormData.append('height', genHeight.toString());
            }
            
            apiFormData.append('quality', genQuality);
            apiFormData.append('output_format', genOutputFormat);
            if (
                (genOutputFormat === 'jpeg' || genOutputFormat === 'webp') &&
                genData.output_compression !== undefined
            ) {
                apiFormData.append('output_compression', genData.output_compression.toString());
            }
            apiFormData.append('background', genBackground);
            apiFormData.append('moderation', genModeration);
            if (genReferenceImages && genReferenceImages.length > 0) {
                genReferenceImages.forEach((file, index) => {
                    apiFormData.append(`reference_image_${index}`, file, file.name);
                });
            }
            
            taskPrompt = genPrompt;
            taskQuality = genQuality;
            taskBackground = genBackground;
            taskModeration = genModeration;
            taskOutputFormat = genOutputFormat;
            taskN = genN[0];
            taskSize = genSize;
        } else {
            apiFormData.append('prompt', editPrompt);
            apiFormData.append('n', editN[0].toString());
            apiFormData.append('size', editSize);
            apiFormData.append('quality', editQuality);

            // 保存源图片
            const sourceImageFilenames: string[] = [];
            
            // 为每个上传的图片创建一个唯一文件名，并保存到数据库
            for (let i = 0; i < editImageFiles.length; i++) {
                const file = editImageFiles[i];
                const sourceFilename = `source-${Date.now()}-${i}-${file.name}`;
                sourceImageFilenames.push(sourceFilename);
                
                // 保存到FormData
                apiFormData.append(`image_${i}`, file, file.name);
                
                // 创建临时URL用于当前会话
                const tempUrl = URL.createObjectURL(file);
                taskSourceImageUrls.push(tempUrl);
                
                console.log(`[源图片保存] 准备保存源图片: ${sourceFilename}, 类型: ${file.type}, 大小: ${file.size}字节`);
                
                // 保存源图片到数据库 - 使用Promise来跟踪保存操作
                const savePromise = new Promise<void>((resolve, reject) => {
                    try {
                        // 读取文件内容
                        const reader = new FileReader();
                        reader.onload = async (e) => {
                            if (e.target?.result instanceof ArrayBuffer) {
                                try {
                                    const blob = new Blob([e.target.result], { type: file.type });
                                    // 保存到sourceImages表
                                    await db.sourceImages.put({
                                        filename: sourceFilename,
                                        taskId: '', // 先用空字符串，后面会更新
                                        blob: blob
                                    });
                                    console.log(`[源图片保存] 成功保存源图片到数据库: ${sourceFilename}`);
                                    resolve();
                                } catch (err) {
                                    console.error('[源图片保存] 保存源图片到数据库失败:', err);
                                    reject(err);
                                }
                            } else {
                                console.error('[源图片保存] 读取文件结果不是ArrayBuffer');
                                reject(new Error('读取文件结果不是ArrayBuffer'));
                            }
                        };
                        reader.onerror = (err) => {
                            console.error('[源图片保存] 读取文件失败:', err);
                            reject(err);
                        };
                        reader.readAsArrayBuffer(file);
                    } catch (err) {
                        console.error('[源图片保存] 保存源图片失败:', err);
                        reject(err);
                    }
                });
                
                saveSourceImagePromises.push(savePromise);
            }
            
            if (editGeneratedMaskFile) {
                apiFormData.append('mask', editGeneratedMaskFile, editGeneratedMaskFile.name);
            }
            
            taskPrompt = editPrompt;
            taskQuality = editQuality;
            taskN = editN[0];
            taskSize = editSize;
            
            // 保存源图片文件名到任务记录
            if (sourceImageFilenames.length > 0) {
                taskData.sourceImages = sourceImageFilenames.map(filename => ({ filename }));
                console.log(`[源图片保存] 设置任务源图片引用: ${JSON.stringify(taskData.sourceImages)}`);
            }
        }

        try {
            // 等待所有源图片保存完成
            if (saveSourceImagePromises.length > 0) {
                console.log(`[源图片保存] 等待${saveSourceImagePromises.length}个源图片保存完成...`);
                await Promise.all(saveSourceImagePromises);
                console.log('[源图片保存] 所有源图片已保存到数据库');
            }
            
            // 创建任务
            taskId = createTask({
                prompt: taskPrompt,
                mode,
                quality: taskQuality,
                background: taskBackground,
                moderation: taskModeration,
                output_format: taskOutputFormat,
                sourceImageUrls: taskSourceImageUrls.length > 0 ? taskSourceImageUrls : undefined,
                sourceImages: taskData?.sourceImages,
                n: taskN,
                size: taskSize
            });
            console.log(`[任务创建] 创建任务ID: ${taskId}, 模式: ${mode}, 数量: ${taskN}, 尺寸: ${taskSize}, 源图片: ${JSON.stringify(taskData?.sourceImages)}`);
            
            // 更新源图片记录中的taskId
            if (mode === 'edit' && taskData?.sourceImages) {
                const updatePromises = taskData.sourceImages.map(sourceImage => 
                    db.sourceImages.update(sourceImage.filename, { taskId })
                        .then(() => console.log(`[源图片更新] 更新源图片taskId成功: ${sourceImage.filename} -> ${taskId}`))
                        .catch(err => console.error(`[源图片更新] 更新源图片${sourceImage.filename}的taskId失败:`, err))
                );
                
                await Promise.all(updatePromises);
                console.log('[源图片更新] 所有源图片taskId更新完成');
            }
            
            console.log('Sending request to /api/images with mode:', mode, 'taskId:', taskId);
            
            // 检查数据库中的源图片
            await checkSourceImagesInDB();

            await updateTaskStatus(taskId, 'processing');
            
            // 发送请求后立即重置表单，不等待响应
            if (mode === 'generate') {
                // 重置生成表单
                setGenPrompt('');
                setGenN([1]);
                setGenReferenceImages([]);
                setGenReferenceImage(null);
            } else if (mode === 'edit') {
                // 重置编辑表单
                setEditPrompt('');
                setEditN([4]);
                setEditImageFiles([]);
                setEditSourceImagePreviewUrls([]);
                setEditGeneratedMaskFile(null);
                setEditMaskPreviewUrl(null);
                setEditDrawnPoints([]);
                setEditIsMaskSaved(false);
                setEditShowMaskEditor(false);
                setEditOriginalImageSize(null);
            }
            
            const response = await fetch('/api/images', {
                method: 'POST',
                body: apiFormData
            });

            const result = await response.json();

            if (!response.ok) {
                if (response.status === 401 && isPasswordRequiredByBackend) {
                    setError('Unauthorized: Invalid or missing password. Please try again.');
                    setPasswordDialogContext('retry');
                    setLastApiCallArgs([formData]);
                    setIsPasswordDialogOpen(true);
                    await updateTaskStatus(taskId, 'failed', '授权失败：无效或缺少密码');
                    return;
                }
                throw new Error(result.error || `API request failed with status ${response.status}`);
            }

            console.log('API Response:', result);

            if (result.images && result.images.length > 0) {
                durationMs = Date.now() - startTime;
                console.log(`API call successful. Duration: ${durationMs}ms`);

                const costDetails = calculateApiCost(result.usage);

                const batchTimestamp = Date.now();
                const newHistoryEntry: HistoryMetadata = {
                    timestamp: batchTimestamp,
                    images: result.images.map((img: { filename: string }) => ({ filename: img.filename })),
                    storageModeUsed: effectiveStorageModeClient,
                    durationMs: durationMs,
                    quality: taskQuality,
                    background: taskBackground,
                    moderation: taskModeration,
                    output_format: taskOutputFormat,
                    prompt: taskPrompt,
                    mode: mode,
                    costDetails: costDetails,
                    taskId: taskId,
                    n: taskN,
                    size: taskSize
                };

                if (effectiveStorageModeClient === 'indexeddb') {
                    console.log('Processing images for IndexedDB storage...');
                    const newImageBatchPromises = result.images.map(async (img: ApiImageResponseItem) => {
                        if (img.b64_json) {
                            try {
                                const byteCharacters = atob(img.b64_json);
                                const byteNumbers = new Array(byteCharacters.length);
                                for (let i = 0; i < byteCharacters.length; i++) {
                                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                                }
                                const byteArray = new Uint8Array(byteNumbers);

                                const actualMimeType = getMimeTypeFromFormat(img.output_format);
                                const blob = new Blob([byteArray], { type: actualMimeType });

                                await db.images.put({ filename: img.filename, blob });
                                console.log(`Saved ${img.filename} to IndexedDB with type ${actualMimeType}.`);
                                return true;
                            } catch (dbError) {
                                console.error(`Error saving blob ${img.filename} to IndexedDB:`, dbError);
                                setError(`Failed to save image ${img.filename} to local database.`);
                                return false;
                            }
                        } else {
                            console.warn(`Image ${img.filename} missing b64_json in indexeddb mode.`);
                            return false;
                        }
                    });

                    // 等待所有图像处理完成
                    await Promise.all(newImageBatchPromises);
                }

                await completeTaskWithImages(taskId, newHistoryEntry);
            } else {
                throw new Error('API response did not contain valid image data or filenames.');
            }
        } catch (err: unknown) {
            durationMs = Date.now() - startTime;
            console.error(`API Call Error after ${durationMs}ms:`, err);
            const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred.';
            setError(errorMessage);
            
            // 这里taskId可能未定义，因为错误可能发生在创建任务之前
            if (taskId) {
                await updateTaskStatus(taskId, 'failed', errorMessage);
            } else {
                console.error('无法更新任务状态：taskId未定义');
            }
        }
    };

    React.useEffect(() => {
        if (genReferenceImage) {
            if (genReferenceImages.length === 0 || genReferenceImages[0] !== genReferenceImage) {
                setGenReferenceImages([genReferenceImage]);
            }
        }
    }, [genReferenceImage]);

    // 处理任务选择
    const handleSelectTask = async (taskId: string) => {
        console.log(`Selected task: ${taskId}`);
    };

    // 处理编辑任务参数，从历史记录或任务中复制参数到表单
    const handleEditTask = (taskData: TaskRecord | HistoryMetadata) => {
        // 根据是否包含images字段判断是任务还是历史记录
        const isHistoryItem = 'images' in taskData;
        
        console.log(`[重新绘制] 开始处理任务: ${isHistoryItem ? '历史记录项' : '任务'}, 模式: ${taskData.mode}`);
        console.log(`[重新绘制] 任务数据: ${JSON.stringify(taskData, (key, value) => {
            // 排除blob等大对象，避免日志过大
            if (key === 'blob' || key === 'images') return '[对象已省略]';
            return value;
        }, 2)}`);
        
        // 检查重要参数
        console.log(`[重新绘制] 参数检查: n=${taskData.n}, size=${taskData.size}`);
        
        // 检查数据库中的所有源图片
        checkSourceImagesInDB();
        
        // 根据模式设置当前模式
        if (taskData.mode === 'generate') {
            setMode('generate');
            // 设置文生图表单参数
            setGenPrompt(taskData.prompt || '');
            console.log(`[重新绘制] 设置提示词: ${taskData.prompt || ''}`);
            
            // 设置图片数量
            if ('n' in taskData && typeof taskData.n === 'number') {
                console.log(`[重新绘制] 设置图片数量: ${taskData.n}`);
                setGenN([taskData.n]);
            } else {
                // 默认生成1张图片
                console.log(`[重新绘制] 设置默认图片数量: 1`);
                setGenN([1]);
            }
            
            // 设置图片质量
            if (taskData.quality) {
                console.log(`[重新绘制] 设置图片质量: ${taskData.quality}`);
                setGenQuality(taskData.quality);
            }
            
            // 设置背景模式
            if (taskData.background) {
                console.log(`[重新绘制] 设置背景模式: ${taskData.background}`);
                setGenBackground(taskData.background);
            }
            
            // 设置内容过滤级别
            if (taskData.moderation) {
                console.log(`[重新绘制] 设置内容过滤级别: ${taskData.moderation}`);
                setGenModeration(taskData.moderation);
            }
            
            // 设置输出格式
            if (taskData.output_format) {
                console.log(`[重新绘制] 设置输出格式: ${taskData.output_format}`);
                setGenOutputFormat(taskData.output_format);
            }
            
            // 设置尺寸
            if ('size' in taskData && typeof taskData.size === 'string') {
                // 如果任务中有直接存储的尺寸信息
                console.log(`[重新绘制] 设置尺寸: ${taskData.size}`);
                setGenSize(taskData.size as GenerationFormData['size']);
                
                // 从尺寸中提取宽高
                const sizeMatch = taskData.size.match(/^(\d+)x(\d+)$/);
                if (sizeMatch) {
                    const [, widthStr, heightStr] = sizeMatch;
                    const width = parseInt(widthStr, 10);
                    const height = parseInt(heightStr, 10);
                    
                    // 设置宽高
                    console.log(`[重新绘制] 设置宽高: ${width}x${height}`);
                    setGenWidth(width);
                    setGenHeight(height);
                    
                    // 根据宽高比例设置aspectRatio
                    let aspectRatio: '1:1' | '16:9' | '9:16' | '4:3' | '3:4' | '3:2' | '2:3' | 'custom' = 'custom';
                    
                    const ratio = width / height;
                    console.log(`[重新绘制] 计算宽高比: ${ratio}`);
                    
                    if (width === height) {
                        aspectRatio = '1:1';
                    } else if (Math.abs(ratio - 16/9) < 0.01) {
                        aspectRatio = '16:9';
                    } else if (Math.abs(ratio - 9/16) < 0.01) {
                        aspectRatio = '9:16';
                    } else if (Math.abs(ratio - 4/3) < 0.01) {
                        aspectRatio = '4:3';
                    } else if (Math.abs(ratio - 3/4) < 0.01) {
                        aspectRatio = '3:4';
                    } else if (Math.abs(ratio - 3/2) < 0.01) {
                        aspectRatio = '3:2';
                    } else if (Math.abs(ratio - 2/3) < 0.01) {
                        aspectRatio = '2:3';
                    }
                    
                    console.log(`[重新绘制] 设置宽高比: ${aspectRatio}`);
                    setGenAspectRatio(aspectRatio);
                } else {
                    console.log(`[重新绘制] 无法从尺寸中提取宽高: ${taskData.size}`);
                }
            } else {
                console.log(`[重新绘制] 没有尺寸信息或格式不正确`);
            }
            
        } else if (taskData.mode === 'edit') {
            setMode('edit');
            // 设置图生图表单参数
            setEditPrompt(taskData.prompt || '');
            console.log(`[重新绘制] 设置提示词: ${taskData.prompt || ''}`);
            
            // 设置图片数量
            if ('n' in taskData && typeof taskData.n === 'number') {
                console.log(`[重新绘制] 设置图片数量: ${taskData.n}`);
                setEditN([taskData.n]);
            } else {
                // 默认生成1张图片
                console.log(`[重新绘制] 设置默认图片数量: 1`);
                setEditN([1]);
            }
            
            // 设置图片质量
            if (taskData.quality) {
                console.log(`[重新绘制] 设置图片质量: ${taskData.quality}`);
                setEditQuality(taskData.quality);
            }
            
            // 设置尺寸
            if ('size' in taskData && typeof taskData.size === 'string') {
                console.log(`[重新绘制] 设置尺寸: ${taskData.size}`);
                setEditSize(taskData.size as EditingFormData['size']);
            } else {
                console.log(`[重新绘制] 没有尺寸信息或格式不正确`);
            }
            
            // 注意：对于图生图模式，我们不应该使用结果图片作为源图片
            // 而是应该尝试获取原始的上传图片（如果有的话）
            
            // 如果是历史记录项，需要查询相关的任务以获取原始图片
            if (isHistoryItem && taskData.taskId) {
                console.log(`[重新绘制] 历史记录项: ${taskData.timestamp}, 关联任务ID: ${taskData.taskId}`);
                
                // 尝试通过taskId找到原始任务
                const originalTask = tasks.find((t: TaskRecord) => t.id === taskData.taskId);
                
                if (originalTask) {
                    console.log(`[重新绘制] 找到原始任务: ${originalTask.id}`);
                    console.log(`[重新绘制] 源图片信息: ${JSON.stringify(originalTask.sourceImages)}`);
                    console.log(`[重新绘制] 源图片URL: ${JSON.stringify(originalTask.sourceImageUrls)}`);
                    
                    // 首先尝试从数据库加载源图片
                    if (originalTask.sourceImages && originalTask.sourceImages.length > 0) {
                        // 清除当前的图片文件
                        setEditImageFiles([]);
                        setEditSourceImagePreviewUrls([]);
                        
                        console.log(`[重新绘制] 尝试从数据库加载源图片: ${originalTask.sourceImages.length}张`);
                        // 从数据库加载源图片
                        loadSourceImagesFromDB(originalTask.sourceImages);
                    }
                    // 如果没有源图片记录或加载失败，尝试使用sourceImageUrls
                    else if (originalTask.sourceImageUrls && originalTask.sourceImageUrls.length > 0) {
                        // 如果找到原始任务并且有源图片URL，使用这些URL
                        setEditImageFiles([]);
                        setEditSourceImagePreviewUrls([]);
                        
                        console.log(`[重新绘制] 尝试从URL加载源图片: ${originalTask.sourceImageUrls.length}个URL`);
                        // 加载原始任务中的源图片URL
                        loadSourceImagesFromUrls(originalTask.sourceImageUrls);
                    } else {
                        console.log(`[重新绘制] 原始任务没有源图片信息，使用结果图片`);
                        // 如果找不到原始任务或源图片，回退到使用结果图片
                        fallbackToResultImage();
                    }
                } else {
                    console.warn(`[重新绘制] 未找到关联的原始任务: ${taskData.taskId}`);
                    // 如果找不到原始任务，回退到使用结果图片
                    fallbackToResultImage();
                }
            } else {
                if (!isHistoryItem) {
                    console.log(`[重新绘制] 直接使用任务对象: ${taskData.id}`);
                    
                    // 如果是任务对象，直接检查它的源图片信息
                    if ('sourceImages' in taskData && taskData.sourceImages && taskData.sourceImages.length > 0) {
                        console.log(`[重新绘制] 任务有源图片信息: ${JSON.stringify(taskData.sourceImages)}`);
                        // 清除当前的图片文件
                        setEditImageFiles([]);
                        setEditSourceImagePreviewUrls([]);
                        
                        // 从数据库加载源图片
                        loadSourceImagesFromDB(taskData.sourceImages);
                    } else if ('sourceImageUrls' in taskData && taskData.sourceImageUrls && taskData.sourceImageUrls.length > 0) {
                        console.log(`[重新绘制] 任务有源图片URL: ${taskData.sourceImageUrls.length}个URL`);
                        // 清除当前的图片文件
                        setEditImageFiles([]);
                        setEditSourceImagePreviewUrls([]);
                        
                        // 加载源图片URL
                        loadSourceImagesFromUrls(taskData.sourceImageUrls);
                    } else {
                        console.log(`[重新绘制] 任务没有源图片信息，使用回退方法`);
                        // 如果没有源图片信息，回退到使用结果图片
                        fallbackToResultImage();
                    }
                } else {
                    console.log(`[重新绘制] 历史记录项没有关联任务ID，使用结果图片`);
                    // 如果不是历史记录项或没有关联的任务ID，回退到使用结果图片
                    fallbackToResultImage();
                }
            }
            
            // 从数据库加载源图片
            async function loadSourceImagesFromDB(sourceImages: { filename: string }[]) {
                console.log(`[源图片加载] 尝试从数据库加载源图片: ${JSON.stringify(sourceImages)}`);
                try {
                    const files: File[] = [];
                    const urls: string[] = [];
                    
                    for (const sourceImage of sourceImages) {
                        try {
                            // 从数据库获取源图片
                            console.log(`[源图片加载] 查询数据库中的源图片: ${sourceImage.filename}`);
                            const sourceImageRecord = await db.sourceImages.get(sourceImage.filename);
                            if (sourceImageRecord && sourceImageRecord.blob) {
                                console.log(`[源图片加载] 找到源图片记录: ${sourceImage.filename}, 类型: ${sourceImageRecord.blob.type}, 大小: ${sourceImageRecord.blob.size}字节`);
                                
                                // 创建File对象
                                const file = new File([sourceImageRecord.blob], sourceImage.filename, { 
                                    type: sourceImageRecord.blob.type 
                                });
                                
                                // 创建预览URL
                                const url = URL.createObjectURL(sourceImageRecord.blob);
                                
                                files.push(file);
                                urls.push(url);
                            } else {
                                console.warn(`[源图片加载] 在数据库中未找到源图片或blob为空: ${sourceImage.filename}`);
                            }
                        } catch (err) {
                            console.error(`[源图片加载] 加载源图片${sourceImage.filename}失败:`, err);
                        }
                    }
                    
                    if (files.length > 0) {
                        // 设置编辑源图片
                        console.log(`[源图片加载] 成功从数据库加载源图片: ${files.length}张`);
                        setEditImageFiles(files);
                        setEditSourceImagePreviewUrls(urls);
                    } else {
                        console.warn('[源图片加载] 没有从数据库加载到源图片，尝试回退方法');
                        fallbackToResultImage();
                    }
                } catch (err) {
                    console.error('[源图片加载] 从数据库加载源图片失败:', err);
                    fallbackToResultImage();
                }
            }
            
            // 从URL加载源图片
            function loadSourceImagesFromUrls(urls: string[]) {
                Promise.all(urls.map((url: string) => 
                    fetch(url)
                        .then(res => res.blob())
                        .then(blob => {
                            const fileName = url.split('/').pop() || `source-image-${Date.now()}.png`;
                            return new File([blob], fileName, { 
                                type: getMimeTypeFromFormat('png') 
                            });
                        })
                ))
                .then((files: File[]) => {
                    setEditImageFiles(files);
                    const previewUrls = files.map(file => URL.createObjectURL(file));
                    setEditSourceImagePreviewUrls(previewUrls);
                    console.log('成功从URL加载源图片:', files.length);
                })
                .catch(err => {
                    console.error('加载原始源图片URL失败:', err);
                    setError('无法加载原始源图片');
                    
                    // 如果无法加载原始源图片，回退到使用结果图片
                    fallbackToResultImage();
                });
            }
            
            // 回退函数：使用结果图片作为源图片
            function fallbackToResultImage() {
                console.log(`[回退] 使用结果图片作为源图片`);
                if (isHistoryItem && taskData.images && taskData.images.length > 0) {
                    // 清除当前的图片文件
                    setEditImageFiles([]);
                    setEditSourceImagePreviewUrls([]);
                    
                    const firstImage = taskData.images[0];
                    if (firstImage && firstImage.filename) {
                        console.log(`[回退] 使用历史记录中的第一张图片: ${firstImage.filename}`);
                        // 尝试获取图片URL
                        try {
                            // 从文件系统获取图片URL的函数可能返回undefined
                            const imageUrl = taskData.storageModeUsed === 'indexeddb'
                                ? getImageSrc(firstImage.filename) // IndexedDB模式
                                : `/api/image/${firstImage.filename}`; // 文件系统模式
                            
                            console.log(`[回退] 获取到图片URL: ${imageUrl}`);
                            
                            if (!imageUrl) {
                                throw new Error('无法获取图片URL');
                            }
                            
                            // 处理输出格式，确保不是undefined
                            const outputFormat = taskData.output_format || 'png';
                            
                            // 从URL获取Blob对象
                            fetch(imageUrl)
                                .then(res => res.blob())
                                .then(blob => {
                                    console.log(`[回退] 成功获取图片Blob: 类型=${blob.type}, 大小=${blob.size}字节`);
                                    // 创建File对象
                                    const file = new File([blob], firstImage.filename, { 
                                        type: getMimeTypeFromFormat(outputFormat) 
                                    });
                                    
                                    // 设置编辑源图片
                                    setEditImageFiles([file]);
                                    setEditSourceImagePreviewUrls([URL.createObjectURL(blob)]);
                                    console.log(`[回退] 成功设置结果图片作为源图片`);
                                })
                                .catch(err => {
                                    console.error('[回退] 获取历史图片失败:', err);
                                    setError('无法加载历史图片进行编辑');
                                });
                        } catch (error) {
                            console.error('[回退] 处理历史图片URL时出错:', error);
                            setError('处理历史图片URL时出错');
                        }
                    } else {
                        console.error('[回退] 历史记录中没有有效的图片');
                    }
                } else {
                    console.error('[回退] 没有可用的历史记录图片');
                }
            }
        }
        
        // 滚动到表单位置，让用户可以看到并编辑参数
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
        
        // 添加延迟检查，确认参数是否正确设置
        setTimeout(() => {
            if (taskData.mode === 'generate') {
                console.log('[参数检查] 生成模式参数:');
                console.log(`- 提示词: ${genPrompt}`);
                console.log(`- 图片数量: ${genN}`);
                console.log(`- 尺寸: ${genSize}`);
                console.log(`- 宽高比: ${genAspectRatio}`);
                console.log(`- 宽度: ${genWidth}`);
                console.log(`- 高度: ${genHeight}`);
                console.log(`- 质量: ${genQuality}`);
                console.log(`- 输出格式: ${genOutputFormat}`);
                console.log(`- 背景: ${genBackground}`);
                console.log(`- 内容过滤: ${genModeration}`);
            } else if (taskData.mode === 'edit') {
                console.log('[参数检查] 编辑模式参数:');
                console.log(`- 提示词: ${editPrompt}`);
                console.log(`- 图片数量: ${editN}`);
                console.log(`- 尺寸: ${editSize}`);
                console.log(`- 质量: ${editQuality}`);
                console.log(`- 图片文件数量: ${editImageFiles.length}`);
            }
        }, 500);
    };

    // 查看数据库中的所有源图片
    async function checkSourceImagesInDB() {
        console.log('[数据库检查] 开始检查数据库中的源图片...');
        try {
            const allSourceImages = await db.sourceImages.toArray();
            console.log(`[数据库检查] 数据库中共有${allSourceImages.length}张源图片:`);
            allSourceImages.forEach((img, index) => {
                console.log(`[数据库检查] ${index+1}. 文件名: ${img.filename}, 任务ID: ${img.taskId}, Blob大小: ${img.blob.size}字节`);
            });
        } catch (err) {
            console.error('[数据库检查] 检查数据库源图片失败:', err);
        }
    }

    return (
        <main className='w-full bg-background p-2 text-foreground h-[calc(100vh-80px)]'>
            <PasswordDialog
                isOpen={isPasswordDialogOpen}
                onOpenChange={setIsPasswordDialogOpen}
                onSave={handleSavePassword}
                title={passwordDialogContext === 'retry' ? '需要密码' : '配置密码'}
                description={
                    passwordDialogContext === 'retry'
                        ? '服务器需要密码，或者之前的密码不正确。请输入密码以继续。'
                        : '设置用于 API 请求的密码。'
                }
            />
            <div className='w-full space-y-6'>
                <div className='grid grid-cols-1 gap-2 lg:grid-cols-4'>
                    <div className='relative flex h-[calc(100vh-80px)] min-h-[600px] flex-col lg:col-span-1'>
                        
                        <div className={mode === 'generate' ? 'block h-full w-full' : 'hidden'}>
                            <GenerationForm
                                onSubmit={handleApiCall}
                                isLoading={false}
                                currentMode={mode}
                                onModeChange={setMode}
                                isPasswordRequiredByBackend={isPasswordRequiredByBackend}
                                clientPasswordHash={clientPasswordHash}
                                onOpenPasswordDialog={handleOpenPasswordDialog}
                                prompt={genPrompt}
                                setPrompt={setGenPrompt}
                                n={genN}
                                setN={setGenN}
                                size={genSize}
                                setSize={setGenSize}
                                aspectRatio={genAspectRatio}
                                setAspectRatio={setGenAspectRatio}
                                width={genWidth}
                                setWidth={setGenWidth}
                                height={genHeight}
                                setHeight={setGenHeight}
                                quality={genQuality}
                                setQuality={setGenQuality}
                                outputFormat={genOutputFormat}
                                setOutputFormat={setGenOutputFormat}
                                compression={genCompression}
                                setCompression={setGenCompression}
                                background={genBackground}
                                setBackground={setGenBackground}
                                moderation={genModeration}
                                setModeration={setGenModeration}
                                referenceImage={genReferenceImage}
                                setReferenceImage={setGenReferenceImage}
                                referenceImages={genReferenceImages}
                                setReferenceImages={setGenReferenceImages}
                            />
                        </div>
                        <div className={mode === 'edit' ? 'block h-full w-full' : 'hidden'}>
                            <EditingForm
                                onSubmit={handleApiCall}
                                isLoading={false}
                                currentMode={mode}
                                onModeChange={setMode}
                                isPasswordRequiredByBackend={isPasswordRequiredByBackend}
                                clientPasswordHash={clientPasswordHash}
                                onOpenPasswordDialog={handleOpenPasswordDialog}
                                imageFiles={editImageFiles}
                                sourceImagePreviewUrls={editSourceImagePreviewUrls}
                                setImageFiles={setEditImageFiles}
                                setSourceImagePreviewUrls={setEditSourceImagePreviewUrls}
                                maxImages={MAX_EDIT_IMAGES}
                                editPrompt={editPrompt}
                                setEditPrompt={setEditPrompt}
                                editN={editN}
                                setEditN={setEditN}
                                editSize={editSize}
                                setEditSize={setEditSize}
                                editQuality={editQuality}
                                setEditQuality={setEditQuality}
                                editBrushSize={editBrushSize}
                                setEditBrushSize={setEditBrushSize}
                                editShowMaskEditor={editShowMaskEditor}
                                setEditShowMaskEditor={setEditShowMaskEditor}
                                editGeneratedMaskFile={editGeneratedMaskFile}
                                setEditGeneratedMaskFile={setEditGeneratedMaskFile}
                                editIsMaskSaved={editIsMaskSaved}
                                setEditIsMaskSaved={setEditIsMaskSaved}
                                editOriginalImageSize={editOriginalImageSize}
                                setEditOriginalImageSize={setEditOriginalImageSize}
                                editDrawnPoints={editDrawnPoints}
                                setEditDrawnPoints={setEditDrawnPoints}
                                editMaskPreviewUrl={editMaskPreviewUrl}
                                setEditMaskPreviewUrl={setEditMaskPreviewUrl}
                            />
                        </div>
                    </div>
                    <div className='flex h-full min-h-[600px] flex-col lg:col-span-3'>
                        {error && (
                            <Alert variant='destructive' className='mb-4 border-red-500/50 bg-red-900/20 text-red-300 flex-shrink-0'>
                                <AlertTitle className='text-red-200'>错误</AlertTitle>
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}
                        
                        <div className='flex-grow h-[calc(100vh-80px)] overflow-hidden'>
                            <TaskHistoryPanel 
                                onSelectTask={handleSelectTask}
                                onEditTask={handleEditTask}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
