// ============================================================
// JOBFINDER BACKEND
// INTERNATIONAL REMOTE JOBS NIGERIANS CAN DO FROM NIGERIA
//
// SOURCE: HIMALAYAS PUBLIC JOBS API
//
// FEATURES:
// 1. Fully remote jobs only
// 2. International / worldwide jobs
// 3. Nigeria-eligible filtering
// 4. 429 rate-limit protection
// 5. Request delays
// 6. Caching
// 7. Telegram automatic job posting
// 8. Telegram test endpoint
// 9. Health endpoint
//
// ============================================================

const express = require("express");
const cors = require("cors");

const app = express();

const PORT = process.env.PORT || 10000;

const HIMALAYAS_API =
  "https://himalayas.app/jobs/api/search";

// ============================================================
// TELEGRAM CONFIGURATION
// ============================================================

const TELEGRAM_BOT_TOKEN =
  process.env.TELEGRAM_BOT_TOKEN || "";

const TELEGRAM_CHAT_ID =
  process.env.TELEGRAM_CHAT_ID || "";

const TELEGRAM_ENABLED =
  Boolean(TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID);

// Prevent duplicate Telegram posts while server is running
const postedTelegramJobs = new Set();


// ============================================================
// JOB SEARCH CONFIGURATION
// ============================================================

// IMPORTANT:
// Keep this small to avoid Himalayas HTTP 429 errors.

const SEARCH_TERMS = [
  "customer support",
  "customer service",
  "virtual assistant",
  "data analyst",
  "AI trainer",
  "software engineer",
  "developer",
  "marketing",
  "sales",
  "content writer"
];

// Maximum pages per search
const MAX_PAGES = 2;

// Maximum jobs returned by our API
const MAX_RESULTS = 100;

// Cache for 20 minutes
const CACHE_TTL = 20 * 60 * 1000;

// Delay between Himalayas requests
const REQUEST_DELAY = 2500;

// Request timeout
const FETCH_TIMEOUT = 15000;


// ============================================================
// EXPRESS
// ============================================================

app.use(cors());
app.use(express.json());


// ============================================================
// CACHE
// ============================================================

let jobsCache = {
  time: 0,
  jobs: []
};


// ============================================================
// DELAY
// ============================================================

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}


// ============================================================
// FETCH JSON WITH 429 PROTECTION
// ============================================================

async function fetchJson(url, attempt = 1) {

  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, FETCH_TIMEOUT);

  try {

    const response = await fetch(url, {
      method: "GET",

      headers: {
        Accept: "application/json",
        "User-Agent":
          "JobFinder International Remote Jobs"
      },

      signal: controller.signal
    });


    // --------------------------------------------------------
    // RATE LIMIT
    // --------------------------------------------------------

    if (response.status === 429) {

      const retryAfter =
        Number(response.headers.get("retry-after")) || 10;

      console.log(
        `⚠️ Himalayas HTTP 429. Waiting ${retryAfter}s...`
      );

      if (attempt <= 3) {

        await sleep(retryAfter * 1000);

        return fetchJson(url, attempt + 1);
      }

      throw new Error(
        "Himalayas rate limit reached after retries"
      );
    }


    // --------------------------------------------------------
    // OTHER HTTP ERRORS
    // --------------------------------------------------------

    if (!response.ok) {

      throw new Error(
        `Himalayas returned HTTP ${response.status}`
      );
    }


    return await response.json();

  } finally {

    clearTimeout(timeout);
  }
}


// ============================================================
// EXTRACT JOBS
// ============================================================

function extractJobs(data) {

  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.jobs)) {
    return data.jobs;
  }

  if (Array.isArray(data?.data)) {
    return data.data;
  }

  if (Array.isArray(data?.results)) {
    return data.results;
  }

  if (Array.isArray(data?.items)) {
    return data.items;
  }

  return [];
}


// ============================================================
// CLEAN HTML
// ============================================================

