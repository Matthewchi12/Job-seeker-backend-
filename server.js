// ============================================================
// INTERNATIONAL REMOTE JOBS API
// REPLACES THE OLD JOBLINK BACKEND
//
// PURPOSE:
// 1. International remote jobs Nigerians can do from Nigeria
// 2. Fully remote jobs only
// 3. Visa sponsorship jobs
// 4. Search jobs
// 5. Telegram automatic posting
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

const TELEGRAM_BOT_TOKEN =
  process.env.TELEGRAM_BOT_TOKEN;

const TELEGRAM_CHANNEL_ID =
  process.env.TELEGRAM_CHANNEL_ID;

// ------------------------------------------------------------
// SETTINGS
// ------------------------------------------------------------

const MAX_PAGES = 5;
const CACHE_TIME = 30 * 60 * 1000;

let remoteCache = {
  time: 0,
  jobs: []
};

let visaCache = {
  time: 0,
  jobs: []
};

// ------------------------------------------------------------
// BASIC FETCH
// ------------------------------------------------------------

async function fetchJson(url) {
  const response = await fetch(url);

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
}

// ------------------------------------------------------------
// HTML CLEANER
// ------------------------------------------------------------

function cleanHtml(value = "") {
  return String(value)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

// ------------------------------------------------------------
// JOB TEXT
// ------------------------------------------------------------

function getJobText(job) {
  return [
    job.title,
    job.description,
    job.excerpt,
    job.companyName,
    job.company,
    job.location,
    job.category,
    job.jobType,
    job.employmentType,
    JSON.stringify(job.locationRestrictions || []),
    JSON.stringify(job.timezoneRestrictions || [])
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

// ------------------------------------------------------------
// LOCATION INFORMATION
// ------------------------------------------------------------

function getLocations(job) {
  if (Array.isArray(job.locationRestrictions)) {
    return job.locationRestrictions;
  }

  return [];
}

function getLocationNames(job) {
  return getLocations(job)
    .map(x => x && x.name)
    .filter(Boolean);
}

// ------------------------------------------------------------
// NIGERIA ELIGIBILITY
// ------------------------------------------------------------

function checkNigeriaEligibility(job) {
  const restrictions = getLocations(job);

  // No geographic restriction = worldwide
  if (restrictions.length === 0) {
    return {
      eligible: true,
      reason:
        "Worldwide remote job with no geographic restriction"
    };
  }

  const nigeria = restrictions.some(location => {
    const alpha2 =
      String(location.alpha2 || "").toLowerCase();

    const name =
      String(location.name || "").toLowerCase();

    const slug =
      String(location.slug || "").toLowerCase();

    return (
      alpha2 === "ng" ||
      name.includes("nigeria") ||
      slug.includes("nigeria")
    );
  });

  if (nigeria) {
    return {
      eligible: true,
      reason:
        "Nigeria is explicitly included in the allowed locations"
    };
  }

  // Africa-wide opportunities
  const africa = restrictions.some(location => {
    const name =
      String(location.name || "").toLowerCase();

    const slug =
      String(location.slug || "").toLowerCase();

    return (
      name === "africa" ||
      name.includes("africa") ||
      slug === "africa" ||
      slug.includes("africa")
    );
  });

  if (africa) {
    return {
      eligible: true,
      reason:
        "Africa is included in the allowed locations"
    };
  }

  return {
    eligible: false,
    reason:
      "Nigeria is not included in the geographic restrictions"
  };
}

// ------------------------------------------------------------
// FULLY REMOTE CHECK
// ------------------------------------------------------------

function isFullyRemote(job) {
  const text = getJobText(job);

  const badPatterns = [
    /\bhybrid\b/i,
    /\bonsite\b/i,
    /\bon-site\b/i,
    /\bin[- ]office\b/i,
    /\bwork from office\b/i,
    /\bworking from office\b/i,
    /\bmust be located in .* office\b/i,
    /\boffice based\b/i,
    /\boffice-based\b/i,
    /\bphysical location required\b/i
  ];

  for (const pattern of badPatterns) {
    if (pattern.test(text)) {
      return false;
    }
  }

  // Explicit remote indicators
  const remotePatterns = [
    /\bremote\b/i,
    /\bwork from home\b/i,
    /\bhome based\b/i,
    /\bhome-based\b/i,
    /\bdistributed team\b/i,
    /\bfully distributed\b/i,
    /\b100% remote\b/i
  ];

  return remotePatterns.some(pattern =>
    pattern.test(text)
  );
}

// ------------------------------------------------------------
// FOREIGN-ONLY CHECK
// ------------------------------------------------------------

function isForeignOnly(job) {
  const text = getJobText(job);

  const patterns = [
    /\bus citizens only\b/i,
    /\bonly open to us citizens\b/i,
    /\bmust be a us citizen\b/i,
    /\bus residents only\b/i,
    /\bonly us residents\b/i,
    /\bcanada only\b/i,
    /\buk residents only\b/i,
    /\beu residents only\b/i,
    /\beurope only\b/i,
    /\baustralia only\b/i
  ];

  return patterns.some(pattern =>
    pattern.test(text)
  );
}

// ------------------------------------------------------------
// HIMALAYAS SEARCH
// ------------------------------------------------------------

async function searchHimalayas(params = {}) {
  const query = new URLSearchParams();

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

  return await fetchJson(url);
}

// ------------------------------------------------------------
// MULTIPLE PAGES
// ------------------------------------------------------------

async function searchMultiplePages(params = {}) {
  let allJobs = [];

  for (let page = 1; page <= MAX_PAGES; page++) {
    try {
      const data = await searchHimalayas({
        ...params,
        page
      });

      let jobs = [];

      if (Array.isArray(data)) {
        jobs = data;
      } else if (Array.isArray(data.jobs)) {
        jobs = data.jobs;
      } else if (
        data.data &&
        Array.isArray(data.data.jobs)
      ) {
        jobs = data.data.jobs;
      }

      allJobs.push(...jobs);

      if (jobs.length < 20) {
        break;
      }
    } catch (error) {
      console.error(
        `Himalayas page ${page} error:`,
        error.message
      );

      break;
    }
  }

  return allJobs;
}

// ------------------------------------------------------------
// DEDUPLICATE
// ------------------------------------------------------------

function deduplicateJobs(jobs) {
  const map = new Map();

  for (const job of jobs) {
    const id =
      job.id ||
      job.slug ||
      job.url ||
      `${job.title}-${job.companyName}`;

    if (!map.has(id)) {
      map.set(id, job);
    }
  }

  return Array.from(map.values());
}

// ------------------------------------------------------------
// EMAIL EXTRACTION
// ------------------------------------------------------------

function extractEmails(text = "") {
  const matches =
    String(text).match(
      /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi
    );

  return [...new Set(matches || [])];
}

// ------------------------------------------------------------
// URL EXTRACTION
// ------------------------------------------------------------

function extractUrls(text = "") {
  const matches =
    String(text).match(
      /https?:\/\/[^\s"'<>]+/gi
    );

  return [...new Set(matches || [])];
}

// ------------------------------------------------------------
// APPLICATION LINK
// ------------------------------------------------------------

function getApplication(job) {
  return (
    job.applicationUrl ||
    job.applyUrl ||
    job.applicationLink ||
    job.url ||
    job.application?.url ||
    null
  );
}

// ------------------------------------------------------------
// JOB TYPE
// ------------------------------------------------------------

function getJobType(job) {
  if (Array.isArray(job.employmentType)) {
    return job.employmentType.join(", ");
  }

  return (
    job.employmentType ||
    job.jobType ||
    "Not specified"
  );
}

// ------------------------------------------------------------
// SALARY
// ------------------------------------------------------------

function formatSalary(job) {
  const min =
    job.minSalary ??
    job.salaryMin ??
    job.salary?.min;

  const max =
    job.maxSalary ??
    job.salaryMax ??
    job.salary?.max;

  const currency =
    job.currency ||
    job.salaryCurrency ||
    job.salary?.currency ||
    "";

  const period =
    job.salaryPeriod ||
    job.salary?.period ||
    "";

  if (min && max) {
    return `${currency} ${min} - ${max} ${period}`.trim();
  }

  if (min) {
    return `${currency} ${min} ${period}`.trim();
  }

  if (max) {
    return `${currency} ${max} ${period}`.trim();
  }

  if (typeof job.salary === "string") {
    return job.salary;
  }

  return "Not specified";
}

// ------------------------------------------------------------
// DATE
// ------------------------------------------------------------

function formatDate(value) {
  if (!value) {
    return null;
  }

  let date;

  if (
    typeof value === "number" ||
    /^\d+$/.test(String(value))
  ) {
    const number = Number(value);

    // Himalayas normally uses milliseconds
    date = new Date(number);

    // Safety for seconds
    if (number < 100000000000) {
      date = new Date(number * 1000);
    }
  } else {
    date = new Date(value);
  }

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

// ------------------------------------------------------------
// FORMAT JOB
// ------------------------------------------------------------

function formatJob(job) {
  const eligibility =
    checkNigeriaEligibility(job);

  const locations =
    getLocationNames(job);

  const description =
    cleanHtml(
      job.description ||
      job.excerpt ||
      ""
    );

  const company =
    job.companyName ||
    job.company ||
    job.organization?.name ||
    "Company not specified";

  const application =
    getApplication(job);

  const sourceUrl =
    job.url ||
    application ||
    "https://himalayas.app/jobs";

  return {
    id:
      job.id ||
      job.slug ||
      `${job.title}-${company}`,

    title:
      job.title ||
      "Untitled job",

    company,

    description,

    excerpt:
      cleanHtml(job.excerpt || "")
        .slice(0, 500),

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

    workFromHome: true,

    remoteLabel:
      "100% Remote",

    nigeriaEligible:
      eligibility.eligible,

    eligibilityReason:
      eligibility.reason,

    eligibility:
      eligibility.eligible
        ? "Nigerians can apply from Nigeria"
        : "Nigeria not explicitly allowed",

    employmentType:
      getJobType(job),

    seniority:
      job.seniority || [],

    salary:
      formatSalary(job),

    applicationUrl:
      application,

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
      extractUrls(description),

    originalJob: job
  };
}

// ------------------------------------------------------------
// GET ALL REMOTE JOBS
// ------------------------------------------------------------

async function getRemoteJobs(search = "") {
  const now = Date.now();

  if (
    !search &&
    remoteCache.jobs.length &&
    now - remoteCache.time < CACHE_TIME
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
    await searchMultiplePages(params);

  const unique =
    deduplicateJobs(rawJobs);

  const jobs = unique
    .filter(isFullyRemote)
    .filter(job => !isForeignOnly(job))
    .map(formatJob)
    .filter(job => job.nigeriaEligible);

  if (!search) {
    remoteCache = {
      time: now,
      jobs
    };
  }

  return jobs;
}

// ------------------------------------------------------------
// VISA JOBS
// ------------------------------------------------------------

async function getVisaJobs(search = "") {
  const now = Date.now();

  if (
    !search &&
    visaCache.jobs.length &&
    now - visaCache.time < CACHE_TIME
  ) {
    return visaCache.jobs;
  }

  const searchTerms = [
    "visa sponsorship",
    "visa sponsor",
    "relocation",
    "work visa"
  ];

  let rawJobs = [];

  for (const term of searchTerms) {
    try {
      const jobs =
        await searchMultiplePages({
          q: search
            ? `${search} ${term}`
            : term,
          sort: "recent"
        });

      rawJobs.push(...jobs);
    } catch (error) {
      console.error(
        "Visa search error:",
        error.message
      );
    }
  }

  const unique =
    deduplicateJobs(rawJobs);

  const jobs = unique
    .filter(job => {
      const text = getJobText(job);

      return (
        /visa sponsorship|visa sponsor|work visa|relocation/i
          .test(text)
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
// ROUTES
// ============================================================

// ------------------------------------------------------------
// HOME
// ------------------------------------------------------------

app.get("/", (req, res) => {
  res.json({
    success: true,
    status: "online",
    message:
      "International Remote Jobs API is running 🚀",

    source:
      "Himalayas",

    features: [
      "International remote jobs",
      "Nigeria-friendly remote jobs",
      "Fully remote filtering",
      "Visa sponsorship jobs",
      "Job search",
      "Salary information",
      "Application links",
      "Telegram posting"
    ],

    endpoints: {
      remote:
        "/api/jobs/remote",

      search:
        "/api/jobs/remote?search=customer%20support",

      visa:
        "/api/jobs/visa",

      debug:
        "/api/jobs/remote/debug",

      test:
        "/api/test-himalayas",

      telegramTest:
        "/api/telegram/test",

      telegramPost:
        "/api/telegram/post"
    }
  });
});

// ------------------------------------------------------------
// TEST HIMALAYAS DIRECTLY
// ------------------------------------------------------------

app.get(
  "/api/test-himalayas",
  async (req, res) => {
    try {
      const data =
        await searchHimalayas({
          sort: "recent",
          page: 1
        });

      let jobs = [];

      if (Array.isArray(data)) {
        jobs = data;
      } else if (Array.isArray(data.jobs)) {
        jobs = data.jobs;
      } else if (
        data.data &&
        Array.isArray(data.data.jobs)
      ) {
        jobs = data.data.jobs;
      }

      res.json({
        success: true,

        message:
          "Himalayas API is responding",

        count:
          jobs.length,

        sample:
          jobs.slice(0, 3),

        rawKeys:
          typeof data === "object"
            ? Object.keys(data)
            : []
      });
    } catch (error) {
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

// ------------------------------------------------------------
// REMOTE JOBS
// ------------------------------------------------------------

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
          remote: true,
          fullyRemote: true,
          nigeriaEligible: true
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

// ------------------------------------------------------------
// VISA JOBS
// ------------------------------------------------------------

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

// ------------------------------------------------------------
// DEBUG
// ------------------------------------------------------------

app.get(
  "/api/jobs/remote/debug",
  async (req, res) => {
    try {
      const rawJobs =
        await searchMultiplePages({
          sort: "recent"
        });

      const unique =
        deduplicateJobs(rawJobs);

      const results =
        unique.map(job => {
          const eligibility =
            checkNigeriaEligibility(job);

          const remote =
            isFullyRemote(job);

          const foreignOnly =
            isForeignOnly(job);

          return {
            id: job.id,

            title:
              job.title,

            company:
              job.companyName ||
              job.company,

            locations:
              job.locationRestrictions || [],

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
          unique.length,

        acceptedCount:
          results.filter(
            x => x.accepted
          ).length,

        rejectedCount:
          results.filter(
            x => !x.accepted
          ).length,

        jobs:
          results
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

// ------------------------------------------------------------
// TELEGRAM SEND
// ------------------------------------------------------------

async function sendTelegramMessage(
  message
) {
  if (
    !TELEGRAM_BOT_TOKEN ||
    !TELEGRAM_CHANNEL_ID
  ) {
    throw new Error(
      "Telegram environment variables are missing"
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

  if (!response.ok || !data.ok) {
    throw new Error(
      data.description ||
      "Telegram request failed"
    );
  }

  return data;
}

// ------------------------------------------------------------
// TELEGRAM FORMAT
// ------------------------------------------------------------

function formatTelegramJob(job) {
  return `
<b>🌍 INTERNATIONAL REMOTE JOB</b>

<b>💼 ${escapeHtml(job.title)}</b>

<b>🏢 Company:</b> ${escapeHtml(job.company)}

<b>🇳🇬 Eligibility:</b>
Nigerians can apply from Nigeria

<b>💻 Work:</b>
100% Fully Remote

<b>📍 Location:</b>
${escapeHtml(job.location)}

<b>💰 Salary:</b>
${escapeHtml(job.salary)}

<b>📝 Type:</b>
${escapeHtml(job.employmentType)}

<b>🔗 APPLY NOW:</b>
${job.applicationUrl || job.sourceUrl}

<i>Source: Himalayas</i>
`.trim();
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// ------------------------------------------------------------
// TELEGRAM TEST
// ------------------------------------------------------------

app.get(
  "/api/telegram/test",
  async (req, res) => {
    try {
      await sendTelegramMessage(
        "🤖 <b>Job API Telegram test successful!</b>\n\nYour international remote jobs backend can post to this channel."
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

// ------------------------------------------------------------
// MANUAL TELEGRAM POST
// ------------------------------------------------------------

app.get(
  "/api/telegram/post",
  async (req, res) => {
    try {
      const jobs =
        await getRemoteJobs();

      if (!jobs.length) {
        return res.json({
          success: false,
          message:
            "No eligible remote jobs found"
        });
      }

      const job =
        jobs[0];

      const message =
        formatTelegramJob(job);

      await sendTelegramMessage(
        message
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
        "Telegram auto-post disabled: environment variables not configured."
      );

      return;
    }

    const jobs =
      await getRemoteJobs();

    if (!jobs.length) {
      console.log(
        "Telegram: no eligible jobs found."
      );

      return;
    }

    const job =
      jobs.find(
        x => x.id !== lastPostedJobId
      ) || jobs[0];

    if (
      job.id === lastPostedJobId
    ) {
      console.log(
        "Telegram: no new job to post."
      );

      return;
    }

    const message =
      formatTelegramJob(job);

    await sendTelegramMessage(
      message
    );

    lastPostedJobId =
      job.id;

    console.log(
      "Telegram job posted:",
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
// START SERVER
// ============================================================

app.listen(
  PORT,
  () => {
    console.log(
      `International Remote Jobs API running on port ${PORT}`
    );

    console.log(
      "Himalayas:",
      HIMALAYAS_API
    );

    console.log(
      "Telegram configured:",
      Boolean(
        TELEGRAM_BOT_TOKEN &&
        TELEGRAM_CHANNEL_ID
      )
    );

    // First Telegram check after startup
    setTimeout(
      automaticTelegramPost,
      10000
    );

    // Check every 12 hours
    setInterval(
      automaticTelegramPost,
      12 * 60 * 60 * 1000
    );
  }
);
