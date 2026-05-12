# 提示詞資料庫 · Prompt Library

> 28 個精選 AI 提示詞模組，六大類別，一鍵複製即用。

## 檔案結構

```
prompt-site/
├── index.html   # 主頁面
├── style.css    # 樣式
├── data.js      # 提示詞資料（新增/修改提示詞在這裡）
├── app.js       # 互動邏輯
└── README.md    # 說明文件
```

## 功能特色

- **六大類別分頁**：決策與分析、企劃與提案、職場溝通與文書、文稿品質提升、策略智囊角色、生活娛樂應用
- **全文搜尋**：即時搜尋標題與內容
- **一鍵複製**：點擊卡片開啟全文，複製後貼到 AI 工具使用
- **深色主題**：護眼配色，適合長時間使用

## 部署到 GitHub Pages

1. 建立新的 GitHub 倉庫（如：`prompt-library`）
2. 將此資料夾內所有檔案上傳至 `main` 分支根目錄
3. 進入倉庫 Settings → Pages → Source 選擇 `main` 分支
4. 儲存後約 1-2 分鐘即可透過 `https://[你的帳號].github.io/prompt-library/` 存取

## 新增或修改提示詞

編輯 `data.js`，在 `PROMPTS` 陣列中新增一個物件：

```javascript
{
  id: 31,          // 唯一編號（遞增）
  cat: 'decision', // 類別 key（見下方）
  title: '提示詞名稱',
  content: `提示詞內容……`
}
```

### 類別對照表

| cat key    | 顯示名稱     |
|------------|------------|
| decision   | 決策與分析   |
| proposal   | 企劃與提案   |
| comms      | 職場溝通與文書|
| writing    | 文稿品質提升 |
| ai-roles   | 策略智囊角色 |
| life       | 生活娛樂應用 |
