# GitHub Secrets 配置指南

## ⚠️ 安全提醒

**重要：** 永远不要将 Personal Access Token (PAT) 提交到代码仓库中！

## 配置 GitHub Secrets

### 方法一：通过 GitHub Web 界面配置（推荐）

1. 访问你的 GitHub 仓库页面
2. 点击 **Settings**（设置）
3. 在左侧菜单中找到 **Secrets and variables** > **Actions**
4. 点击 **New repository secret**（新建仓库密钥）
5. 添加以下密钥：

#### 如果需要使用自定义 GitHub Token：

- **Name**: `GITHUB_TOKEN`
- **Value**: `你的_GitHub_Personal_Access_Token`

> **注意**: GitHub Actions 默认会提供 `GITHUB_TOKEN`，通常不需要手动配置。只有在需要更高权限时才需要自定义。

#### Tauri 应用签名（可选）：

如果需要为 macOS 和 Windows 应用签名，需要添加：

- **Name**: `TAURI_PRIVATE_KEY`
- **Value**: （你的 Tauri 私钥内容）

- **Name**: `TAURI_KEY_PASSWORD`
- **Value**: （你的私钥密码）

### 方法二：通过 GitHub CLI 配置

```bash
# 安装 GitHub CLI（如果还没有）
# Windows: winget install GitHub.cli
# macOS: brew install gh
# Linux: 参考 https://cli.github.com/

# 登录 GitHub CLI
gh auth login

# 设置 Secret
gh secret set GITHUB_TOKEN --body "你的_GitHub_Personal_Access_Token"
```

### 方法三：通过 GitHub API 配置

```bash
# 使用 curl 设置 Secret（需要安装 gh CLI 或手动配置）
curl -X PUT \
  -H "Authorization: token 你的_GitHub_Personal_Access_Token" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/repos/你的用户名/你的仓库名/actions/secrets/GITHUB_TOKEN
```

## Token 权限说明

确保你的 Personal Access Token 具有以下权限：

- ✅ `repo` - 完整仓库访问权限（私有仓库需要）
- ✅ `workflow` - 更新 GitHub Actions 工作流
- ✅ `write:packages` - 上传包到 GitHub Packages（如果需要）
- ✅ `read:packages` - 从 GitHub Packages 下载包（如果需要）

## 验证配置

配置完成后，可以通过以下方式验证：

1. 推送一个标签触发发布工作流：
```bash
git tag v0.0.6
git push origin v0.0.6
```

2. 在 GitHub 仓库的 **Actions** 标签页查看工作流运行状态

3. 如果工作流成功运行，说明配置正确

## 本地开发使用 Token

如果需要在本地脚本中使用 Token（如 `sync-macos-release.ps1`），可以通过环境变量设置：

### Windows PowerShell:
```powershell
$env:GITHUB_TOKEN = "你的_GitHub_Personal_Access_Token"
```

### macOS/Linux:
```bash
export GITHUB_TOKEN="你的_GitHub_Personal_Access_Token"
```

### 永久设置（Windows）:
```powershell
# 用户级别环境变量
[System.Environment]::SetEnvironmentVariable('GITHUB_TOKEN', '你的_GitHub_Personal_Access_Token', 'User')
```

### 永久设置（macOS/Linux）:
```bash
# 添加到 ~/.bashrc 或 ~/.zshrc
echo 'export GITHUB_TOKEN="你的_GitHub_Personal_Access_Token"' >> ~/.bashrc
source ~/.bashrc
```

## 安全最佳实践

1. ✅ **使用最小权限原则** - 只授予必要的权限
2. ✅ **定期轮换 Token** - 建议每 90 天更换一次
3. ✅ **使用环境变量** - 不要在代码中硬编码 Token
4. ✅ **使用 GitHub Secrets** - 在 GitHub Actions 中使用 Secrets
5. ✅ **撤销泄露的 Token** - 如果 Token 意外泄露，立即撤销并创建新的

## 撤销 Token

如果 Token 泄露或不再需要：

1. 访问 https://github.com/settings/tokens
2. 找到对应的 Token
3. 点击 **Revoke**（撤销）

## 相关链接

- [GitHub Personal Access Tokens 文档](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token)
- [GitHub Actions Secrets 文档](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Tauri 签名文档](https://tauri.app/v1/guides/building/signing)
