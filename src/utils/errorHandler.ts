// 增强的错误处理模块
// 提供详细的网络故障诊断信息和解决建议

import { toast } from 'sonner';
import { networkDiagnostics } from './networkDiagnostics';
import { offlineManager } from './offlineManager';

export interface ErrorInfo {
  type: 'network' | 'api' | 'auth' | 'config' | 'timeout' | 'cors' | 'unknown';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  details?: string;
  suggestions: string[];
  canRetry: boolean;
  shouldEnableOfflineMode?: boolean;
}

export interface DiagnosticSuggestion {
  title: string;
  description: string;
  action?: () => void;
  priority: 'high' | 'medium' | 'low';
}

class ErrorHandler {
  private readonly ERROR_PATTERNS = {
    // 网络相关错误
    NETWORK_FAILED: /net::ERR_FAILED|Failed to fetch|Network request failed/i,
    NETWORK_TIMEOUT: /timeout|ETIMEDOUT|Request timed out/i,
    NETWORK_OFFLINE: /net::ERR_INTERNET_DISCONNECTED|offline/i,
    DNS_FAILED: /net::ERR_NAME_NOT_RESOLVED|DNS/i,
    
    // CORS相关错误
    CORS_ERROR: /CORS|Cross-Origin|Access-Control/i,
    
    // API相关错误
    API_UNAUTHORIZED: /401|Unauthorized|Invalid token/i,
    API_FORBIDDEN: /403|Forbidden|Access denied/i,
    API_NOT_FOUND: /404|Not found|Worker not found/i,
    API_RATE_LIMIT: /429|Too many requests|Rate limit/i,
    API_SERVER_ERROR: /5\d{2}|Internal server error|Service unavailable/i,
    
    // 配置相关错误
    CONFIG_MISSING: /API token|Account ID|Worker ID.*required|not configured/i,
    CONFIG_INVALID: /Invalid.*format|Malformed/i
  };

  /**
   * 分析错误并返回详细信息
   */
  analyzeError(error: any, context?: string): ErrorInfo {
    const errorMessage = this.extractErrorMessage(error);
    const errorString = `${errorMessage} ${error?.stack || ''} ${context || ''}`;

    // 网络相关错误
    if (this.ERROR_PATTERNS.NETWORK_FAILED.test(errorString)) {
      return this.createNetworkFailedError(errorMessage);
    }
    
    if (this.ERROR_PATTERNS.NETWORK_TIMEOUT.test(errorString)) {
      return this.createTimeoutError(errorMessage);
    }
    
    if (this.ERROR_PATTERNS.NETWORK_OFFLINE.test(errorString)) {
      return this.createOfflineError(errorMessage);
    }
    
    if (this.ERROR_PATTERNS.DNS_FAILED.test(errorString)) {
      return this.createDnsError(errorMessage);
    }

    // CORS相关错误
    if (this.ERROR_PATTERNS.CORS_ERROR.test(errorString)) {
      return this.createCorsError(errorMessage);
    }

    // API相关错误
    if (this.ERROR_PATTERNS.API_UNAUTHORIZED.test(errorString)) {
      return this.createAuthError(errorMessage);
    }
    
    if (this.ERROR_PATTERNS.API_FORBIDDEN.test(errorString)) {
      return this.createForbiddenError(errorMessage);
    }
    
    if (this.ERROR_PATTERNS.API_NOT_FOUND.test(errorString)) {
      return this.createNotFoundError(errorMessage);
    }
    
    if (this.ERROR_PATTERNS.API_RATE_LIMIT.test(errorString)) {
      return this.createRateLimitError(errorMessage);
    }
    
    if (this.ERROR_PATTERNS.API_SERVER_ERROR.test(errorString)) {
      return this.createServerError(errorMessage);
    }

    // 配置相关错误
    if (this.ERROR_PATTERNS.CONFIG_MISSING.test(errorString)) {
      return this.createConfigMissingError(errorMessage);
    }
    
    if (this.ERROR_PATTERNS.CONFIG_INVALID.test(errorString)) {
      return this.createConfigInvalidError(errorMessage);
    }

    // 未知错误
    return this.createUnknownError(errorMessage);
  }

  /**
   * 提取错误消息
   */
  private extractErrorMessage(error: any): string {
    if (typeof error === 'string') return error;
    if (error?.message) return error.message;
    if (error?.error) return error.error;
    if (error?.statusText) return error.statusText;
    return '未知错误';
  }

  /**
   * 创建网络连接失败错误
   */
  private createNetworkFailedError(message: string): ErrorInfo {
    return {
      type: 'network',
      severity: 'high',
      message: '网络连接失败',
      details: message,
      suggestions: [
        '检查网络连接是否正常',
        '确认防火墙或代理设置',
        '尝试切换到离线模式继续工作',
        '检查Cloudflare API服务状态',
        '运行网络诊断获取详细信息'
      ],
      canRetry: true,
      shouldEnableOfflineMode: true
    };
  }

