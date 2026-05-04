import fs from "fs";
import path from "path";
import https from "https";

// ============ 配置 ============
const DEEPSEEK_API_KEY = "sk-79ad301f7e5e4dc7a6211ec27e63f221";     // 改成你的
const PEXELS_API_KEY = "bp10n6W3VCXS8nxxN20688CDHHiQFiPon0ZdxCsPnAlBvcTo1wkqhkdE";         // 改成你的，只填Access Key
const CONTENT_DIR = "./src/content";
const IMG_DIR = "./public/img";

// ============ Pexels 搜图下载 ============
function searchPexels(query) {
  return new Promise((resolve, reject) => {
    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=5&orientation=landscape&size=medium`;
    const options = {
      hostname: "api.pexels.com",
      path: url.replace("https://api.pexels.com", ""),
      method: "GET",
      headers: { "Authorization": PEXELS_API_KEY },
    };

    https.get(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
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
        // 跟随重定向
        downloadImage(res.headers.location, filepath).then(resolve).catch(reject);
        return;
      }
      res.pipe(file);
      file.on("finish", () => { file.close(); resolve(); });
    }).on("error", reject);
  });
}

async function downloadImages(query, folder, baseName) {
  const dir = path.join(IMG_DIR, folder);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const urls = await searchPexels(query);
  const images = [];

  for (let i = 0; i < Math.min(4, urls.length); i++) {
    const filename = `${baseName}-${i + 1}.jpg`;
    const filepath = path.join(dir, filename);
    await downloadImage(urls[i], filepath);
    images.push(`/img/${folder}/${filename}`);
    console.log(`📷 下载图片: ${folder}/${filename}`);
  }

  return images;
}

// ============ 调用 DeepSeek ============
function callDeepSeek(prompt) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: "你是一个专业的无锡旅游内容生成器。只输出要求的格式，不要额外解释。" },
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
        "Authorization": `Bearer ${DEEPSEEK_API_KEY}`,
      },
    }, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
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

// ============ 替换图片路径 ============
function replaceImagePaths(content, images, folder) {
  let result = content;
  result = result.replace(/cover:.*$/m, `cover: "${images[0]}"`);
  result = result.replace(/gallery:\n(.*\n)*?(?=\w+:|---)/,
    `gallery:\n${images.map((img) => `  - "${img}"`).join("\n")}\n`);
  return result;
}

async function generateTour(name, category) {
  const prompt = `生成无锡旅游路线"${name}"的MDX内容，category="${category}"。格式严格如下，正文300字以上：

---
title: "吸引人标题"
category: "${category}"
description: "一句话描述"
cover: "PLACEHOLDER"
gallery:
  - "PLACEHOLDER"
duration: "一日游 / 两天一夜 / 三天两晚"
location: "无锡，江苏"
price: 合理数字
pricing:
  - label: "标准套餐"
    price: 同price
    multiplier: 1
  - label: "精品小团"
    price: price*1.5取整
    multiplier: 1.5
  - label: "尊享定制"
    price: price*2.4取整
    multiplier: 2.4
rating: 5.0
reviews: 0
facilities:
  - 澜青持证导游全程陪同
  - 景区门票全含
  - 当地特色午餐
  - 专车接送
  - 旅游保险
---

正文`;

  const content = await callDeepSeek(prompt);
  const images = await downloadImages(`无锡 ${name}`, "tours", name);
  return replaceImagePaths(content, images, "tours");
}

async function generateBlog(topic) {
  const prompt = `生成无锡旅游攻略"${topic}"的MDX内容。格式严格如下，正文500字以上：

---
title: "吸引人标题含SEO关键词"
cover: "PLACEHOLDER"
date: "2026-05-04"
category: "景点攻略/美食推荐/交通出行/住宿指南"
description: "吸引点击的摘要"
tags:
  - 标签1
  - 标签2
  - 标签3
  - 标签4
  - 标签5
readTime: 合理数字
author:
  name: "澜青旅行顾问"
  job: "澜青旅行社"
  avatar: "/img/avatar-none.jpg"
---

正文`;

  const content = await callDeepSeek(prompt);
  const images = await downloadImages(`无锡 ${topic}`, "blog", topic.replace(/[^\w]/g, "-").substring(0, 30));
  return replaceImagePaths(content, [images[0]], "blog");
}

// ============ 保存 ============
function saveMDX(filename, content, folder) {
  const dir = path.join(CONTENT_DIR, folder);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const clean = content.replace(/^```[a-z]*\n?/g, "").replace(/```$/g, "").trim();
  fs.writeFileSync(path.join(dir, filename), clean, "utf-8");
  console.log(`✅ 已生成: ${folder}/${filename}\n`);
}

// ============ 主程序 ============
async function main() {
  console.log("🚀 开始生成无锡旅游内容（Pexels 自动配图）...\n");

  const tours = [
    { name: "lingshan-dafo", category: "禅意之旅" },
    { name: "huishan-guzhen", category: "古镇文化" },
    { name: "nanchangjie-food", category: "美食之旅" },
    { name: "taihu-youchuan", category: "太湖风光" },
  ];

  for (const t of tours) {
    console.log(`📝 生成路线: ${t.name}...`);
    const content = await generateTour(t.name, t.category);
    saveMDX(`${t.name}.mdx`, content, "tours");
  }

  const blogs = [
    "无锡鼋头渚樱花季完整攻略",
    "灵山大佛一日游攻略",
    "惠山古镇必吃美食推荐",
    "无锡南长街夜游指南",
    "无锡亲子游好去处推荐",
  ];

  for (const b of blogs) {
    console.log(`📝 生成攻略: ${b}...`);
    const content = await generateBlog(b);
    const filename = b.replace(/[^\w\u4e00-\u9fff]/g, "-").toLowerCase().slice(0, 40) + ".mdx";
    saveMDX(filename, content, "blog");
  }

  console.log("\n🎉 全部生成完毕！运行 npm run dev 查看效果。");
}

main().catch(console.error);