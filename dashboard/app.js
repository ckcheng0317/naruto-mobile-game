// Dashboard state — loaded from JSON files
let revenueData = null;
let leadsData = null;
let projectsData = null;

const GOAL = 10000;

async function loadData() {
  try {
    const [revRes, leadsRes, projRes] = await Promise.all([
      fetch("../business/revenue-tracker.json"),
      fetch("../business/leads.json"),
      fetch("../business/projects.json"),
    ]);
    revenueData = await revRes.json();
    leadsData = await leadsRes.json();
    projectsData = await projRes.json();
  } catch {
    revenueData = {
      goal: GOAL,
      currentRevenue: 0,
      pendingRevenue: 0,
      startDate: null,
      transactions: [],
      weeklyBreakdown: {
        week1: { target: 2000, actual: 0 },
        week2: { target: 3000, actual: 0 },
        week3: { target: 3000, actual: 0 },
        week4: { target: 2000, actual: 0 },
      },
    };
    leadsData = { leads: [], totalGenerated: 0, totalContacted: 0, totalReplied: 0, totalConverted: 0 };
    projectsData = { projects: [], totalProjects: 0, activeProjects: 0, completedProjects: 0 };
  }
}

function renderRevenue() {
  const current = revenueData.currentRevenue || 0;
  const pending = revenueData.pendingRevenue || 0;
  const pct = Math.min(Math.round((current / GOAL) * 100), 100);

  const startDate = revenueData.startDate ? new Date(revenueData.startDate) : new Date();
  const daysElapsed = Math.floor((Date.now() - startDate) / 86400000);
  const daysRemaining = Math.max(30 - daysElapsed, 0);
  const dailyNeed = daysRemaining > 0 ? Math.round((GOAL - current) / daysRemaining) : 0;

  document.getElementById("current-revenue").textContent = `$${current.toLocaleString()}`;
  document.getElementById("revenue-pct").textContent = `${pct}%`;
  document.getElementById("pending-revenue").textContent = `$${pending.toLocaleString()} pending`;
  document.getElementById("days-remaining").textContent = daysRemaining;
  document.getElementById("daily-need").textContent = `$${dailyNeed.toLocaleString()}/day needed`;
  document.getElementById("progress-bar").style.width = `${pct}%`;

  const wb = revenueData.weeklyBreakdown;
  ["week1", "week2", "week3", "week4"].forEach((week) => {
    const data = wb[week];
    const weekPct = Math.min(Math.round((data.actual / data.target) * 100), 100);
    document.getElementById(`${week}-actual`).textContent = `$${data.actual.toLocaleString()}`;
    document.getElementById(`${week}-bar`).style.width = `${weekPct}%`;
  });
}

function renderLeads() {
  document.getElementById("leads-generated").textContent = leadsData.totalGenerated || 0;
  document.getElementById("leads-contacted").textContent = leadsData.totalContacted || 0;
  document.getElementById("leads-replied").textContent = leadsData.totalReplied || 0;
  document.getElementById("leads-converted").textContent = leadsData.totalConverted || 0;

  const container = document.getElementById("recent-leads");
  const hotLeads = (leadsData.leads || [])
    .filter((l) => l.priority === "hot")
    .slice(0, 5);

  if (hotLeads.length === 0) {
    container.innerHTML = '<p class="text-slate-600 text-sm text-center py-4">No hot leads yet. Run the lead generator.</p>';
    return;
  }

  container.innerHTML = hotLeads.map((lead) => `
    <div class="flex items-center gap-3 p-3 bg-slate-800/30 rounded-lg hover:bg-slate-800/50 transition-colors">
      <div class="w-2 h-2 rounded-full ${lead.priority === 'hot' ? 'bg-red-400' : lead.priority === 'warm' ? 'bg-yellow-400' : 'bg-slate-600'} flex-shrink-0"></div>
      <div class="flex-1 min-w-0">
        <p class="font-medium text-sm truncate">${lead.name}</p>
        <p class="text-slate-500 text-xs truncate">${lead.gameType || lead.platform}</p>
      </div>
      <div class="text-xs text-slate-500 flex-shrink-0">${lead.estimatedBudget?.replace(' ($', ' (')?.replace(')', '') || ''}</div>
      <div class="text-xs px-2 py-0.5 rounded-full ${statusColor(lead.status)}">${lead.status || 'new'}</div>
    </div>
  `).join("");
}

