#!/bin/sh

# 设置环境变量，提供默认值
export NEZHA_KEY=${NEZHA_KEY:-''}
export ARGO_AUTH=${ARGO_AUTH:-''}                             

# 根据架构选择合适的下载URL
set_download_url() {
  local default_url="$1"
  local x64_url="$2"

  case "$(uname -m)" in
    x86_64|amd64|x64) echo "$x64_url" ;;
    *) echo "$default_url" ;;
  esac
}

# 下载程序文件（如果不存在）
download_program() {
  local program_name="$1"
  local default_url="$2"
  local x64_url="$3"

  local download_url
  download_url=$(set_download_url "$default_url" "$x64_url")

  if [ ! -f "$program_name" ]; then
    echo "正在下载 $program_name..."
    curl -sSL "$download_url" -o "$program_name"
    chmod +x "$program_name"
    echo "$program_name 下载完成，并授予权限。"
  else
    echo "$program_name 已存在，跳过下载。"
  fi
}

# 下载相关文件
download_program "npm" "https://github.com/eooce/test/releases/download/ARM/swith" "https://github.com/jpus/test/releases/download/web/nza"
sleep 6

download_program "web" "https://github.com/eooce/test/releases/download/ARM/web" "https://github.com/jpus/test/releases/download/web/x8001l-9"
sleep 6

download_program "http" "https://github.com/eooce/test/releases/download/arm64/bot13" "https://github.com/jpus/test/releases/download/amd/thttp-9"
sleep 6

# 启动服务
run() {
  # 启动 npm
  if [ -x npm ]; then
    if ! pgrep -f "./npm -p ${NEZHA_KEY}" >/dev/null; then
      nohup ./npm -p ${NEZHA_KEY} >/dev/null 2>&1 &
      echo "npm 服务已启动"
    else
      echo "npm 服务已在运行"
    fi
  fi

  # 启动 web
  if [ -x web ]; then
    if ! pgrep -f "./web" >/dev/null; then
      nohup ./web >/dev/null 2>&1 &
      echo "web 服务已启动"
    else
      echo "web 服务已在运行"
    fi
  fi
  
  # 启动 http
  if [ -x http ]; then
    if ! pgrep -f "./http tunnel --edge-ip-version auto --no-autoupdate --protocol http2 run --token ${ARGO_AUTH}" >/dev/null; then
      nohup ./http tunnel --edge-ip-version auto --no-autoupdate --protocol http2 run --token ${ARGO_AUTH} >/dev/null 2>&1 &
      echo "http 服务已启动"
    else
      echo "http 服务已在运行"
    fi
  fi  
}

run