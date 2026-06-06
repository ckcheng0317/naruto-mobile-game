import Anthropic from "@anthropic-ai/sdk";
import { writeFileSync, mkdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const CONTENT_SYSTEM_PROMPT = `You are a social media strategist and copywriter for a solo game UI developer.
You create content that builds authority, attracts clients, and showcases AI-powered development speed.

The creator:
- Solo developer who builds mobile game UIs using AI tools
- Portfolio: Naruto-themed game UI built in days
- Target audience: indie game developers, small studios, game jam participants
- Platforms: Twitter/X, LinkedIn, Reddit (r/gamedev), Indie game Discord servers

Content pillars:
1. Speed demos — "I built X UI in Y hours using AI"
2. Before/after — ugly placeholder → polished UI
3. Process reveals — showing how AI tools accelerate design
4. Value tips — free game UI advice
5. Behind the scenes — solo dev life, building in public

Tone: authentic, developer-to-developer, not marketing-speak
Never: "Hire me!", "DM for rates", corporate language
Always: specific, visual, relatable to indie devs`;

async function generateSocialContent(topic, platforms = ["twitter", "linkedin", "reddit"]) {
  console.log(`\n🎨 Generating social content for: ${topic}\n`);

  const response = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 4096,
    thinking: { type: "adaptive" },
    system: CONTENT_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Create social media content about: "${topic}"

Generate platform-optimized posts as JSON:
{
  "topic": "${topic}",
  "contentPillar": "which pillar this falls under",
  "posts": {
    "twitter": {
      "main": "tweet text (under 280 chars)",
      "thread": ["tweet 1", "tweet 2", "tweet 3", "tweet 4 (CTA)"],
      "hashtags": ["#gamedev", "#indiedev", etc.],
      "bestPostTime": "day and time to post"
    },
    "linkedin": {
      "text": "full LinkedIn post (300-500 words, professional but personal)",
      "hook": "first line that stops the scroll",
      "hashtags": ["#gamedev", "#freelance", etc.]
    },
    "reddit": {
      "subreddit": "r/gamedev or r/indiegaming or r/gamedesign",
      "title": "post title (descriptive, no clickbait)",
      "body": "post body (helpful, not promotional, 200-400 words)",
      "flairSuggestion": "appropriate flair"
    }
  },
  "repurposedFormats": {
    "tiktokScript": "60-second script for TikTok/YouTube Shorts",
    "newsletterSnippet": "short blurb for email newsletter"
  },
  "visualSuggestion": "what screenshot/video to pair with this content"
}

Make the content genuinely useful and authentic. Include specific numbers, techniques, or insights.
Return ONLY valid JSON.`,
      },
    ],
  });

  let contentJson = "";
  for (const block of response.content) {
    if (block.type === "text") contentJson += block.text;
  }

  contentJson = contentJson.trim();
  if (contentJson.startsWith("```")) {
    contentJson = contentJson.replace(/```json?\n?/g, "").replace(/```$/g, "").trim();
  }

  const content = JSON.parse(contentJson);

  const contentDir = join(ROOT, "business/content");
  mkdirSync(contentDir, { recursive: true });

  const filename = `content-${Date.now()}-${topic.replace(/\s+/g, "-").toLowerCase().substring(0, 30)}.json`;
  writeFileSync(join(contentDir, filename), JSON.stringify(content, null, 2));

  console.log(`✅ Content generated and saved: ${filename}`);
  console.log(`\n🐦 Twitter hook:\n${content.posts.twitter.main}\n`);
  console.log(`💼 LinkedIn hook:\n${content.posts.linkedin.hook}\n`);

  return content;
}

