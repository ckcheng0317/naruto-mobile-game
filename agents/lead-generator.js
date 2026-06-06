import Anthropic from "@anthropic-ai/sdk";
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const LEAD_SYSTEM_PROMPT = `You are an expert business development specialist for a one-person game UI development agency.
Your job is to identify and research high-quality leads for mobile game UI development services.

The agency owner specializes in:
- Mobile game UI/UX design (HTML5, CSS3, JavaScript)
- Anime/fantasy-style game interfaces (portfolio: Naruto-themed game UI)
- Rapid prototyping (48-72 hour turnaround)
- AI-assisted asset creation

Target clients are indie game developers and small studios who:
1. Have posted on forums/job boards looking for UI help
2. Have Kickstarter/Indiegogo campaigns for mobile games
3. Are active on Twitter/X talking about their indie game
4. Posted on Reddit (r/gamedev, r/indiegaming, r/unrealengine)
5. Have GitHub repos for mobile games with no UI polish

For each lead, think carefully about:
- Why they specifically need UI help RIGHT NOW
- What their budget likely is based on their project stage
- What angle would resonate most in outreach
- How to personalize the approach

Always output valid JSON arrays only.`;

async function generateLeads(niche = "indie mobile game", count = 10) {
  console.log(`\n🔍 Generating ${count} leads for: ${niche}\n`);

  const response = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 4096,
    thinking: { type: "adaptive" },
    system: LEAD_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Generate ${count} highly realistic, specific leads for the "${niche}" niche.

Each lead should be a plausible indie developer or small studio that would genuinely need game UI development services.

For each lead, create a JSON object with:
{
  "id": "lead_001",
  "name": "Developer/Studio name",
  "platform": "Where to find them (Twitter, Reddit, Fiverr, Upwork, itch.io, etc.)",
  "profileUrl": "realistic URL pattern",
  "gameType": "type of game they're making",
  "currentStage": "prototype/alpha/beta/pre-launch",
  "estimatedBudget": "low ($300-800) | mid ($800-2000) | high ($2000-5000)",
  "painPoint": "specific UI problem they have",
  "personalizedAngle": "why our Naruto-style portfolio would resonate",
  "urgencyIndicators": ["list", "of", "signals", "showing", "they", "need", "help", "now"],
  "contactMethod": "how to reach them",
  "priority": "hot|warm|cold",
  "tags": ["anime", "fantasy", "rpg", etc.]
}

Return ONLY a valid JSON array of ${count} lead objects. No explanation text.`,
      },
    ],
  });

  let leadsJson = "";
  for (const block of response.content) {
    if (block.type === "text") leadsJson += block.text;
  }

  leadsJson = leadsJson.trim();
  if (leadsJson.startsWith("```")) {
    leadsJson = leadsJson.replace(/```json?\n?/g, "").replace(/```$/g, "").trim();
  }

  const newLeads = JSON.parse(leadsJson);

  const dataPath = join(ROOT, "business/leads.json");
  const existing = JSON.parse(readFileSync(dataPath, "utf8"));

  const now = new Date().toISOString();
  const stamped = newLeads.map((lead, i) => ({
    ...lead,
    id: `lead_${Date.now()}_${i}`,
    generatedAt: now,
    status: "new",
    outreachSent: false,
    proposalSent: false,
    replied: false,
    converted: false,
  }));

  existing.leads.push(...stamped);
  existing.lastUpdated = now;
  existing.totalGenerated += stamped.length;

  writeFileSync(dataPath, JSON.stringify(existing, null, 2));

  console.log(`✅ Generated ${stamped.length} leads and saved to business/leads.json\n`);
  console.log("Top leads by priority:");
  stamped
    .filter((l) => l.priority === "hot")
    .slice(0, 3)
    .forEach((l) => {
      console.log(`  🔥 ${l.name} | ${l.gameType} | Budget: ${l.estimatedBudget}`);
      console.log(`     Pain: ${l.painPoint}`);
    });

  return stamped;
}

async function researchLead(lead) {
  console.log(`\n🔬 Deep research on: ${lead.name}\n`);

  const response = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 2048,
    thinking: { type: "adaptive" },
    system: LEAD_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Do a deep analysis of this lead and create a conversion strategy:

Lead: ${JSON.stringify(lead, null, 2)}

Portfolio context: The agency has a Naruto-themed mobile game UI demo showing:
- Character selection screen with 2.5D cards
- Battle HUD with chakra/health bars
- Social hub with chat UI
- Anime-style shop/gacha screen
- Home screen with clan system

Create a detailed JSON object with:
{
  "conversionStrategy": "step by step approach",
  "openingMessage": "first contact message (under 100 words, casual, specific)",
  "valueProposition": "what specifically to offer this lead",
  "priceAnchor": "what price to start conversation at",
  "portfolioPiece": "which part of Naruto UI demo to highlight for them",
  "followUpSequence": ["day 0", "day 3", "day 7"],
  "estimatedClose": "how many days to close",
  "redFlags": ["potential objections"],
  "dealBreakers": ["things to watch out for"]
}

Return ONLY valid JSON.`,
      },
    ],
  });

  let strategyJson = "";
  for (const block of response.content) {
    if (block.type === "text") strategyJson += block.text;
  }

  strategyJson = strategyJson.trim();
  if (strategyJson.startsWith("```")) {
    strategyJson = strategyJson.replace(/```json?\n?/g, "").replace(/```$/g, "").trim();
  }

  return JSON.parse(strategyJson);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const niche = args[0] || "indie mobile RPG game";
  const count = parseInt(args[1]) || 10;

  generateLeads(niche, count).catch(console.error);
}

export { generateLeads, researchLead };
