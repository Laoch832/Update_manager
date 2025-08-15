import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// 版本信息接口
export interface VersionInfo {
  version: string;
  downloadUrl: string;
  changelog: string[];
  forceUpdate: boolean;
}

// 配置信息接口
export interface Config {
  cloudflareApiToken: string;
  cloudflareAccountId: string;
  cloudflareWorkerId: string;
  cosSecretId: string;
  cosSecretKey: string;
  cosBucket: string;
  cosRegion: string;
}

// 应用状态接口
interface AppState {
  // 版本信息
  versionInfo: VersionInfo;
  setVersionInfo: (info: Partial<VersionInfo>) => void;
  
  // 配置信息
  config: Config;
  setConfig: (config: Partial<Config>) => void;
  
  // UI状态
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
  
  // 上传状态
  uploadProgress: number;
  setUploadProgress: (progress: number) => void;
  
  // Worker状态
  workerStatus: 'unknown' | 'running' | 'error' | 'not_deployed' | 'offline';
  setWorkerStatus: (status: 'unknown' | 'running' | 'error' | 'not_deployed' | 'offline') => void;
}

// 默认版本信息
const defaultVersionInfo: VersionInfo = {
  version: '0.5.5',
  downloadUrl: 'https://czupdate-1327987561.cos.ap-chengdu.myqcloud.com/0.5.5.zip',
  changelog: [
    '优化了网络加载速度',
    '换掉了更新api',
    '增加了高级的缓存机制'
  ],
  forceUpdate: false
};

// 默认配置
const defaultConfig: Config = {
  cloudflareApiToken: '',
  cloudflareAccountId: '',
  cloudflareWorkerId: '',
  cosSecretId: '',
  cosSecretKey: '',
  cosBucket: '',
  cosRegion: 'ap-chengdu'
};

// 创建store
export const useStore = create<AppState>()(persist(
  (set, get) => ({
    // 版本信息
    versionInfo: defaultVersionInfo,
    setVersionInfo: (info) => set((state) => ({
      versionInfo: { ...state.versionInfo, ...info }
    })),
    
    // 配置信息
    config: defaultConfig,
    setConfig: (config) => set((state) => ({
      config: { ...state.config, ...config }
    })),
    
    // UI状态
    isLoading: false,
    setLoading: (loading) => set({ isLoading: loading }),
    
    // 上传状态
    uploadProgress: 0,
    setUploadProgress: (progress) => set({ uploadProgress: progress }),
    
    // Worker状态
    workerStatus: 'unknown',
    setWorkerStatus: (status) => set({ workerStatus: status })
  }),
  {
    name: 'version-manager-storage',
    partialize: (state) => ({
      versionInfo: state.versionInfo,
      config: state.config
    })
  }
));