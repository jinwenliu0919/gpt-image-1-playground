import { NextRequest, NextResponse } from 'next/server';
import { getS3Service } from '@/lib/s3-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;

  if (!filename) {
    return NextResponse.json({ error: 'Filename is required' }, { status: 400 });
  }

  // 基本安全检查：防止目录遍历
  if (filename.includes('..') || filename.startsWith('/') || filename.startsWith('\\')) {
    return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
  }

  try {
    // 获取S3服务实例
    const s3Service = getS3Service();
    
    // 直接重定向到S3的公共URL
    const publicUrl = s3Service.getPublicUrl(filename);
    
    return NextResponse.redirect(publicUrl);
    
    // 如果需要通过服务器中转文件内容，可以使用下面的代码替代上面的重定向
    /*
    // 从S3获取文件
    const fileBuffer = await s3Service.getFile(filename);
    
    // 设置正确的Content-Type
    const contentType = lookup(filename) || 'application/octet-stream';
    
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': fileBuffer.length.toString(),
        'Cache-Control': 'public, max-age=31536000', // 缓存一年
      },
    });
    */
  } catch (error) {
    console.error(`Error serving S3 image ${filename}:`, error);
    return NextResponse.json(
      { error: 'Failed to retrieve image from S3' },
      { status: 500 }
    );
  }
} 