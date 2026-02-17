import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { invoke } from '@tauri-apps/api/core';
import { Sidebar } from './components/Layout/Sidebar';
import { Header } from './components/Layout/Header';
import { Dashboard } from './components/Dashboard';
import { AIConfig } from './components/AIConfig';
import { Channels } from './components/Channels';
import { Settings } from './components/Settings';
import { Testing } from './components/Testing';
import { Logs } from './components/Logs';
import { appLogger } from './lib/logger';
import { isTauri } from './lib/tauri';
import { Download, Loader2, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';

export type PageType = 'dashboard' | 'ai' | 'channels' | 'testing' | 'logs' | 'settings';

export interface EnvironmentStatus {
  node_installed: boolean;
  node_version: string | null;
  node_version_ok: boolean;
  openclaw_installed: boolean;
  openclaw_version: string | null;
  config_dir_exists: boolean;
  ready: boolean;
  os: string;
}

interface ServiceStatus {
  running: boolean;
  pid: number | null;
  port: number;
}

interface UpdateInfo {
  update_available: boolean;
  current_version: string | null;
  latest_version: string | null;
  error: string | null;
}

interface UpdateResult {
  success: boolean;
  message: string;
  error?: string;
}

function App() {
  const [currentPage, setCurrentPage] = useState<PageType>('dashboard');
  const [isReady, setIsReady] = useState<boolean | null>(null);
  const [envStatus, setEnvStatus] = useState<EnvironmentStatus | null>(null);
  const [serviceStatus, setServiceStatus] = useState<ServiceStatus | null>(null);
  
  // 更新相关状态
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [showUpdateBanner, setShowUpdateBanner] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [updateResult, setUpdateResult] = useState<UpdateResult | null>(null);

  // 检查环境
  const checkEnvironment = useCallback(async () => {
    if (!isTauri()) {
      appLogger.warn('不在 Tauri 环境中，跳过环境检查');
      setIsReady(true);
      return;
    }
    
    appLogger.info('开始检查系统环境...');
    try {
      const status = await invoke<EnvironmentStatus>('check_environment');
      appLogger.info('环境检查完成', status);
      setEnvStatus(status);
      setIsReady(true); // 总是显示主界面
    } catch (e) {
      appLogger.error('环境检查失败', e);
      setIsReady(true);
    }
  }, []);

  // 检查更新
  const checkUpdate = useCallback(async () => {
    if (!isTauri()) return;
    
    appLogger.info('检查 OpenClaw 更新...');
    try {
      const info = await invoke<UpdateInfo>('check_openclaw_update');
      appLogger.info('更新检查结果', info);
      setUpdateInfo(info);
      if (info.update_available) {
        setShowUpdateBanner(true);
      }
    } catch (e) {
      appLogger.error('检查更新失败', e);
    }
  }, []);

  // 执行更新
  const handleUpdate = async () => {
    setUpdating(true);
    setUpdateResult(null);
    
    try {
      // 1. 先备份配置
      appLogger.info('开始备份配置...');
      const backupMsg = await invoke<string>('backup_user_config');
      appLogger.info('配置备份成功', backupMsg);
      
      // 2. 执行更新
      appLogger.info('开始执行更新...');
      const result = await invoke<UpdateResult>('update_openclaw');
      setUpdateResult(result);
      
      if (result.success) {
        // 更新成功后重新检查环境
        await checkEnvironment();
        // 3秒后关闭提示
        setTimeout(() => {
          setShowUpdateBanner(false);
          setUpdateResult(null);
        }, 3000);
      }
    } catch (e) {
      setUpdateResult({
        success: false,
        message: '更新过程中发生错误',
        error: String(e),
      });
    } finally {
      setUpdating(false);
    }
  };

  useEffect(() => {
    appLogger.info('🦞 App 组件已挂载');
    checkEnvironment();
  }, [checkEnvironment]);

  // 启动后延迟检查更新（避免阻塞启动）
  useEffect(() => {
    if (!isTauri()) return;
    const timer = setTimeout(() => {
      checkUpdate();
    }, 2000);
    return () => clearTimeout(timer);
  }, [checkUpdate]);

  // 定期获取服务状态
  useEffect(() => {
    // 不在 Tauri 环境中则不轮询
    if (!isTauri()) return;
    
    const fetchServiceStatus = async () => {
      try {
        const status = await invoke<ServiceStatus>('get_service_status');
        setServiceStatus(status);
      } catch {
        // 静默处理轮询错误
      }
    };
    fetchServiceStatus();
    const interval = setInterval(fetchServiceStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleSetupComplete = useCallback(() => {
    appLogger.info('安装向导完成');
    checkEnvironment(); // 重新检查环境
  }, [checkEnvironment]);

  // 页面切换处理
  const handleNavigate = (page: PageType) => {
    appLogger.action('页面切换', { from: currentPage, to: page });
    setCurrentPage(page);
  };

  const renderPage = () => {
    const pageVariants = {
      initial: { opacity: 0, x: 20 },
      animate: { opacity: 1, x: 0 },
      exit: { opacity: 0, x: -20 },
    };

    const pages: Record<PageType, JSX.Element> = {
      dashboard: <Dashboard envStatus={envStatus} onSetupComplete={handleSetupComplete} />,
      ai: <AIConfig />,
      channels: <Channels />,
      testing: <Testing />,
      logs: <Logs />,
      settings: <Settings onEnvironmentChange={checkEnvironment} />,
    };

    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={currentPage}
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.2 }}
          className="h-full"
        >
          {pages[currentPage]}
        </motion.div>
      </AnimatePresence>
    );
  };

  // 正在检查环境
  if (isReady === null) {
    return (
      <div className="flex h-screen bg-dark-900 items-center justify-center">
        <div className="fixed inset-0 bg-gradient-radial pointer-events-none" />
        <div className="relative z-10 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-500 to-purple-600 mb-6 animate-pulse shadow-xl shadow-brand-500/20">
            <span className="text-4xl">🦞</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2 tracking-tight">OpenClaw Manager</h1>
          <p className="text-dark-400 mb-6">正在初始化系统环境...</p>
          
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-dark-800/50 rounded-full border border-dark-700/50">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            <span className="text-xs text-dark-400 font-medium">支持 macOS & Windows</span>
          </div>
        </div>
      </div>
    );
  }

  // 主界面
  return (
    <div className="flex h-screen bg-dark-900 overflow-hidden">
      {/* 背景装饰 */}
      <div className="fixed inset-0 bg-gradient-radial pointer-events-none" />
      
      {/* 更新提示模态框 (强提醒) */}
      <AnimatePresence>
        {showUpdateBanner && updateInfo?.update_available && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-md bg-dark-800 rounded-2xl border border-dark-600 shadow-2xl overflow-hidden"
            >
              {/* 头部 */}
              <div className="p-6 bg-gradient-to-br from-brand-600 to-purple-700 text-white text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-20">
                  <Download size={80} />
                </div>
                <div className="relative z-10">
                  <div className="w-16 h-16 bg-white/20 rounded-2xl mx-auto mb-4 flex items-center justify-center backdrop-blur-md">
                    <span className="text-3xl">🚀</span>
                  </div>
                  <h2 className="text-2xl font-bold mb-1">发现新版本</h2>
                  <p className="text-white/80">OpenClaw {updateInfo.latest_version}</p>
                </div>
              </div>

              {/* 内容 */}
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between p-4 bg-dark-700 rounded-xl border border-dark-600">
                  <div>
                    <p className="text-xs text-dark-400 mb-1">当前版本</p>
                    <p className="font-mono text-white">{updateInfo.current_version}</p>
                  </div>
                  <div className="text-dark-500">
                    <ArrowRight size={20} />
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-brand-400 mb-1">新版本</p>
                    <p className="font-mono text-brand-400 font-bold">{updateInfo.latest_version}</p>
                  </div>
                </div>

                <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                  <div className="flex gap-3">
                    <div className="mt-0.5">
                      <AlertCircle size={18} className="text-blue-400" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-blue-400 mb-1">安全更新提示</h4>
                      <p className="text-xs text-blue-300/80 leading-relaxed">
                        点击更新后，系统将自动备份您的当前配置，然后下载并安装新版本。备份文件存放于 <code className="bg-blue-500/20 px-1 rounded">~/.openclaw_backups</code>。
                      </p>
                    </div>
                  </div>
                </div>

                {updateResult && (
                   <div className={`p-4 rounded-xl border ${updateResult.success ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                      <div className="flex items-center gap-3">
                        {updateResult.success ? <CheckCircle size={18} className="text-green-400" /> : <AlertCircle size={18} className="text-red-400" />}
                        <p className={`text-sm ${updateResult.success ? 'text-green-400' : 'text-red-400'}`}>
                          {updateResult.message}
                        </p>
                      </div>
                      {updateResult.error && <p className="text-xs text-red-400/70 mt-1 ml-7">{updateResult.error}</p>}
                   </div>
                )}
              </div>

              {/* 底部按钮 */}
              <div className="p-6 pt-0 flex gap-3">
                <button
                  onClick={() => setShowUpdateBanner(false)}
                  disabled={updating}
                  className="flex-1 py-3 px-4 rounded-xl bg-dark-700 hover:bg-dark-600 text-dark-300 font-medium transition-colors disabled:opacity-50"
                >
                  暂不更新
                </button>
                <button
                  onClick={handleUpdate}
                  disabled={updating}
                  className="flex-[2] py-3 px-4 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-medium shadow-lg shadow-brand-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {updating ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      正在备份并更新...
                    </>
                  ) : (
                    <>
                      <Download size={18} />
                      立即更新
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {/* 侧边栏 */}
      <Sidebar currentPage={currentPage} onNavigate={handleNavigate} serviceStatus={serviceStatus} />
      
      {/* 主内容区 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 标题栏（macOS 拖拽区域） */}
        <Header currentPage={currentPage} />
        
        {/* 页面内容 */}
        <main className="flex-1 overflow-hidden p-6">
          {renderPage()}
        </main>
      </div>
    </div>
  );
}

export default App;