  /**
   * 创建超时错误
   */
  private createTimeoutError(message: string): ErrorInfo {
    return {
      type: 'timeout',
      severity: 'medium',
      message: '请求超时',
      details: message,
      suggestions: [
        '检查网络连接速度',
        '稍后重试',
        '考虑使用离线模式',
        '检查是否有网络代理影响速度'
      ],
      canRetry: true,
      shouldEnableOfflineMode: true
    };
  }

  /**
   * 创建离线错误
   */
  private createOfflineError(message: string): ErrorInfo {
    return {
      type: 'network',
      severity: 'high',
      message: '设备处于离线状态',
      details: message,
      suggestions: [
        '检查网络连接',
        '启用离线模式继续工作',
        '连接网络后重新同步数据'
      ],
      canRetry: false,
      shouldEnableOfflineMode: true
    };
  }

  /**
   * 创建DNS错误
   */
  private createDnsError(message: string): ErrorInfo {
    return {
      type: 'network',
      severity: 'high',
      message: 'DNS解析失败',
      details: message,
      suggestions: [
        '检查DNS设置',
        '尝试使用其他DNS服务器（如8.8.8.8）',
        '检查网络连接',
        '联系网络管理员'
      ],
      canRetry: true
    };
  }

  /**
   * 创建CORS错误
   */
  private createCorsError(message: string): ErrorInfo {
    return {
      type: 'cors',
      severity: 'medium',
      message: '跨域请求被阻止',
      details: message,
      suggestions: [
        '这通常是浏览器安全策略导致的',
        '尝试使用HTTPS访问',
        '检查Cloudflare Worker的CORS设置',
        '考虑使用浏览器扩展或代理'
      ],
      canRetry: true
    };
  }

  /**
   * 创建认证错误
   */
  private createAuthError(message: string): ErrorInfo {
    return {
      type: 'auth',
      severity: 'high',
      message: 'API Token无效或已过期',
      details: message,
      suggestions: [
        '检查API Token是否正确',
        '确认Token是否已过期',
        '重新生成API Token',
        '检查Token权限设置'
      ],
      canRetry: false
    };
  }

  /**
   * 创建权限错误
   */
  private createForbiddenError(message: string): ErrorInfo {
    return {
      type: 'auth',
      severity: 'high',
      message: '权限不足',
      details: message,
      suggestions: [
        '检查API Token权限',
        '确认Account ID是否正确',
        '联系管理员获取必要权限',
        '检查Worker访问权限设置'
      ],
      canRetry: false
    };
  }

  /**
   * 创建资源未找到错误
   */
  private createNotFoundError(message: string): ErrorInfo {
    return {
      type: 'api',
      severity: 'medium',
      message: '资源未找到',
      details: message,
      suggestions: [
        '检查Worker ID是否正确',
        '确认Account ID是否正确',
        '检查Worker是否已部署',
        '验证API端点URL'
      ],
      canRetry: false
    };
  }

  /**
   * 创建频率限制错误
   */
  private createRateLimitError(message: string): ErrorInfo {
    return {
      type: 'api',
      severity: 'medium',
      message: 'API调用频率超限',
      details: message,
      suggestions: [
        '等待一段时间后重试',
        '减少API调用频率',
        '考虑升级API计划',
        '使用离线模式减少API调用'
      ],
      canRetry: true,
      shouldEnableOfflineMode: true
    };
  }

  /**
   * 创建服务器错误
   */
  private createServerError(message: string): ErrorInfo {
    return {
      type: 'api',
      severity: 'high',
      message: 'Cloudflare服务器错误',
      details: message,
      suggestions: [
        '稍后重试',
        '检查Cloudflare服务状态',
        '使用离线模式继续工作',
        '联系Cloudflare支持'
      ],
      canRetry: true,
      shouldEnableOfflineMode: true
    };
  }

  /**
   * 创建配置缺失错误
   */
  private createConfigMissingError(message: string): ErrorInfo {
    return {
      type: 'config',
      severity: 'critical',
      message: '配置信息缺失',
      details: message,
      suggestions: [
        '前往配置页面设置API Token',
        '确保Account ID已正确填写',
        '检查Worker ID配置',
        '保存配置后重试'
      ],
      canRetry: false
    };
  }

  /**
   * 创建配置无效错误
   */
  private createConfigInvalidError(message: string): ErrorInfo {
    return {
      type: 'config',
      severity: 'high',
      message: '配置格式无效',
      details: message,
      suggestions: [
        '检查API Token格式',
        '验证Account ID格式',
        '确认Worker ID格式',
        '参考官方文档检查配置'
      ],
      canRetry: false
    };
  }

