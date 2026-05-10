import fs from "fs";
import path from "path";
import https from "https";

// ============ 配置 ============
const DEEPSEEK_API_KEY = "sk-79ad301f7e5e4dc7a6211ec27e63f221";
const PEXELS_API_KEY = "bp10n6W3VCXS8nxxN20688CDHHiQFiPon0ZdxCsPnAlBvcTo1wkqhkdE";
const CONTENT_DIR = "./src/content";
const IMG_DIR = "./public/img";

// ============ 每天的选题库 ============
const TOPICS = [
  "无锡鼋头渚最佳拍照机位攻略",
  "无锡灵山大佛九龙灌浴表演时间攻略",
  "惠山古镇一日游最佳路线",
  "无锡南长街必打卡网红店推荐",
  "无锡太湖三白哪家好吃",
  "无锡拈花湾夜景攻略",
  "无锡蠡园荷花季攻略",
  "无锡本地人私藏的小众景点",
  "无锡带父母出游攻略",
  "无锡情侣约会路线推荐",
  "无锡春季赏花地图",
  "无锡秋季最美打卡地",
  "无锡地铁沿线景点攻略",
  "无锡免费景点盘点",
  "无锡雨天室内游玩推荐",
];

// ============ Pexels 搜图 ============
function searchPexels(query) {
  return new Promise((resolve, reject) => {
    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=3&orientation=landscape&size=medium`;
    https.get(url, { headers: { Authorization: PEXELS_API_KEY } }, (res) => {
      let body = "";
      res.on("data", (c) => (body += c));
      res.on("end", () => {
        const data = JSON.parse(body);
        resolve(data.photos.map((p) => p.src.large));
      });
    }).on("error", reject);
  });
}

function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        downloadImage(res.headers.location, filepath).then(resolve).catch(reject);
        return;
      }
      res.pipe(file);
      file.on("finish", () => { file.close(); resolve(); });
    }).on("error", reject);
  });
}

// ============ DeepSeek ============
function callDeepSeek(prompt) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: "你是无锡旅游攻略生成器，只输出格式内容不解释。" },
        { role: "user", content: prompt }
      ],
      temperature: 0.8,
    });
    const req = https.request({
      hostname: "api.deepseek.com",
      path: "/v1/chat/completions",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
      },
    }, (res) => {
      let body = "";
      res.on("data", (c) => (body += c));
      res.on("end", () => {
        const result = JSON.parse(body);
        resolve(result.choices[0].message.content);
      });
    });
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

// ============ 生成一篇攻略 ============
async function generateArticle(topic) {
  const today = new Date().toISOString().split("T")[0];

  const prompt = `写一篇无锡旅游攻略，主题是"${topic}"。500字以上，格式如下：

---
title: "吸引人的标题"
cover: "PLACEHOLDER"
date: "${today}"
category: "景点攻略"
description: "100字以内摘要"
tags:
  - 标签1
  - 标签2
  - 标签3
  - 标签4
  - 标签5
readTime: 6
author:
  name: "澜青旅行顾问"
  job: "澜青旅行社"
  avatar: "/img/avatar-none.jpg"
---

正文（实用攻略，有具体信息，适合游客参考）`;

  const content = await callDeepSeek(prompt);

  // 下载封面图
  const images = await searchPexels(`无锡 ${topic.substring(0, 10)}`);
  const dir = path.join(IMG_DIR, "blog");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const imgName = `auto-${Date.now()}.jpg`;
  await downloadImage(images[0] || images[1], path.join(dir, imgName));
  const coverPath = `/img/blog/${imgName}`;

  // 替换封面路径
  const finalContent = content.replace(/cover:.*$/m, `cover: "${coverPath}"`);

  // 保存
  const filename = topic.replace(/[^\w\u4e00-\u9fff]/g, "-").slice(0, 30) + ".mdx";
  const filepath = path.join(CONTENT_DIR, "blog", filename);
  fs.writeFileSync(filepath, finalContent.replace(/^```[a-z]*\n?/g, "").replace(/```$/g, "").trim(), "utf-8");

  console.log(`[${new Date().toLocaleString()}] ✅ 发布成功: ${topic}`);
  console.log(`   封面: ${coverPath}`);
  console.log(`   文件: blog/${filename}\n`);
}

// ============ 主程序 ============
async function main() {
  const topic = TOPICS[Math.floor(Math.random() * TOPICS.length)];
  console.log(`\n📝 今日选题: ${topic}\n`);
  await generateArticle(topic);
}

main().catch(console.error);