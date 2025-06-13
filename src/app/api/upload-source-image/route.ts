import { NextRequest, NextResponse } from 'next/server';
import { getS3Service } from '@/lib/s3-service';
import { lookup } from 'mime-types';

export async function POST(request: NextRequest) {
  try {
    // 检查配置
    const useS3 = process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY && process.env.S3_BUCKET;
    if (!useS3) {
      return NextResponse.json(
        { error: 'S3存储未配置' },
        { status: 500 }
      );
    }

    // 解析FormData
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const filename = formData.get('filename') as string | null;

    if (!file || !filename) {
      return NextResponse.json(
        { error: '缺少必要参数：file或filename' },
        { status: 400 }
      );
    }

    // 获取文件内容和类型
    const buffer = Buffer.from(await file.arrayBuffer());
    const contentType = file.type || lookup(filename) || 'application/octet-stream';

    // 上传到S3
    const s3Service = getS3Service();
    const s3Url = await s3Service.uploadFile(buffer, filename, contentType);

    return NextResponse.json({
      success: true,
      filename,
      url: s3Url
    });
  } catch (error) {
    console.error('上传源图片到S3失败:', error);
    return NextResponse.json(
      { error: `上传源图片到S3失败: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
} 