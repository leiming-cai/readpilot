# ReadPilot - AI Reading Assistant

[English](./README_en.md) | [中文](./README.md)

---

A Chrome Manifest V3 browser extension providing page summarization and AI-powered text explanation.

## Features

### 📄 Page Summarization
- Click extension icon → Select template → Click **"Summarize Page"**
- 4 built-in templates + custom templates:
  - **Bullet Summary**: 3-5 bullet points covering key points
  - **Detailed Summary**: Paragraph-style detailed summary
  - **Key Takeaways**: Topic + viewpoints + conclusions
  - **Plain English**: Easy-to-understand explanations
- Manage templates in Settings page

### ✍️ Text Explanation
- Select any text (≥5 characters)
- **"AI Explain"** floating button appears
- Click to get AI explanation with 60s countdown
- Supports up to **3 Toast notifications** stacked
- Copy button to copy explanation content

### ⚙️ Settings Page
- API Key management (secure local storage)
- DeepSeek API URL configuration
- Max Tokens adjustment (100-2000)
- Auto-test connection on save

## Toast Interaction

Multi-Toast stacked display:

| Action | Behavior |
|--------|----------|
| Multiple selections | Toasts stack vertically |
| Click close button | Closes current Toast, 60s auto-close |
| Click Go to Settings | Opens extension settings |
| Press ESC | Closes all Toasts |
| More than 3 | Oldest Toast slides out |
| Copy button | Copy explanation to clipboard |

All buttons have internationalized hover tooltips.

## Quick Start

### Step 1: Configure API Key

1. Click the extension icon
2. Click **Settings** icon
3. Enter your [DeepSeek API Key](https://platform.deepseek.com)
4. Click **Save & Test** to save and verify

> 💡 No API Key? Visit [DeepSeek Platform](https://platform.deepseek.com) to register and create one in API Keys section.

### Step 2: Summarize a Page

1. Open any webpage
2. Click the extension icon
3. Select a template (optional)
4. Click **Summarize Page**
5. Wait for summary, click copy button to copy

### Step 3: Explain Text

1. Select any text on the page (at least 5 characters)
2. **"AI Explain"** floating button appears
3. Click to get AI explanation
4. Click copy button to copy content
5. Multiple explanations stack automatically

### FAQ

| Issue | Solution |
|-------|----------|
| Extension icon not showing | Enable extension in `chrome://extensions/` |
| Button click does nothing | Check if API Key is configured |
| Explanation is slow | Network delay or API rate limit, try again later |
| Toast covers content | Click close button or wait 60s |

## Architecture

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────┐
│   popup.js      │─────▶│  content.js     │─────▶│ DeepSeek   │
│  (Summary UI)   │      │  (Content Extract)│      │ API        │
└─────────────────┘      └─────────────────┘      └─────────────┘
        │                        │
        ▼                        ▼
┌─────────────────┐      ┌─────────────────┐
│  background.js  │      │ chrome.storage   │
│  (Service Worker)│      │ (Config Store) │
└─────────────────┘      └─────────────────┘
```

## File Structure

```
ReadPilot/
├── manifest.json      # Manifest V3 config
├── popup.html        # Popup UI
├── popup.css         # Styles (dark/light mode)
├── popup.js          # Popup logic
├── content.js        # Content script (selection, Toast)
├── options.html      # Settings page
├── options.js        # Settings logic
├── background.js     # Service worker
├── _locales/        # i18n files
│   ├── en/
│   │   └── messages.json
│   └── zh_CN/
│       └── messages.json
└── icons/            # Extension icons
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## i18n

Supports **English** and **中文** (Chinese).

Extension auto-detects Chrome browser language setting.

| File | Language |
|------|----------|
| `_locales/en/messages.json` | English |
| `_locales/zh_CN/messages.json` | 中文 |

## Installation

1. Open `chrome://extensions/`
2. Enable **Developer Mode** (top right)
3. Click **Load unpacked**
4. Select `ReadPilot` folder

## Configuration

1. Click extension icon → **Settings**
2. Enter your [DeepSeek API Key](https://platform.deepseek.com)
3. Optional: Adjust API URL and Max Tokens
4. Click **Save & Test**

## API Config

| Parameter | Default | Description |
|-----------|---------|-------------|
| API Base URL | `https://api.deepseek.com` | DeepSeek API URL |
| Max Tokens | 1000 | Summary max tokens |

## Error Handling

| Error | Handling |
|-------|----------|
| API Key not configured | Shows link to Settings |
| API rate limit (429) | Shows retry button |
| Network error | Shows error message + retry |
| Empty page | Shows "No content" message |
| Selection too short | Shows warning |

## Privacy

- API Key stored locally in `chrome.storage.local`
- All API calls go directly to DeepSeek servers
- No user data collected or uploaded

## Development

```bash
# Clone repo
git clone https://github.com/leiming-cai/readpilot.git

# After code changes, reload extension
# chrome://extensions/ → ReadPilot → Refresh button
```

## License

MIT License

## Version

v1.2.0
