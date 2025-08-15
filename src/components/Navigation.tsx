import { Link, useLocation } from 'react-router-dom';
import { Home, Settings, Upload, Code, Database } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/', label: '首页', icon: Home },
  { path: '/version', label: '版本管理', icon: Database },
  { path: '/upload', label: '文件上传', icon: Upload },
  { path: '/worker', label: 'Worker管理', icon: Code },
  { path: '/config', label: '配置', icon: Settings }
];

export default function Navigation() {
  const location = useLocation();

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <h1 className="text-xl font-bold text-blue-600">版本管理系统</h1>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      'inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    )}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}