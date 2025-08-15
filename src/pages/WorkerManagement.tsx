import { useState, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { Code, Play, Save, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import Editor, { loader } from '@monaco-editor/react';

// 配置Monaco编辑器使用更稳定的CDN源
loader.config({
  paths: {
    vs: 'https://cdn.bootcdn.net/ajax/libs/monaco-editor/0.52.2/min/vs'
  }
});

export default function WorkerManagement() {
  const { versionInfo, workerStatus, setWorkerStatus } = useStore();
  const [workerCode, setWorkerCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editorLoading, setEditorLoading] = useState(true);
  const [editorError, setEditorError] = useState<string | null>(null);

  // 固定的Cloudflare API配置
  const CLOUDFLARE_CONFIG = {
    email: '937446411b@gmail.com',
    apiToken: 'nhDxYK9lQIJuZhRLeIF0ArukFO9mIQIrzlxk_qNa',
    accountId: 'ea183bdb76007d87f4e9147d393c6074',
    workerId: 'version'
  };

  // 生成Worker代码
  const generateWorkerCode = () => {
    return `addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  // 手动维护的版本信息，更新时直接修改这里
  const versionInfo = {
    version: "${versionInfo.version}",  // 当前最新版本号
    downloadUrl: "${versionInfo.downloadUrl}",  // COS中的ZIP包地址
    changelog: [  // 更新日志，支持多条记录
${versionInfo.changelog.map(item => `      "${item}"`).join(',\n')}
    ],
    forceUpdate: ${versionInfo.forceUpdate}  // 是否强制更新（可选字段）
  };

  // 跨域配置，允许客户端访问
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Content-Type": "application/json"
  };

  // 处理预检请求
  if (request.method === "OPTIONS") {
    return new Response(null, { headers });
  }

  return new Response(JSON.stringify(versionInfo), {
    status: 200,
    headers: headers
  });
}`;
  };

  // 检测是否为CORS错误
  const isCorsError = (error: any) => {
    return error.message === 'Failed to fetch' || 
           error.name === 'TypeError' ||
           error.message.includes('CORS') ||
           error.message.includes('net::ERR_FAILED');
  };

  // 简化的获取Worker代码函数
  const fetchWorkerCode = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('https://api.cloudflare.com/client/v4/accounts/ea183bdb76007d87f4e9147d393c6074/workers/scripts/version', {
        method: 'GET',
        headers: {
          'X-Auth-Email': '937446411b@gmail.com',
          'Authorization': 'Bearer nhDxYK9lQIJuZhRLeIF0ArukFO9mIQIrzlxk_qNa'
        }
      });
      
      if (response.ok) {
        const code = await response.text();
        setWorkerCode(code);
        setWorkerStatus('running');
        toast.success('✅ Worker代码获取成功');
      } else if (response.status === 404) {
        // Worker未部署，显示模板代码
        const generatedCode = generateWorkerCode();
        setWorkerCode(generatedCode);
        setWorkerStatus('not_deployed');
        toast.info('ℹ️ Worker尚未部署，显示模板代码');
      } else {
        throw new Error(`获取失败: ${response.status}`);
      }
    } catch (error: any) {
      console.error('Fetch worker error:', error);
      
      // 检测CORS错误并提供友好提示
      if (isCorsError(error)) {
        const generatedCode = generateWorkerCode();
        setWorkerCode(generatedCode);
        setWorkerStatus('offline');
        toast.warning('⚠️ 由于浏览器安全限制，无法直接访问Cloudflare API\n已切换到离线模式，显示模板代码\n\n💡 提示：可以使用命令行工具或Cloudflare Dashboard进行实际部署');
      } else {
        // 其他错误
        const generatedCode = generateWorkerCode();
        setWorkerCode(generatedCode);
        setWorkerStatus('error');
        toast.error('❌ 获取Worker代码失败，显示模板代码');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 简化的更新Worker代码函数
  const updateWorkerCode = async () => {
    setIsUpdating(true);
    const updatedCode = generateWorkerCode(); // 将变量声明移到函数开头
    
    try {
      
      const response = await fetch('https://api.cloudflare.com/client/v4/accounts/ea183bdb76007d87f4e9147d393c6074/workers/scripts/version', {
        method: 'PUT',
        headers: {
          'Authorization': 'Bearer nhDxYK9lQIJuZhRLeIF0ArukFO9mIQIrzlxk_qNa',
          'Content-Type': 'application/javascript'
        },
        body: updatedCode
      });
      
      if (response.ok) {
        setWorkerCode(updatedCode);
        setWorkerStatus('running');
        toast.success('🚀 Worker代码更新成功！');
        // 自动测试Worker
        setTimeout(() => testWorker(), 2000);
      } else {
        throw new Error(`部署失败: ${response.status}`);
      }
    } catch (error: any) {
      console.error('Update worker error:', error);
      
      // 检测CORS错误并提供友好提示
       if (isCorsError(error)) {
         setWorkerStatus('offline');
         const curlCommand = `curl --location --request PUT "https://api.cloudflare.com/client/v4/accounts/ea183bdb76007d87f4e9147d393c6074/workers/scripts/version" \\\n--header "Authorization: Bearer nhDxYK9lQIJuZhRLeIF0ArukFO9mIQIrzlxk_qNa" \\\n--header "Content-Type: application/javascript" \\\n--data-raw "${updatedCode.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`;
         toast.warning(`⚠️ 由于浏览器安全限制，无法直接部署到Cloudflare\n\n📋 请复制以下curl命令在终端中执行：\n\n${curlCommand}`);
       } else {
         setWorkerStatus('error');
         toast.error('❌ Worker代码更新失败');
       }
    } finally {
      setIsUpdating(false);
    }
  };



  useEffect(() => {
    // 组件加载时获取Worker代码
    fetchWorkerCode();
  }, [versionInfo.version, versionInfo.downloadUrl, versionInfo.changelog, versionInfo.forceUpdate]);

  // 添加缺少的setIsTesting状态
  const [isTesting, setIsTesting] = useState(false);

  // 简化的测试Worker函数
  const testWorker = async () => {
    setIsTesting(true);
    try {
      const response = await fetch('https://version.ea183bdb76007d87f4e9147d393c6074.workers.dev/', {
        method: 'GET'
      });
      
      if (response.ok) {
        try {
          const data = await response.json();
          if (data.version) {
            setWorkerStatus('running');
            toast.success(`✅ Worker运行正常！当前版本: ${data.version}`);
          } else {
            setWorkerStatus('running');
            toast.success('✅ Worker运行正常！');
          }
        } catch (jsonError) {
          setWorkerStatus('running');
          toast.success('✅ Worker运行正常！');
        }
      } else if (response.status === 404) {
        setWorkerStatus('not_deployed');
        toast.warning('🚫 Worker尚未部署');
      } else {
        throw new Error(`测试失败: ${response.status}`);
      }
    } catch (error: any) {
      console.error('Test worker error:', error);
      
      // 检测CORS或网络错误
      if (isCorsError(error)) {
        setWorkerStatus('offline');
        toast.info('ℹ️ 无法测试Worker连接\n这可能是由于网络限制或Worker尚未部署\n\n💡 提示：如果Worker已部署，可以直接在浏览器中访问：\nhttps://version.ea183bdb76007d87f4e9147d393c6074.workers.dev/');
      } else {
        setWorkerStatus('error');
        toast.error('❌ Worker测试失败');
      }
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <h2 className="text-2xl font-bold text-gray-900">Worker管理</h2>
            <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
              workerStatus === 'running' ? 'bg-green-100 text-green-800' :
              workerStatus === 'error' ? 'bg-red-100 text-red-800' :
              workerStatus === 'not_deployed' ? 'bg-yellow-100 text-yellow-800' :
              workerStatus === 'offline' ? 'bg-blue-100 text-blue-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {workerStatus === 'running' ? '运行中' :
               workerStatus === 'error' ? '错误' :
               workerStatus === 'not_deployed' ? '未部署' :
               workerStatus === 'offline' ? '离线模式' : '未知'}
            </div>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => testWorker()}
              disabled={isTesting}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <Play className="w-4 h-4 mr-2" />
              {isTesting ? '测试中...' : '测试'}
            </button>
            <button
              onClick={() => fetchWorkerCode()}
              disabled={isLoading}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? '获取中...' : '刷新'}
            </button>
            <button
              onClick={() => updateWorkerCode()}
              disabled={isUpdating}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4 mr-2" />
              {isUpdating ? '更新中...' : '更新Worker'}
            </button>
          </div>
        </div>



        {/* 代码编辑器 */}
        <div className="border border-gray-300 rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-300">
            <div className="flex items-center space-x-2">
              <Code className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Worker代码</span>
            </div>
          </div>
          <div className="h-96 relative">
            {editorLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
                <div className="flex items-center space-x-2">
                  <RefreshCw className="w-5 h-5 animate-spin text-blue-500" />
                  <span className="text-sm text-gray-600">加载编辑器...</span>
                </div>
              </div>
            )}
            {editorError && (
              <div className="absolute inset-0 flex items-center justify-center bg-red-50 z-10">
                <div className="text-center">
                  <RefreshCw className="w-8 h-8 text-red-500 mx-auto mb-2" />
                  <p className="text-sm text-red-600 mb-2">编辑器加载失败</p>
                  <p className="text-xs text-red-500">{editorError}</p>
                  <button
                    onClick={() => {
                      setEditorError(null);
                      setEditorLoading(true);
                    }}
                    className="mt-2 px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                  >
                    重试
                  </button>
                </div>
              </div>
            )}
            <Editor
              height="100%"
              defaultLanguage="javascript"
              value={workerCode}
              onChange={(value) => setWorkerCode(value || '')}
              onMount={() => {
                setEditorLoading(false);
                setEditorError(null);
              }}
              onValidate={(markers) => {
                // 处理编辑器验证错误
                if (markers.length > 0) {
                  console.warn('Editor validation warnings:', markers);
                }
              }}
              beforeMount={(monaco) => {
                // 配置Monaco编辑器主题和语言
                try {
                  monaco.editor.defineTheme('custom-light', {
                    base: 'vs',
                    inherit: true,
                    rules: [],
                    colors: {}
                  });
                } catch (error) {
                  console.warn('Monaco theme setup warning:', error);
                }
              }}
              loading={null}
              options={{
                readOnly: false,
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                wordWrap: 'on',
                scrollbar: {
                  vertical: 'auto',
                  horizontal: 'auto'
                }
              }}
              theme="vs-light"
            />
          </div>
        </div>





        {/* 代码说明 */}
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <h4 className="text-sm font-medium text-blue-800 mb-2">代码说明</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• 代码会根据当前版本信息自动生成</li>
            <li>• 点击"更新Worker"将把最新的版本信息推送到Cloudflare</li>
            <li>• Worker提供跨域API接口，客户端可以直接调用获取版本信息</li>
            <li>• 支持versionInfo字段的可视化编辑，包括版本号、下载链接、更新日志等</li>
          </ul>
        </div>

        {/* CORS限制说明 */}
        {workerStatus === 'offline' && (
          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-md">
            <h4 className="text-sm font-medium text-amber-800 mb-2">🔒 浏览器安全限制说明</h4>
            <div className="text-sm text-amber-700 space-y-2">
              <p>由于浏览器的CORS（跨域资源共享）安全策略，无法直接从网页向Cloudflare API发起请求。</p>
              <div className="bg-amber-100 p-3 rounded border">
                <p className="font-medium mb-1">💡 解决方案：</p>
                <ul className="space-y-1">
                  <li>• 使用命令行工具（curl、wrangler）进行部署</li>
                  <li>• 通过Cloudflare Dashboard网页控制台</li>
                  <li>• 配置代理服务器转发API请求</li>
                  <li>• 使用Cloudflare Workers CLI工具</li>
                </ul>
              </div>
              <p className="text-xs">当前已切换到离线模式，您可以复制生成的代码手动部署。</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}