  /**
   * 创建未知错误
   */
  private createUnknownError(message: string): ErrorInfo {
    return {
      type: 'unknown',
      severity: 'medium',
      message: '未知错误',
      details: message,
      suggestions: [
        '尝试刷新页面',
        '检查浏览器控制台获取更多信息',
        '运行网络诊断',
        '联系技术支持'
      ],
      canRetry: true
    };
  }

  /**
   * 处理错误并显示用户友好的提示
   */
  async handleError(error: any, context?: string, options?: {
    showToast?: boolean;
    enableAutoOffline?: boolean;
    runDiagnostics?: boolean;
  }): Promise<ErrorInfo> {
    const errorInfo = this.analyzeError(error, context);
    const opts = { showToast: true, enableAutoOffline: true, runDiagnostics: false, ...options };

    // 显示Toast提示
    if (opts.showToast) {
      this.showErrorToast(errorInfo);
    }

    // 自动启用离线模式
    if (opts.enableAutoOffline && errorInfo.shouldEnableOfflineMode) {
      offlineManager.setOfflineMode(true);
    }

    // 运行网络诊断
    if (opts.runDiagnostics && errorInfo.type === 'network') {
      setTimeout(() => {
        this.suggestNetworkDiagnostics();
      }, 2000);
    }

    return errorInfo;
  }

  /**
   * 显示错误Toast
   */
  private showErrorToast(errorInfo: ErrorInfo): void {
    const icon = this.getErrorIcon(errorInfo.severity);
    const message = `${icon} ${errorInfo.message}`;
    
    switch (errorInfo.severity) {
      case 'critical':
      case 'high':
        toast.error(message, {
          description: errorInfo.details,
          duration: 8000
        });
        break;
      case 'medium':
        toast.warning(message, {
          description: errorInfo.details,
          duration: 6000
        });
        break;
      case 'low':
        toast.info(message, {
          description: errorInfo.details,
          duration: 4000
        });
        break;
    }
  }

  /**
   * 获取错误图标
   */
  private getErrorIcon(severity: string): string {
    switch (severity) {
      case 'critical': return '🚨';
      case 'high': return '❌';
      case 'medium': return '⚠️';
      case 'low': return 'ℹ️';
      default: return '❓';
    }
  }

  /**
   * 建议运行网络诊断
   */
  private suggestNetworkDiagnostics(): void {
    toast.info('🔍 建议运行网络诊断', {
      description: '点击Worker管理页面的"网络诊断"按钮获取详细信息',
      duration: 10000
    });
  }

  /**
   * 生成诊断建议
   */
  generateDiagnosticSuggestions(errorInfo: ErrorInfo): DiagnosticSuggestion[] {
    const suggestions: DiagnosticSuggestion[] = [];

    // 基于错误类型生成建议
    switch (errorInfo.type) {
      case 'network':
        suggestions.push({
          title: '运行网络诊断',
          description: '检查网络连接、DNS解析和API可达性',
          action: () => networkDiagnostics.generateDiagnosticReport(''),
          priority: 'high'
        });
        break;
        
      case 'auth':
        suggestions.push({
          title: '检查API配置',
          description: '验证API Token和权限设置',
          priority: 'high'
        });
        break;
        
      case 'config':
        suggestions.push({
          title: '更新配置',
          description: '前往配置页面检查和更新设置',
          priority: 'high'
        });
        break;
    }

    // 如果支持离线模式，添加相关建议
    if (errorInfo.shouldEnableOfflineMode) {
      suggestions.push({
        title: '启用离线模式',
        description: '在网络问题解决前使用本地功能',
        action: () => offlineManager.setOfflineMode(true),
        priority: 'medium'
      });
    }

    return suggestions;
  }

  /**
   * 检查错误是否可以重试
   */
  shouldRetry(errorInfo: ErrorInfo, retryCount: number, maxRetries: number = 3): boolean {
    if (!errorInfo.canRetry || retryCount >= maxRetries) {
      return false;
    }

    // 某些错误类型不应该重试
    const noRetryTypes = ['auth', 'config'];
    if (noRetryTypes.includes(errorInfo.type)) {
      return false;
    }

    return true;
  }

  /**
   * 计算重试延迟（指数退避）
   */
  calculateRetryDelay(retryCount: number, baseDelay: number = 1000): number {
    return Math.min(baseDelay * Math.pow(2, retryCount), 10000);
  }
}

// 导出单例实例
export const errorHandler = new ErrorHandler();

// 便捷函数
export const handleError = (error: any, context?: string, options?: any) => 
  errorHandler.handleError(error, context, options);

export const analyzeError = (error: any, context?: string) => 
  errorHandler.analyzeError(error, context);

export const shouldRetryError = (errorInfo: ErrorInfo, retryCount: number, maxRetries?: number) => 
  errorHandler.shouldRetry(errorInfo, retryCount, maxRetries);

export const getRetryDelay = (retryCount: number, baseDelay?: number) => 
  errorHandler.calculateRetryDelay(retryCount, baseDelay);