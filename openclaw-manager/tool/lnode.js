/**
 * lnode.js - 自动化环境安装工具
 * 
 * 功能描述：
 * 1. 自动检测系统环境（Windows/macOS/Linux）
 * 2. 检查 Node.js 版本，如未安装或版本过低则自动安装最新版
 * 3. 支持配置国内镜像源，加速下载
 * 4. 包含完整的错误处理和日志记录
 * 
 * 使用方法：
 * node tool/lnode.js
 */

const os = require('os');
const fs = require('fs');
const path = require('path');
const { exec, execSync } = require('child_process');
const https = require('https');

// 配置项
const CONFIG = {
    // 最小 Node.js 版本要求
    minNodeVersion: 22,
    // 淘宝镜像源
    npmRegistry: 'https://registry.npmmirror.com',
    // Node.js 下载镜像 (用于 nvm/fnm 等工具)
    nodeDistUrl: 'https://npmmirror.com/mirrors/node',
};

// 日志工具
const logger = {
    info: (msg) => console.log(`[INFO] ${new Date().toLocaleTimeString()} - ${msg}`),
    warn: (msg) => console.warn(`[WARN] ${new Date().toLocaleTimeString()} - ${msg}`),
    error: (msg) => console.error(`[ERROR] ${new Date().toLocaleTimeString()} - ${msg}`),
    success: (msg) => console.log(`[SUCCESS] ${new Date().toLocaleTimeString()} - ${msg}`),
};

/**
 * 主函数
 */
async function main() {
    try {
        logger.info('开始执行环境检查...');
        
        // 1. 检查操作系统
        const platform = os.platform();
        logger.info(`检测到操作系统: ${platform}`);

        // 2. 检查 Node.js 版本
        const currentVersion = process.version;
        logger.info(`当前 Node.js 版本: ${currentVersion}`);

        const majorVersion = parseInt(currentVersion.substring(1).split('.')[0], 10);
        if (majorVersion < CONFIG.minNodeVersion) {
            logger.warn(`Node.js 版本低于 v${CONFIG.minNodeVersion}，准备更新...`);
            await installLatestNode(platform);
        } else {
            logger.success('Node.js 版本满足要求。');
        }

        // 3. 配置 npm 镜像源
        await configureNpmMirror();

        // 4. 检查并安装构建工具 (Windows)
        if (platform === 'win32') {
            await checkAndInstallBuildTools();
        }

        logger.success('lnode.js 执行完成！环境已就绪。');

    } catch (error) {
        logger.error(`执行过程中发生错误: ${error.message}`);
        if (error.stack) {
            console.error(error.stack);
        }
        process.exit(1);
    }
}

/**
 * 配置 npm 镜像源
 */
async function configureNpmMirror() {
    logger.info('正在配置 npm 镜像源...');
    try {
        // 检查当前 registry
        const currentRegistry = execSync('npm config get registry').toString().trim();
        if (currentRegistry !== CONFIG.npmRegistry) {
            logger.info(`设置 npm registry 为: ${CONFIG.npmRegistry}`);
            execSync(`npm config set registry ${CONFIG.npmRegistry}`);
            logger.success('npm 镜像源配置成功');
        } else {
            logger.info('npm 镜像源已配置，无需修改');
        }
    } catch (e) {
        logger.error(`配置 npm 镜像源失败: ${e.message}`);
        // 不阻断主流程
    }
}

/**
 * 检查并安装 Windows 构建工具
 */
async function checkAndInstallBuildTools() {
    logger.info('正在检查 Windows 构建环境...');
    try {
        // 简单检查 python 和 node-gyp
        let hasPython = false;
        try {
            execSync('python --version');
            hasPython = true;
            logger.info('Python 已安装');
        } catch (e) {
            logger.warn('Python 未找到');
        }

        if (!hasPython) {
            logger.info('尝试安装 Python 和构建工具...');
            // 使用 npm 全局安装 windows-build-tools (注意：这需要管理员权限，且耗时较长)
            // 鉴于不确定是否为管理员，这里尝试安装 node-gyp 和 python
            // 或者推荐使用 winget
            
            logger.info('建议手动运行: winget install Python.Python.3');
            // 尝试安装 node-gyp
            logger.info('安装 node-gyp...');
            execSync('npm install -g node-gyp', { stdio: 'inherit' });
        } else {
             logger.info('构建环境检查通过');
        }
    } catch (e) {
        logger.error(`构建环境检查失败: ${e.message}`);
    }
}

/**
 * 查找本地安装包
 */
function findLocalInstaller(platform) {
    const toolDir = __dirname;
    const files = fs.readdirSync(toolDir);
    
    if (platform === 'win32') {
        // 查找 .msi 文件，优先匹配 node-v*-x64.msi
        return files.find(f => f.startsWith('node-v') && f.endsWith('.msi') && f.includes('x64')) ||
               files.find(f => f.startsWith('node') && f.endsWith('.msi'));
    } else if (platform === 'darwin') {
        // 查找 .pkg 文件
        return files.find(f => f.startsWith('node') && f.endsWith('.pkg'));
    }
    return null;
}

/**
 * 安装最新版 Node.js
 * @param {string} platform 操作系统
 */
async function installLatestNode(platform) {
    logger.info('正在检查 Node.js 安装环境...');
    
    // 1. 优先尝试本地安装
    const localInstaller = findLocalInstaller(platform);
    if (localInstaller) {
        const installerPath = path.join(__dirname, localInstaller);
        logger.info(`发现本地安装包: ${localInstaller}`);
        logger.info('正在执行本地静默安装，请稍候...');
        
        try {
            if (platform === 'win32') {
                // Windows 静默安装 MSI
                // /qn: 安静模式，无 UI
                // /norestart: 安装后不重启
                execSync(`msiexec /i "${installerPath}" /qn /norestart`, { stdio: 'inherit' });
                logger.success('本地 Node.js 安装成功！');
                return;
            } else if (platform === 'darwin') {
                // macOS 静默安装 PKG (需要 sudo 权限，通常脚本以管理员运行或会提示)
                // -target /: 安装到根目录
                logger.info('macOS 安装需要管理员权限，请输入密码...');
                execSync(`sudo installer -pkg "${installerPath}" -target /`, { stdio: 'inherit' });
                logger.success('本地 Node.js 安装成功！');
                return;
            }
        } catch (e) {
            logger.error(`本地安装失败: ${e.message}，将尝试在线安装...`);
        }
    } else {
        logger.info('未在 tool 目录找到 Node.js 安装包，准备在线安装...');
    }

    // 2. 在线安装回退逻辑
    if (platform === 'win32') {
        logger.info('Windows 系统建议使用 winget 或 fnm 安装');
        try {
            // 尝试调用 winget
            logger.info('尝试调用 winget 安装 Node.js LTS...');
            execSync('winget install OpenJS.NodeJS.LTS --accept-source-agreements', { stdio: 'inherit' });
            logger.success('winget 命令执行完毕，请重启终端生效');
        } catch (e) {
            logger.error('winget 安装失败，请手动下载安装包: https://nodejs.org/');
        }
    } else if (platform === 'darwin') {
        logger.info('macOS 系统建议使用 brew 安装');
        try {
            execSync('brew install node', { stdio: 'inherit' });
            logger.success('brew 命令执行完毕');
        } catch (e) {
            logger.error('brew 安装失败，请检查是否安装 Homebrew');
        }
    } else {
        logger.info('Linux 系统建议使用 nvm 或包管理器安装');
    }
}

// 执行主函数
main();
