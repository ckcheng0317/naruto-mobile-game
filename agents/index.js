#!/usr/bin/env node
/**
 * AI Agent Orchestrator — $10K in 30 Days Business System
 *
 * This orchestrator coordinates all AI agents for the one-person
 * game UI development agency. Run daily for automated lead generation,
 * outreach, content creation, and revenue tracking.
 *
 * Usage:
 *   node agents/index.js              — full daily run
 *   node agents/index.js --mode=daily — daily tasks only
 *   node agents/index.js --mode=leads — generate leads
 *   node agents/index.js --mode=content — create content
 *   node agents/index.js --mode=status — show business status
 */

import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

import { generateLeads } from "./lead-generator.js";
import { generateBatchOutreach } from "./outreach-generator.js";
import { generateWeeklyContentCalendar, generatePortfolioDescription } from "./content-creator.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function loadData(filename) {
  return JSON.parse(readFileSync(join(ROOT, "business", filename), "utf8"));
}

function saveData(filename, data) {
  data.lastUpdated = new Date().toISOString();
  writeFileSync(join(ROOT, "business", filename), JSON.stringify(data, null, 2));
}

function showStatus() {
  const revenue = loadData("revenue-tracker.json");
  const leads = loadData("leads.json");
  const projects = loadData("projects.json");

  const daysElapsed = revenue.startDate
    ? Math.floor((Date.now() - new Date(revenue.startDate)) / 86400000)
    : 0;
  const daysRemaining = 30 - daysElapsed;
  const progressPct = Math.round((revenue.currentRevenue / revenue.goal) * 100);
  const dailyTarget = daysRemaining > 0
    ? Math.round((revenue.goal - revenue.currentRevenue) / daysRemaining)
    : 0;

  console.log("\n" + "═".repeat(60));
  console.log("  💰 $10K IN 30 DAYS — BUSINESS STATUS");
  console.log("═".repeat(60));
  console.log(`  Revenue:    $${revenue.currentRevenue.toLocaleString()} / $${revenue.goal.toLocaleString()} (${progressPct}%)`);
  console.log(`  Pending:    $${revenue.pendingRevenue.toLocaleString()}`);
  console.log(`  Timeline:   Day ${daysElapsed} of 30 | ${daysRemaining} days left`);
  console.log(`  Daily need: $${dailyTarget}/day to hit goal`);
  console.log("");
  console.log(`  Leads:      ${leads.totalGenerated} generated | ${leads.totalContacted} contacted`);
  console.log(`              ${leads.totalReplied} replied | ${leads.totalConverted} converted`);
  console.log("");
  console.log(`  Projects:   ${projects.totalProjects} total | ${projects.activeProjects} active`);
  console.log(`              ${projects.completedProjects} completed`);
  console.log("");

  const weeklyStatus = Object.entries(revenue.weeklyBreakdown).map(([week, data]) => {
    const pct = Math.round((data.actual / data.target) * 100);
    const bar = "█".repeat(Math.floor(pct / 10)) + "░".repeat(10 - Math.floor(pct / 10));
    return `  ${week.toUpperCase()}: [${bar}] $${data.actual}/$${data.target}`;
  });
  console.log(weeklyStatus.join("\n"));
  console.log("═".repeat(60) + "\n");

  return { revenue, leads, projects, daysRemaining, progressPct };
}

async function runDailyOrchestration() {
  const revenue = loadData("revenue-tracker.json");

  if (!revenue.startDate) {
    revenue.startDate = new Date().toISOString();
    saveData("revenue-tracker.json", revenue);
    console.log("🚀 Day 1 — Business started!\n");
  }

  const status = showStatus();

  console.log("🤖 Running daily AI agent tasks...\n");

  const tasks = [];

  console.log("📊 Task 1: Analyzing business situation...\n");
  const analysis = await analyzeBusinessSituation(status);
  console.log(`   Focus today: ${analysis.todayFocus}`);
  console.log(`   Priority action: ${analysis.priorityAction}\n`);

  console.log("🔍 Task 2: Generating leads...");
  tasks.push(
    generateLeads(analysis.bestNicheToday, 8)
      .then((leads) => console.log(`   ✅ Generated ${leads.length} leads`))
      .catch((e) => console.error(`   ❌ Lead gen failed: ${e.message}`))
  );

  console.log("✉️  Task 3: Generating outreach messages...");
  tasks.push(
    generateBatchOutreach(3)
      .then((results) => console.log(`   ✅ Generated outreach for ${results.length} leads`))
      .catch((e) => console.error(`   ❌ Outreach gen failed: ${e.message}`))
  );

  const leads = loadData("leads.json");
  const isMonday = new Date().getDay() === 1;
  if (isMonday || leads.totalGenerated === 0) {
    console.log("📅 Task 4: Creating content calendar...");
    tasks.push(
      generateWeeklyContentCalendar()
        .then(() => console.log("   ✅ Content calendar created"))
        .catch((e) => console.error(`   ❌ Content creation failed: ${e.message}`))
    );
  }

  await Promise.allSettled(tasks);

  console.log("\n📋 Daily action checklist:");
  console.log(analysis.dailyChecklist.map((item) => `  ☐ ${item}`).join("\n"));
  console.log("\n💡 Today's tip:", analysis.tipOfDay);
  console.log("\n✅ Daily orchestration complete!\n");
}

