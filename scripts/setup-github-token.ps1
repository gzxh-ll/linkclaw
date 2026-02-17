# GitHub Token 配置脚本 (PowerShell)
# 用于在本地开发环境中设置 GitHub Token

param(
    [Parameter(Mandatory=$false)]
    [string]$Token = "",
    
    [Parameter(Mandatory=$false)]
    [switch]$UserLevel,
    
    [Parameter(Mandatory=$false)]
    [switch]$Verify
)

$ErrorActionPreference = "Stop"

if ($Verify) {
    Write-Host "验证 GitHub Token..." -ForegroundColor Cyan
    
    if (-not $env:GITHUB_TOKEN) {
        Write-Host "❌ 未找到 GITHUB_TOKEN 环境变量" -ForegroundColor Red
        Write-Host "请先运行此脚本设置 Token" -ForegroundColor Yellow
        exit 1
    }
    
    try {
        $headers = @{
            "Authorization" = "Bearer $env:GITHUB_TOKEN"
            "Accept" = "application/vnd.github.v3+json"
            "User-Agent" = "openclaw-manager-setup"
        }
        
        $response = Invoke-RestMethod -Uri "https://api.github.com/user" -Headers $headers -Method Get
        Write-Host "✅ Token 验证成功！" -ForegroundColor Green
        Write-Host "   用户名: $($response.login)" -ForegroundColor Gray
        Write-Host "   用户 ID: $($response.id)" -ForegroundColor Gray
        exit 0
    } catch {
        Write-Host "❌ Token 验证失败: $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
}

if ([string]::IsNullOrWhiteSpace($Token)) {
    Write-Host "❌ 错误: 未提供 Token" -ForegroundColor Red
    Write-Host "使用方法: .\scripts\setup-github-token.ps1 -Token '你的_GitHub_Token'" -ForegroundColor Yellow
    Write-Host "或者: .\scripts\setup-github-token.ps1 -Token '你的_GitHub_Token' -UserLevel" -ForegroundColor Yellow
    exit 1
}

Write-Host "配置 GitHub Token..." -ForegroundColor Cyan

if ($UserLevel) {
    # 设置为用户级别环境变量（永久）
    Write-Host "设置为用户级别环境变量（永久）..." -ForegroundColor Yellow
    [System.Environment]::SetEnvironmentVariable('GITHUB_TOKEN', $Token, 'User')
    Write-Host "✅ Token 已设置为用户级别环境变量" -ForegroundColor Green
    Write-Host "   注意: 需要重新打开终端或重启应用才能生效" -ForegroundColor Yellow
} else {
    # 设置为当前会话环境变量（临时）
    Write-Host "设置为当前会话环境变量（临时）..." -ForegroundColor Yellow
    $env:GITHUB_TOKEN = $Token
    Write-Host "✅ Token 已设置为当前会话环境变量" -ForegroundColor Green
    Write-Host "   注意: 仅在当前 PowerShell 会话中有效" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "验证 Token..." -ForegroundColor Cyan
try {
    $headers = @{
        "Authorization" = "Bearer $Token"
        "Accept" = "application/vnd.github.v3+json"
        "User-Agent" = "openclaw-manager-setup"
    }
    
    $response = Invoke-RestMethod -Uri "https://api.github.com/user" -Headers $headers -Method Get
    Write-Host "✅ Token 验证成功！" -ForegroundColor Green
    Write-Host "   用户名: $($response.login)" -ForegroundColor Gray
    Write-Host "   用户 ID: $($response.id)" -ForegroundColor Gray
} catch {
    Write-Host "⚠️  Token 验证失败: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host "   请检查 Token 是否正确或是否有足够的权限" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "使用说明:" -ForegroundColor Cyan
Write-Host "  - 临时设置（当前会话）: .\scripts\setup-github-token.ps1" -ForegroundColor Gray
Write-Host "  - 永久设置（用户级别）: .\scripts\setup-github-token.ps1 -UserLevel" -ForegroundColor Gray
Write-Host "  - 验证 Token: .\scripts\setup-github-token.ps1 -Verify" -ForegroundColor Gray
