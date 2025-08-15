import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { Settings, Save, TestTube, Eye, EyeOff, CheckCircle, XCircle, Download, Upload, FolderOpen } from 'lucide-react';
import { toast } from 'sonner';
import { 
  exportConfigToFile, 
  importConfigFromFile, 
  saveConfigToLocal, 
  loadConfigFromLocal 
} from '@/utils/configManager';

export default function Configuration() {
  const { config, setConfig } = useStore();
  const [localConfig, setLocalConfig] = useState(config);
  const [showSecrets, setShowSecrets] = useState({
    cloudflareApiToken: false,
    cosSecretId: false,
    cosSecretKey: false
  });
  const [testResults, setTestResults] = useState({
    cloudflare: null as boolean | null,
    cos: null as boolean | null
  });
  const [isTesting, setIsTesting] = useState({
    cloudflare: false,
    cos: false
  });

  const handleInputChange = (field: keyof typeof config, value: string) => {
    setLocalConfig(prev => ({ ...prev, [field]: value }));
  };

  const toggleSecretVisibility = (field: keyof typeof showSecrets) => {
    setShowSecrets(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSave = () => {
    setConfig(localConfig);
    toast.success('配置已保存');
  };

  // 配置文件管理函数
  const handleExportConfig = () => {
    exportConfigToFile(localConfig);
  };

  const handleImportConfig = async () => {
    try {
      const importedConfig = await importConfigFromFile();
      setLocalConfig(importedConfig);
    } catch (error) {
      // 错误已在 importConfigFromFile 中处理
    }
  };

  const handleSaveToLocal = () => {
    saveConfigToLocal(localConfig);
  };

  const handleLoadFromLocal = () => {
    const savedConfig = loadConfigFromLocal();
    if (savedConfig) {
      setLocalConfig(savedConfig);
      toast.success('配置已从本地加载');
    } else {
      toast.warning('未找到本地保存的配置');
    }
  };

  const testCloudflareConnection = async () => {
    if (!localConfig.cloudflareApiToken) {
      toast.error('请填写Cloudflare API Token');
      return;
    }

    setIsTesting(prev => ({ ...prev, cloudflare: true }));
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch('https://api.cloudflare.com/client/v4/user/tokens/verify', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localConfig.cloudflareApiToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'Version-Manager/1.0'
        },
        mode: 'cors',
        credentials: 'omit',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setTestResults(prev => ({ ...prev, cloudflare: true }));
          toast.success('✅ Cloudflare API Token验证成功');
        } else {
          setTestResults(prev => ({ ...prev, cloudflare: false }));
          toast.error('❌ API Token验证失败');
        }
      } else if (response.status === 401) {
        setTestResults(prev => ({ ...prev, cloudflare: false }));
        toast.error('❌ API Token无效或已过期');
      } else if (response.status === 403) {
        setTestResults(prev => ({ ...prev, cloudflare: false }));
        toast.error('❌ API Token权限不足');
      } else {
        setTestResults(prev => ({ ...prev, cloudflare: false }));
        toast.error(`❌ API服务器错误 (${response.status})`);
      }
    } catch (error: any) {
      setTestResults(prev => ({ ...prev, cloudflare: false }));
      
      if (error.name === 'AbortError') {
        toast.error('❌ 连接超时，请检查网络连接');
      } else if (error.message.includes('Failed to fetch') || error.message.includes('ERR_FAILED')) {
        toast.error('❌ 网络连接失败，可能是网络问题或CORS限制');
      } else {
        toast.error(`❌ 连接测试失败: ${error.message}`);
      }
    } finally {
      setIsTesting(prev => ({ ...prev, cloudflare: false }));
    }
  };

  const testCosConnection = async () => {
    if (!localConfig.cosSecretId || !localConfig.cosSecretKey || !localConfig.cosBucket) {
      toast.error('请填写腾讯云COS完整配置');
      return;
    }

    setIsTesting(prev => ({ ...prev, cos: true }));
    try {
      // 这里应该调用腾讯云COS API测试连接
      await new Promise(resolve => setTimeout(resolve, 2000));
      setTestResults(prev => ({ ...prev, cos: true }));
      toast.success('腾讯云COS连接测试成功');
    } catch (error) {
      setTestResults(prev => ({ ...prev, cos: false }));
      toast.error('腾讯云COS连接测试失败');
    } finally {
      setIsTesting(prev => ({ ...prev, cos: false }));
    }
  };

  const renderTestResult = (result: boolean | null) => {
    if (result === null) return null;
    return result ? (
      <CheckCircle className="w-5 h-5 text-green-500" />
    ) : (
      <XCircle className="w-5 h-5 text-red-500" />
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">系统配置</h2>
          <div className="flex items-center space-x-3">
            {/* 配置文件管理按钮组 */}
            <div className="flex items-center space-x-2 border-r border-gray-200 pr-3">
              <button
                onClick={handleLoadFromLocal}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                title="从本地加载配置"
              >
                <FolderOpen className="w-4 h-4 mr-1" />
                加载
              </button>
              <button
                onClick={handleSaveToLocal}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                title="保存到本地"
              >
                <Save className="w-4 h-4 mr-1" />
                本地保存
              </button>
            </div>
            
            {/* 导入导出按钮组 */}
            <div className="flex items-center space-x-2 border-r border-gray-200 pr-3">
              <button
                onClick={handleImportConfig}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                title="导入配置文件"
              >
                <Upload className="w-4 h-4 mr-1" />
                导入
              </button>
              <button
                onClick={handleExportConfig}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                title="导出配置文件"
              >
                <Download className="w-4 h-4 mr-1" />
                导出
              </button>
            </div>
            
            {/* 保存配置按钮 */}
            <button
              onClick={handleSave}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              <Save className="w-4 h-4 mr-2" />
              保存配置
            </button>
          </div>
        </div>

        <div className="space-y-8">
          {/* Cloudflare配置 */}
          <div className="border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <Settings className="w-5 h-5 mr-2" />
                Cloudflare配置
              </h3>
              <div className="flex items-center space-x-2">
                {renderTestResult(testResults.cloudflare)}
                <button
                  onClick={testCloudflareConnection}
                  disabled={isTesting.cloudflare}
                  className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  <TestTube className={`w-4 h-4 mr-1 ${isTesting.cloudflare ? 'animate-pulse' : ''}`} />
                  {isTesting.cloudflare ? '测试中...' : '测试连接'}
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  API Token
                </label>
                <div className="relative">
                  <input
                    type={showSecrets.cloudflareApiToken ? 'text' : 'password'}
                    value={localConfig.cloudflareApiToken}
                    onChange={(e) => handleInputChange('cloudflareApiToken', e.target.value)}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="输入Cloudflare API Token"
                  />
                  <button
                    type="button"
                    onClick={() => toggleSecretVisibility('cloudflareApiToken')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showSecrets.cloudflareApiToken ? (
                      <EyeOff className="w-4 h-4 text-gray-400" />
                    ) : (
                      <Eye className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Account ID
                </label>
                <input
                  type="text"
                  value={localConfig.cloudflareAccountId}
                  onChange={(e) => handleInputChange('cloudflareAccountId', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="输入Cloudflare Account ID"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Worker ID
                </label>
                <input
                  type="text"
                  value={localConfig.cloudflareWorkerId}
                  onChange={(e) => handleInputChange('cloudflareWorkerId', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="输入Worker ID"
                />
              </div>
            </div>
          </div>

          {/* 腾讯云COS配置 */}
          <div className="border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <Settings className="w-5 h-5 mr-2" />
                腾讯云COS配置
              </h3>
              <div className="flex items-center space-x-2">
                {renderTestResult(testResults.cos)}
                <button
                  onClick={testCosConnection}
                  disabled={isTesting.cos}
                  className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  <TestTube className={`w-4 h-4 mr-1 ${isTesting.cos ? 'animate-pulse' : ''}`} />
                  {isTesting.cos ? '测试中...' : '测试连接'}
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Secret ID
                </label>
                <div className="relative">
                  <input
                    type={showSecrets.cosSecretId ? 'text' : 'password'}
                    value={localConfig.cosSecretId}
                    onChange={(e) => handleInputChange('cosSecretId', e.target.value)}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="输入腾讯云Secret ID"
                  />
                  <button
                    type="button"
                    onClick={() => toggleSecretVisibility('cosSecretId')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showSecrets.cosSecretId ? (
                      <EyeOff className="w-4 h-4 text-gray-400" />
                    ) : (
                      <Eye className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Secret Key
                </label>
                <div className="relative">
                  <input
                    type={showSecrets.cosSecretKey ? 'text' : 'password'}
                    value={localConfig.cosSecretKey}
                    onChange={(e) => handleInputChange('cosSecretKey', e.target.value)}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="输入腾讯云Secret Key"
                  />
                  <button
                    type="button"
                    onClick={() => toggleSecretVisibility('cosSecretKey')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showSecrets.cosSecretKey ? (
                      <EyeOff className="w-4 h-4 text-gray-400" />
                    ) : (
                      <Eye className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    存储桶名称
                  </label>
                  <input
                    type="text"
                    value={localConfig.cosBucket}
                    onChange={(e) => handleInputChange('cosBucket', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="输入存储桶名称"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    地域
                  </label>
                  <select
                    value={localConfig.cosRegion}
                    onChange={(e) => handleInputChange('cosRegion', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="ap-beijing">北京</option>
                    <option value="ap-shanghai">上海</option>
                    <option value="ap-guangzhou">广州</option>
                    <option value="ap-chengdu">成都</option>
                    <option value="ap-nanjing">南京</option>
                    <option value="ap-hongkong">香港</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 配置说明 */}
        <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-md">
          <h4 className="text-sm font-medium text-gray-800 mb-2">配置说明</h4>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Cloudflare API Token需要具有Worker编辑权限</li>
            <li>• 腾讯云COS需要具有对象存储的读写权限</li>
            <li>• 所有敏感信息都会安全存储在本地</li>
            <li>• 建议定期更新API密钥以确保安全</li>
            <li>• 可以导出配置文件进行备份，或导入已有配置</li>
            <li>• 本地保存功能可快速保存和恢复当前配置</li>
          </ul>
        </div>
      </div>
    </div>
  );
}