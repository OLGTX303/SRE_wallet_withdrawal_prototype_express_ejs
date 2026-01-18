const express = require("express");
const path = require("path");
const session = require("express-session");
const https = require("https");

const app = express();
const PORT = process.env.PORT || 3000;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use("/public", express.static(path.join(__dirname, "public")));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "prototype-secret-change-me",
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 1000 * 60 * 60 },
  })
);

// --- Helpers ---
function formatRM(n) {
  try {
    return "RM " + Number(n).toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  } catch (e) {
    return "RM 0.00";
  }
}

function ensureState(req) {
  if (!req.session.state) {
    req.session.state = {
      userId: "CUST-1001",
      balance: 1750.75,
      dailyLimit: 3000,
      usedToday: 400,
      twoFAEnabled: false,
      blockedBankAccounts: [],
      linkedBanks: [
        { id: "mbb", name: "Maybank", acctMasked: "**** 1234" },
        { id: "cimb", name: "CIMB", acctMasked: "**** 8891" },
      ],
      products: [
        { id: "etiqa-safe", name: "Etiqa Secure Growth", minAmount: 100, maxAmount: 5000, eligibleByDefault: true, riskTag: "Low" },
        { id: "etiqa-balance", name: "Etiqa Balanced Income", minAmount: 300, maxAmount: 8000, eligibleByDefault: true, riskTag: "Medium" },
        { id: "etiqa-venture", name: "Etiqa Venture Plus", minAmount: 1000, maxAmount: 15000, eligibleByDefault: false, riskTag: "High" },
      ],
      selectedBankId: "mbb",
      lastWithdrawal: null,
      lastReinvest: null,
      investedAmount: 300,
      alerts: [],
      auditLogs: [],
    };
  } else if (typeof req.session.state.twoFAEnabled === "undefined") {
    req.session.state.twoFAEnabled = false;
  }
  if (typeof req.session.state.investedAmount === "undefined") {
    req.session.state.investedAmount = 300;
  }
  if (!Array.isArray(req.session.state.products) || req.session.state.products.length === 0) {
    req.session.state.products = [
      { id: "etiqa-safe", name: "Etiqa Secure Growth", minAmount: 100, maxAmount: 5000, eligibleByDefault: true, riskTag: "Low" },
      { id: "etiqa-balance", name: "Etiqa Balanced Income", minAmount: 300, maxAmount: 8000, eligibleByDefault: true, riskTag: "Medium" },
      { id: "etiqa-venture", name: "Etiqa Venture Plus", minAmount: 1000, maxAmount: 15000, eligibleByDefault: false, riskTag: "High" },
    ];
  }
  if (!Array.isArray(req.session.state.blockedBankAccounts)) {
    req.session.state.blockedBankAccounts = [];
  }
  if (!req.session.withdrawal) {
    req.session.withdrawal = {
      amount: "",
      bankId: req.session.state.selectedBankId,
      note: "",
      ref: null,
      status: null,
      screening: null,
    };
  }
  if (!req.session.reinvest) {
    const firstProduct = req.session.state.products && req.session.state.products[0];
    req.session.reinvest = {
      amount: "",
      productId: firstProduct ? firstProduct.id : "",
      ref: null,
      status: null,
      eligibility: null,
      screening: null,
      attemptLogged: false,
      notEligibleReason: "",
    };
  }
}

function getScenario(req) {
  // scenario controls branching for demo purposes:
  // success | insufficient | noteligible | hold | blocked | limit | nack | timeout
  // default = success
  const raw = req.query.scenario || req.session.scenario || "success";
  const s = String(raw).split(",")[0].toLowerCase();
  req.session.scenario = s;
  return s;
}

function newRef() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 10; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return "WD-" + out;
}

function newReinvestRef() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 10; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return "RI-" + out;
}

function findBank(state, bankId) {
  return state.linkedBanks.find((b) => b.id === bankId) || state.linkedBanks[0];
}