async function analyzeBusinessSituation(status) {
  const response = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 2000,
    thinking: { type: "adaptive" },
    messages: [
      {
        role: "user",
        content: `You are a business strategist analyzing a solo game UI developer's $10K/30-day challenge.

Current situation:
- Revenue: $${status.revenue.currentRevenue} / $10,000 (${status.progressPct}%)
- Days remaining: ${status.daysRemaining}
- Leads generated: ${status.leads.totalGenerated}
- Leads converted: ${status.leads.totalConverted}
- Active projects: ${status.projects.activeProjects}

Services offered: Mobile game UI development, HTML5 prototypes, character design
Portfolio: Naruto-themed game UI (live demo)
Pricing: $500-$3,000 per project

Based on this situation, provide a JSON strategy for today:
{
  "todayFocus": "one sentence — what to focus on today",
  "priorityAction": "the single most important action to take",
  "bestNicheToday": "best indie dev niche to target (e.g. 'anime mobile RPG', 'game jam participants', 'Kickstarter game campaigns')",
  "dailyChecklist": [
    "actionable task 1",
    "actionable task 2",
    "actionable task 3",
    "actionable task 4",
    "actionable task 5"
  ],
  "tipOfDay": "one tactical tip for closing clients faster",
  "revenueStrategy": "how to realistically hit today's revenue target"
}

Return ONLY valid JSON.`,
      },
    ],
  });

  let json = "";
  for (const block of response.content) {
    if (block.type === "text") json += block.text;
  }

  json = json.trim();
  if (json.startsWith("```")) {
    json = json.replace(/```json?\n?/g, "").replace(/```$/g, "").trim();
  }

  return JSON.parse(json);
}

async function addRevenue(amount, clientName, projectType) {
  const revenue = loadData("revenue-tracker.json");
  const projects = loadData("projects.json");

  const transaction = {
    id: `TXN-${Date.now()}`,
    amount,
    clientName,
    projectType,
    date: new Date().toISOString(),
    type: "income",
  };

  revenue.transactions.push(transaction);
  revenue.currentRevenue += amount;

  const daysElapsed = revenue.startDate
    ? Math.floor((Date.now() - new Date(revenue.startDate)) / 86400000)
    : 0;

  const weekNum = Math.min(Math.ceil((daysElapsed + 1) / 7), 4);
  const weekKey = `week${weekNum}`;
  if (revenue.weeklyBreakdown[weekKey]) {
    revenue.weeklyBreakdown[weekKey].actual += amount;
  }

  saveData("revenue-tracker.json", revenue);

  const projectEntry = projects.projects.find((p) => p.clientName === clientName);
  if (projectEntry) {
    projectEntry.status = amount >= projectEntry.recommendedPrice ? "completed" : "partial_payment";
    projectEntry.paidAmount = (projectEntry.paidAmount || 0) + amount;
    projects.completedProjects = projects.projects.filter((p) => p.status === "completed").length;
    saveData("projects.json", projects);
  }

  const progress = Math.round((revenue.currentRevenue / revenue.goal) * 100);
  console.log(`\n💰 Revenue recorded: +$${amount} from ${clientName}`);
  console.log(`   Total: $${revenue.currentRevenue.toLocaleString()} / $10,000 (${progress}%)\n`);

  if (revenue.currentRevenue >= revenue.goal) {
    console.log("🎉🎉🎉 GOAL REACHED! $10,000 USD in 30 days! 🎉🎉🎉\n");
  }

  return transaction;
}

const args = process.argv.slice(2);
const mode = args.find((a) => a.startsWith("--mode="))?.split("=")[1] || "daily";

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("❌ Missing ANTHROPIC_API_KEY. Copy .env.example to .env and add your key.");
    process.exit(1);
  }

  switch (mode) {
    case "status":
      showStatus();
      break;
    case "leads":
      generateLeads("indie mobile RPG game", 10).catch(console.error);
      break;
    case "content":
      generateWeeklyContentCalendar().catch(console.error);
      break;
    case "portfolio":
      generatePortfolioDescription().catch(console.error);
      break;
    case "add-revenue": {
      const amount = parseFloat(args.find((a) => a.startsWith("--amount="))?.split("=")[1] || 0);
      const client = args.find((a) => a.startsWith("--client="))?.split("=")[1] || "Unknown";
      const type = args.find((a) => a.startsWith("--type="))?.split("=")[1] || "game_ui";
      addRevenue(amount, client, type).catch(console.error);
      break;
    }
    case "daily":
    default:
      runDailyOrchestration().catch(console.error);
  }
}

export { runDailyOrchestration, showStatus, addRevenue, analyzeBusinessSituation };
