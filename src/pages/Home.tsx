import { Link } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import { 
  Upload, 
  Code, 
  Settings, 
  Database, 
  Download, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  TrendingUp
} from 'lucide-react';

export default function Home() {
  const { versionInfo, workerStatus, config } = useStore();

  const quickActions = [
    {
      title: '发布新版本',
      description: '上传文件并更新版本信息',
      icon: Upload,
      link: '/upload',
      color: 'bg-blue-600 hover:bg-blue-700'
    },
    {
      title: '管理版本',
      description: '编辑版本信息和更新日志',
      icon: Database,
      link: '/version',
      color: 'bg-green-600 hover:bg-green-700'
    },
    {
      title: '更新Worker',
      description: '推送最新代码到Cloudflare',
      icon: Code,
      link: '/worker',
      color: 'bg-purple-600 hover:bg-purple-700'
    },
    {
      title: '系统配置',
      description: '设置API密钥和参数',
      icon: Settings,
      link: '/config',
      color: 'bg-gray-600 hover:bg-gray-700'
    }
  ];

  const stats = [
    {
      title: '当前版本',
      value: versionInfo.version,
      icon: TrendingUp,
      color: 'text-blue-600'
    },
    {
      title: '更新项目',
      value: versionInfo.changelog.length,
      icon: Clock,
      color: 'text-green-600'
    },
    {
      title: 'Worker状态',
      value: workerStatus === 'running' ? '运行中' : workerStatus === 'error' ? '错误' : '未知',
      icon: workerStatus === 'running' ? CheckCircle : AlertCircle,
      color: workerStatus === 'running' ? 'text-green-600' : 'text-red-600'
    }
  ];

  const isConfigured = config.cloudflareApiToken && config.cosSecretId;

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* 欢迎区域 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">版本管理系统</h1>
        <p className="text-lg text-gray-600">自动化管理Cloudflare Worker代码更新和腾讯云COS文件上传</p>
      </div>

      {/* 配置提醒 */}
      {!isConfigured && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-yellow-400 mr-2" />
            <div>
              <h3 className="text-sm font-medium text-yellow-800">需要完成配置</h3>
              <p className="text-sm text-yellow-700 mt-1">
                请先在 <Link to="/config" className="underline">配置页面</Link> 设置Cloudflare和腾讯云COS的API密钥。
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center">
                <div className={`p-2 rounded-lg bg-gray-100 ${stat.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 快速操作 */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">快速操作</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <Link
                key={index}
                to={action.link}
                className={`${action.color} text-white rounded-lg p-6 transition-colors group`}
              >
                <div className="flex items-center mb-3">
                  <Icon className="w-6 h-6 mr-2" />
                  <h3 className="font-semibold">{action.title}</h3>
                </div>
                <p className="text-sm opacity-90">{action.description}</p>
              </Link>
            );
          })}
        </div>
      </div>

      {/* 版本信息预览 */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">当前版本信息</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">版本详情</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">版本号:</span>
                <span className="font-medium">{versionInfo.version}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">强制更新:</span>
                <span className={`font-medium ${
                  versionInfo.forceUpdate ? 'text-red-600' : 'text-green-600'
                }`}>
                  {versionInfo.forceUpdate ? '是' : '否'}
                </span>
              </div>
              <div className="flex items-start justify-between">
                <span className="text-gray-600">下载链接:</span>
                <div className="flex items-center ml-2">
                  <Download className="w-4 h-4 text-gray-400 mr-1" />
                  <span className="text-sm text-blue-600 truncate max-w-xs">
                    {versionInfo.downloadUrl || '未设置'}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">更新日志</h3>
            <div className="space-y-1">
              {versionInfo.changelog.length > 0 ? (
                versionInfo.changelog.map((item, index) => (
                  <div key={index} className="flex items-start">
                    <span className="text-gray-400 mr-2">•</span>
                    <span className="text-gray-700 text-sm">{item}</span>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-sm">暂无更新日志</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}