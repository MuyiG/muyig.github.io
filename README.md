# Hikari's Blog

基于 [AstroPaper](https://github.com/satnaing/astro-paper) 的 Astro 静态博客。

## 本地运行

需要 Node.js >= 24.16.0。

```sh
npm ci
npm run dev
```

访问 http://localhost:4321/ 。

## 构建与预览

```sh
npm run build
npm run preview
```

构建输出位于 `dist/`，包含 Pagefind 静态搜索索引。开发模式下首次使用搜索前，先执行一次构建。

## 写文章

文章源文件统一放在 `src/content/posts/`。文件名建议使用小写英文和短横线，例如 `src/content/posts/2026/my-first-note.md`；也可以按年份、主题建立子目录。目录只用于整理文件，文章 URL 会根据文件路径生成并转换为小写短横线形式。文章文件名以下划线开头时不会作为文章发布，适合保留主题资料或暂不发布的文章；仅把目录命名为下划线开头并不能排除其中的文章。

新建文章时，先复制下面的最小模板。`pubDatetime` 使用 ISO 8601 日期时间，建议统一写成北京时间对应的带 `Z` 时间；`tags` 至少保留一个标签。

```md
---
title: 我的第一篇文章
pubDatetime: 2026-09-19T12:00:00Z
description: 用一句话说明文章内容。
tags:
  - 随笔
draft: false
featured: false
---

正文从这里开始。
```

必填字段是 `title`、`pubDatetime` 和 `description`；建议填写 `tags`，不填写时主题会使用 `others`。`draft: true` 的文章只用于本地预览，不会出现在正式站点；`featured: true` 会让文章进入首页精选区域。需要标记修改时间时增加 `modDatetime`，需要指定社交分享图时增加 `ogImage`。

正文使用 Markdown；需要在正文中嵌入 Astro 组件或交互代码时，可以使用 `.mdx` 扩展名。提交前运行 `npm run dev` 预览，确认标题、日期、目录、图片和链接都正常，再提交到 Git。

### 图片和附件

推荐把文章图片放在 `src/assets/images/posts/<文章 slug>/`，例如：

```text
src/assets/images/posts/my-first-note/architecture.png
src/assets/images/posts/my-first-note/architecture-dark.png
```

正文中用 `@/assets/` 别名引用：

```md
![系统架构图](@/assets/images/posts/my-first-note/architecture.png)
```

这种方式会交给 Astro 处理和压缩，适合文章插图、封面和截图。图片必须填写有意义的 alt 文本；上传前先裁剪和压缩，避免把原始相机照片直接放进仓库。

需要保留原文件、提供下载，或文件格式不适合 Astro 图片处理时，放在 `public/assets/posts/<文章 slug>/`，例如：

```text
public/assets/posts/my-first-note/demo.pdf
public/assets/posts/my-first-note/sample.zip
```

这类文件会原样复制到网站，正文用以 `/` 开头的公开路径引用：

```md
[下载示例文件](/assets/posts/my-first-note/demo.pdf)
```

`src/assets/` 中的资源会被构建工具处理，不能写成 `/src/assets/...`；`public/` 中的资源不会自动优化，也不会自动改名。文章删除或改 slug 时，记得同步检查对应的附件目录和 Markdown 链接。外部图片或视频只在确有必要时使用，并优先改为仓库内资源，避免第三方链接失效或造成国内访问不稳定。

文章的社交分享图可以使用 `src/assets/images/posts/<文章 slug>/og.png`，然后在 frontmatter 中写：

```yaml
ogImage: ../../assets/images/posts/my-first-note/og.png
```

如果不设置 `ogImage`，站点会使用 `public/default-og.png` 作为默认图。

站点配置在 `astro-paper.config.ts`，个人介绍在 `src/content/pages/about.md`。

## 部署到 GitHub Pages

本项目使用 GitHub Actions 自动构建并发布到 GitHub Pages。仓库名是 `MuyiG/muyig.github.io`，因此站点地址为 `https://muyig.github.io/`。

首次启用时，在 GitHub 仓库的 `Settings → Pages` 中将发布源设置为 `GitHub Actions`。之后推送到 `main` 分支会自动运行 `.github/workflows/deploy.yml`。

Astro 构建使用 `npm run build`，输出目录为 `dist`。部署工作流会将 `SITE_URL` 设置为 `https://muyig.github.io/`，用于生成 canonical、RSS 和 sitemap。

本项目为纯静态输出，无需服务器、数据库或 Cloudflare adapter。

## 主题

保留 AstroPaper 的 MIT 许可证，见 `LICENSE`。本站采用系统字体，未启用评论和社交分享。