function cleanHtml(value) {

  if (!value) {
    return "";
  }

  return String(value)

    .replace(
      /<script[\s\S]*?<\/script>/gi,
      " "
    )

    .replace(
      /<style[\s\S]*?<\/style>/gi,
      " "
    )

    .replace(/<[^>]*>/g, " ")

    .replace(/&nbsp;/gi, " ")

    .replace(/&amp;/gi, "&")

    .replace(/&quot;/gi, '"')

    .replace(/&#39;/gi, "'")

    .replace(/\s+/g, " ")

    .trim();
}


// ============================================================
// TEXT VALUE
// ============================================================

function textValue(value) {

  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  if (typeof value === "string") {
    return cleanHtml(value);
  }

  if (typeof value === "number") {
    return String(value);
  }

  try {
    return cleanHtml(
      JSON.stringify(value)
    );
  } catch {
    return "";
  }
}


// ============================================================
// DESCRIPTION
// ============================================================

function getDescription(job) {

  return cleanHtml(
    job.description ||
    job.excerpt ||
    job.summary ||
    job.content ||
    job.body ||
    ""
  );
}


// ============================================================
// JOB TEXT
// ============================================================

function getJobText(job) {

  return [

    job.title,
    job.company,
    job.location,
    job.remoteLabel,
    job.remoteType,
    job.workArrangement,
    job.employmentType,
    job.description,
    job.excerpt,
    job.summary

  ]

    .map(textValue)

    .join(" ")

    .toLowerCase();
}


// ============================================================
// LOCATION RESTRICTIONS
// ============================================================

function getLocationRestrictions(job) {

  return Array.isArray(
    job.locationRestrictions
  )
    ? job.locationRestrictions
    : [];
}


// ============================================================
// RESTRICTION TEXT
// ============================================================

function getRestrictionText(job) {

  return getLocationRestrictions(job)

    .map(item => [

      item?.name,
      item?.alpha2,
      item?.slug

    ]

      .filter(Boolean)

      .join(" "))

    .join(" ")

    .toLowerCase();
}


// ============================================================
// NIGERIA ELIGIBILITY
// ============================================================

function isNigeriaEligible(job) {

  const restrictions =
    getLocationRestrictions(job);


  // No restriction = worldwide
  if (restrictions.length === 0) {

    return {

      eligible: true,

      reason:
        "Worldwide job with no geographic restriction"
    };
  }


  const restrictionText =
    getRestrictionText(job);


  // Nigeria
  if (
    restrictionText.includes("nigeria") ||
    restrictionText.includes("niger")
  ) {

    return {

      eligible: true,

      reason:
        "Nigeria is included in allowed locations"
    };
  }


  // Africa
  if (
    restrictionText.includes("africa")
  ) {

    return {

      eligible: true,

      reason:
        "Africa is included in allowed locations"
    };
  }


  return {

    eligible: false,

    reason:
      "Nigeria is not included in geographic restrictions"
  };
}


// ============================================================
// FOREIGN ONLY CHECK
// ============================================================

function isForeignOnly(job) {

  const text =
    getJobText(job);


  const patterns = [

    "us citizens only",
    "u.s. citizens only",
    "usa citizens only",

    "us residents only",
    "u.s. residents only",
    "usa residents only",

    "must be based in the us",
    "must be based in usa",

    "must reside in the us",
    "must reside in usa",

    "canada residents only",
    "must be based in canada",

    "uk residents only",
    "must be based in the uk",

    "eu residents only",

    "australian residents only",
    "must be based in australia"

  ];


  return patterns.some(
    pattern => text.includes(pattern)
  );
}


// ============================================================
// FULLY REMOTE CHECK
// ============================================================

function isFullyRemote(job) {

  const text =
    getJobText(job);


  // Reject hybrid
  const hybridPatterns = [

    "hybrid",
    "hybrid remote",
    "partially remote",
    "partly remote",
    "remote and office",
    "remote/office"

  ];


  for (
    const pattern of hybridPatterns
  ) {

    if (text.includes(pattern)) {

      return {

        remote: false,

        reason:
          `Hybrid indicator: ${pattern}`
      };
    }
  }


  // Reject onsite
  const onsitePatterns = [

    "on-site",
    "onsite",
    "on site",
    "in office",
    "in-office",
    "office based",
    "office-based",
    "work from office",
    "work-from-office",
    "physical location required",
    "must work from the office",
    "must be in the office"

  ];


  for (
    const pattern of onsitePatterns
  ) {

    if (text.includes(pattern)) {

      return {

        remote: false,

        reason:
          `Onsite indicator: ${pattern}`
      };
    }
  }


  // API says remote
  if (
    job.remote === true ||
    job.workFromHome === true ||
    String(
      job.remoteType || ""
    ).toUpperCase() ===
      "FULLY_REMOTE"
  ) {

    return {

      remote: true,

      reason:
        "API identifies job as remote"
    };
  }


  // Text says remote
  const remotePatterns = [

    "fully remote",
    "100% remote",
    "remote",
    "work from home",
    "work-from-home",
    "distributed team",
    "remote-first",
    "remote first",
    "remote position",
    "remote role",
    "remote job",
    "home based",
    "home-based",
    "location independent"

  ];


  for (
    const pattern of remotePatterns
  ) {

    if (text.includes(pattern)) {

      return {

        remote: true,

        reason:
          `Remote indicator: ${pattern}`
      };
    }
  }


  // Worldwide jobs from Himalayas
  if (
    getLocationRestrictions(job)
      .length === 0
  ) {

    return {

      remote: true,

      reason:
        "Worldwide job with no onsite indicator"
    };
  }


  return {

    remote: false,

    reason:
      "No reliable remote indicator"
  };
}


// ============================================================
// EVALUATE JOB
// ============================================================

function evaluateJob(job) {

  const remote =
    isFullyRemote(job);


  if (!remote.remote) {

    return {

      eligible: false,

      reason:
        `Not fully remote: ${remote.reason}`
    };
  }


  const nigeria =
    isNigeriaEligible(job);


  if (!nigeria.eligible) {

    return {

      eligible: false,

      reason:
        `Nigeria restriction: ${nigeria.reason}`
    };
  }


  if (isForeignOnly(job)) {

    return {

      eligible: false,

      reason:
        "Foreign-only wording found"
    };
  }


  return {

    eligible: true,

    reason:
      nigeria.reason
  };
}


// ============================================================
// FORMAT NUMBER
// ============================================================

function formatNumber(value) {

  const number =
    Number(value);


  if (Number.isNaN(number)) {

    return String(value);
  }


  return number.toLocaleString();
}


// ============================================================
// FORMAT SALARY
// ============================================================

function formatSalary(job) {

  if (
    job.salary &&
    typeof job.salary === "string"
  ) {

    return job.salary;
  }


  const min =
    job.salaryMin ??
    job.salary_min;


  const max =
    job.salaryMax ??
    job.salary_max;


  const currency =
    job.currency || "";


  const period =
    job.salaryPeriod ||
    job.salary_period ||
    "";


  if (
    min === null ||
    min === undefined
  ) {

    return "Salary not specified";
  }


  const minText =
    formatNumber(min);


  const maxText =
    formatNumber(max);


  let result;


  if (
    max !== null &&
    max !== undefined &&
    max !== ""
  ) {

    result =
      `${currency} ${minText} - ${maxText}`;

  } else {

    result =
      `${currency} ${minText}`;
  }


  if (period) {

    result += ` ${period}`;
  }


  return result.trim();
}


// ============================================================
// APPLICATION URL
// ============================================================

function getApplicationUrl(job) {

  const possibleUrls = [

    job.applicationUrl,
    job.applicationLink,
    job.application_url,
    job.url,
    job.link,
    job.applyUrl,
    job.apply_url

  ];


  for (
    const value of possibleUrls
  ) {

    if (!value) continue;


    try {

      const parsed =
        new URL(String(value));


      if (
        parsed.protocol === "http:" ||
        parsed.protocol === "https:"
      ) {

        return parsed.href;
      }

    } catch {}
  }


  return "";
}


// ============================================================
// NORMALIZE JOB
// ============================================================

function normalizeJob(job) {

  const title =
    textValue(job.title);


  const company =
    textValue(
      job.company ||
      job.companyName ||
      "Company"
    );


  const description =
    getDescription(job);


  const restrictions =
    getLocationRestrictions(job);


  let location =
    textValue(job.location);


  if (!location) {

    if (
      restrictions.length === 0
    ) {

      location =
        "Worldwide";

    } else {

      location =
        restrictions

          .map(
            item => item?.name
          )

          .filter(Boolean)

          .join(", ");
    }
  }


  const nigeria =
    isNigeriaEligible(job);


  const employmentType =
    textValue(

      job.employmentType ||
      job.contract_type ||
      job.contractTime ||
      job.contract_time ||
      "Full Time"

    );


  const applicationUrl =
    getApplicationUrl(job);


  const id =
    textValue(

      job.id ||
      job.slug ||
      `${title}-${company}`

    );


  return {

    id,

    title,

    company,

    description,

    excerpt:
      textValue(job.excerpt),

    location,

    locationRestrictions:
      restrictions,

    timezoneRestrictions:
      Array.isArray(
        job.timezoneRestrictions
      )
        ? job.timezoneRestrictions
        : [],

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
      nigeria.eligible,

    eligibility:
      nigeria.eligible
        ? "Nigerians can apply from Nigeria"
        : "Nigeria eligibility not confirmed",

    eligibilityReason:
      nigeria.reason,

    employmentType,

    seniority:
      Array.isArray(job.seniority)
        ? job.seniority
        : [],

    salary:
      formatSalary(job),

    salary_min:
      job.salaryMin ??
      job.salary_min ??
      null,

    salary_max:
      job.salaryMax ??
      job.salary_max ??
      null,

    currency:
      job.currency || "",

    salary_period:
      job.salaryPeriod ||
      job.salary_period ||
      "",

    applicationUrl,

    url:
      applicationUrl,

    source:
      "Himalayas",

    pubDate:
      job.pubDate ||
      job.publishedAt ||
      null,

    expiryDate:
      job.expiryDate ||
      null
  };
}


// ============================================================
// HIMALAYAS SEARCH
// ============================================================

async function searchHimalayas(
  searchTerm,
  page
) {

  const params =
    new URLSearchParams();


  if (searchTerm) {

    params.set(
      "q",
      searchTerm
    );
  }


  params.set(
    "page",
    String(page)
  );


  params.set(
    "worldwide",
    "true"
  );


  const url =
    `${HIMALAYAS_API}?${params.toString()}`;


  console.log(
    `Himalayas search: "${searchTerm}" page ${page}`
  );


  const data =
    await fetchJson(url);


  return extractJobs(data);
}


// ============================================================
// COLLECT RAW JOBS
// ============================================================

async function collectRawJobs() {

  const allJobs = [];


  for (
    const searchTerm of SEARCH_TERMS
  ) {

    for (
      let page = 1;
      page <= MAX_PAGES;
      page++
    ) {

      try {

        const jobs =
          await searchHimalayas(
            searchTerm,
            page
          );


        if (!jobs.length) {

          break;
        }


        allJobs.push(
          ...jobs
        );


        // Don't immediately hammer
        // the next request.
        await sleep(
          REQUEST_DELAY
        );


        if (
          jobs.length < 20
        ) {

          break;
        }

      } catch (error) {

        console.error(
          `Search failed: "${searchTerm}" page ${page}: ${error.message}`
        );


        // If rate limited, stop
        // the current collection.
        if (
          error.message.includes(
            "rate limit"
          ) ||
          error.message.includes(
            "HTTP 429"
          )
        ) {

          console.log(
            "🛑 Rate limit detected. Stopping this collection cycle."
          );

          return allJobs;
        }


        break;
      }
    }
  }


  return allJobs;
}


// ============================================================
// DEDUPLICATE
// ============================================================

function deduplicateJobs(jobs) {

  const seen =
    new Set();


  const result = [];


  for (
    const job of jobs
  ) {

    const key =
      String(

        job.id ||
        job.slug ||
        `${job.title}-${job.company}`

      )

        .toLowerCase()

        .trim();


    if (!key) continue;


    if (
      seen.has(key)
    ) {

      continue;
    }


    seen.add(key);


    result.push(job);
  }


  return result;
}


// ============================================================
// GET REMOTE JOBS
// ============================================================

async function getRemoteJobs(
  forceRefresh = false
) {

  const now =
    Date.now();


  // Return cached jobs
  if (
    !forceRefresh &&
    jobsCache.jobs.length > 0 &&
    now - jobsCache.time <
      CACHE_TTL
  ) {

    console.log(
      "Using cached jobs."
    );

    return jobsCache.jobs;
  }


  console.log(
    "🌍 Collecting international remote jobs..."
  );


  const rawJobs =
    await collectRawJobs();


  console.log(
    `Raw jobs collected: ${rawJobs.length}`
  );


  const uniqueRawJobs =
    deduplicateJobs(rawJobs);


  console.log(
    `Unique raw jobs: ${uniqueRawJobs.length}`
  );


  const eligibleJobs = [];


  for (
    const job of uniqueRawJobs
  ) {

    const evaluation =
      evaluateJob(job);


    if (
      !evaluation.eligible
    ) {

      continue;
    }


    const normalized =
      normalizeJob(job);


    eligibleJobs.push(
      normalized
    );


    if (
      eligibleJobs.length >=
      MAX_RESULTS
    ) {

      break;
    }
  }


  console.log(
    `Nigeria-eligible fully remote jobs: ${eligibleJobs.length}`
  );


  jobsCache = {

    time: now,

    jobs: eligibleJobs

  };


  return eligibleJobs;
}


// ============================================================
// TELEGRAM HTML ESCAPE
// ============================================================

function escapeTelegramHtml(
  value
) {

  return String(value || "")

    .replace(/&/g, "&amp;")

    .replace(/</g, "&lt;")

    .replace(/>/g, "&gt;");
}


// ============================================================
// CREATE TELEGRAM MESSAGE
// ============================================================

function createTelegramJobMessage(
  job
) {

  const title =
    escapeTelegramHtml(
      job.title
    );


  const company =
    escapeTelegramHtml(
      job.company
    );


  const location =
    escapeTelegramHtml(
      job.location
    );


  const salary =
    escapeTelegramHtml(
      job.salary
    );


  const employment =
    escapeTelegramHtml(
      job.employmentType
    );


  const applicationUrl =
    job.applicationUrl;


  let message =

`🇳🇬 <b>NAIJA REMOTE JOB ALERT</b>

💼 <b>${title}</b>

🏢 Company: ${company}

🌍 Location: ${location}

🏠 <b>FULLY REMOTE — WORK FROM NIGERIA</b>

💰 Salary: ${salary}

🕐 Type: ${employment}

🇳🇬 Nigerians can apply from Nigeria

`;


  if (applicationUrl) {

    message +=
      `\n👉 <a href="${applicationUrl}">APPLY FOR THIS JOB</a>\n`;
  }


  message +=
    `\n🔎 Source: Himalayas`;


  return message;
}


// ============================================================
// SEND TELEGRAM MESSAGE
// ============================================================

async function sendTelegramMessage(
  text
) {

  if (
    !TELEGRAM_ENABLED
  ) {

    throw new Error(
      "Telegram is not configured"
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
          TELEGRAM_CHAT_ID,

        text,

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
      `Telegram HTTP ${response.status}`

    );
  }


  return data;
}


// ============================================================
// POST NEW JOBS TO TELEGRAM
// ============================================================

async function postNewJobsToTelegram(
  jobs
) {

  if (
    !TELEGRAM_ENABLED
  ) {

    console.log(
      "Telegram is not configured. Skipping Telegram posting."
    );

    return {

      enabled: false,

      posted: 0,

      skipped: jobs.length

    };
  }


  let posted = 0;


  for (
    const job of jobs
  ) {

    const key =
      String(job.id);


    // Already posted during
    // this server session
    if (
      postedTelegramJobs.has(key)
    ) {

      continue;
    }


    try {

      const message =
        createTelegramJobMessage(
          job
        );


      await sendTelegramMessage(
        message
      );


      postedTelegramJobs.add(
        key
      );


      posted++;


      console.log(
        `📨 Telegram posted: ${job.title}`
      );


      // Don't send hundreds
      // of messages at once.
      await sleep(1500);

    } catch (error) {

      console.error(
        `Telegram posting failed for "${job.title}": ${error.message}`
      );
    }
  }


  return {

    enabled: true,

    posted,

    skipped:
      jobs.length - posted

  };
}


// ============================================================
// HOME
// ============================================================

app.get("/", (req, res) => {

  res.json({

    success: true,

    message:
      "International Remote Jobs API is running",

    server:
      "JobFinder",

    source:
      "Himalayas",

    endpoint:
      "/api/jobs/remote",

    telegram:
      TELEGRAM_ENABLED
        ? "enabled"
        : "not configured",

    rules: {

      international:
        true,

      fullyRemote:
        true,

      nigeriaEligible:
        true

    }

  });
});


// ============================================================
// HEALTH
// ============================================================

app.get(
  "/api/health",
  (req, res) => {

    res.json({

      success: true,

      status:
        "online",

      server:
        "International Remote Jobs API",

      source:
        "Himalayas",

      searchCategories:
        SEARCH_TERMS.length,

      maxPages:
        MAX_PAGES,

      maxResults:
        MAX_RESULTS,

      cacheJobs:
        jobsCache.jobs.length,

      telegram: {

        enabled:
          TELEGRAM_ENABLED,

        channelConfigured:
          Boolean(
            TELEGRAM_CHAT_ID
          )

      }

    });
  }
);


// ============================================================
// TEST HIMALAYAS
// ============================================================

app.get(
  "/api/test-himalayas",
  async (req, res) => {

    try {

      const jobs =
        await searchHimalayas(
          "",
          1
        );


      res.json({

        success:
          true,

        count:
          jobs.length,

        source:
          "Himalayas",

        api:
          HIMALAYAS_API,

        sample:
          jobs.slice(0, 5)

      });

    } catch (error) {

      res.status(500).json({

        success:
          false,

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
          req.query.search ||
          ""
        )

          .trim()
          .toLowerCase();


      let jobs =
        await getRemoteJobs();


      if (search) {

        jobs =
          jobs.filter(
            job => {

              const text = [

                job.title,
                job.company,
                job.description,
                job.excerpt,
                job.location,
                job.employmentType,
                job.salary

              ]

                .map(textValue)

                .join(" ")

                .toLowerCase();


              return text.includes(
                search
              );
            }
          );
      }


      res.json({

        success:
          true,

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

        success:
          false,

        message:
          "Unable to load remote jobs",

        error:
          error.message,

        jobs: []

      });
    }
  }
);


// ============================================================
// MANUAL REFRESH
// ============================================================

app.get(
  "/api/jobs/refresh",
  async (req, res) => {

    try {

      const jobs =
        await getRemoteJobs(
          true
        );


      const telegram =
        await postNewJobsToTelegram(
          jobs
        );


      res.json({

        success:
          true,

        message:
          "Jobs refreshed",

        count:
          jobs.length,

        telegram

      });

    } catch (error) {

      console.error(
        "Refresh error:",
        error
      );


      res.status(500).json({

        success:
          false,

        error:
          error.message

      });
    }
  }
);


// ============================================================
// TELEGRAM TEST
// ============================================================

app.get(
  "/api/telegram-test",
  async (req, res) => {

    try {

      if (
        !TELEGRAM_ENABLED
      ) {

        return res.status(400).json({

          success:
            false,

          message:
            "Telegram is not configured",

          required: [

            "TELEGRAM_BOT_TOKEN",
            "TELEGRAM_CHAT_ID"

          ]

        });
      }


      const result =
        await sendTelegramMessage(

`<b>✅ TELEGRAM TEST SUCCESSFUL</b>

🇳🇬 Naija Remote Jobs

🤖 Your bot can post messages to this channel.

📢 Channel: @remoteNaijajob

🔄 Automatic job alerts are ready.`

        );


      res.json({

        success:
          true,

        message:
          "Telegram test message sent successfully",

        telegram:
          result

      });

    } catch (error) {

      console.error(
        "Telegram test error:",
        error
      );


      res.status(500).json({

        success:
          false,

        message:
          "Telegram test failed",

        error:
          error.message

      });
    }
  }
);


// ============================================================
// AUTOMATIC JOB REFRESH
// ============================================================

const AUTO_REFRESH_INTERVAL =
  30 * 60 * 1000; // 30 minutes


let automaticRefreshRunning =
  false;


async function automaticJobRefresh() {

  if (
    automaticRefreshRunning
  ) {

    console.log(
      "⏳ Previous refresh still running. Skipping."
    );

    return;
  }


  automaticRefreshRunning =
    true;


  try {

    console.log(
      "🔄 Automatic job refresh started..."
    );


    const jobs =
      await getRemoteJobs(
        true
      );


    console.log(
      `✅ Automatic refresh found ${jobs.length} eligible jobs`
    );


    const telegram =
      await postNewJobsToTelegram(
        jobs
      );


    console.log(
      `📨 Telegram new posts: ${telegram.posted}`
    );

  } catch (error) {

    console.error(
      "❌ Automatic refresh failed:",
      error.message
    );

  } finally {

    automaticRefreshRunning =
      false;
  }
}


// ============================================================
// START AUTOMATIC REFRESH
// ============================================================

// Wait 60 seconds after startup.
// This prevents immediately hammering
// Himalayas during every Render restart.

setTimeout(
  automaticJobRefresh,
  60 * 1000
);


// Run every 30 minutes

setInterval(
  automaticJobRefresh,
  AUTO_REFRESH_INTERVAL
);


// ============================================================
// 404
// ============================================================

app.use(
  (req, res) => {

    res.status(404).json({

      success:
        false,

      message:
        "Endpoint not found",

      path:
        req.originalUrl

    });
  }
);


// ============================================================
// ERROR HANDLER
// ============================================================

app.use(
  (
    error,
    req,
    res,
    next
  ) => {

    console.error(
      "Server error:",
      error
    );


    res.status(500).json({

      success:
        false,

      message:
        "Internal server error",

      error:
        error.message

    });
  }
);


// ============================================================
// START SERVER
// ============================================================

app.listen(
  PORT,
  () => {

    console.log(
      "================================================"
    );

    console.log(
      "International Remote Jobs API"
    );

    console.log(
      `Server running on port ${PORT}`
    );

    console.log(
      `Himalayas API: ${HIMALAYAS_API}`
    );

    console.log(
      `Search categories: ${SEARCH_TERMS.length}`
    );

    console.log(
      `Pages per search: ${MAX_PAGES}`
    );

    console.log(
      `Maximum results: ${MAX_RESULTS}`
    );

    console.log(
      "Nigeria eligibility: ENABLED"
    );

    console.log(
      "Fully remote: ENABLED"
    );

    console.log(
      `Telegram: ${
        TELEGRAM_ENABLED
          ? "ENABLED"
          : "NOT CONFIGURED"
      }`
    );

    console.log(
      "================================================"
    );
  }
);