async function generateWeeklyContentCalendar() {
  console.log(`\n📅 Generating 7-day content calendar...\n`);

  const response = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 6000,
    thinking: { type: "adaptive" },
    system: CONTENT_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Create a 7-day social media content calendar for a solo game UI developer.

Goal: Build authority and attract indie game developer clients.
Week theme: "From zero to polished game UI in 30 days"

Portfolio highlight: Naruto mobile game UI (character select, battle HUD, social hub, gacha shop)

For each day, create:
{
  "weeklyCalendar": {
    "theme": "week theme",
    "goal": "what this week achieves for the business",
    "days": [
      {
        "day": "Monday",
        "date": "Day 1",
        "contentPillar": "speed demo | before/after | process | tips | behind-scenes",
        "primaryPlatform": "Twitter or LinkedIn or Reddit",
        "topic": "specific content topic",
        "tweet": "ready-to-post tweet",
        "linkedinPost": "ready-to-post LinkedIn content",
        "redditPost": {
          "subreddit": "r/...",
          "title": "post title",
          "preview": "first 100 words"
        },
        "visualNeeded": "what to screenshot/record from the Naruto game UI",
        "expectedEngagement": "what kind of response to expect",
        "clientAttractionGoal": "how this converts to potential clients"
      }
    ],
    "weeklyKPIs": {
      "followerGrowthTarget": number,
      "leadsFromContent": number,
      "engagementRateTarget": "percentage"
    }
  }
}

Make all content immediately actionable. Each post should be ready to copy-paste.
Return ONLY valid JSON.`,
      },
    ],
  });

  let calJson = "";
  for (const block of response.content) {
    if (block.type === "text") calJson += block.text;
  }

  calJson = calJson.trim();
  if (calJson.startsWith("```")) {
    calJson = calJson.replace(/```json?\n?/g, "").replace(/```$/g, "").trim();
  }

  const calendar = JSON.parse(calJson);

  const contentDir = join(ROOT, "business/content");
  mkdirSync(contentDir, { recursive: true });
  writeFileSync(join(contentDir, `calendar-week-${Date.now()}.json`), JSON.stringify(calendar, null, 2));

  console.log(`✅ 7-day content calendar generated!\n`);
  console.log(`Theme: ${calendar.weeklyCalendar.theme}`);
  console.log(`\nDaily topics:`);
  calendar.weeklyCalendar.days.forEach((d) => {
    console.log(`  ${d.day}: ${d.topic} (${d.primaryPlatform})`);
  });

  return calendar;
}

async function generatePortfolioDescription() {
  console.log(`\n🎮 Generating portfolio descriptions for the Naruto game UI...\n`);

  const response = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 3000,
    thinking: { type: "adaptive" },
    system: CONTENT_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Write compelling portfolio descriptions for a Naruto-themed mobile game UI.

The UI includes:
- Home screen: Clan system, daily missions, news feed with animated character
- Character screen: 2.5D character cards with rarity system, stats display
- Battle screen: Dynamic HUD with chakra meter, health bars, skill slots
- Social screen: Friend system, chat bubbles, online status
- Shop screen: Gacha system, currency display, featured items

For each screen, write:
1. A portfolio description (what it demonstrates technically)
2. A client pitch version (why this matters for their game)
3. A social media caption (engaging, with hashtags)

Output as JSON:
{
  "portfolioDescriptions": {
    "home_screen": { "technical": "...", "clientPitch": "...", "socialCaption": "..." },
    "character_screen": { "technical": "...", "clientPitch": "...", "socialCaption": "..." },
    "battle_screen": { "technical": "...", "clientPitch": "...", "socialCaption": "..." },
    "social_screen": { "technical": "...", "clientPitch": "...", "socialCaption": "..." },
    "shop_screen": { "technical": "...", "clientPitch": "...", "socialCaption": "..." }
  },
  "overallPitch": "3-sentence elevator pitch for the whole portfolio",
  "freelancePlatformBio": "Upwork/Fiverr bio (200 words, keyword-rich)",
  "portfolioTagline": "one-liner tagline"
}

Return ONLY valid JSON.`,
      },
    ],
  });

  let descJson = "";
  for (const block of response.content) {
    if (block.type === "text") descJson += block.text;
  }

  descJson = descJson.trim();
  if (descJson.startsWith("```")) {
    descJson = descJson.replace(/```json?\n?/g, "").replace(/```$/g, "").trim();
  }

  const descriptions = JSON.parse(descJson);

  const contentDir = join(ROOT, "business/content");
  mkdirSync(contentDir, { recursive: true });
  writeFileSync(join(contentDir, "portfolio-descriptions.json"), JSON.stringify(descriptions, null, 2));

  console.log(`✅ Portfolio descriptions generated!\n`);
  console.log(`Tagline: ${descriptions.portfolioTagline}`);
  console.log(`\nElevator pitch:\n${descriptions.overallPitch}\n`);

  return descriptions;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const mode = args[0] || "calendar";

  if (mode === "calendar") {
    generateWeeklyContentCalendar().catch(console.error);
  } else if (mode === "portfolio") {
    generatePortfolioDescription().catch(console.error);
  } else if (mode === "post") {
    const topic = args.slice(1).join(" ") || "How I built a complete game UI in 72 hours using AI";
    generateSocialContent(topic).catch(console.error);
  }
}

export { generateSocialContent, generateWeeklyContentCalendar, generatePortfolioDescription };
