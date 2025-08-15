import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useStore } from '@/store/useStore';
import { Upload, File, Copy, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import COS from 'cos-js-sdk-v5';

interface UploadedFile {
  name: string;
  size: number;
  url: string;
  uploadTime: string;
}

export default function FileUpload() {
  const { config, uploadProgress, setUploadProgress, setVersionInfo } = useStore();
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!config.cosSecretId || !config.cosSecretKey || !config.cosBucket || !config.cosRegion) {
      toast.error('请先在配置页面设置腾讯云COS配置');
      return;
    }

    const file = acceptedFiles[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // 初始化COS实例
      const cos = new COS({
        SecretId: config.cosSecretId,
        SecretKey: config.cosSecretKey,
      });

      // 生成文件名（添加时间戳避免重复）
      const timestamp = Date.now();
      const fileName = `${timestamp}_${file.name}`;

      // 使用简单上传方式避免CORS问题
      const result = await new Promise<any>((resolve, reject) => {
        cos.putObject({
          Bucket: config.cosBucket,
          Region: config.cosRegion,
          Key: fileName,
          Body: file,
          onProgress: (progressData: any) => {
            const percent = Math.round(progressData.percent * 100);
            setUploadProgress(percent);
          },
        }, (err: any, data: any) => {
          if (err) {
            reject(new Error(`上传失败: ${err.message || err.error || '网络错误'}`));
          } else {
            resolve(data);
          }
        });
      });

      // 构建文件URL
      const fileUrl = `https://${result.Location}`;

      const uploadedFile: UploadedFile = {
        name: file.name,
        size: file.size,
        url: fileUrl,
        uploadTime: new Date().toLocaleString()
      };

      setUploadedFiles(prev => [uploadedFile, ...prev]);
      
      // 自动更新版本信息中的下载链接
      setVersionInfo({ downloadUrl: fileUrl });
      
      toast.success('文件上传成功！');
    } catch (error: any) {
      console.error('Upload error:', error);
      
      let errorMessage = '文件上传失败';
      if (error.message) {
        if (error.message.includes('CORS') || error.message.includes('network')) {
          errorMessage = '上传失败：CORS跨域问题，请检查存储桶CORS配置';
        } else if (error.message.includes('403')) {
          errorMessage = '上传失败：权限不足，请检查密钥配置';
        } else if (error.message.includes('404')) {
          errorMessage = '上传失败：存储桶不存在，请检查存储桶名称';
        } else {
          errorMessage = `上传失败: ${error.message}`;
        }
      }
      
      toast.error(errorMessage);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [config, setUploadProgress, setVersionInfo]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: {
      'application/zip': ['.zip'],
      'application/x-zip-compressed': ['.zip']
    }
  });

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success('链接已复制到剪贴板');
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">文件上传</h2>

        {/* 配置检查 */}
        {(!config.cosSecretId || !config.cosSecretKey || !config.cosBucket) && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
            <div className="flex">
              <AlertCircle className="w-5 h-5 text-yellow-400 mr-2" />
              <div>
                <h3 className="text-sm font-medium text-yellow-800">配置未完成</h3>
                <p className="text-sm text-yellow-700 mt-1">
                  请先在配置页面设置腾讯云COS相关配置才能上传文件。
                </p>
              </div>
            </div>
          </div>
        )}

        {/* CORS提示 */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <div className="flex">
            <AlertCircle className="w-5 h-5 text-blue-400 mr-2" />
            <div>
              <h3 className="text-sm font-medium text-blue-800">重要提示</h3>
              <p className="text-sm text-blue-700 mt-1">
                如果上传失败，请确保您的腾讯云COS存储桶已配置CORS规则，允许来自 localhost 的跨域请求。
              </p>
              <p className="text-sm text-blue-700 mt-1">
                CORS配置示例：AllowedOrigins: *, AllowedMethods: PUT,POST,GET, AllowedHeaders: *
              </p>
            </div>
          </div>
        </div>

        {/* 上传区域 */}
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragActive
              ? 'border-blue-400 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
          } ${isUploading ? 'pointer-events-none opacity-50' : ''}`}
        >
          <input {...getInputProps()} />
          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          {isDragActive ? (
            <p className="text-blue-600">拖放文件到这里...</p>
          ) : (
            <div>
              <p className="text-gray-600 mb-2">拖拽ZIP文件到这里，或点击选择文件</p>
              <p className="text-sm text-gray-500">支持ZIP格式文件</p>
            </div>
          )}
        </div>

        {/* 上传进度 */}
        {isUploading && (
          <div className="mt-4">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>上传中...</span>
              <span>{Math.round(uploadProgress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* 已上传文件列表 */}
        {uploadedFiles.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">已上传文件</h3>
            <div className="space-y-3">
              {uploadedFiles.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <File className="w-8 h-8 text-blue-600" />
                    <div>
                      <p className="font-medium text-gray-900">{file.name}</p>
                      <p className="text-sm text-gray-500">
                        {formatFileSize(file.size)} • {file.uploadTime}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <button
                      onClick={() => copyToClipboard(file.url)}
                      className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                    >
                      <Copy className="w-4 h-4 mr-1" />
                      复制链接
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}