function statusColor(status) {
  const map = {
    new: "bg-slate-700 text-slate-300",
    outreach_ready: "bg-blue-500/10 text-blue-400",
    contacted: "bg-yellow-500/10 text-yellow-400",
    replied: "bg-purple-500/10 text-purple-400",
    proposal_sent: "bg-orange-500/10 text-orange-400",
    converted: "bg-green-500/10 text-green-400",
  };
  return map[status] || "bg-slate-700 text-slate-300";
}

function renderProjects() {
  document.getElementById("proj-total").textContent = projectsData.totalProjects || 0;
  document.getElementById("proj-active").textContent = projectsData.activeProjects || 0;
  document.getElementById("proj-completed").textContent = projectsData.completedProjects || 0;

  const container = document.getElementById("recent-projects");
  const projects = (projectsData.projects || []).slice(-5).reverse();

  if (projects.length === 0) {
    container.innerHTML = '<p class="text-slate-600 text-sm text-center py-4">No projects yet.</p>';
    return;
  }

  container.innerHTML = projects.map((proj) => `
    <div class="flex items-center gap-3 p-3 bg-slate-800/30 rounded-lg">
      <div class="flex-1 min-w-0">
        <p class="font-medium text-sm truncate">${proj.clientName}</p>
        <p class="text-slate-500 text-xs">${proj.recommendedPackage} — $${(proj.recommendedPrice || 0).toLocaleString()}</p>
      </div>
      <div class="text-xs px-2 py-0.5 rounded-full ${statusColor(proj.status)}">${proj.status?.replace(/_/g, ' ') || 'pending'}</div>
    </div>
  `).join("");
}

function renderTransactions() {
  const container = document.getElementById("transactions");
  const txns = (revenueData.transactions || []).slice(-10).reverse();

  if (txns.length === 0) {
    container.innerHTML = '<p class="text-slate-600 text-sm text-center py-4">No transactions yet. Start closing clients!</p>';
    return;
  }

  container.innerHTML = txns.map((t) => `
    <div class="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg">
      <div class="flex items-center gap-3">
        <div class="text-green-400 font-bold mono text-sm">+$${t.amount.toLocaleString()}</div>
        <div>
          <p class="text-sm font-medium">${t.clientName}</p>
          <p class="text-slate-500 text-xs">${t.projectType?.replace(/_/g, ' ')} • ${new Date(t.date).toLocaleDateString()}</p>
        </div>
      </div>
      <div class="text-xs text-slate-600 mono">${t.id}</div>
    </div>
  `).join("");
}

function renderAll() {
  renderRevenue();
  renderLeads();
  renderProjects();
  renderTransactions();
  updateDate();
}

