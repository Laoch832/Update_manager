import { Config } from '@/store/useStore';
import { toast } from 'sonner';

// 配置文件接口
export interface ConfigFile {
  version: string;
  timestamp: string;
  config: Config;
  metadata?: {
    exportedBy?: string;
    description?: string;
  };
}

// 详细的配置文件验证结果
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// 配置文件验证
export const validateConfigFile = (data: any): data is ConfigFile => {
  const result = validateConfigFileDetailed(data);
  return result.isValid;
};

// 详细的配置文件验证
export const validateConfigFileDetailed = (data: any): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 基本结构检查
  if (!data || typeof data !== 'object') {
    errors.push('配置文件格式无效：不是有效的JSON对象');
    return { isValid: false, errors, warnings };
  }

  // 检查版本信息
  if (!data.version) {
    errors.push('缺少版本信息');
  } else if (typeof data.version !== 'string') {
    errors.push('版本信息格式错误');
  }

  // 检查时间戳
  if (!data.timestamp) {
    errors.push('缺少时间戳');
  } else if (typeof data.timestamp !== 'string') {
    errors.push('时间戳格式错误');
  } else {
    const timestamp = new Date(data.timestamp);
    if (isNaN(timestamp.getTime())) {
      errors.push('时间戳格式无效');
    }
  }

  // 检查配置对象
  if (!data.config) {
    errors.push('缺少配置信息');
    return { isValid: false, errors, warnings };
  }

  if (typeof data.config !== 'object') {
    errors.push('配置信息格式错误');
    return { isValid: false, errors, warnings };
  }

  const config = data.config;
  const requiredFields = [
    'cloudflareApiToken',
    'cloudflareAccountId', 
    'cloudflareWorkerId',
    'cosSecretId',
    'cosSecretKey',
    'cosBucket',
    'cosRegion'
  ];

  // 检查必需字段
  for (const field of requiredFields) {
    if (!(field in config)) {
      errors.push(`缺少配置字段: ${field}`);
    } else if (typeof config[field] !== 'string') {
      errors.push(`配置字段 ${field} 类型错误，应为字符串`);
    }
  }

  // 检查Cloudflare配置完整性
  const cloudflareFields = ['cloudflareApiToken', 'cloudflareAccountId', 'cloudflareWorkerId'];
  const hasCloudflareConfig = cloudflareFields.some(field => config[field]);
  const missingCloudflareFields = cloudflareFields.filter(field => !config[field]);
  
  if (hasCloudflareConfig && missingCloudflareFields.length > 0) {
    warnings.push(`Cloudflare配置不完整，缺少: ${missingCloudflareFields.join(', ')}`);
  }

  // 检查COS配置完整性
  const cosFields = ['cosSecretId', 'cosSecretKey', 'cosBucket', 'cosRegion'];
  const hasCosConfig = cosFields.some(field => config[field]);
  const missingCosFields = cosFields.filter(field => !config[field]);
  
  if (hasCosConfig && missingCosFields.length > 0) {
    warnings.push(`腾讯云COS配置不完整，缺少: ${missingCosFields.join(', ')}`);
  }

  // 检查地域格式
  if (config.cosRegion) {
    const validRegions = ['ap-beijing', 'ap-shanghai', 'ap-guangzhou', 'ap-chengdu', 'ap-nanjing', 'ap-hongkong'];
    if (!validRegions.includes(config.cosRegion)) {
      warnings.push(`COS地域 '${config.cosRegion}' 可能不是有效的地域代码`);
    }
  }

  // 检查API Token格式（基本长度检查）
  if (config.cloudflareApiToken && config.cloudflareApiToken.length < 20) {
    warnings.push('Cloudflare API Token 长度可能不正确');
  }

  // 检查Account ID格式（32位十六进制）
  if (config.cloudflareAccountId && !/^[a-f0-9]{32}$/i.test(config.cloudflareAccountId)) {
    warnings.push('Cloudflare Account ID 格式可能不正确（应为32位十六进制字符串）');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

// 安全的配置导入（带验证）
export const safeImportConfig = async (): Promise<{ config: Config; validation: ValidationResult }> => {
  try {
    const file = await new Promise<File>((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      
      input.onchange = (event) => {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (!file) {
          reject(new Error('未选择文件'));
          return;
        }
        resolve(file);
      };
      
      input.click();
    });

    const content = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = () => reject(new Error('读取文件失败'));
      reader.readAsText(file);
    });

    const data = JSON.parse(content);
    const validation = validateConfigFileDetailed(data);
    
    if (!validation.isValid) {
      throw new Error(`配置文件验证失败:\n${validation.errors.join('\n')}`);
    }

    if (validation.warnings.length > 0) {
      toast.warning(`配置导入成功，但有以下警告:\n${validation.warnings.join('\n')}`);
    } else {
      toast.success('配置文件导入成功');
    }

    return { config: data.config, validation };
  } catch (error) {
    console.error('导入配置文件失败:', error);
    toast.error(error instanceof Error ? error.message : '导入配置文件失败');
    throw error;
  }
};

