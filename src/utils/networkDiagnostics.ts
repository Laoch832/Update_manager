// 网络诊断工具模块
// 提供详细的网络连接测试、DNS解析和API连接诊断功能

export interface NetworkDiagnosticResult {
  success: boolean;
  message: string;
  details?: any;
  timestamp: number;
  duration?: number;
}

export interface DiagnosticReport {
  basicConnectivity: NetworkDiagnosticResult;
  dnsResolution: NetworkDiagnosticResult;
  cloudflareApi: NetworkDiagnosticResult;
  corsSupport: NetworkDiagnosticResult;
  overall: {
    status: 'healthy' | 'degraded' | 'failed';
    issues: string[];
    recommendations: string[];
  };
}

class NetworkDiagnostics {
  private readonly TIMEOUT_MS = 10000;
  private readonly CLOUDFLARE_ENDPOINTS = {
    trace: 'https://www.cloudflare.com/cdn-cgi/trace',
    api: 'https://api.cloudflare.com/client/v4',
    tokenVerify: 'https://api.cloudflare.com/client/v4/user/tokens/verify'
  };

  /**
   * 基础网络连接测试
   */
  async testBasicConnectivity(): Promise<NetworkDiagnosticResult> {
    const startTime = Date.now();
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT_MS);
      
      // 测试多个可靠的端点
      const testEndpoints = [
        'https://www.cloudflare.com/cdn-cgi/trace',
        'https://httpbin.org/get',
        'https://api.github.com'
      ];
      
      const results = await Promise.allSettled(
        testEndpoints.map(url => 
          fetch(url, {
            method: 'GET',
            mode: 'cors',
            credentials: 'omit',
            signal: controller.signal
          })
        )
      );
      
      clearTimeout(timeoutId);
      
      const successCount = results.filter(r => r.status === 'fulfilled' && r.value.ok).length;
      const duration = Date.now() - startTime;
      
