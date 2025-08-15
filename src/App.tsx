import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from 'sonner';
import ErrorBoundary from "@/components/ErrorBoundary";
import NetworkStatus from "@/components/NetworkStatus";
import Navigation from "@/components/Navigation";
import Home from "@/pages/Home";
import VersionManagement from "@/pages/VersionManagement";
import FileUpload from "@/pages/FileUpload";
import WorkerManagement from "@/pages/WorkerManagement";
import Configuration from "@/pages/Configuration";

export default function App() {
  return (
    <ErrorBoundary>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Navigation />
          <main className="py-6">
            <ErrorBoundary fallback={
              <div className="flex items-center justify-center min-h-96">
                <div className="text-center">
                  <h2 className="text-lg font-semibold text-gray-900 mb-2">页面加载失败</h2>
                  <p className="text-gray-600">请刷新页面重试</p>
                </div>
              </div>
            }>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/version" element={<VersionManagement />} />
                <Route path="/upload" element={<FileUpload />} />
                <Route path="/worker" element={<WorkerManagement />} />
                <Route path="/config" element={<Configuration />} />
              </Routes>
            </ErrorBoundary>
          </main>
          <Toaster position="top-right" richColors />
           <NetworkStatus />
         </div>
       </Router>
     </ErrorBoundary>
  );
}
