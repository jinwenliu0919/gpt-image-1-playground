import { S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { GetObjectCommand } from '@aws-sdk/client-s3';

export class S3Service {
  private s3Client: S3Client;
  private bucket: string;
  private publicDomain: string;

  constructor() {
    // 从环境变量读取配置
    const accessKeyId = process.env.S3_ACCESS_KEY_ID;
    const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
    const endpoint = process.env.S3_ENDPOINT;
    const region = process.env.S3_REGION || 'us-west-1'; // 默认区域
    this.bucket = process.env.S3_BUCKET || '';
    this.publicDomain = process.env.S3_PUBLIC_DOMAIN || '';

    if (!accessKeyId || !secretAccessKey || !endpoint || !this.bucket) {
      throw new Error('缺少S3必要的配置信息');
    }

    // 创建S3客户端
    this.s3Client = new S3Client({
      region,
      endpoint,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      forcePathStyle: false, // 阿里云OSS不使用path style
    });
  }

  /**
   * 上传文件到S3
   * @param buffer 文件数据
   * @param key 文件路径和名称
   * @param contentType 文件类型
   * @returns 返回文件的URL
   */
  async uploadFile(buffer: Buffer, key: string, contentType: string): Promise<string> {
    try {
      // 使用Upload类来处理分段上传
      const upload = new Upload({
        client: this.s3Client,
        params: {
          Bucket: this.bucket,
          Key: key,
          Body: buffer,
          ContentType: contentType,
          ACL: 'public-read', // 设置为公开可读
        },
      });

      await upload.done();
      
      // 返回文件的公共URL
      return `${this.publicDomain}/${key}`;
    } catch (error) {
      console.error('上传文件到S3失败:', error);
      throw error;
    }
  }

  /**
   * 根据文件名获取完整URL
   * @param filename 文件名
   * @returns 完整的URL
   */
  getPublicUrl(filename: string): string {
    return `${this.publicDomain}/${filename}`;
  }

  /**
   * 从S3获取文件
   * @param key 文件路径和名称
   * @returns 文件Buffer
   */
  async getFile(key: string): Promise<Buffer> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });
      
      const response = await this.s3Client.send(command);
      
      if (!response.Body) {
        throw new Error('未能从S3获取文件内容');
      }
      
      // 转换流为Buffer
      return Buffer.from(await response.Body.transformToByteArray());
    } catch (error) {
      console.error('从S3获取文件失败:', error);
      throw error;
    }
  }
}

// 创建单例实例
let s3Instance: S3Service | null = null;

export function getS3Service(): S3Service {
  if (!s3Instance) {
    s3Instance = new S3Service();
  }
  return s3Instance;
} 