      if (successCount === 0) {
        return {
          success: false,
          message: '🚫 无法连接到任何测试端点，请检查网络连接',
          details: { successCount, totalTests: testEndpoints.length, results },
          timestamp: Date.now(),
          duration
        };
      } else if (successCount < testEndpoints.length) {
        return {
          success: true,
          message: `⚠️ 部分网络连接异常 (${successCount}/${testEndpoints.length} 成功)`,
          details: { successCount, totalTests: testEndpoints.length, results },
          timestamp: Date.now(),
          duration
        };
      } else {
        return {
          success: true,
          message: `✅ 网络连接正常 (${duration}ms)`,
          details: { successCount, totalTests: testEndpoints.length, results },
          timestamp: Date.now(),
          duration
        };
      }
    } catch (error: any) {
      return {
        success: false,
        message: `❌ 网络连接测试失败: ${error.message}`,
        details: { error: error.toString() },
        timestamp: Date.now(),
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * DNS解析测试
   */
  async testDnsResolution(): Promise<NetworkDiagnosticResult> {
    const startTime = Date.now();
    
    try {
      const testDomains = [
        'api.cloudflare.com',
        'www.cloudflare.com',
        'httpbin.org'
      ];
      
      const results = [];
      
      for (const domain of testDomains) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);
          
          const response = await fetch(`https://${domain}`, {
            method: 'HEAD',
            mode: 'no-cors', // 避免CORS问题
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          results.push({ domain, success: true, type: response.type });
        } catch (error: any) {
          if (error.name === 'AbortError') {
            results.push({ domain, success: false, error: 'DNS解析超时' });
          } else {
            results.push({ domain, success: true, error: 'DNS解析成功但连接失败' });
          }
        }
      }
      
      const successCount = results.filter(r => r.success).length;
      const duration = Date.now() - startTime;
      
      if (successCount === 0) {
        return {
          success: false,
          message: '🚫 DNS解析完全失败，请检查DNS设置',
          details: { results },
          timestamp: Date.now(),
          duration
        };
      } else if (successCount < testDomains.length) {
        return {
          success: true,
          message: `⚠️ 部分DNS解析异常 (${successCount}/${testDomains.length} 成功)`,
          details: { results },
          timestamp: Date.now(),
          duration
        };
      } else {
        return {
          success: true,
          message: `✅ DNS解析正常 (${duration}ms)`,
          details: { results },
          timestamp: Date.now(),
          duration
        };
      }
    } catch (error: any) {
      return {
        success: false,
        message: `❌ DNS解析测试失败: ${error.message}`,
        details: { error: error.toString() },
        timestamp: Date.now(),
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Cloudflare API连接测试
   */
  async testCloudflareApi(apiToken?: string): Promise<NetworkDiagnosticResult> {
    const startTime = Date.now();
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT_MS);
      
      // 首先测试API端点可达性
      const apiResponse = await fetch(this.CLOUDFLARE_ENDPOINTS.api, {
        method: 'GET',
        mode: 'cors',
        credentials: 'omit',
        signal: controller.signal
      });
      
      if (!apiResponse.ok) {
        clearTimeout(timeoutId);
        return {
          success: false,
          message: `🚫 Cloudflare API端点不可达 (状态码: ${apiResponse.status})`,
          details: { status: apiResponse.status, statusText: apiResponse.statusText },
          timestamp: Date.now(),
          duration: Date.now() - startTime
        };
      }
      
      // 如果提供了API Token，测试Token验证
      if (apiToken) {
        const tokenResponse = await fetch(this.CLOUDFLARE_ENDPOINTS.tokenVerify, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apiToken}`,
            'Content-Type': 'application/json'
          },
          mode: 'cors',
          credentials: 'omit',
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        const duration = Date.now() - startTime;
        
        if (tokenResponse.ok) {
          const data = await tokenResponse.json();
          if (data.success) {
            return {
              success: true,
              message: `✅ Cloudflare API连接正常，Token有效 (${duration}ms)`,
              details: { tokenValid: true, apiReachable: true, tokenData: data.result },
              timestamp: Date.now(),
              duration
            };
          } else {
            return {
              success: false,
              message: '🔑 API Token验证失败',
              details: { tokenValid: false, apiReachable: true, errors: data.errors },
              timestamp: Date.now(),
              duration
            };
          }
        } else {
          return {
            success: false,
            message: `🔑 API Token验证失败 (状态码: ${tokenResponse.status})`,
            details: { 
              tokenValid: false, 
              apiReachable: true, 
              status: tokenResponse.status,
              statusText: tokenResponse.statusText 
            },
            timestamp: Date.now(),
            duration
          };
        }
      } else {
        clearTimeout(timeoutId);
        const duration = Date.now() - startTime;
        return {
          success: true,
          message: `✅ Cloudflare API端点可达 (${duration}ms)`,
          details: { apiReachable: true, tokenProvided: false },
          timestamp: Date.now(),
          duration
        };
      }
    } catch (error: any) {
      return {
        success: false,
        message: `❌ Cloudflare API连接失败: ${error.message}`,
        details: { error: error.toString() },
        timestamp: Date.now(),
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * CORS支持测试
   */
  async testCorsSupport(): Promise<NetworkDiagnosticResult> {
    const startTime = Date.now();
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      // 测试CORS预检请求
      const response = await fetch(this.CLOUDFLARE_ENDPOINTS.api, {
        method: 'OPTIONS',
        headers: {
          'Access-Control-Request-Method': 'GET',
          'Access-Control-Request-Headers': 'Authorization, Content-Type'
        },
        mode: 'cors',
        credentials: 'omit',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      const duration = Date.now() - startTime;
      
      const corsHeaders = {
        allowOrigin: response.headers.get('Access-Control-Allow-Origin'),
        allowMethods: response.headers.get('Access-Control-Allow-Methods'),
        allowHeaders: response.headers.get('Access-Control-Allow-Headers')
      };
      
      if (response.ok || response.status === 204) {
        return {
          success: true,
          message: `✅ CORS支持正常 (${duration}ms)`,
          details: { corsHeaders, status: response.status },
          timestamp: Date.now(),
          duration
        };
      } else {
        return {
          success: false,
          message: `⚠️ CORS预检请求异常 (状态码: ${response.status})`,
          details: { corsHeaders, status: response.status, statusText: response.statusText },
          timestamp: Date.now(),
          duration
        };
      }
    } catch (error: any) {
      return {
        success: false,
        message: `❌ CORS测试失败: ${error.message}`,
        details: { error: error.toString() },
        timestamp: Date.now(),
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * 完整的网络诊断报告
   */
  async generateDiagnosticReport(apiToken?: string): Promise<DiagnosticReport> {
    console.log('🔍 开始网络诊断...');
    
    const [basicConnectivity, dnsResolution, cloudflareApi, corsSupport] = await Promise.all([
      this.testBasicConnectivity(),
      this.testDnsResolution(),
      this.testCloudflareApi(apiToken),
      this.testCorsSupport()
    ]);
    
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    // 分析问题和建议
    if (!basicConnectivity.success) {
      issues.push('基础网络连接失败');
      recommendations.push('检查网络连接和防火墙设置');
    }
    
    if (!dnsResolution.success) {
      issues.push('DNS解析失败');
      recommendations.push('检查DNS设置，尝试使用8.8.8.8或1.1.1.1');
    }
    
    if (!cloudflareApi.success) {
      issues.push('Cloudflare API连接失败');
      if (apiToken) {
        recommendations.push('检查API Token有效性和权限设置');
      } else {
        recommendations.push('配置有效的Cloudflare API Token');
      }
    }
    
    if (!corsSupport.success) {
      issues.push('CORS支持异常');
      recommendations.push('检查浏览器CORS设置或使用代理');
    }
    
    // 确定整体状态
    let overallStatus: 'healthy' | 'degraded' | 'failed';
    if (basicConnectivity.success && cloudflareApi.success) {
      overallStatus = issues.length === 0 ? 'healthy' : 'degraded';
    } else {
      overallStatus = 'failed';
    }
    
    return {
      basicConnectivity,
      dnsResolution,
      cloudflareApi,
      corsSupport,
      overall: {
        status: overallStatus,
        issues,
        recommendations
      }
    };
  }
}

// 导出单例实例
export const networkDiagnostics = new NetworkDiagnostics();

// 便捷函数
export const runQuickDiagnostic = async (apiToken?: string): Promise<DiagnosticReport> => {
  return networkDiagnostics.generateDiagnosticReport(apiToken);
};

export const testApiConnection = async (apiToken: string): Promise<NetworkDiagnosticResult> => {
  return networkDiagnostics.testCloudflareApi(apiToken);
};

export const testBasicNetwork = async (): Promise<NetworkDiagnosticResult> => {
  return networkDiagnostics.testBasicConnectivity();
};