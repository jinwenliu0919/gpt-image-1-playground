import crypto from 'crypto';
import fs from 'fs/promises';
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import path from 'path';
import fetch from 'node-fetch';
import { getS3Service } from '@/lib/s3-service';
import { lookup } from 'mime-types';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_API_BASE_URL
});

const outputDir = path.resolve(process.cwd(), 'generated-images');

async function ensureOutputDirExists() {
    try {
        await fs.access(outputDir);
    } catch (error: unknown) {
        if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT') {
            try {
                await fs.mkdir(outputDir, { recursive: true });
                console.log(`Created output directory: ${outputDir}`);
            } catch (mkdirError) {
                console.error(`Error creating output directory ${outputDir}:`, mkdirError);
                throw new Error('Failed to create image output directory.');
            }
        } else {
            console.error(`Error accessing output directory ${outputDir}:`, error);
            throw new Error(
                `Failed to access or ensure image output directory exists. Original error: ${error instanceof Error ? error.message : String(error)}`
            );
        }
    }
}

function sha256(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
}

export async function POST(request: NextRequest) {
    console.log('Received POST request to /api/images');

    if (!process.env.OPENAI_API_KEY) {
        console.error('OPENAI_API_KEY is not set.');
        return NextResponse.json({ error: 'Server configuration error: API key not found.' }, { status: 500 });
    }
    try {
        let effectiveStorageMode: 'fs' | 'indexeddb' | 's3';
        const explicitMode = process.env.NEXT_PUBLIC_IMAGE_STORAGE_MODE;
        const isOnVercel = process.env.VERCEL === '1';
        const useS3 = process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY && process.env.S3_BUCKET;

        if (explicitMode === 'fs') {
            effectiveStorageMode = 'fs';
        } else if (explicitMode === 'indexeddb') {
            effectiveStorageMode = 'indexeddb';
        } else if (explicitMode === 's3') {
            effectiveStorageMode = 's3';
        } else if (useS3) {
            effectiveStorageMode = 's3';
        } else if (isOnVercel) {
            effectiveStorageMode = 'indexeddb';
        } else {
            effectiveStorageMode = 'fs';
        }
        console.log(
            `Effective Image Storage Mode: ${effectiveStorageMode} (Explicit: ${explicitMode || 'unset'}, Vercel: ${isOnVercel}, S3 Config: ${useS3 ? 'available' : 'unavailable'})`
        );

        if (effectiveStorageMode === 'fs') {
            await ensureOutputDirExists();
        }

        const formData = await request.formData();

        if (process.env.APP_PASSWORD) {
            const clientPasswordHash = formData.get('passwordHash') as string | null;
            if (!clientPasswordHash) {
                console.error('Missing password hash.');
                return NextResponse.json({ error: 'Unauthorized: Missing password hash.' }, { status: 401 });
            }
            const serverPasswordHash = sha256(process.env.APP_PASSWORD);
            if (clientPasswordHash !== serverPasswordHash) {
                console.error('Invalid password hash.');
                return NextResponse.json({ error: 'Unauthorized: Invalid password.' }, { status: 401 });
            }
        }

        let mode = formData.get('mode') as 'generate' | 'edit' | 'completion' | null;
        const prompt = formData.get('prompt') as string | null;

        console.log(`Mode: ${mode}, Prompt: ${prompt ? prompt.substring(0, 50) + '...' : 'N/A'}`);

        if (!mode || !prompt) {
            return NextResponse.json({ error: 'Missing required parameters: mode and prompt' }, { status: 400 });
        }

        const imageFiles: File[] = [];
        for (const [key, value] of formData.entries()) {
            if (key.startsWith('image_') && value instanceof File) {
                imageFiles.push(value);
            }
        }
        if(imageFiles.length > 0) {
            mode = 'edit';
        }

        let result: OpenAI.Images.ImagesResponse | OpenAI.Completions.Completion;
        //const model = 'gpt-image-1';
        // const model = 'sora_image';
        const model = 'gpt-4o-image-vip';
        if (mode === 'generate') {
            const n = parseInt((formData.get('n') as string) || '1', 10);
            const size = (formData.get('size') as OpenAI.Images.ImageGenerateParams['size']) || '1024x1024';
            const quality = (formData.get('quality') as OpenAI.Images.ImageGenerateParams['quality']) || 'auto';
            const output_format =
                (formData.get('output_format') as OpenAI.Images.ImageGenerateParams['output_format']) || 'png';
            const output_compression_str = formData.get('output_compression') as string | null;
            const background =
                (formData.get('background') as OpenAI.Images.ImageGenerateParams['background']) || 'auto';
            const moderation =
                (formData.get('moderation') as OpenAI.Images.ImageGenerateParams['moderation']) || 'auto';

            const params: OpenAI.Images.ImageGenerateParams = {
                model,
                prompt,
                n: Math.max(1, Math.min(n || 1, 10)),
                size,
                quality,
                output_format,
                background,
                moderation
            };

            if ((output_format === 'jpeg' || output_format === 'webp') && output_compression_str) {
                const compression = parseInt(output_compression_str, 10);
                if (!isNaN(compression) && compression >= 0 && compression <= 100) {
                    params.output_compression = compression;
                }
            }

            console.log('Calling OpenAI generate with params:', params);
            result = await openai.images.generate(params);
        } else if (mode === 'edit') {
            const n = parseInt((formData.get('n') as string) || '1', 10);
            const size = (formData.get('size') as OpenAI.Images.ImageEditParams['size']) || 'auto';
            const quality = (formData.get('quality') as OpenAI.Images.ImageEditParams['quality']) || 'auto';

           

            if (imageFiles.length === 0) {
                return NextResponse.json({ error: 'No image file provided for editing.' }, { status: 400 });
            }

            const maskFile = formData.get('mask') as File | null;

            const params: OpenAI.Images.ImageEditParams = {
                model,
                prompt,
                image: imageFiles,
                n: Math.max(1, Math.min(n || 1, 10)),
                size: size === 'auto' ? undefined : size,
                quality: quality === 'auto' ? undefined : quality
            };

            if (maskFile) {
                params.mask = maskFile;
            }

            console.log('Calling OpenAI edit with params:', {
                ...params,
                image: `[${imageFiles.map((f) => f.name).join(', ')}]`,
                mask: maskFile ? maskFile.name : 'N/A'
            });
            result = await openai.images.edit(params);
        } 
        else if (mode === 'completion') {
            const n = parseInt((formData.get('n') as string) || '1', 10);
            const size = (formData.get('size') as OpenAI.Images.ImageCreateVariationParams['size']) || '1024x1024';

            const promptMap = {
                "role": "user",
                "prompt": formData.get('prompt') as string,
                "n": n,
                "size": size,
            }

            const params: OpenAI.Completions.CompletionCreateParamsNonStreaming = {
                model: 'gpt-4o-mini',
                prompt: JSON.stringify(promptMap),
            };
            
            result = await openai.completions.create(params);
            console.log('OpenAI API call successful.', result);
            return NextResponse.json(result);
        }
        else {
            return NextResponse.json({ error: 'Invalid mode specified' }, { status: 400 });
        }

        console.log('OpenAI API call successful.');

        if (!result || !Array.isArray(result.data) || result.data.length === 0) {
            console.error('Invalid or empty data received from OpenAI API:', result);
            return NextResponse.json({ error: 'Failed to retrieve image data from API.' }, { status: 500 });
        }

        const savedImagesData = await Promise.all(
            result.data.map(async (imageData, index) => {
                const timestamp = Date.now();
                const fileExtension = (formData.get('output_format') as string) || 'png';
                const filename = `${timestamp}-${index}.${fileExtension}`;
                
                if (imageData.b64_json) {
                    const buffer = Buffer.from(imageData.b64_json, 'base64');

                    if (effectiveStorageMode === 'fs') {
                        const filepath = path.join(outputDir, filename);
                        console.log(`Attempting to save image to: ${filepath}`);
                        await fs.writeFile(filepath, buffer);
                        console.log(`Successfully saved image: ${filename}`);
                    } else if (effectiveStorageMode === 's3') {
                        try {
                            // 使用S3服务保存图片
                            const contentType = lookup(filename) || 'image/png';
                            const s3 = getS3Service();
                            const s3Url = await s3.uploadFile(buffer, `dreamImage/${filename}`, contentType);
                            console.log(`Successfully uploaded image to S3: ${s3Url}`);
                            
                            const imageResult: { filename: string; b64_json: string; path?: string; url?: string; output_format: string } = {
                                filename: filename,
                                b64_json: imageData.b64_json,
                                url: s3Url,
                                output_format: fileExtension
                            };
                            
                            return imageResult;
                        } catch (s3Error) {
                            console.error('Error uploading to S3:', s3Error);
                            throw new Error(`Failed to upload image to S3: ${s3Error instanceof Error ? s3Error.message : String(s3Error)}`);
                        }
                    }

                    const imageResult: { filename: string; b64_json: string; path?: string; url?: string; output_format: string } = {
                        filename: filename,
                        b64_json: imageData.b64_json,
                        output_format: fileExtension
                    };

                    if (effectiveStorageMode === 'fs') {
                        imageResult.path = `/api/image/${filename}`;
                    }

                    return imageResult;
                } else if (imageData.url) {
                    console.log(`Image ${index} provided as URL: ${imageData.url}`);
                    
                    if (effectiveStorageMode === 'fs') {
                        try {
                            const response = await fetch(imageData.url);
                            if (!response.ok) {
                                throw new Error(`Failed to download image from URL: ${response.status} ${response.statusText}`);
                            }
                            const buffer = await response.buffer();
                            
                            const filepath = path.join(outputDir, filename);
                            console.log(`Attempting to save image from URL to: ${filepath}`);
                            await fs.writeFile(filepath, buffer);
                            console.log(`Successfully saved image from URL: ${filename}`);
                        } catch (downloadError: unknown) {
                            console.error(`Error downloading image from URL: ${imageData.url}`, downloadError);
                            throw new Error(`Failed to download image from URL: ${downloadError instanceof Error ? downloadError.message : String(downloadError)}`);
                        }
                    } else if (effectiveStorageMode === 's3') {
                        try {
                            // 下载图片并上传到S3
                            const response = await fetch(imageData.url);
                            if (!response.ok) {
                                console.log(`无法下载图片，直接返回原始URL: ${imageData.url}`);
                                return {
                                    filename: filename,
                                    url: imageData.url,
                                    output_format: fileExtension,
                                    original: true // 标记这是原始URL
                                };
                            }
                            const buffer = await response.buffer();
                            
                            // 使用S3服务保存图片
                            const contentType = lookup(filename) || 'image/png';
                            const s3 = getS3Service();
                            const s3Url = await s3.uploadFile(buffer, `dreamImage/${filename}`, contentType);
                            console.log(`Successfully uploaded image from URL to S3: ${s3Url}`);
                            
                            const imageResult: { filename: string; url: string; output_format: string } = {
                                filename: filename,
                                url: s3Url,
                                output_format: fileExtension
                            };
                            
                            return imageResult;
                        } catch (s3Error) {
                            console.error('从URL下载或上传到S3失败，直接返回原始URL:', s3Error);
                            return {
                                filename: filename,
                                url: imageData.url,
                                output_format: fileExtension,
                                original: true // 标记这是原始URL
                            };
                        }
                    }
                    
                    const imageResult: { filename: string; url: string; path?: string; output_format: string } = {
                        filename: filename,
                        url: imageData.url,
                        output_format: fileExtension
                    };
                    
                    if (effectiveStorageMode === 'fs') {
                        imageResult.path = `/api/image/${filename}`;
                    }
                    
                    return imageResult;
                } else {
                    console.error(`Image data ${index} has neither b64_json nor url.`);
                    throw new Error(`Image data at index ${index} is missing both base64 data and URL.`);
                }
            })
        );

        console.log(`All images processed. Mode: ${effectiveStorageMode}`);
        console.log('返回给前端的图片数据:', JSON.stringify(savedImagesData, null, 2));

        return NextResponse.json({ images: savedImagesData, usage: result.usage, storageMode: effectiveStorageMode });
    } catch (error: unknown) {
        console.error('Error in /api/images:', error);

        let errorMessage = 'An unexpected error occurred.';
        let status = 500;

        if (error instanceof Error) {
            errorMessage = error.message;
            if (typeof error === 'object' && error !== null && 'status' in error && typeof error.status === 'number') {
                status = error.status;
            }
        } else if (typeof error === 'object' && error !== null) {
            if ('message' in error && typeof error.message === 'string') {
                errorMessage = error.message;
            }
            if ('status' in error && typeof error.status === 'number') {
                status = error.status;
            }
        }

        return NextResponse.json({ error: errorMessage }, { status });
    }
}
