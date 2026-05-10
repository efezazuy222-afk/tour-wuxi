import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CITY = "无锡";

const openai = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: "https://api.deepseek.com",
});

async function generateArticle(title, slug) {
  console.log(`正在生成：${title} ...`);

  const completion = await openai.chat.completions.create({
    model: "deepseek-chat",
    messages: [
      {
        role: "user",
        content: `用HTML写一篇关于'${title}'的${CITY}旅游攻略，400字左右，适合SEO，只输出HTML片段不要包含\`\`\`标记，直接以<p>或<h2>等标签开始`,
      },
    ],
    temperature: 0.8,
  });

  const content = completion.choices[0].message.content;

  const dataPath = path.join(__dirname, "src", "data", "wuxi.json");
  const data = JSON.parse(fs.readFileSync(dataPath, "utf-8"));

  const newEntry = { slug, title, description: `${title}的详细攻略`, content };
  data.push(newEntry);
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), "utf-8");

  console.log(`✅ 已添加：${title}`);
  console.log(`📊 当前条目总数：${data.length}`);
}

const args = process.argv.slice(2);
const title = args[0] || `${CITY}旅游攻略`;
const slug = args[1] || "wuxi-tour";

generateArticle(title, slug).catch((err) => {
  console.error("❌ 报错：", err.message);
});