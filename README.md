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
- 支持最多 **3个 Toast 同时显示**，堆叠展示
- 每个解释 Toast 可一键 **复制内容**

### ⚙️ 设置页面
- API Key 管理（安全存储于本地）
- DeepSeek API 地址配置
- Max Tokens 调节（100-2000）
- 保存时自动测试连接

## Toast 交互

解释功能支持多 Toast 堆叠显示：

| 操作 | 行为 |
|------|------|
| 连续划词 | 多个解释 Toast 垂直堆叠显示 |
| 点击关闭按钮 | 只关闭当前 Toast，60s 倒计时关闭 |
| 点击前往设置 | 打开扩展设置页面 |
| 按 ESC 键 | 关闭所有 Toast |
| 超过3个 | 最早的 Toast 滑出消失 |
| 复制按钮 | 一键复制解释内容 |

所有按钮均支持鼠标悬停提示（国际化）

## 快速上手

### 第一步：配置 API Key

1. 点击浏览器右上角扩展图标
2. 点击 **Settings**（设置）图标，进入设置页面
3. 输入您的 [DeepSeek API Key](https://platform.deepseek.com)
4. 点击 **Save & Test** 保存并验证连接

> 💡 没有 API Key？访问 [DeepSeek 平台](https://platform.deepseek.com) 注册账号后在 API Keys 页面创建。

### 第二步：使用页面摘要

1. 打开任意网页
2. 点击扩展图标
3. 选择摘要模板（可选）
4. 点击 **Summarize Page**
5. 等待摘要生成，点击复制按钮一键复制

### 第三步：使用文本解释

1. 在网页中选中任意文字（至少5个字符）
2. 页面会显示 **"AI Explain"** 悬浮按钮
3. 点击按钮获取 AI 解释
4. 可点击复制按钮复制解释内容
5. 多个解释会堆叠显示

### 常见问题

| 问题 | 解决方案 |
|------|----------|
| 扩展图标不显示 | 在 `chrome://extensions/` 启用扩展 |
| 按钮点击无反应 | 检查是否已配置 API Key |
| 解释显示很慢 | 网络延迟或 API 限速，请稍后重试 |
| Toast 遮盖内容 | 点击关闭按钮或等待 60s 自动关闭 |

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
├── content.js        # 内容脚本（选中文本检测、悬浮按钮、Toast）
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
| API Key 未配置 | 提示前往设置页面（带链接） |
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

v1.2.0
