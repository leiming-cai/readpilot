# ReadPilot - AI 智能阅读助手

一款基于 Chrome Manifest V3 的浏览器扩展，提供页面摘要和文本 AI 解释功能。

## 功能特性

### 📄 页面摘要
- 点击扩展图标 → 弹出窗口 → 选择摘要模板 → 点击 **"Summarize Page"** 按钮
- 支持4种内置摘要模板 + 自定义模板
  - **简洁要点**：3-5个bullet points概括要点
  - **段落详摘**：段落式详细总结
  - **关键信息**：主题+观点+结论
  - **通俗解释**：用通俗易懂的语言解释
- 支持在设置页面管理模板

### ✍️ 文本解释
- 选中任意文字（≥5字符）
- 页面显示悬浮 **"AI Explain"** 按钮
- 点击获取 AI 解释，支持技术术语和概念说明

### ⚙️ 设置页面
- API Key 管理（安全存储于本地）
- DeepSeek API 地址配置
- Max Tokens 调节（100-2000）
- 保存时自动测试连接

## 技术架构

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────┐
│   popup.js      │─────▶│  content.js     │─────▶│ DeepSeek   │
│  (摘要逻辑)      │      │  (内容提取)      │      │ API        │
└─────────────────┘      └─────────────────┘      └─────────────┘
        │                        │
        ▼                        ▼
┌─────────────────┐      ┌─────────────────┐
│  background.js  │      │ chrome.storage   │
│  (服务工作者)    │      │ (配置存储)       │
└─────────────────┘      └─────────────────┘
```

## 文件结构

```
ReadPilot/
├── manifest.json      # Manifest V3 配置
├── popup.html        # 弹窗界面
├── popup.css         # 样式（含深色/浅色模式）
├── popup.js          # 页面摘要逻辑
├── content.js        # 内容脚本（选中文本检测、悬浮按钮）
├── options.html      # 设置页面
├── options.js        # API 配置管理
├── background.js     # 服务工作者
├── _locales/          # 国际化文件
│   ├── en/
│   │   └── messages.json
│   └── zh_CN/
│       └── messages.json
└── icons/            # 扩展图标
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## 国际化 (i18n)

支持 **English** 和 **中文** 两种语言。

扩展会自动检测 Chrome 浏览器语言设置并显示对应语言界面。

| 文件 | 语言 |
|------|------|
| `_locales/en/messages.json` | English |
| `_locales/zh_CN/messages.json` | 中文 |

如需添加更多语言：
1. 在 `_locales/` 下创建对应语言目录（如 `ja/`、`ko/`）
2. 添加 `messages.json` 文件
3. 在 `manifest.json` 中添加对应 `default_locale`

## 安装方法

1. 打开 `chrome://extensions/`
2. 启用右上角 **"开发者模式"**
3. 点击 **"加载已解压的扩展程序"**
4. 选择 `ReadPilot` 文件夹

## 配置说明

1. 点击扩展图标 → **Settings** 打开设置页面
2. 输入您的 [DeepSeek API Key](https://platform.deepseek.com)
3. 可选：调整 API 地址和 Max Tokens
4. 点击 **Save & Test** 保存并测试连接

## API 配置

| 参数 | 默认值 | 说明 |
|------|--------|------|
| API Base URL | `https://api.deepseek.com` | DeepSeek API 地址 |
| Max Tokens | 1000 | 摘要最大 token 数 |

## 错误处理

| 错误类型 | 处理方式 |
|----------|----------|
| API Key 未配置 | 提示前往设置页面 |
| API 限速 (429) | 显示重试按钮 |
| 网络错误 | 显示连接错误和重试 |
| 空白页面 | 提示"无内容可摘要" |
| 选中文本过短 | 提示"请选择更多文本" |

## DeepSeek API 集成

- **端点**: `POST /chat/completions`
- **模型**: `deepseek-chat`
- **Temperature**: 0.7
- **摘要 Max Tokens**: 1000
- **解释 Max Tokens**: 500

## 隐私说明

- API Key 仅存储在本地 `chrome.storage.local`
- 所有 API 调用直接与 DeepSeek 服务器通信
- 不收集或上传任何用户数据

## 开发相关

```bash
# 克隆仓库
git clone https://github.com/leiming-cai/readpilot.git

# 修改代码后重新加载扩展
# chrome://extensions/ → ReadPilot → 刷新按钮
```

## 许可证

MIT License

## 版本

v1.0.0
