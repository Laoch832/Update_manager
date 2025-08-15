// 离线模式管理器
// 当API不可用时提供基本功能和模拟数据

import { toast } from 'sonner';

export interface OfflineConfig {
  enabled: boolean;
  lastSyncTime?: number;
  cachedData?: any;
}

export interface MockVersionInfo {
  version: string;
  downloadUrl: string;
  changelog: string[];
  forceUpdate: boolean;
}

export interface MockWorkerData {
  code: string;
  status: 'running' | 'not_deployed' | 'error';
  lastUpdated: number;
}

class OfflineManager {
  private readonly STORAGE_KEY = 'offline-manager-data';
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24小时
  
  private offlineConfig: OfflineConfig = {
    enabled: false
  };

  constructor() {
    this.loadOfflineConfig();
    this.setupNetworkListeners();
  }

  /**
   * 加载离线配置
   */
  private loadOfflineConfig(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.offlineConfig = { ...this.offlineConfig, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.warn('Failed to load offline config:', error);
    }
  }

  /**
   * 保存离线配置
   */
  private saveOfflineConfig(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.offlineConfig));
    } catch (error) {
      console.warn('Failed to save offline config:', error);
    }
  }

  /**
   * 设置网络状态监听器
   */
  private setupNetworkListeners(): void {
    window.addEventListener('online', () => {
      if (this.offlineConfig.enabled) {
        toast.success('🌐 网络连接已恢复，退出离线模式');
        this.setOfflineMode(false);
      }
    });

    window.addEventListener('offline', () => {
      toast.warning('🚫 网络连接断开，启用离线模式');
      this.setOfflineMode(true);
    });
  }

  /**
   * 设置离线模式
   */
  setOfflineMode(enabled: boolean): void {
    this.offlineConfig.enabled = enabled;
    this.saveOfflineConfig();
    
    if (enabled) {
      toast.info('📱 离线模式已启用，使用缓存数据');
    }
  }

  /**
   * 检查是否处于离线模式
   */
  isOfflineMode(): boolean {
    return this.offlineConfig.enabled || !navigator.onLine;
  }

  /**
   * 缓存数据
   */
  cacheData(key: string, data: any): void {
    try {
      const cacheKey = `cache-${key}`;
      const cacheData = {
        data,
        timestamp: Date.now()
      };
      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
    } catch (error) {
      console.warn('Failed to cache data:', error);
    }
  }

  /**
   * 获取缓存数据
   */
  getCachedData(key: string): any | null {
    try {
      const cacheKey = `cache-${key}`;
      const stored = localStorage.getItem(cacheKey);
      if (!stored) return null;
      
      const cacheData = JSON.parse(stored);
      const isExpired = Date.now() - cacheData.timestamp > this.CACHE_DURATION;
      
      if (isExpired) {
        localStorage.removeItem(cacheKey);
        return null;
      }
      
      return cacheData.data;
    } catch (error) {
      console.warn('Failed to get cached data:', error);
      return null;
    }
  }

  /**
   * 生成模拟版本信息
   */
  getMockVersionInfo(): MockVersionInfo {
    const cached = this.getCachedData('version-info');
    if (cached) {
      return cached;
    }

    return {
      version: '1.0.0',
      downloadUrl: 'https://example.com/app-v1.0.0.zip',
      changelog: [
        '修复了一些已知问题',
        '优化了用户体验',
        '添加了新功能'
      ],
      forceUpdate: false
    };
  }

  /**
   * 生成模拟Worker代码
   */
  getMockWorkerCode(): string {
    const cached = this.getCachedData('worker-code');
    if (cached) {
      return cached;
    }

    const mockVersionInfo = this.getMockVersionInfo();
    
    return `addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  // 离线模式 - 模拟版本信息
  const versionInfo = {
    version: "${mockVersionInfo.version}",
    downloadUrl: "${mockVersionInfo.downloadUrl}",
    changelog: [
${mockVersionInfo.changelog.map(item => `      "${item}"`).join(',\n')}
    ],
    forceUpdate: ${mockVersionInfo.forceUpdate}
  };

  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Content-Type": "application/json"
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { headers });
  }

  return new Response(JSON.stringify(versionInfo), {
    status: 200,
    headers: headers
  });
}`;
  }

  /**
   * 获取模拟Worker数据
   */
  getMockWorkerData(): MockWorkerData {
    return {
      code: this.getMockWorkerCode(),
      status: 'running',
      lastUpdated: Date.now()
    };
  }

  /**
   * 模拟API调用延迟
   */
  async simulateApiDelay(minMs: number = 500, maxMs: number = 1500): Promise<void> {
    const delay = Math.random() * (maxMs - minMs) + minMs;
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * 模拟网络连接检查
   */
  async mockNetworkCheck(): Promise<{ isConnected: boolean; error?: string }> {
    await this.simulateApiDelay(800, 1200);
    
    if (this.isOfflineMode()) {
      return {
        isConnected: false,
        error: '🚫 当前处于离线模式，使用缓存数据'
      };
    }
    
    return {
      isConnected: true
    };
  }

  /**
   * 模拟Worker代码获取
   */
  async mockFetchWorkerCode(): Promise<string> {
    await this.simulateApiDelay(1000, 2000);
    
    if (this.isOfflineMode()) {
      toast.info('📱 离线模式：使用缓存的Worker代码');
    }
    
    return this.getMockWorkerCode();
  }

  /**
   * 模拟Worker代码更新
   */
  async mockUpdateWorkerCode(code: string): Promise<boolean> {
    await this.simulateApiDelay(2000, 3000);
    
    if (this.isOfflineMode()) {
      // 在离线模式下，只能缓存到本地
      this.cacheData('worker-code', code);
      toast.warning('📱 离线模式：代码已保存到本地缓存，联网后请重新部署');
      return false;
    }
    
    // 模拟成功更新
    this.cacheData('worker-code', code);
    return true;
  }

  /**
   * 模拟Worker测试
   */
  async mockTestWorker(): Promise<{ success: boolean; message: string }> {
    await this.simulateApiDelay(1500, 2500);
    
    if (this.isOfflineMode()) {
      return {
        success: false,
        message: '📱 离线模式：无法测试Worker，请联网后重试'
      };
    }
    
    // 模拟随机成功/失败
    const success = Math.random() > 0.2; // 80%成功率
    
    return {
      success,
      message: success 
        ? '✅ Worker运行正常（模拟测试）' 
        : '❌ Worker测试失败（模拟错误）'
    };
  }

  /**
   * 清理过期缓存
   */
  cleanExpiredCache(): void {
    try {
      const keys = Object.keys(localStorage);
      const cacheKeys = keys.filter(key => key.startsWith('cache-'));
      
      let cleanedCount = 0;
      
      cacheKeys.forEach(key => {
        try {
          const stored = localStorage.getItem(key);
          if (stored) {
            const cacheData = JSON.parse(stored);
            const isExpired = Date.now() - cacheData.timestamp > this.CACHE_DURATION;
            
            if (isExpired) {
              localStorage.removeItem(key);
              cleanedCount++;
            }
          }
        } catch (error) {
          // 删除损坏的缓存项
          localStorage.removeItem(key);
          cleanedCount++;
        }
      });
      
      if (cleanedCount > 0) {
        console.log(`🧹 清理了 ${cleanedCount} 个过期缓存项`);
      }
    } catch (error) {
      console.warn('Failed to clean expired cache:', error);
    }
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats(): { totalItems: number; totalSize: number; oldestItem?: number } {
    try {
      const keys = Object.keys(localStorage);
      const cacheKeys = keys.filter(key => key.startsWith('cache-'));
      
      let totalSize = 0;
      let oldestTimestamp = Date.now();
      
      cacheKeys.forEach(key => {
        try {
          const stored = localStorage.getItem(key);
          if (stored) {
            totalSize += stored.length;
            const cacheData = JSON.parse(stored);
            if (cacheData.timestamp < oldestTimestamp) {
              oldestTimestamp = cacheData.timestamp;
            }
          }
        } catch (error) {
          // 忽略损坏的缓存项
        }
      });
      
      return {
        totalItems: cacheKeys.length,
        totalSize,
        oldestItem: cacheKeys.length > 0 ? oldestTimestamp : undefined
      };
    } catch (error) {
      console.warn('Failed to get cache stats:', error);
      return { totalItems: 0, totalSize: 0 };
    }
  }
}

// 导出单例实例
export const offlineManager = new OfflineManager();

// 便捷函数
export const enableOfflineMode = () => offlineManager.setOfflineMode(true);
export const disableOfflineMode = () => offlineManager.setOfflineMode(false);
export const isOffline = () => offlineManager.isOfflineMode();
export const getMockData = () => ({
  versionInfo: offlineManager.getMockVersionInfo(),
  workerData: offlineManager.getMockWorkerData()
});

// 定期清理过期缓存
setInterval(() => {
  offlineManager.cleanExpiredCache();
}, 60 * 60 * 1000); // 每小时清理一次