import { useState, useEffect } from 'react';
import { Wifi, WifiOff, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface NetworkStatusProps {
  onStatusChange?: (isOnline: boolean) => void;
}

export default function NetworkStatus({ onStatusChange }: NetworkStatusProps) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showStatus, setShowStatus] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowStatus(true);
      toast.success('网络连接已恢复');
      onStatusChange?.(true);
      
      // 3秒后隐藏状态
      setTimeout(() => setShowStatus(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowStatus(true);
      toast.error('网络连接已断开');
      onStatusChange?.(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // 初始状态检查
    if (!navigator.onLine) {
      setShowStatus(true);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [onStatusChange]);

  // 手动检测网络连接
  const checkConnection = async () => {
    try {
      const response = await fetch('/favicon.svg', {
        method: 'HEAD',
        cache: 'no-cache'
      });
      const isConnected = response.ok;
      
      if (isConnected !== isOnline) {
        setIsOnline(isConnected);
        onStatusChange?.(isConnected);
        
        if (isConnected) {
          toast.success('网络连接正常');
        } else {
          toast.error('网络连接异常');
        }
      }
      
      return isConnected;
    } catch (error) {
      setIsOnline(false);
      onStatusChange?.(false);
      toast.error('网络连接检测失败');
      return false;
    }
  };

  if (!showStatus && isOnline) {
    return null;
  }

  return (
    <div className={`fixed top-4 right-4 z-50 transition-all duration-300 ${
      showStatus ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
    }`}>
      <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg shadow-lg ${
        isOnline 
          ? 'bg-green-100 text-green-800 border border-green-200'
          : 'bg-red-100 text-red-800 border border-red-200'
      }`}>
        {isOnline ? (
          <Wifi className="w-4 h-4" />
        ) : (
          <WifiOff className="w-4 h-4" />
        )}
        <span className="text-sm font-medium">
          {isOnline ? '网络已连接' : '网络已断开'}
        </span>
        
        {!isOnline && (
          <button
            onClick={checkConnection}
            className="ml-2 text-xs bg-red-200 hover:bg-red-300 px-2 py-1 rounded transition-colors"
          >
            重试
          </button>
        )}
      </div>
    </div>
  );
}

// 导出一个Hook用于其他组件使用
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const checkConnection = async (): Promise<boolean> => {
    try {
      const response = await fetch('/favicon.svg', {
        method: 'HEAD',
        cache: 'no-cache'
      });
      const isConnected = response.ok;
      setIsOnline(isConnected);
      return isConnected;
    } catch (error) {
      setIsOnline(false);
      return false;
    }
  };

  return { isOnline, checkConnection };
}