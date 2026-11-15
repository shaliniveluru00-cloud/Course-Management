// Run: node profile_pages.mjs   (needs: npm i puppeteer-core lighthouse; backend on :8000; 'npm run build' then 'npx vite preview --port 5175')
import puppeteer from "puppeteer-core";

const CHROME = process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const BASE = "http://127.0.0.1:5175";
const API = "http://127.0.0.1:8000";

const users = {
  student: {
    username: "student001", password: "Stu@2026_001", role: "STUDENT",
    pages: ["Dashboard", "My Courses", "Assignments", "Grades", "Schedule", "Announcements", "Help & Contact"],
  },
  faculty: {
    username: "faculty09", password: "Fac@2026_09", role: "FACULTY",
    pages: ["Dashboard", "My Courses", "Students", "Enrollment Requests", "Assignments", "Grades", "Schedule", "Reports", "Help & Contact"],
  },
};

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--no-sandbox"] });
const out = {};

for (const [name, u] of Object.entries(users)) {
  const res = await fetch(`${API}/api/auth/login/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: u.username, password: u.password, role: u.role }),
  });
  const login = await res.json();

  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.setViewport({ width: 1366, height: 800 });
  await page.evaluateOnNewDocument((d) => {
    localStorage.setItem("token", d.access);
    localStorage.setItem("refresh", d.refresh);
    localStorage.setItem("user", JSON.stringify(d.user));
  }, login);

  let log = [];
  page.on("request", (r) => {
    const u = r.url(); if ((u.startsWith("http://localhost:8000") || u.startsWith(API)) && r.method() !== "OPTIONS") log.push(r.method() + " " + u.replace("http://localhost:8000", "").replace(API, ""));
  });

  const t0 = Date.now();
  await page.goto(`${BASE}/${name}`, { waitUntil: "networkidle0" });
  const firstLoad = Date.now() - t0;
  const nav = await page.evaluate(() => {
    const n = performance.getEntriesByType("navigation")[0];
    const fcp = performance.getEntriesByName("first-contentful-paint")[0];
    return {
      domContentLoaded: Math.round(n.domContentLoadedEventEnd),
      load: Math.round(n.loadEventEnd),
      fcp: fcp ? Math.round(fcp.startTime) : null,
    };
  });
  out[name] = { firstLoadMs: firstLoad, nav, firstLoadApiCalls: log.slice(), pages: {} };

  for (const label of u.pages) {
    log = [];
    const m0 = await page.metrics();
    let clicked = false;
    for (const b of await page.$$(".sidebar-link")) {
      const txt = await b.evaluate((el) => el.textContent.trim());
      if (txt === label) { await b.click(); clicked = true; break; }
    }
    await page.waitForNetworkIdle({ idleTime: 400, timeout: 8000 }).catch(() => {});
    await new Promise((r) => setTimeout(r, 700));
    const m1 = await page.metrics();
    const counts = {};
    log.forEach((x) => { counts[x] = (counts[x] || 0) + 1; });
    out[name].pages[label] = {
      clicked,
      apiCalls: log.length,
      duplicates: Object.entries(counts).filter(([, c]) => c > 1).map(([k, c]) => `${k} x${c}`),
      urls: Object.keys(counts),
      scriptMs: Math.round((m1.ScriptDuration - m0.ScriptDuration) * 1000),
      layoutMs: Math.round((m1.LayoutDuration - m0.LayoutDuration) * 1000),
      styleMs: Math.round((m1.RecalcStyleDuration - m0.RecalcStyleDuration) * 1000),
      domNodes: m1.Nodes,
      heapMB: +(m1.JSHeapUsedSize / 1048576).toFixed(1),
    };
  }
  await ctx.close();
}
await browser.close();
console.log(JSON.stringify(out, null, 1));