function updateDate() {
  const now = new Date();
  document.getElementById("current-date").textContent = now.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Revenue form
document.getElementById("rev-amount").addEventListener("input", (e) => {
  document.getElementById("rev-btn-amount").textContent = parseFloat(e.target.value || 0).toLocaleString();
});

function addRevenue(e) {
  e.preventDefault();
  const amount = parseFloat(document.getElementById("rev-amount").value);
  const client = document.getElementById("rev-client").value;
  const type = document.getElementById("rev-type").value;

  if (!amount || !client) return;

  const transaction = {
    id: `TXN-${Date.now()}`,
    amount,
    clientName: client,
    projectType: type,
    date: new Date().toISOString(),
    type: "income",
  };

  revenueData.transactions.push(transaction);
  revenueData.currentRevenue = (revenueData.currentRevenue || 0) + amount;

  if (!revenueData.startDate) revenueData.startDate = new Date().toISOString();

  const daysElapsed = Math.floor((Date.now() - new Date(revenueData.startDate)) / 86400000);
  const weekNum = Math.min(Math.ceil((daysElapsed + 1) / 7), 4);
  const weekKey = `week${weekNum}`;
  if (revenueData.weeklyBreakdown[weekKey]) {
    revenueData.weeklyBreakdown[weekKey].actual += amount;
  }

  showToast(`💰 +$${amount.toLocaleString()} from ${client} recorded!`);

  document.getElementById("rev-amount").value = "";
  document.getElementById("rev-client").value = "";
  document.getElementById("rev-btn-amount").textContent = "0";

  renderAll();

  if (revenueData.currentRevenue >= GOAL) {
    setTimeout(() => showToast("🎉🎉🎉 $10,000 GOAL REACHED! You did it!", 5000), 1000);
  }
}

function runAgent(agentName) {
  const statusEl = document.getElementById(`agent-${agentName}-status`);
  if (statusEl) {
    statusEl.className = "w-2 h-2 rounded-full bg-yellow-400 animate-pulse";
  }

  showToast(`🤖 ${agentName} agent running... Check terminal for output.`);

  setTimeout(() => {
    if (statusEl) {
      statusEl.className = "w-2 h-2 rounded-full bg-green-400";
    }
  }, 3000);

  console.log(`To run: npm run ${agentName === 'daily' ? 'daily' : agentName === 'leads' ? 'leads' : agentName === 'content' ? 'content' : agentName}`);
}

function copyPortfolioLink() {
  const link = window.location.href.replace("/dashboard/index.html", "/index.html");
  navigator.clipboard.writeText(link).then(() => {
    showToast("🔗 Portfolio link copied to clipboard!");
  }).catch(() => {
    showToast(`Portfolio: ${link}`);
  });
}

function generateDailyReport() {
  const current = revenueData.currentRevenue || 0;
  const pct = Math.round((current / GOAL) * 100);
  const leads = leadsData.totalGenerated || 0;
  const converted = leadsData.totalConverted || 0;
  const convRate = leads > 0 ? Math.round((converted / leads) * 100) : 0;

  const report = `📊 DAILY BUSINESS REPORT
Revenue: $${current.toLocaleString()} / $10,000 (${pct}%)
Leads: ${leads} generated, ${converted} converted (${convRate}% rate)
Projects: ${projectsData.totalProjects} total, ${projectsData.activeProjects} active
Date: ${new Date().toLocaleDateString()}`;

  navigator.clipboard.writeText(report).then(() => {
    showToast("📋 Daily report copied to clipboard!");
  });
}

function showToast(msg, duration = 3000) {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.className = "fixed bottom-6 right-6 bg-green-500 text-white px-6 py-3 rounded-xl font-medium shadow-lg transition-all duration-300 opacity-100";
  setTimeout(() => {
    toast.className = "fixed bottom-6 right-6 bg-green-500 text-white px-6 py-3 rounded-xl font-medium shadow-lg transition-all duration-300 translate-y-20 opacity-0";
  }, duration);
}

document.querySelectorAll('input[name="payment-type"]').forEach((radio) => {
  radio.addEventListener("change", () => {
    document.querySelectorAll(".payment-type-btn").forEach((btn) => {
      btn.className = "border border-slate-700 rounded-lg px-3 py-2 text-center text-sm cursor-pointer payment-type-btn";
    });
    radio.nextElementSibling.className =
      "border border-orange-500/50 bg-orange-500/5 rounded-lg px-3 py-2 text-center text-sm cursor-pointer payment-type-btn";
  });
});

loadData().then(renderAll);
setInterval(updateDate, 60000);
