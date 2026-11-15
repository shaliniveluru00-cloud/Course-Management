// Run: node profile_lighthouse.mjs   (needs: npm i puppeteer-core lighthouse; backend on :8000; 'npm run build' then 'npx vite preview --port 5175')
import puppeteer from "puppeteer-core";
import lighthouse from "lighthouse";
import desktopConfig from "lighthouse/core/config/desktop-config.js";

const CHROME = process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const BASE = "http://127.0.0.1:5175";
const API = "http://127.0.0.1:8000";

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: true, args: ["--no-sandbox", "--remote-debugging-port=9333"],
});

async function getLogin(username, password, role) {
  const r = await fetch(`${API}/api/auth/login/`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password, role }),
  });
  return r.json();
}

const targets = [
  { name: "Login page (logged out)", path: "/login", login: null },
  { name: "Student dashboard", path: "/student", login: await getLogin("student001", "Stu@2026_001", "STUDENT") },
  { name: "Faculty dashboard", path: "/faculty", login: await getLogin("faculty09", "Fac@2026_09", "FACULTY") },
];

const rows = [];
for (const t of targets) {
  const page = await browser.newPage();
  await page.goto(`${BASE}/login`, { waitUntil: "load" });
  await page.evaluate((d) => {
    localStorage.clear();
    if (d) {
      localStorage.setItem("token", d.access);
      localStorage.setItem("refresh", d.refresh);
      localStorage.setItem("user", JSON.stringify(d.user));
    }
  }, t.login);
  const result = await lighthouse(`${BASE}${t.path}`, {
    port: 9333, output: "json", logLevel: "error", disableStorageReset: true,
    onlyCategories: ["performance", "accessibility", "best-practices"],
  }, desktopConfig);
  const lhr = result.lhr;
  const sc = (k) => Math.round(lhr.categories[k].score * 100);
  const a = lhr.audits;
  rows.push({
    page: t.name,
    finalUrl: lhr.finalDisplayedUrl.replace(BASE, ""),
    performance: sc("performance"), accessibility: sc("accessibility"), bestPractices: sc("best-practices"),
    FCP: a["first-contentful-paint"].displayValue, LCP: a["largest-contentful-paint"].displayValue,
    TBT: a["total-blocking-time"].displayValue, CLS: a["cumulative-layout-shift"].displayValue,
    failedAudits: Object.values(a).filter((x) => x.score !== null && x.score < 0.9 && x.scoreDisplayMode === "binary" || (x.score !== null && x.score < 0.9 && x.scoreDisplayMode === "numeric"))
      .map((x) => x.id + " (" + Math.round((x.score ?? 0) * 100) + ")").slice(0, 8),
  });
  await page.close();
}
await browser.close();
console.log(JSON.stringify(rows, null, 1));