function findProduct(state, productId) {
  return (state.products || []).find((p) => p.id === productId) || (state.products || [])[0];
}

function resetWithdrawal(req) {
  ensureState(req);
  req.session.withdrawal = {
    amount: "",
    bankId: req.session.state.selectedBankId,
    note: "",
    ref: null,
    status: null,
    screening: null,
  };
}

function resetReinvest(req) {
  ensureState(req);
  const firstProduct = req.session.state.products && req.session.state.products[0];
  req.session.reinvest = {
    amount: "",
    productId: firstProduct ? firstProduct.id : "",
    ref: null,
    status: null,
    eligibility: null,
    screening: null,
    attemptLogged: false,
    notEligibleReason: "",
  };
}

function logAudit(req, action, outcome, meta = {}) {
  ensureState(req);
  req.session.state.auditLogs.unshift({
    userId: req.session.state.userId,
    ts: new Date().toISOString(),
    action,
    outcome,
    meta,
    signature: "mock-signed",
  });
}

// --- Global locals ---
app.use((req, res, next) => {
  ensureState(req);
  res.locals.formatRM = formatRM;
  res.locals.state = req.session.state;
  res.locals.withdrawal = req.session.withdrawal;
  res.locals.reinvest = req.session.reinvest;
  res.locals.scenario = getScenario(req);
  res.locals.bank = findBank(req.session.state, req.session.withdrawal.bankId);
  res.locals.product = findProduct(req.session.state, req.session.reinvest.productId);
  res.locals.page = "";
  next();
});

// --- Routes map (see README for full flow) ---
app.get("/", (req, res) => res.redirect("/dashboard"));
app.get("/reset", (req, res) => {
  resetWithdrawal(req);
  resetReinvest(req);
  res.redirect("/dashboard");
});

// Dashboard
app.get("/dashboard", (req, res) => {
  res.locals.page = "Dashboard";
  res.render("dashboard");
});

// --- Reinvest flow (UC-008) ---
app.get("/reinvest", (req, res) => {
  res.locals.page = "Reinvest Funds";
  res.render("reinvest");
});

app.post("/reinvest", (req, res) => {
  const { amount, productId } = req.body;
  req.session.reinvest.amount = String(amount || "").trim();
  req.session.reinvest.productId = String(productId || req.session.reinvest.productId || "").trim();
  req.session.reinvest.ref = null;
  req.session.reinvest.status = null;
  req.session.reinvest.eligibility = null;
  req.session.reinvest.screening = null;
  req.session.reinvest.attemptLogged = false;
  req.session.reinvest.notEligibleReason = "";
  res.redirect("/reinvest/confirm");
});

app.get("/reinvest/confirm", (req, res) => {
  res.locals.page = "Review & Confirm";
  res.render("reinvest_confirm", { error: null });
});

app.post("/reinvest/confirm", (req, res) => {
  const amount = Number(req.session.reinvest.amount);
  const product = findProduct(req.session.state, req.session.reinvest.productId);
  if (!req.session.reinvest.amount || Number.isNaN(amount) || amount <= 0) {
    res.locals.page = "Review & Confirm";
    return res.status(400).render("reinvest_confirm", { error: "Please enter a valid reinvest amount." });
  }
  if (!product) {
    res.locals.page = "Review & Confirm";
    return res.status(400).render("reinvest_confirm", { error: "Please select a valid product." });
  }
  if (getScenario(req) === "insufficient" || amount > req.session.state.balance) {
    return res.redirect("/reinvest/insufficient");
  }
  if (!req.session.reinvest.attemptLogged) {
    req.session.reinvest.attemptLogged = true;
    logAudit(req, "REINVEST_ATTEMPT", "submitted", {
      productId: product.id,
      amount,
    });
  }
  return res.redirect("/reinvest/eligibility");
});

