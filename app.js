const http = require('http');
const { Buffer } = require('buffer');
const net = require('net');
const os = require('os');
const fs = require("fs");
const path = require("path");
const { promisify } = require('util');
const exec = promisify(require('child_process').exec);
const { execSync, spawn } = require('child_process');

// 配置中心
const config = {
  port: process.env.PORT || 3000,
  startScript: process.env.START_SCRIPT || path.join(__dirname, 'run.sh')
};

// 日志函数
const logger = {
  info: (msg) => console.log(`[INFO] ${new Date().toISOString()} - ${msg}`),
  error: (msg) => console.error(`[ERROR] ${new Date().toISOString()} - ${msg}`),
  warn: (msg) => console.warn(`[WARN] ${new Date().toISOString()} - ${msg}`)
};

// 资源清理函数
const cleanupResources = () => {
  logger.info('Cleaning up resources...');
  if (startScript) {
    startScript.kill();
    logger.info('Child process terminated');
  }
  if (server) {
    server.close(() => {
      logger.info('HTTP server closed');
    });
  }
};

// 处理进程退出
process.on('SIGINT', cleanupResources);
process.on('SIGTERM', cleanupResources);
process.on('uncaughtException', (err) => {
  logger.error(`Uncaught Exception: ${err.stack}`);
  cleanupResources();
  process.exit(1);
});

// 检查并设置脚本权限
try {
  fs.accessSync(config.startScript, fs.constants.X_OK);
  logger.info(`Script is executable: ${config.startScript}`);
} catch (error) {
  try {
    fs.chmodSync(config.startScript, 0o755);
    logger.info(`Permission granted: ${config.startScript}`);
  } catch (chmodError) {
    logger.error(`Failed to set permissions: ${chmodError}`);
    process.exit(1);
  }
}

// 启动子进程
let startScript;
try {
  startScript = spawn('/usr/bin/env', ['bash', config.startScript], {
    stdio: ['pipe', 'pipe', 'pipe'],
    cwd: path.dirname(config.startScript)
  });

  startScript.stdout.on('data', (data) => {
    logger.info(`Script Output: ${data.toString().trim()}`);
  });

  startScript.stderr.on('data', (data) => {
    logger.error(`Script Error: ${data.toString().trim()}`);
  });

  startScript.on('error', (error) => {
    logger.error(`Script execution error: ${error}`);
    cleanupResources();
    process.exit(1);
  });

  startScript.on('close', (code) => {
    logger.info(`Child process exited with code ${code}`);
    if (code !== 0) {
      logger.warn('Child process exited with non-zero code');
    }
  });
} catch (error) {
  logger.error(`Failed to start child process: ${error}`);
  process.exit(1);
}

// 创建HTTP服务器
const server = http.createServer((req, res) => {
  try {
    // 规范化URL
    req.url = req.url.replace(/^\/+/, '/');
    
    // 根端点
    if (req.url === '/') {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      return res.end('Hello, World!');
    }
    
    // 终止所有进程端点
    if (req.url === '/killall') {
      const username = os.userInfo().username;
      logger.warn(`Attempting to kill all processes for user: ${username}`);
      
      exec(`pkill -kill -u ${username}`, (error, stdout, stderr) => {
        if (error) {
          logger.error(`Failed to kill processes: ${error.message}`);
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          return res.end(`Failed to terminate all processes: ${error.message}`);
        }
        
        logger.warn(`All processes for user ${username} were terminated`);
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('All processes terminated successfully');
      });
      
      return;
    }
    
    // 其他请求返回404
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  } catch (err) {
    logger.error(`Request handling error: ${err}`);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
    }
    res.end('Internal Server Error');
  }
});

// 启动服务器
server.listen(config.port, () => {
  logger.info(`HTTP server started (port: ${config.port})`);
}).on('error', (err) => {
  logger.error(`HTTP server failed to start: ${err}`);
  cleanupResources();
  process.exit(1);
});