// ============================================================
// INTERNATIONAL REMOTE JOBS API
// ============================================================
// Replaces the old JobLink backend.
//
// FEATURES
// - International remote jobs
// - Jobs Nigerians can work from Nigeria
// - Fully remote filtering
// - Search
// - Visa sponsorship / relocation jobs
// - Salary information
// - Application links
// - Debug endpoint
// - Telegram posting
//
// SOURCE: HIMALAYAS
// ============================================================

const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 10000;

const HIMALAYAS_API =
  "https://himalayas.app/jobs/api/search";

const HIMALAYAS_JOBS_PAGE =
  "https://himalayas.app/jobs";

const TELEGRAM_BOT_TOKEN =
  process.env.TELEGRAM_BOT_TOKEN || "";

const TELEGRAM_CHANNEL_ID =
  process.env.TELEGRAM_CHANNEL_ID || "";

const MAX_PAGES = 5;
const CACHE_TIME = 30 * 60 * 1000;

// ============================================================
// CACHE
// ============================================================

let remoteCache = {
  time: 0,
  jobs: []
};

let visaCache = {
  time: 0,
  jobs: []
};

// ============================================================
// SAFE FETCH
// ============================================================

async function fetchJson(url) {
  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, 30000);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent":
          "InternationalRemoteJobsAPI/1.0"
      },
      signal: controller.signal
    });

    const text = await response.text();

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status}: ${text.slice(0, 500)}`
      );
    }

    try {
      return JSON.parse(text);
    } catch {
      throw new Error(
        "Himalayas returned invalid JSON: " +
        text.slice(0, 500)
      );
    }
  } finally {
    clearTimeout(timeout);
  }
}

// ============================================================
// HTML CLEANER
// ============================================================

function cleanHtml(value = "") {
  return String(value)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

// ============================================================
// CONVERT ANY VALUE TO TEXT
// ============================================================

function textValue(value) {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return value
      .map(textValue)
      .filter(Boolean)
      .join(" ");
  }

  if (typeof value === "object") {
    return Object.values(value)
      .map(textValue)
      .filter(Boolean)
      .join(" ");
  }

  return String(value);
}

// ============================================================
// JOB DESCRIPTION
// ============================================================

function getDescription(job) {
  return cleanHtml(
    textValue(
      job.description ||
      job.jobDescription ||
      job.excerpt ||
      job.summary ||
      ""
    )
  );
}

// ============================================================
// ALL SEARCHABLE JOB TEXT
// ============================================================

function getJobText(job) {
  return [
    job.title,
    job.companyName,
    job.company,
    job.company?.name,
    job.location,
    job.category,
    job.jobType,
    job.employmentType,
    job.description,
    job.jobDescription,
    job.excerpt,
    job.summary,
    JSON.stringify(job.locationRestrictions || []),
    JSON.stringify(job.timezoneRestrictions || [])
  ]
    .map(textValue)
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

// ============================================================
// LOCATION RESTRICTIONS
// ============================================================

function getLocationRestrictions(job) {
  if (Array.isArray(job.locationRestrictions)) {
    return job.locationRestrictions;
  }

  return [];
}

function getLocationNames(job) {
  return getLocationRestrictions(job)
    .map(location => {
      if (!location) return "";

      if (typeof location === "string") {
        return location;
      }

      return (
        location.name ||
        location.country ||
        location.label ||
        ""
      );
    })
    .filter(Boolean);
}

// ============================================================
// COUNTRY CHECK
// ============================================================

function locationMatches(location, words) {
  const text = [
    location?.alpha2,
    location?.name,
    location?.slug,
    location?.country,
    location?.label
  ]
    .map(textValue)
    .join(" ")
    .toLowerCase();

  return words.some(word =>
    text.includes(word)
  );
}

// ============================================================
// NIGERIA ELIGIBILITY
// ============================================================

function checkNigeriaEligibility(job) {
  const restrictions =
    getLocationRestrictions(job);

  // Himalayas: empty location restrictions
  // means worldwide.
  if (restrictions.length === 0) {
    return {
      eligible: true,
      reason:
        "Worldwide job with no geographic restriction"
    };
  }

  // Nigeria explicitly allowed
  const nigeriaAllowed =
    restrictions.some(location =>
      locationMatches(location, [
        "ng",
        "nigeria",
        "nigerian"
      ])
    );

  if (nigeriaAllowed) {
    return {
      eligible: true,
      reason:
        "Nigeria is explicitly included"
    };
  }

  // Africa-wide
  const africaAllowed =
    restrictions.some(location =>
      locationMatches(location, [
        "africa"
      ])
    );

  if (africaAllowed) {
    return {
      eligible: true,
      reason:
        "Africa is included"
    };
  }

  return {
    eligible: false,
    reason:
      "Nigeria is not included in the geographic restrictions"
  };
}

// ============================================================
// FULLY REMOTE CHECK
// ============================================================

function isFullyRemote(job) {
  const text = getJobText(job);

  // Explicit arrangements that should be rejected.
  const rejectedPatterns = [
    /\bhybrid\b/i,
    /\bhybrid[- ]remote\b/i,
    /\bremote[- ]hybrid\b/i,

    /\bonsite\b/i,
    /\bon-site\b/i,

    /\bfully onsite\b/i,
    /\bfully on-site\b/i,

    /\bin[- ]office\b/i,
    /\bwork from office\b/i,
    /\bworking from office\b/i,

    /\boffice[- ]based\b/i,
    /\boffice based\b/i,

    /\bphysical location required\b/i
  ];

  if (
    rejectedPatterns.some(pattern =>
      pattern.test(text)
    )
  ) {
    return false;
  }

  // Explicit remote wording.
  const remotePatterns = [
    /\bremote\b/i,
    /\bfully remote\b/i,
    /\b100% remote\b/i,
    /\bwork from home\b/i,
    /\bwork[- ]from[- ]home\b/i,
    /\bhome based\b/i,
    /\bhome-based\b/i,
    /\bdistributed team\b/i,
    /\bfully distributed\b/i,
    /\bremote first\b/i,
    /\bremote-first\b/i
  ];

  return remotePatterns.some(pattern =>
    pattern.test(text)
  );
}

// ============================================================
// FOREIGN ONLY
// ============================================================

function isForeignOnly(job) {
  const text = getJobText(job);

  const patterns = [
    /\bus citizens only\b/i,
    /\bus citizen only\b/i,
    /\bonly open to us citizens\b/i,
    /\bmust be a us citizen\b/i,
    /\bmust be us citizen\b/i,

    /\bus residents only\b/i,
    /\bonly us residents\b/i,

    /\bcanada residents only\b/i,
    /\bcanadian residents only\b/i,

    /\buk residents only\b/i,
    /\buk citizens only\b/i,

    /\beu residents only\b/i,
    /\beuropean union residents only\b/i,

    /\baustralia residents only\b/i,
    /\baustralian residents only\b/i
  ];

  return patterns.some(pattern =>
    pattern.test(text)
  );
}

// ============================================================
// HIMALAYAS SEARCH
// ============================================================

async function searchHimalayas(params = {}) {
  const query =
    new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (
      value !== undefined &&
      value !== null &&
      value !== ""
    ) {
      query.set(key, String(value));
    }
  }

  const url =
    `${HIMALAYAS_API}?${query.toString()}`;

  console.log("Himalayas request:", url);

  return fetchJson(url);
}

// ============================================================
// EXTRACT JOB ARRAY
// ============================================================

function extractJobs(data) {
  if (Array.isArray(data)) {
    return data;
  }

  if (
    data &&
    Array.isArray(data.jobs)
  ) {
    return data.jobs;
  }

  if (
    data &&
    data.data &&
    Array.isArray(data.data.jobs)
  ) {
    return data.data.jobs;
  }

  if (
    data &&
    data.results &&
    Array.isArray(data.results)
  ) {
    return data.results;
  }

  if (
    data &&
    data.data &&
    Array.isArray(data.data)
  ) {
    return data.data;
  }

  return [];
}

// ============================================================
// MULTI-PAGE SEARCH
// ============================================================

async function searchMultiplePages(params = {}) {
  const allJobs = [];

  for (
    let page = 1;
    page <= MAX_PAGES;
    page++
  ) {
    try {
      const data =
        await searchHimalayas({
          ...params,
          page
        });

      const jobs =
        extractJobs(data);

      console.log(
        `Himalayas page ${page}: ${jobs.length} jobs`
      );

      allJobs.push(...jobs);

      // Stop if fewer than 20 were returned.
      if (jobs.length < 20) {
        break;
      }
    } catch (error) {
      console.error(
        `Himalayas page ${page} failed:`,
        error.message
      );

      // If page 1 fails, propagate the error.
      if (page === 1) {
        throw error;
      }

      break;
    }
  }

  return allJobs;
}

// ============================================================
// DEDUPLICATE
// ============================================================

function getJobId(job) {
  return (
    job.id ||
    job.slug ||
    job.url ||
    job.applicationUrl ||
    `${job.title || "job"}-${job.companyName || job.company || "company"}`
  );
}

function deduplicateJobs(jobs) {
  const map = new Map();

  for (const job of jobs) {
    const id = getJobId(job);

    if (!map.has(id)) {
      map.set(id, job);
    }
  }

  return [...map.values()];
}

// ============================================================
// EMAIL EXTRACTION
// ============================================================

function extractEmails(text = "") {
  const matches =
    String(text).match(
      /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi
    );

  return [
    ...new Set(matches || [])
  ];
}

// ============================================================
// URL EXTRACTION
// ============================================================

function extractUrls(text = "") {
  const matches =
    String(text).match(
      /https?:\/\/[^\s"'<>]+/gi
    );

  return [
    ...new Set(matches || [])
  ];
}

// ============================================================
// APPLICATION URL
// ============================================================

function getApplication(job) {
  return (
    job.applicationUrl ||
    job.applyUrl ||
    job.applicationLink ||
    job.apply ||
    job.application?.url ||
    job.url ||
    null
  );
}

// ============================================================
// COMPANY
// ============================================================

function getCompany(job) {
  if (typeof job.companyName === "string") {
    return job.companyName;
  }

  if (typeof job.company === "string") {
    return job.company;
  }

  if (
    job.company &&
    typeof job.company === "object"
  ) {
    return (
      job.company.name ||
      job.company.title ||
      "Company not specified"
    );
  }

  if (
    job.organization &&
    typeof job.organization === "object"
  ) {
    return (
      job.organization.name ||
      "Company not specified"
    );
  }

  return "Company not specified";
}

// ============================================================
// JOB TYPE
// ============================================================

function getJobType(job) {
  const value =
    job.employmentType ||
    job.jobType ||
    job.type ||
    "";

  if (Array.isArray(value)) {
    return value.join(", ");
  }

  if (typeof value === "object") {
    return Object.values(value)
      .map(textValue)
      .filter(Boolean)
      .join(", ");
  }

  return value || "Not specified";
}

// ============================================================
// SALARY
// ============================================================

function formatSalary(job) {
  // Himalayas may provide a salary object.
  if (
    job.salary &&
    typeof job.salary === "object"
  ) {
    const salary = job.salary;

    const min =
      salary.min ??
      salary.minimum;

    const max =
      salary.max ??
      salary.maximum;

    const currency =
      salary.currency ||
      job.currency ||
      "";

    const period =
      salary.period ||
      job.salaryPeriod ||
      "";

    if (min != null && max != null) {
      return `${currency} ${min} - ${max} ${period}`.trim();
    }

    if (min != null) {
      return `${currency} ${min} ${period}`.trim();
    }

    if (max != null) {
      return `${currency} ${max} ${period}`.trim();
    }
  }

  if (typeof job.salary === "string") {
    return job.salary;
  }

  const min =
    job.minSalary ??
    job.salaryMin;

  const max =
    job.maxSalary ??
    job.salaryMax;

  const currency =
    job.currency ||
    job.salaryCurrency ||
    "";

  const period =
    job.salaryPeriod ||
    "";

  if (min != null && max != null) {
    return `${currency} ${min} - ${max} ${period}`.trim();
  }

  if (min != null) {
    return `${currency} ${min} ${period}`.trim();
  }

  if (max != null) {
    return `${currency} ${max} ${period}`.trim();
  }

  return "Not specified";
}

// ============================================================
// DATE
// ============================================================

function formatDate(value) {
  if (!value) {
    return null;
  }

  let date;

  const numeric =
    typeof value === "number" ||
    /^\d+$/.test(String(value));

  if (numeric) {
    const number =
      Number(value);

    if (number < 100000000000) {
      date =
        new Date(number * 1000);
    } else {
      date =
        new Date(number);
    }
  } else {
    date =
      new Date(value);
  }

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return null;
  }

  return date.toISOString();
}

// ============================================================
// FORMAT JOB
// ============================================================

function formatJob(job) {
  const eligibility =
    checkNigeriaEligibility(job);

  const locations =
    getLocationNames(job);

  const description =
    getDescription(job);

  const company =
    getCompany(job);

  const applicationUrl =
    getApplication(job);

  const sourceUrl =
    job.url ||
    applicationUrl ||
    HIMALAYAS_JOBS_PAGE;

  return {
    id: getJobId(job),

    title:
      job.title ||
      "Untitled job",

    company,

    description,

    excerpt:
      cleanHtml(
        textValue(
          job.excerpt ||
          job.summary ||
          ""
        )
      ).slice(0, 600),

    location:
      locations.length
        ? locations.join(", ")
        : "Worldwide",

    locationRestrictions:
      job.locationRestrictions || [],

    timezoneRestrictions:
      job.timezoneRestrictions || [],

    remote: true,

    remoteType:
      "FULLY_REMOTE",

    workArrangement:
      "Fully Remote",

    workFromHome:
      true,

    remoteLabel:
      "100% Remote",

    nigeriaEligible:
      eligibility.eligible,

    eligibility:
      eligibility.eligible
        ? "Nigerians can apply from Nigeria"
        : "Nigeria not explicitly allowed",

    eligibilityReason:
      eligibility.reason,

    employmentType:
      getJobType(job),

    seniority:
      job.seniority || [],

    salary:
      formatSalary(job),

    applicationUrl,

    source:
      "Himalayas",

    sourceUrl,

    publishedAt:
      formatDate(
        job.pubDate ||
        job.publishedAt ||
        job.createdAt
      ),

    expiryDate:
      formatDate(
        job.expiryDate
      ),

    emails:
      extractEmails(description),

    urls:
      extractUrls(description)
  };
}

// ============================================================
// GET REMOTE JOBS
// ============================================================

async function getRemoteJobs(search = "") {
  const now = Date.now();

  // Cache only the normal unfiltered request.
  if (
    !search &&
    remoteCache.jobs.length > 0 &&
    now - remoteCache.time <
      CACHE_TIME
  ) {
    return remoteCache.jobs;
  }

  const params = {
    sort: "recent"
  };

  if (search) {
    params.q = search;
  }

  const rawJobs =
    await searchMultiplePages(
      params
    );

  const uniqueJobs =
    deduplicateJobs(rawJobs);

  const jobs =
    uniqueJobs
      .filter(job =>
        isFullyRemote(job)
      )
      .filter(job =>
        !isForeignOnly(job)
      )
      .map(formatJob)
      .filter(job =>
        job.nigeriaEligible
      );

  if (!search) {
    remoteCache = {
      time: now,
      jobs
    };
  }

  return jobs;
}

// ============================================================
// VISA JOBS
// ============================================================

async function getVisaJobs(search = "") {
  const now = Date.now();

  if (
    !search &&
    visaCache.jobs.length > 0 &&
    now - visaCache.time <
      CACHE_TIME
  ) {
    return visaCache.jobs;
  }

  const terms = [
    "visa sponsorship",
    "visa sponsor",
    "work visa",
    "relocation"
  ];

  let rawJobs = [];

  for (const term of terms) {
    try {
      const query =
        search
          ? `${search} ${term}`
          : term;

      const jobs =
        await searchMultiplePages({
          q: query,
          sort: "recent"
        });

      rawJobs.push(...jobs);
    } catch (error) {
      console.error(
        `Visa search "${term}" failed:`,
        error.message
      );
    }
  }

  const uniqueJobs =
    deduplicateJobs(rawJobs);

  const jobs =
    uniqueJobs
      .filter(job => {
        const text =
          getJobText(job);

        return (
          /\bvisa sponsorship\b/i.test(text) ||
          /\bvisa sponsor\b/i.test(text) ||
          /\bwork visa\b/i.test(text) ||
          /\bvisa support\b/i.test(text) ||
          /\brelocation\b/i.test(text)
        );
      })
      .map(formatJob);

  if (!search) {
    visaCache = {
      time: now,
      jobs
    };
  }

  return jobs;
}

// ============================================================
// HOME
// ============================================================

app.get("/", (req, res) => {
  res.json({
    success: true,

    status:
      "online",

    message:
      "International Remote Jobs API is running 🚀",

    source:
      "Himalayas",

    version:
      "2.0.0",

    endpoints: {
      health:
        "/api/health",

      test:
        "/api/test-himalayas",

      remote:
        "/api/jobs/remote",

      search:
        "/api/jobs/remote?search=customer%20support",

      visa:
        "/api/jobs/visa",

      debug:
        "/api/jobs/remote/debug",

      telegramTest:
        "/api/telegram/test",

      telegramPost:
        "/api/telegram/post"
    }
  });
});

// ============================================================
// HEALTH CHECK
// ============================================================

app.get("/api/health", (req, res) => {
  res.json({
    success: true,

    status:
      "online",

    server:
      "International Remote Jobs API",

    version:
      "2.0.0",

    source:
      "Himalayas",

    telegramConfigured:
      Boolean(
        TELEGRAM_BOT_TOKEN &&
        TELEGRAM_CHANNEL_ID
      ),

    time:
      new Date().toISOString()
  });
});

// ============================================================
// DIRECT HIMALAYAS TEST
// ============================================================

app.get(
  "/api/test-himalayas",
  async (req, res) => {
    try {
      const data =
        await searchHimalayas({
          sort: "recent",
          page: 1
        });

      const jobs =
        extractJobs(data);

      res.json({
        success: true,

        message:
          "Himalayas API is responding",

        count:
          jobs.length,

        sample:
          jobs.slice(0, 3),

        responseKeys:
          data &&
          typeof data === "object"
            ? Object.keys(data)
            : []
      });
    } catch (error) {
      console.error(
        "Himalayas test error:",
        error
      );

      res.status(500).json({
        success: false,

        message:
          "Himalayas API test failed",

        error:
          error.message
      });
    }
  }
);

// ============================================================
// REMOTE JOBS
// ============================================================

app.get(
  "/api/jobs/remote",
  async (req, res) => {
    try {
      const search =
        String(
          req.query.search || ""
        ).trim();

      const jobs =
        await getRemoteJobs(search);

      res.json({
        success: true,

        count:
          jobs.length,

        search:
          search || null,

        filters: {
          international:
            true,

          fullyRemote:
            true,

          nigeriaEligible:
            true
        },

        jobs
      });
    } catch (error) {
      console.error(
        "Remote jobs error:",
        error
      );

      res.status(500).json({
        success: false,

        count: 0,

        jobs: [],

        error:
          error.message
      });
    }
  }
);

// ============================================================
// VISA JOBS
// ============================================================

app.get(
  "/api/jobs/visa",
  async (req, res) => {
    try {
      const search =
        String(
          req.query.search || ""
        ).trim();

      const jobs =
        await getVisaJobs(search);

      res.json({
        success: true,

        count:
          jobs.length,

        search:
          search || null,

        type:
          "Visa sponsorship / relocation",

        jobs
      });
    } catch (error) {
      console.error(
        "Visa jobs error:",
        error
      );

      res.status(500).json({
        success: false,

        count: 0,

        jobs: [],

        error:
          error.message
      });
    }
  }
);

// ============================================================
// DEBUG
// ============================================================

app.get(
  "/api/jobs/remote/debug",
  async (req, res) => {
    try {
      const rawJobs =
        await searchMultiplePages({
          sort: "recent"
        });

      const uniqueJobs =
        deduplicateJobs(rawJobs);

      const debugJobs =
        uniqueJobs.map(job => {
          const eligibility =
            checkNigeriaEligibility(
              job
            );

          const remote =
            isFullyRemote(job);

          const foreignOnly =
            isForeignOnly(job);

          return {
            id:
              getJobId(job),

            title:
              job.title,

            company:
              getCompany(job),

            locationRestrictions:
              job.locationRestrictions ||
              [],

            remote,

            foreignOnly,

            nigeriaEligible:
              eligibility.eligible,

            eligibilityReason:
              eligibility.reason,

            accepted:
              remote &&
              !foreignOnly &&
              eligibility.eligible
          };
        });

      res.json({
        success: true,

        rawCount:
          rawJobs.length,

        uniqueCount:
          uniqueJobs.length,

        acceptedCount:
          debugJobs.filter(
            job => job.accepted
          ).length,

        rejectedCount:
          debugJobs.filter(
            job => !job.accepted
          ).length,

        jobs:
          debugJobs
      });
    } catch (error) {
      res.status(500).json({
        success: false,

        error:
          error.message
      });
    }
  }
);

// ============================================================
// TELEGRAM
// ============================================================

function escapeTelegramHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function sendTelegramMessage(
  message
) {
  if (
    !TELEGRAM_BOT_TOKEN ||
    !TELEGRAM_CHANNEL_ID
  ) {
    throw new Error(
      "TELEGRAM_BOT_TOKEN or TELEGRAM_CHANNEL_ID is missing"
    );
  }

  const url =
    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

  const response =
    await fetch(url, {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json"
      },

      body: JSON.stringify({
        chat_id:
          TELEGRAM_CHANNEL_ID,

        text:
          message,

        parse_mode:
          "HTML",

        disable_web_page_preview:
          false
      })
    });

  const data =
    await response.json();

  if (
    !response.ok ||
    !data.ok
  ) {
    throw new Error(
      data.description ||
      "Telegram request failed"
    );
  }

  return data;
}

// ============================================================
// TELEGRAM JOB FORMAT
// ============================================================

function formatTelegramJob(job) {
  const apply =
    job.applicationUrl ||
    job.sourceUrl ||
    HIMALAYAS_JOBS_PAGE;

  return [
    "<b>🌍 INTERNATIONAL REMOTE JOB</b>",
    "",
    `<b>💼 ${escapeTelegramHtml(job.title)}</b>`,
    "",
    `<b>🏢 Company:</b> ${escapeTelegramHtml(job.company)}`,
    "",
    "<b>🇳🇬 Nigeria:</b> Nigerians can apply from Nigeria",
    "",
    "<b>💻 Work:</b> 100% Fully Remote",
    "",
    `<b>📍 Location:</b> ${escapeTelegramHtml(job.location)}`,
    "",
    `<b>💰 Salary:</b> ${escapeTelegramHtml(job.salary)}`,
    "",
    `<b>📝 Type:</b> ${escapeTelegramHtml(job.employmentType)}`,
    "",
    `<b>🔗 APPLY:</b> ${escapeTelegramHtml(apply)}`,
    "",
    "<i>Source: Himalayas</i>"
  ].join("\n");
}

// ============================================================
// TELEGRAM TEST
// ============================================================

app.get(
  "/api/telegram/test",
  async (req, res) => {
    try {
      await sendTelegramMessage(
        "🤖 <b>International Remote Jobs API</b>\n\nTelegram connection is working successfully."
      );

      res.json({
        success: true,

        message:
          "Telegram test message sent successfully"
      });
    } catch (error) {
      res.status(500).json({
        success: false,

        error:
          error.message
      });
    }
  }
);

// ============================================================
// TELEGRAM MANUAL POST
// ============================================================

app.get(
  "/api/telegram/post",
  async (req, res) => {
    try {
      const jobs =
        await getRemoteJobs();

      if (!jobs.length) {
        return res.status(404).json({
          success: false,

          message:
            "No Nigeria-eligible remote jobs found"
        });
      }

      const job =
        jobs[0];

      await sendTelegramMessage(
        formatTelegramJob(job)
      );

      res.json({
        success: true,

        message:
          "Job posted to Telegram",

        job
      });
    } catch (error) {
      res.status(500).json({
        success: false,

        error:
          error.message
      });
    }
  }
);

// ============================================================
// AUTOMATIC TELEGRAM POSTING
// ============================================================

let lastPostedJobId = null;

async function automaticTelegramPost() {
  try {
    if (
      !TELEGRAM_BOT_TOKEN ||
      !TELEGRAM_CHANNEL_ID
    ) {
      console.log(
        "Telegram auto-posting disabled: credentials missing."
      );

      return;
    }

    const jobs =
      await getRemoteJobs();

    if (!jobs.length) {
      console.log(
        "Telegram: no eligible jobs."
      );

      return;
    }

    const newJob =
      jobs.find(
        job =>
          job.id !==
          lastPostedJobId
      );

    const job =
      newJob || jobs[0];

    if (
      job.id ===
      lastPostedJobId
    ) {
      console.log(
        "Telegram: no new job."
      );

      return;
    }

    await sendTelegramMessage(
      formatTelegramJob(job)
    );

    lastPostedJobId =
      job.id;

    console.log(
      "Telegram posted:",
      job.title
    );
  } catch (error) {
    console.error(
      "Telegram auto-post error:",
      error.message
    );
  }
}

// ============================================================
// 404 HANDLER
// ============================================================

app.use(
  (req, res) => {
    res.status(404).json({
      success: false,

      error:
        "Endpoint not found",

      path:
        req.originalUrl,

      availableEndpoints: [
        "/",
        "/api/health",
        "/api/test-himalayas",
        "/api/jobs/remote",
        "/api/jobs/remote/debug",
        "/api/jobs/visa",
        "/api/telegram/test",
        "/api/telegram/post"
      ]
    });
  }
);

// ============================================================
// ERROR HANDLER
// ============================================================

app.use(
  (error, req, res, next) => {
    console.error(
      "Server error:",
      error
    );

    res.status(500).json({
      success: false,

      error:
        error.message ||
        "Internal server error"
    });
  }
);

// ============================================================
// START
// ============================================================

app.listen(
  PORT,
  () => {
    console.log(
      "================================================"
    );

    console.log(
      `International Remote Jobs API running on port ${PORT}`
    );

    console.log(
      "Himalayas API:",
      HIMALAYAS_API
    );

    console.log(
      "Telegram configured:",
      Boolean(
        TELEGRAM_BOT_TOKEN &&
        TELEGRAM_CHANNEL_ID
      )
    );

    console.log(
      "================================================"
    );

    // Wait 10 seconds after Render starts.
    setTimeout(
      automaticTelegramPost,
      10000
    );

    // Check every 12 hours.
    setInterval(
      automaticTelegramPost,
      12 * 60 * 60 * 1000
    );
  }
);