app.get("/reinvest/insufficient", (req, res) => {
  res.locals.page = "Insufficient Balance";
  if (req.session.reinvest.status !== "insufficient") {
    req.session.reinvest.status = "insufficient";
    logAudit(req, "REINVEST_REJECTED", "insufficient", {
      productId: req.session.reinvest.productId,
      amount: req.session.reinvest.amount,
      balance: req.session.state.balance,
    });
  }
  res.render("reinvest_insufficient");
});

app.get("/reinvest/eligibility", (req, res) => {
  res.locals.page = "Eligibility Check";
  res.render("reinvest_eligibility");
});

app.get("/reinvest/eligibility/result", (req, res) => {
  const scenario = getScenario(req);
  const product = findProduct(req.session.state, req.session.reinvest.productId);
  const amount = Number(req.session.reinvest.amount);
  if (!req.session.reinvest.attemptLogged) {
    req.session.reinvest.attemptLogged = true;
    logAudit(req, "REINVEST_ATTEMPT", "submitted", {
      productId: product ? product.id : "",
      amount,
    });
  }
  let notEligibleReason = "";
  if (scenario === "noteligible") {
    notEligibleReason = "Scenario forces not eligible.";
  } else if (!product) {
    notEligibleReason = "Selected product not found.";
  } else if (!product.eligibleByDefault) {
    notEligibleReason = "Product eligibility rules not met.";
  } else if (Number.isNaN(amount) || amount < product.minAmount || amount > product.maxAmount) {
    notEligibleReason = `Amount must be between RM ${product.minAmount} and RM ${product.maxAmount}.`;
  }
  if (notEligibleReason) {
    req.session.reinvest.status = "not_eligible";
    req.session.reinvest.notEligibleReason = notEligibleReason;
    logAudit(req, "REINVEST_REJECTED", "not_eligible", {
      productId: product ? product.id : "",
      amount,
      reason: notEligibleReason,
    });
    return res.redirect("/reinvest/not-eligible");
  }
  req.session.reinvest.eligibility = "passed";
  return res.redirect("/reinvest/screening");
});

app.get("/reinvest/not-eligible", (req, res) => {
  res.locals.page = "Not Eligible";
  res.render("reinvest_not_eligible");
});

app.get("/reinvest/screening", (req, res) => {
  res.locals.page = "Security Check";
  res.render("reinvest_screening");
});

app.get("/reinvest/screening/result", (req, res) => {
  const scenario = getScenario(req);
  if (scenario === "blocked" || scenario === "hold") {
    return res.redirect("/reinvest/blocked");
  }
  return res.redirect("/reinvest/success");
});

app.get("/reinvest/blocked", (req, res) => {
  res.locals.page = "Blocked";
  const ref = req.session.reinvest.ref || newReinvestRef();
  req.session.reinvest.ref = ref;
  if (req.session.reinvest.status !== "blocked") {
    req.session.reinvest.status = "blocked";
    logAudit(req, "REINVEST_BLOCKED", "screening_blocked", {
      productId: req.session.reinvest.productId,
      amount: req.session.reinvest.amount,
      ref,
    });
  }
  req.session.state.alerts.unshift({
    type: "Blocked",
    title: "Reinvestment Blocked",
    detail: `Reinvestment ${ref} was blocked and sent for finance review.`,
    ts: new Date().toISOString(),
  });
  res.render("reinvest_blocked");
});

app.get("/reinvest/success", (req, res) => {
  res.locals.page = "Receipt";
  const amount = Number(req.session.reinvest.amount);
  const safeAmount = Number.isNaN(amount) ? 0 : amount;
  const product = findProduct(req.session.state, req.session.reinvest.productId);
  const ref = req.session.reinvest.ref || newReinvestRef();
  req.session.reinvest.ref = ref;
  if (req.session.reinvest.status !== "success") {
    req.session.state.balance = Math.max(0, req.session.state.balance - safeAmount);
    req.session.state.usedToday = req.session.state.usedToday + safeAmount;
    req.session.state.investedAmount = (req.session.state.investedAmount || 0) + safeAmount;
    req.session.reinvest.status = "success";
    req.session.state.lastReinvest = {
      ref,
      amount: safeAmount,
      product,
      ts: new Date().toISOString(),
      status: "Completed",
    };
    logAudit(req, "REINVEST_SUCCESS", "completed", {
      productId: product ? product.id : "",
      amount: safeAmount,
      ref,
    });
  }
  res.render("reinvest_success");
});

