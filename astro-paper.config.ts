import { defineAstroPaperConfig } from "./src/types/config";

export default defineAstroPaperConfig({
  site: {
    // Set SITE_URL to the actual public URL before production deployment.
    url: process.env.SITE_URL || "http://localhost:4321/",
    title: "Hikari's Blog",
    description: "记录技术学习、日常思考与个人作品。",
    author: "Hikari",
    profile: "https://github.com/MuyiG",
    ogImage: "default-og.png",
    lang: "zh-CN",
    timezone: "Asia/Shanghai",
    dir: "ltr",
  },
  posts: { perPage: 6, perIndex: 4 },
  features: {
    lightAndDarkMode: true,
    dynamicOgImage: false,
    showArchives: true,
    showBackButton: true,
    editPost: { enabled: false },
    search: "pagefind",
  },
  socials: [
    { name: "github", url: "https://github.com/MuyiG", linkTitle: "Hikari 的 GitHub" },
  ],
  shareLinks: [],
});
