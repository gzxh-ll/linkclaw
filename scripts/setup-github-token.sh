#!/bin/bash
# GitHub Token 配置脚本 (Bash)
# 用于在本地开发环境中设置 GitHub Token

TOKEN="${1:-}"
USER_LEVEL=false
VERIFY=false

# 解析参数
while [[ $# -gt 0 ]]; do
    case $1 in
        --user-level|-u)
            USER_LEVEL=true
            shift
            ;;
        --verify|-v)
            VERIFY=true
            shift
            ;;
        --token|-t)
            TOKEN="$2"
            shift 2
            ;;
        *)
            shift
            ;;
    esac
done

if [ "$VERIFY" = true ]; then
    echo "验证 GitHub Token..."
    
    if [ -z "$GITHUB_TOKEN" ]; then
        echo "❌ 未找到 GITHUB_TOKEN 环境变量"
        echo "请先运行此脚本设置 Token"
        exit 1
    fi
    
    response=$(curl -s -H "Authorization: Bearer $GITHUB_TOKEN" \
                    -H "Accept: application/vnd.github.v3+json" \
                    https://api.github.com/user)
    
    if echo "$response" | grep -q '"login"'; then
        username=$(echo "$response" | grep -o '"login":"[^"]*' | cut -d'"' -f4)
        userid=$(echo "$response" | grep -o '"id":[0-9]*' | cut -d':' -f2)
        echo "✅ Token 验证成功！"
        echo "   用户名: $username"
        echo "   用户 ID: $userid"
        exit 0
    else
        echo "❌ Token 验证失败"
        exit 1
    fi
fi

if [ -z "$TOKEN" ]; then
    echo "❌ 错误: 未提供 Token"
    echo "使用方法: ./scripts/setup-github-token.sh --token '你的_GitHub_Token'"
    echo "或者: ./scripts/setup-github-token.sh --token '你的_GitHub_Token' --user-level"
    exit 1
fi

echo "配置 GitHub Token..."

if [ "$USER_LEVEL" = true ]; then
    # 添加到 shell 配置文件（永久）
    SHELL_CONFIG=""
    if [ -n "$ZSH_VERSION" ]; then
        SHELL_CONFIG="$HOME/.zshrc"
    elif [ -n "$BASH_VERSION" ]; then
        SHELL_CONFIG="$HOME/.bashrc"
    fi
    
    if [ -n "$SHELL_CONFIG" ]; then
        # 检查是否已存在
        if grep -q "GITHUB_TOKEN" "$SHELL_CONFIG" 2>/dev/null; then
            echo "⚠️  检测到已存在的 GITHUB_TOKEN，正在更新..."
            if [[ "$OSTYPE" == "darwin"* ]]; then
                sed -i '' '/export GITHUB_TOKEN=/d' "$SHELL_CONFIG"
            else
                sed -i '/export GITHUB_TOKEN=/d' "$SHELL_CONFIG"
            fi
        fi
        
        echo "export GITHUB_TOKEN=\"$TOKEN\"" >> "$SHELL_CONFIG"
        echo "✅ Token 已添加到 $SHELL_CONFIG"
        echo "   运行 'source $SHELL_CONFIG' 或重新打开终端以生效"
    else
        echo "⚠️  无法检测 shell 类型，请手动添加到配置文件中"
    fi
else
    # 设置为当前会话环境变量（临时）
    export GITHUB_TOKEN="$TOKEN"
    echo "✅ Token 已设置为当前会话环境变量"
    echo "   注意: 仅在当前终端会话中有效"
fi

echo ""
echo "验证 Token..."
response=$(curl -s -H "Authorization: Bearer $TOKEN" \
                -H "Accept: application/vnd.github.v3+json" \
                https://api.github.com/user)

if echo "$response" | grep -q '"login"'; then
    username=$(echo "$response" | grep -o '"login":"[^"]*' | cut -d'"' -f4)
    userid=$(echo "$response" | grep -o '"id":[0-9]*' | cut -d':' -f2)
    echo "✅ Token 验证成功！"
    echo "   用户名: $username"
    echo "   用户 ID: $userid"
else
    echo "⚠️  Token 验证失败"
    echo "   请检查 Token 是否正确或是否有足够的权限"
fi

echo ""
echo "使用说明:"
echo "  - 临时设置（当前会话）: ./scripts/setup-github-token.sh"
echo "  - 永久设置（用户级别）: ./scripts/setup-github-token.sh --user-level"
echo "  - 验证 Token: ./scripts/setup-github-token.sh --verify"