// Admin audit log (mock)
app.get("/admin/audit", (req, res) => {
  res.locals.page = "Audit Logs";
  res.render("admin_audit", { exported: req.query.export === "1" });
});

// Backward compatibility redirects (Withdraw -> Reinvest)
app.get("/withdraw", (req, res) => res.redirect("/reinvest?scenario=" + getScenario(req)));
app.post("/withdraw", (req, res) => res.redirect("/reinvest?scenario=" + getScenario(req)));
app.get("/withdraw/confirm", (req, res) => res.redirect("/reinvest/confirm?scenario=" + getScenario(req)));
app.post("/withdraw/confirm", (req, res) => res.redirect("/reinvest/confirm?scenario=" + getScenario(req)));
app.get("/withdraw/insufficient", (req, res) => res.redirect("/reinvest/insufficient?scenario=" + getScenario(req)));
app.get("/withdraw/screening", (req, res) => res.redirect("/reinvest/screening?scenario=" + getScenario(req)));
app.get("/withdraw/screening/result", (req, res) => res.redirect("/reinvest/screening/result?scenario=" + getScenario(req)));
app.get("/withdraw/under-review", (req, res) => res.redirect("/reinvest/blocked?scenario=" + getScenario(req)));
app.get("/withdraw/blocked", (req, res) => res.redirect("/reinvest/blocked?scenario=" + getScenario(req)));
app.get("/withdraw/limit-check", (req, res) => res.redirect("/reinvest/eligibility?scenario=" + getScenario(req)));
app.get("/withdraw/limit-check/result", (req, res) => res.redirect("/reinvest/eligibility/result?scenario=" + getScenario(req)));
app.get("/withdraw/limit-exceeded", (req, res) => res.redirect("/reinvest/not-eligible?scenario=" + getScenario(req)));
app.get("/withdraw/bank-processing", (req, res) => res.redirect("/reinvest/screening?scenario=" + getScenario(req)));
app.get("/withdraw/bank-processing/result", (req, res) => res.redirect("/reinvest/screening/result?scenario=" + getScenario(req)));
app.get("/withdraw/bank-declined", (req, res) => res.redirect("/reinvest/blocked?scenario=" + getScenario(req)));
app.get("/withdraw/timeout", (req, res) => res.redirect("/reinvest/blocked?scenario=" + getScenario(req)));
app.get("/withdraw/success", (req, res) => res.redirect("/reinvest/success?scenario=" + getScenario(req)));

// Security tips / secure account (linked from blocked)
app.get("/security/tips", (req, res) => {
  res.locals.page = "Secure Your Account";
  res.render("security_tips");
});

app.get("/security/2fa", (req, res) => {
  res.locals.page = "Enable 2FA";
  res.render("security_2fa");
});

app.post("/security/2fa/enable", (req, res) => {
  req.session.state.twoFAEnabled = true;
  res.redirect("/security/2fa");
});

app.post("/security/2fa/disable", (req, res) => {
  req.session.state.twoFAEnabled = false;
  res.redirect("/security/2fa");
});

app.get("/security/linked-banks", (req, res) => {
  res.locals.page = "Linked Bank Accounts";
  res.render("security_banks");
});

