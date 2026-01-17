# 如何免费部署 WORD DUEL 游戏

既然您的项目使用了 React (Vite) 并且依赖后端代理（访问有道词典 API），**Vercel** 是目前最好用的免费部署平台。

它不仅可以托管您的前端页面，还能完美支持我们刚刚配置的 API 代理 (`vercel.json`)，并且会自动为您分配一个免费的 `https://your-project.vercel.app` 域名。

## 部署步骤

### 1. 准备代码
确保您的代码已经提交到了 GitHub (推荐) 或 GitLab/Bitbucket。

如果还没提交：
1. 在 GitHub 上创建一个新的仓库（Repository）。
2. 在您的项目文件夹中打开终端，运行：
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin <您的GitHub仓库地址>
   git push -u origin main
   ```

### 2. 在 Vercel 上部署
1. 访问 [Vercel 官网](https://vercel.com/) 并使用 GitHub 账号注册/登录。
2. 点击控制台右上角的 **"Add New..."** -> **"Project"**。
3. 在 "Import Git Repository" 列表中找到您的 `WordConstruction` 仓库，点击 **Import**。
4. **关键步骤**：
   - **Framework Preset**: Vercel 会自动识别为 `Vite`，保持默认即可。
   - **Root Directory**: 保持默认 `./`。
   - **Build and Output Settings**: 保持默认。
   - 点击 **Deploy** 按钮。

### 3. 等待部署
Vercel 会自动拉取代码、安装依赖、打包构建。大概 1-2 分钟后，您就会看到满屏的彩带，恭喜部署成功！

点击 **Continue to Dashboard**，您会看到一个 `Visit` 按钮，点击即可访问您的在线游戏。
- **域名**: Vercel 会自动分配类似 `word-duel-tau.vercel.app` 的域名。
- **HTTPS**: 默认全站开启 HTTPS 安全连接。

---

## 关于自定义域名

### Vercel 免费子域名（推荐）
Vercel 提供的 `.vercel.app` 子域名永久免费，且速度快、不仅包含 SSL 证书，还支持自动 CDN 加速。对于个人项目来说，这不仅够用，而且很专业。
您可以去 Vercel 项目设置 -> **Domains** 中修改子域名的前缀（只要没被占用），例如尝试改为 `word-duel-game.vercel.app`。

### 申请完全自定义的免费域名（不推荐）
以往有 Freenom (提供 .tk, .ml 等) 等服务商提供免费顶级域名，但近年来这些服务极其不稳定，经常无故回收域名，且容易被当作垃圾网站拦截。
如果您一定要拥有自己的顶级域名（如 .com, .xyz），建议购买：
- **Namecheap / GoDaddy / 阿里云 / 腾讯云**
- `.xyz` 或 `.top` 域名通常首年非常便宜（几块钱人民币）。

购买后，在 Vercel 的 **Domains** 设置中添加该域名，按照提示去域名服务商处修改 CNAME 解析记录即可绑定。

---

## 总结
**最推荐方案**：直接使用 Vercel 提供的流程进行部署。我已经在项目中为您创建了 `vercel.json` 配置文件，它会处理好跨域代理问题，确保游戏上线后“有道词典”翻译功能依然正常工作。
