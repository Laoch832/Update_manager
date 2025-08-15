import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { Plus, Trash2, Save, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

export default function VersionManagement() {
  const { versionInfo, setVersionInfo } = useStore();
  const [localVersion, setLocalVersion] = useState(versionInfo.version);
  const [localDownloadUrl, setLocalDownloadUrl] = useState(versionInfo.downloadUrl);
  const [localChangelog, setLocalChangelog] = useState([...versionInfo.changelog]);
  const [localForceUpdate, setLocalForceUpdate] = useState(versionInfo.forceUpdate);
  const [newChangelogItem, setNewChangelogItem] = useState('');

  const handleAddChangelog = () => {
    if (newChangelogItem.trim()) {
      setLocalChangelog([...localChangelog, newChangelogItem.trim()]);
      setNewChangelogItem('');
    }
  };

  const handleRemoveChangelog = (index: number) => {
    setLocalChangelog(localChangelog.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    setVersionInfo({
      version: localVersion,
      downloadUrl: localDownloadUrl,
      changelog: localChangelog,
      forceUpdate: localForceUpdate
    });
    toast.success('版本信息已保存');
  };

  const handleReset = () => {
    setLocalVersion(versionInfo.version);
    setLocalDownloadUrl(versionInfo.downloadUrl);
    setLocalChangelog([...versionInfo.changelog]);
    setLocalForceUpdate(versionInfo.forceUpdate);
    toast.info('已重置为保存的版本');
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">版本管理</h2>
          <div className="flex space-x-3">
            <button
              onClick={handleReset}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              重置
            </button>
            <button
              onClick={handleSave}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              <Save className="w-4 h-4 mr-2" />
              保存
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {/* 版本号 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              版本号
            </label>
            <input
              type="text"
              value={localVersion}
              onChange={(e) => setLocalVersion(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="例如: 1.0.0"
            />
          </div>

          {/* 下载链接 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              下载链接
            </label>
            <input
              type="url"
              value={localDownloadUrl}
              onChange={(e) => setLocalDownloadUrl(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="https://example.com/download.zip"
            />
          </div>

          {/* 强制更新 */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="forceUpdate"
              checked={localForceUpdate}
              onChange={(e) => setLocalForceUpdate(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="forceUpdate" className="ml-2 block text-sm text-gray-900">
              强制更新
            </label>
          </div>

          {/* 更新日志 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              更新日志
            </label>
            <div className="space-y-2 mb-3">
              {localChangelog.map((item, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <div className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-md">
                    {item}
                  </div>
                  <button
                    onClick={() => handleRemoveChangelog(index)}
                    className="p-2 text-red-600 hover:text-red-800 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex space-x-2">
              <input
                type="text"
                value={newChangelogItem}
                onChange={(e) => setNewChangelogItem(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddChangelog()}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="添加新的更新内容"
              />
              <button
                onClick={handleAddChangelog}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                添加
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}