app.post("/security/linked-banks/remove", (req, res) => {
  const { bankId } = req.body;
  if (req.session.state.linkedBanks.length <= 1) {
    return res.redirect("/security/linked-banks");
  }
  if (bankId) {
    req.session.state.linkedBanks = req.session.state.linkedBanks.filter((b) => b.id !== bankId);
    if (req.session.state.selectedBankId === bankId) {
      req.session.state.selectedBankId = req.session.state.linkedBanks[0]?.id || "";
    }
    if (req.session.withdrawal.bankId === bankId) {
      req.session.withdrawal.bankId = req.session.state.selectedBankId;
    }
  }
  res.redirect("/security/linked-banks");
});

app.get("/security/limits", (req, res) => {
  res.locals.page = "Set Safer Limits";
  res.render("security_limits", { error: null, newLimit: "" });
});

app.post("/security/limits", (req, res) => {
  res.locals.page = "Set Safer Limits";
  const limit = Number(req.body.limit);
  if (!req.body.limit || Number.isNaN(limit) || limit < req.session.state.usedToday) {
    return res.status(400).render("security_limits", {
      error: "Limit must be a number and at least the amount used today.",
      newLimit: req.body.limit || "",
    });
  }
  req.session.state.dailyLimit = limit;
  return res.render("security_limits", { error: null, newLimit: "" });
});

app.get("/security/report", (req, res) => {
  res.locals.page = "Report Suspicious Activity";
  res.render("security_report", { error: null, submitted: null });
});

app.post("/security/report", (req, res) => {
  res.locals.page = "Report Suspicious Activity";
  const { category, ref, message } = req.body;
  if (!category || !message) {
    return res.status(400).render("security_report", {
      error: "Please select a category and provide details.",
      submitted: null,
    });
  }
  const caseId = "RP-" + newRef().replace("WD-", "");
  req.session.state.alerts.unshift({
    type: "Report",
    title: "User Report Submitted",
    detail: `Category: ${category}${ref ? " | Ref: " + ref : ""}`,
    ts: new Date().toISOString(),
  });
  return res.render("security_report", {
    error: null,
    submitted: { caseId },
  });
});

// --- Misuse flow: Fraudulent withdrawal attempt ---
app.get("/misuse/fraud-withdrawal", (req, res) => {
  res.locals.page = "Fraud Attempt (Demo)";
  res.render("misuse_start");
});

// Add new bank (optional mock)
app.get("/misuse/add-bank", (req, res) => {
  res.locals.page = "Add Bank Account";
  res.render("add_bank", { error: null });
});

async function checkMuleAccount(bankAccount) {
  const url = "https://semakmule.rmp.gov.my/api/mule/get_search_data.php";
  const payload = {
    data: {
      category: "bank",
      bankAccount,
      telNo: "",
      companyName: "",
      captcha: "",
    },
  };
  try {
    let data = null;
    if (process.env.SEMAKMULE_INSECURE === "1") {
      data = await new Promise((resolve, reject) => {
        const req = https.request(
          url,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            rejectUnauthorized: false,
          },
          (res) => {
            let body = "";
            res.on("data", (chunk) => { body += chunk; });
            res.on("end", () => {
              try {
                resolve(JSON.parse(body));
              } catch (err) {
                reject(err);
              }
            });
          }
        );
        req.on("error", reject);
        req.write(JSON.stringify(payload));
        req.end();
      });
    } else {
      const fetchFn = typeof fetch === "function" ? fetch : null;
      if (!fetchFn) {
        console.error("[semakmule] fetch unavailable in this runtime");
        return { ok: false, error: "Network check unavailable." };
      }
      const resp = await fetchFn(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      data = await resp.json();
    }
    let reportCount = 0;
    if (data && data.status === 1 && Array.isArray(data.table_data) && data.table_data[0]) {
      reportCount = Number(data.table_data[0][1] || 0);
    }
    return { ok: true, reportCount, raw: data };
  } catch (err) {
    console.error("[semakmule] request failed:", err && err.message ? err.message : err);
    return { ok: false, error: "Unable to verify account right now." };
  }
}

