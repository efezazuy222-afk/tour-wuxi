const DEPLOY_HOOK = "https://api.cloudflare.com/client/v4/pages/webhooks/deploy_hooks/464be281-a3dc-4fe5-bba5-517a03e63970";
const DEEPSEEK_API_KEY = "sk-e411674adab84202adea93c8e918b475";
const PEXELS_API_KEY = "bp10n6W3VCXS8nxxN20688CDHHiQFiPon0ZdxCsPnAlBvcTo1wkqhkdE";
const GITHUB_TOKEN = env.GITHUB_TOKEN;
const GITHUB_USER = "efezazuy222-afk";
const GITHUB_REPO = "tour-wuxi";
const GITHUB_BRANCH = "main";

const CITY = "无锡";

const TOPICS = [
  "无锡鼋头渚最佳拍照机位攻�?,
  "无锡灵山大佛九龙灌浴表演时间攻略",
  "惠山古镇一日游最佳路�?,
  "无锡南长街必打卡网红店推�?,
  "无锡太湖三白哪家好吃",
  "无锡拈花湾夜景攻�?,
  "无锡蠡园荷花季攻�?,
  "无锡本地人私藏的小众景点",
  "无锡带父母出游攻�?,
  "无锡情侣约会路线推荐",
];

// 备用图片（Pexels 调用失败时的保底图）
const FALLBACK_IMAGE = "https://images.pexels.com/photos/460672/pexels-photo-460672.jpeg";

function toSlug(text) {
  return text
    .replace(/[^\w\u4e00-\u9fff]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()
    .slice(0, 60);
}

async function getCoverImage(topic) {
  try {
    const query = `${CITY} ${topic} 旅游`;
    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=5&orientation=landscape`;
    const res = await fetch(url, { headers: { Authorization: PEXELS_API_KEY } });

    if (!res.ok) return FALLBACK_IMAGE;

    const data = await res.json();
    if (data.photos?.length) {
      return data.photos[Math.floor(Math.random() * data.photos.length)].src.medium;
    }
    return FALLBACK_IMAGE;
  } catch {
    return FALLBACK_IMAGE;
  }
}

async function getCurrentData() {
  const url = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/src/data/wuxi.json?ref=${GITHUB_BRANCH}`;
  const res = await fetch(url, {
    headers: { Authorization: `token ${GITHUB_TOKEN}` },
  });

  if (!res.ok) throw new Error(`读取 wuxi.json 失败: ${res.status}`);

  const data = await res.json();
  const content = atob(data.content);

  return { data: JSON.parse(content), sha: data.sha };
}

async function updateWuxiJson(newData, sha) {
  const content = btoa(unescape(encodeURIComponent(JSON.stringify(newData, null, 2))));
  const url = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/src/data/wuxi.json`;

  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `token ${GITHUB_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: `auto: 新增攻略`,
      content,
      branch: GITHUB_BRANCH,
      sha,
    }),
  });

  if (!res.ok) throw new Error(`更新 wuxi.json 失败: ${res.status}`);
}

async function callDeepSeek(topic) {
  const res = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        {
          role: "user",
          content: `用HTML写一篇关�?${topic}'�?{CITY}旅游攻略�?00字左右，适合SEO。要求：1)开头用<h2>标签写标�?2)正文�?-4个小节，每节�?h3>做小标题 3)只输出HTML片段，不要包含\`\`\`标记 4)最后加一�?由澜青旅行社整理发布"`,
        },
      ],
      temperature: 0.8,
      max_tokens: 1800,
    }),
  });

  const data = await res.json();
  if (!data.choices?.[0]?.message?.content) {
    throw new Error("DeepSeek 返回内容为空");
  }
  return data.choices[0].message.content;
}

async function run() {
  const topic = TOPICS[Math.floor(Math.random() * TOPICS.length)];
  const slug = toSlug(topic);

  console.log(`正在生成�?{topic}`);

  // 1. 获取封面图URL（直接外链）
  const coverUrl = await getCoverImage(topic);
  console.log(`封面图：${coverUrl}`);

  // 2. 调用 DeepSeek 生成文章
  const rawContent = await callDeepSeek(topic);

  // 3. 组装文章（封面图插入最前面�?
  const content = `<img src="${coverUrl}" alt="${topic}" style="width:100%; border-radius:12px; margin-bottom:20px;" />` + rawContent;

  // 4. 读取当前数据
  const { data, sha } = await getCurrentData();

  // 5. 检查是否已存在相同 slug
  if (data.find((item) => item.slug === slug)) {
    console.log(`⚠️ 已存在相同文章，跳过�?{slug}`);
    return { success: false, reason: "duplicate", topic };
  }

  // 6. 追加新条�?
  const newEntry = {
    slug,
    title: topic,
    description: `${topic}的详细攻略，包含实用贴士、路线推荐和美食指南`,
    content,
  };

  data.push(newEntry);
  await updateWuxiJson(data, sha);

  console.log(`�?已添加：${topic}`);
  console.log(`📊 当前�?${data.length} 篇文章`);

  // 7. 触发 Cloudflare Pages 重新部署
  if (DEPLOY_HOOK) {
    await fetch(DEPLOY_HOOK, { method: "POST" }).catch(() => {});
  }

  return { success: true, topic, total: data.length };
}

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(run());
  },

  async fetch(request, env) {
    const result = await run();
    return new Response(JSON.stringify(result, null, 2), {
      headers: { "Content-Type": "application/json" },
    });
  },
<<<<<<< Updated upstream
};
=======
};
>>>>>>> Stashed changes