// 导出配置到JSON文件
export const exportConfigToFile = (config: Config, filename?: string): void => {
  try {
    const configFile: ConfigFile = {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      config,
      metadata: {
        exportedBy: 'Version Manager',
        description: 'API配置文件导出'
      }
    };

    const jsonString = JSON.stringify(configFile, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `config-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success('配置文件导出成功');
  } catch (error) {
    console.error('导出配置文件失败:', error);
    toast.error('导出配置文件失败');
  }
};

// 从文件导入配置
export const importConfigFromFile = (): Promise<Config> => {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) {
        reject(new Error('未选择文件'));
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const data = JSON.parse(content);
          
          if (!validateConfigFile(data)) {
            throw new Error('配置文件格式无效');
          }
          
          toast.success('配置文件导入成功');
          resolve(data.config);
        } catch (error) {
          console.error('解析配置文件失败:', error);
          toast.error('配置文件格式错误');
          reject(error);
        }
      };
      
      reader.onerror = () => {
        toast.error('读取文件失败');
        reject(new Error('读取文件失败'));
      };
      
      reader.readAsText(file);
    };
    
    input.click();
  });
};

// 保存配置到本地存储
export const saveConfigToLocal = (config: Config, key: string = 'saved-config'): void => {
  try {
    const configFile: ConfigFile = {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      config,
      metadata: {
        description: '本地保存的配置'
      }
    };
    
    localStorage.setItem(key, JSON.stringify(configFile));
    toast.success('配置已保存到本地');
  } catch (error) {
    console.error('保存配置到本地失败:', error);
    toast.error('保存配置失败');
  }
};

// 从本地存储加载配置
export const loadConfigFromLocal = (key: string = 'saved-config'): Config | null => {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) {
      return null;
    }
    
    const data = JSON.parse(stored);
    if (!validateConfigFile(data)) {
      throw new Error('本地配置文件格式无效');
    }
    
    return data.config;
  } catch (error) {
    console.error('从本地加载配置失败:', error);
    toast.error('加载本地配置失败');
    return null;
  }
};

// 获取所有保存的配置键名
export const getSavedConfigKeys = (): string[] => {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('saved-config')) {
      keys.push(key);
    }
  }
  return keys;
};

// 删除保存的配置
export const deleteSavedConfig = (key: string): void => {
  try {
    localStorage.removeItem(key);
    toast.success('配置已删除');
  } catch (error) {
    console.error('删除配置失败:', error);
    toast.error('删除配置失败');
  }
};

// 导出配置到剪贴板
export const exportConfigToClipboard = async (config: Config): Promise<void> => {
  try {
    const configFile: ConfigFile = {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      config,
      metadata: {
        exportedBy: 'Version Manager',
        description: 'API配置文件（剪贴板导出）'
      }
    };

    const jsonString = JSON.stringify(configFile, null, 2);
    await navigator.clipboard.writeText(jsonString);
    toast.success('配置已复制到剪贴板');
  } catch (error) {
    console.error('复制到剪贴板失败:', error);
    toast.error('复制到剪贴板失败');
  }
};

// 从剪贴板导入配置
export const importConfigFromClipboard = async (): Promise<Config> => {
  try {
    const text = await navigator.clipboard.readText();
    const data = JSON.parse(text);
    
    if (!validateConfigFile(data)) {
      throw new Error('剪贴板中的配置文件格式无效');
    }
    
    toast.success('配置已从剪贴板导入');
    return data.config;
  } catch (error) {
    console.error('从剪贴板导入失败:', error);
    toast.error('剪贴板内容格式错误或为空');
    throw error;
  }
};

// 批量导出多个配置
export const exportMultipleConfigs = (configs: { name: string; config: Config }[]): void => {
  try {
    const exportData = {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      type: 'multiple-configs',
      configs: configs.map(item => ({
        name: item.name,
        config: item.config,
        timestamp: new Date().toISOString()
      })),
      metadata: {
        exportedBy: 'Version Manager',
        description: '批量配置文件导出',
        count: configs.length
      }
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `configs-batch-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success(`已导出 ${configs.length} 个配置文件`);
  } catch (error) {
    console.error('批量导出失败:', error);
    toast.error('批量导出失败');
  }
};

// 获取配置文件信息（不包含敏感数据）
export const getConfigInfo = (config: Config) => {
  return {
    hasCloudflareToken: !!config.cloudflareApiToken,
    hasCloudflareAccountId: !!config.cloudflareAccountId,
    hasCloudflareWorkerId: !!config.cloudflareWorkerId,
    hasCosSecretId: !!config.cosSecretId,
    hasCosSecretKey: !!config.cosSecretKey,
    cosBucket: config.cosBucket,
    cosRegion: config.cosRegion,
    completeness: {
      cloudflare: !!(config.cloudflareApiToken && config.cloudflareAccountId && config.cloudflareWorkerId),
      cos: !!(config.cosSecretId && config.cosSecretKey && config.cosBucket && config.cosRegion)
    }
  };
};

// 配置文件预览（脱敏显示）
export const previewConfig = (config: Config) => {
  const maskString = (str: string, visibleChars: number = 4) => {
    if (!str) return '';
    if (str.length <= visibleChars) return '*'.repeat(str.length);
    return str.substring(0, visibleChars) + '*'.repeat(str.length - visibleChars);
  };

  return {
    cloudflareApiToken: maskString(config.cloudflareApiToken),
    cloudflareAccountId: maskString(config.cloudflareAccountId),
    cloudflareWorkerId: config.cloudflareWorkerId, // Worker ID 通常不敏感
    cosSecretId: maskString(config.cosSecretId),
    cosSecretKey: maskString(config.cosSecretKey),
    cosBucket: config.cosBucket,
    cosRegion: config.cosRegion
  };
};