app.post("/misuse/add-bank", async (req, res) => {
  const { bankName, accountNo } = req.body;
  if (!bankName || !accountNo || String(accountNo).replace(/\D/g, "").length < 8) {
    res.locals.page = "Add Bank Account";
    return res.status(400).render("add_bank", { error: "Please enter a valid bank name and account number." });
  }
  const scenario = getScenario(req);
  const accountDigits = String(accountNo).replace(/\D/g, "");
  if (req.session.state.blockedBankAccounts.includes(accountDigits)) {
    res.locals.page = "Add Bank Account";
    return res.status(400).render("add_bank", {
      error: "This bank account is blocked and cannot be linked. Please contact customer service.",
    });
  }
  const check = await checkMuleAccount(accountDigits);
  let reportCount = check.ok ? check.reportCount : 0;
  if (!check.ok) {
    reportCount = accountDigits.endsWith("9999") || accountDigits.endsWith("8888") ? 1 : 0;
  }
  if (reportCount > 0) {
    if (!req.session.state.blockedBankAccounts.includes(accountDigits)) {
      req.session.state.blockedBankAccounts.push(accountDigits);
    }
    res.locals.page = "Add Bank Account";
    return res.status(400).render("add_bank", {
      error: `This bank account has been reported (${reportCount} time(s)). Please contact customer service.`,
    });
  }
  // Add as new linked bank (masked)
  const masked = "**** " + accountDigits.slice(-4);
  const id = "new" + Math.floor(Math.random() * 10000);
  req.session.state.linkedBanks.unshift({ id, name: bankName.trim(), acctMasked: masked });
  req.session.withdrawal.bankId = id;
  req.session.withdrawal.amount = "5000";
  req.session.withdrawal.note = "Unusual amount (demo)";
  req.session.state.selectedBankId = id;
  req.session.scenario = scenario === "hold" ? "hold" : "blocked";
  res.redirect("/misuse/security-alert");
});

// Server-side proxy for Semak Mule (requires network access enabled)
app.post("/api/semakmule", async (req, res) => {
  const { bankAccount } = req.body || {};
  const digits = String(bankAccount || "").replace(/\D/g, "");
  if (!digits) {
    return res.status(400).json({ ok: false, error: "Missing bank account." });
  }
  const check = await checkMuleAccount(digits);
  if (!check.ok) {
    const mockReported = digits.endsWith("9999") || digits.endsWith("8888");
    return res.json({
      ok: true,
      reportCount: mockReported ? 1 : 0,
      raw: { mocked: true, reported: mockReported },
    });
  }
  return res.json({ ok: true, reportCount: check.reportCount, raw: check.raw });
});

// Security alert
app.get("/misuse/security-alert", (req, res) => {
  res.locals.page = "Security Alert";
  const scenario = getScenario(req);
  const ref = req.session.misuseAlertRef || newRef();
  req.session.misuseAlertRef = ref;
  if (req.session.misuseLoggedRef !== ref) {
    req.session.misuseLoggedRef = ref;
    logAudit(req, "REINVEST_BLOCKED", "misuse_blocked", { ref, scenario });
  }
  req.session.state.alerts.unshift({
    type: "Alert",
    title: "Suspicious Activity Detected",
    detail: `A suspicious withdrawal attempt was detected. Ref: ${ref}`,
    ts: new Date().toISOString(),
  });
  res.render("security_alert", { ref });
});

// Freeze withdrawals (mock)
app.post("/misuse/freeze", (req, res) => {
  req.session.state.withdrawalsFrozen = true;
  res.redirect("/misuse/security-alert?frozen=1");
});

// Unfreeze (mock)
app.post("/misuse/unfreeze", (req, res) => {
  req.session.state.withdrawalsFrozen = false;
  res.redirect("/misuse/security-alert?frozen=0");
});

// Health check
app.get("/health", (req, res) => res.json({ ok: true }));

// 404
app.use((req, res) => {
  res.status(404).render("404");
});

app.listen(PORT, () => {
  console.log(`Prototype running at http://localhost:${PORT}`);
});
