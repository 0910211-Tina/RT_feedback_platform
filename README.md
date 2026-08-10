# RT PGY 完整回饋平台 v7.1｜部署說明

架構：GitHub → Netlify → Supabase Cloud → Google OAuth

## 0. 這個平台的定位
- 不取代 e-Portfolio。
- 協助臨床教師快速建立可貼回 e-Portfolio 的質性回饋。
- 未登入時可使用本機模式；登入 Google 後才將紀錄同步至 Supabase。
- 請持續只使用學員代號，避免輸入病人姓名、病歷號或其他可識別病人資訊。

## 1. 建立 GitHub repository
建立一個新 repository，例如：
`rt-pgy-feedback`

把以下檔案上傳到 repository 根目錄：
- `index.html`
- `netlify.toml`
- `supabase-schema.sql`
- `README_DEPLOY.md`

## 2. 建立 Supabase Cloud project
1. 在 Supabase 建立新 project。
2. 打開 SQL Editor。
3. 將 `supabase-schema.sql` 全部貼上並執行。
4. 到 Project Settings / API（名稱可能隨 Dashboard 更新略有不同），取得：
   - Project URL
   - Publishable key（或舊介面的 anon public key）
5. 打開 `index.html`，搜尋：
   `window.SUPABASE_CONFIG`
6. 將：
   - `YOUR_SUPABASE_PROJECT_URL`
   - `YOUR_SUPABASE_PUBLISHABLE_KEY`
   換成實際值。

注意：Publishable/anon key 是前端可使用的 key；不要把 `service_role` 或 secret key 放入 HTML / GitHub。

## 3. 設定 Google OAuth
在 Supabase Dashboard 的 Google Provider 頁面可看到「Supabase callback URL」。

到 Google Auth Platform / Google Cloud：
1. 建立 OAuth Client。
2. Application type 選 `Web application`。
3. Authorized JavaScript origins：
   - 先填正式 Netlify 網址，例如 `https://your-site.netlify.app`
4. Authorized redirect URIs：
   - 填 Supabase Google Provider 頁面顯示的 callback URL。
5. 儲存後取得 Google Client ID 與 Client Secret。
6. 回到 Supabase Authentication → Google Provider：
   - 啟用 Google
   - 填入 Client ID
   - 填入 Client Secret

Google OAuth scopes 建議只維持基本登入所需：
- `openid`
- email
- profile

## 4. Supabase URL Configuration
Supabase Authentication / URL Configuration：
- Site URL：填正式網站，例如
  `https://your-site.netlify.app`
- Redirect URLs：至少加入正式網址，例如
  `https://your-site.netlify.app/**`

若要使用 Netlify Deploy Preview，可再加入：
`https://**--YOUR-NETLIFY-SITE.netlify.app/**`

正式上線後，建議把 Site URL 固定為 production URL。

## 5. GitHub → Netlify
1. 登入 Netlify。
2. Add new project → Import an existing project。
3. 選 GitHub。
4. 選剛才的 repository。
5. 本專案是純靜態 HTML：
   - Build command：留空
   - Publish directory：`.`（repository root）
6. Publish。

之後每次 push GitHub，Netlify 會自動重新部署。

## 6. 上線後測試
依序確認：
1. 網站可以正常開啟。
2. 未登入時可新增本機紀錄。
3. Google 登入成功。
4. 登入後按「同步本機紀錄」。
5. Supabase Table Editor 中可看到自己的紀錄。
6. 換另一個 Google 帳號登入，不能看到前一個帳號的紀錄（RLS 驗證）。
7. 新增紀錄後，雲端同步狀態顯示成功。
8. 刪除紀錄後，Supabase 相同紀錄也同步刪除。
9. 「從雲端載入」可將雲端紀錄重新整合到本機。

## 7. 資料安全
`feedback_records` 已啟用 Row Level Security：
- 登入教師只能 SELECT 自己的資料。
- 只能 INSERT / UPDATE / DELETE 自己的資料。
- 未登入（anon）沒有資料表權限。
- 前端不可使用 service_role key。

## 8. 未來擴充建議
第一階段先維持「教師只能看自己的紀錄」。
若未來要讓教學負責人查看跨教師的 PGY 縱向回饋，再新增：
- profiles / roles
- educator / admin 權限
- 專屬 RLS policy
不要直接把所有 authenticated user 開放成可讀所有回饋。
