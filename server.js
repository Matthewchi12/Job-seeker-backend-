// ============================================================
// INTERNATIONAL REMOTE JOBS BACKEND
// FOR NIGERIANS
//
// SOURCE:
// Himalayas Remote Jobs API
//
// OPTIONAL:
// Hunter API for publicly available company emails
//
// TELEGRAM:
// Existing Telegram bot can automatically post jobs
//
// IMPORTANT:
// - Remote jobs Nigerians can work from Nigeria
// - Worldwide remote jobs
// - Nigeria-specific remote jobs
// - Visa sponsorship jobs
// - Never invent emails
// ============================================================

const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 10000;


// ============================================================
// API URLS
// ============================================================

const HIMALAYAS_SEARCH_API =
  "https://himalayas.app/jobs/api/search";

const HIMALAYAS_BROWSE_API =
  "https://himalayas.app/jobs/api";

const HUNTER_API =
  "https://api.hunter.io/v2";


// ============================================================
// CACHE
// ============================================================

const cache = new Map();

const CACHE_TIME =
  30 * 60 * 1000;


// ============================================================
// TELEGRAM
// ============================================================

const TELEGRAM_BOT_TOKEN =
  process.env.TELEGRAM_BOT_TOKEN || "";

const TELEGRAM_CHANNEL_ID =
  process.env.TELEGRAM_CHANNEL_ID || "";

const TELEGRAM_API =
  "https://api.telegram.org";


// Keep IDs in memory to reduce duplicates.
// Note: Render restarts clear this memory.
const telegramPostedJobs =
  new Set();


// ============================================================
// FETCH HELPER
// ============================================================

async function fetchJson(url) {

  const response =
    await fetch(url);

  if (!response.ok) {

    const text =
      await response.text();

    throw new Error(
      `HTTP ${response.status}: ${text.slice(0, 300)}`
    );
  }

  return await response.json();
}


// ============================================================
// CLEAN HTML
// ============================================================

function cleanHtml(html = "") {

  return String(html)

    .replace(
      /<script[^>]*>[\s\S]*?<\/script>/gi,
      ""
    )

    .replace(
      /<style[^>]*>[\s\S]*?<\/style>/gi,
      ""
    )

    .replace(
      /<[^>]+>/g,
      " "
    )

    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"')

    .replace(
      /\s+/g,
      " "
    )

    .trim();
}


// ============================================================
// JOB TEXT
// ============================================================

function getJobText(job) {

  return cleanHtml(

    `${job.title || ""} ` +
    `${job.excerpt || ""} ` +
    `${job.description || ""} ` +

    `${
      Array.isArray(job.categories)
        ? job.categories.join(" ")
        : ""
    } ` +

    `${
      Array.isArray(job.parentCategories)
        ? job.parentCategories.join(" ")
        : ""
    }`

  ).toLowerCase();
}


// ============================================================
// LOCATION
// ============================================================

function getLocations(job) {

  return Array.isArray(
    job.locationRestrictions
  )
    ? job.locationRestrictions
    : [];
}


// ============================================================
// NIGERIA ELIGIBILITY
//
// Empty locationRestrictions = worldwide
// Nigeria = accepted
// Africa = accepted
// ============================================================

function isNigeriaEligible(job) {

  const locations =
    getLocations(job);


  // Worldwide
  if (
    locations.length === 0
  ) {

    return {
      eligible: true,
      reason: "worldwide"
    };
  }


  // Nigeria
  const nigeria =
    locations.some(location => {

      const alpha2 =
        String(
          location?.alpha2 || ""
        ).toLowerCase();

      const name =
        String(
          location?.name || ""
        ).toLowerCase();

      const slug =
        String(
          location?.slug || ""
        ).toLowerCase();

      return (
        alpha2 === "ng" ||
        name === "nigeria" ||
        slug === "nigeria"
      );
    });


  if (nigeria) {

    return {
      eligible: true,
      reason: "nigeria"
    };
  }


  // Africa
  const africa =
    locations.some(location => {

      const name =
        String(
          location?.name || ""
        ).toLowerCase();

      const slug =
        String(
          location?.slug || ""
        ).toLowerCase();

      return (
        name === "africa" ||
        slug === "africa"
      );
    });


  if (africa) {

    return {
      eligible: true,
      reason: "africa"
    };
  }


  return {
    eligible: false,
    reason: "other_country"
  };
}


// ============================================================
// REMOTE CHECK
//
// Himalayas is already a remote-jobs API.
// Only reject clearly onsite-only jobs.
// ============================================================

function isRemote(job) {

  const text =
    getJobText(job);


  const badTerms = [

    "on-site only",
    "onsite only",
    "on site only",

    "office based only",
    "office-based only",

    "must work on site",
    "must work onsite",

    "must work in the office",

    "fully onsite",
    "fully on-site",

    "in-office only",
    "in office only"

  ];


  return !badTerms.some(
    term =>
      text.includes(term)
  );
}


// ============================================================
// FOREIGN-ONLY CHECK
// ============================================================

function isForeignOnly(job) {

  const text =
    getJobText(job);


  const badTerms = [

    "us residents only",
    "usa residents only",

    "uk residents only",

    "canada residents only",

    "australia residents only",

    "united states residents only",

    "must be located in the united states",

    "must be located in the us",

    "must be located in the usa",

    "must reside in the united states",

    "must reside in the us",

    "must reside in the usa",

    "must be based in the united states",

    "must be based in the us",

    "must be based in the usa"

  ];


  return badTerms.some(
    term =>
      text.includes(term)
  );
}


// ============================================================
// SEARCH HIMALAYAS
// ============================================================

async function searchHimalayas({
  search = "",
  country = "",
  worldwide = false,
  page = 1
}) {

  const url =
    new URL(
      HIMALAYAS_SEARCH_API
    );


  if (search) {

    url.searchParams.set(
      "q",
      search
    );
  }


  if (country) {

    url.searchParams.set(
      "country",
      country
    );
  }


  if (worldwide) {

    url.searchParams.set(
      "worldwide",
      "true"
    );
  }


  url.searchParams.set(
    "sort",
    "recent"
  );


  url.searchParams.set(
    "page",
    String(page)
  );


  console.log(
    "Himalayas:",
    url.toString()
  );


  const data =
    await fetchJson(
      url.toString()
    );


  return {

    jobs:
      Array.isArray(data.jobs)
        ? data.jobs
        : [],

    totalCount:
      Number(
        data.totalCount || 0
      )

  };
}


// ============================================================
// GET REMOTE JOBS
// ============================================================

async function getRemoteJobs(
  search = "",
  page = 1
) {

  const cacheKey =
    `remote:${search}:${page}`;


  const cached =
    cache.get(cacheKey);


  if (
    cached &&
    Date.now() - cached.time <
      CACHE_TIME
  ) {

    return cached.data;
  }


  let nigeriaJobs = [];
  let worldwideJobs = [];

  let nigeriaTotal = 0;
  let worldwideTotal = 0;


  // ==========================================================
  // NIGERIA
  // ==========================================================

  try {

    const result =
      await searchHimalayas({

        search,

        country: "NG",

        worldwide: false,

        page

      });


    nigeriaJobs =
      result.jobs;

    nigeriaTotal =
      result.totalCount;

  } catch (error) {

    console.error(
      "Nigeria Himalayas error:",
      error.message
    );
  }


  // ==========================================================
  // WORLDWIDE
  // ==========================================================

  try {

    const result =
      await searchHimalayas({

        search,

        worldwide: true,

        page

      });


    worldwideJobs =
      result.jobs;

    worldwideTotal =
      result.totalCount;

  } catch (error) {

    console.error(
      "Worldwide Himalayas error:",
      error.message
    );
  }


  // ==========================================================
  // COMBINE
  // ==========================================================

  const combined = [

    ...nigeriaJobs,

    ...worldwideJobs

  ];


  // ==========================================================
  // DEDUPLICATE
  // ==========================================================

  const seen =
    new Set();


  const unique =
    combined.filter(job => {

      const key =
        job.guid ||
        job.applicationLink ||
        `${job.companySlug || ""}-${job.title || ""}`;


      if (
        seen.has(key)
      ) {

        return false;
      }


      seen.add(key);

      return true;
    });


  // ==========================================================
  // FILTER
  // ==========================================================

  const accepted = [];


  for (
    const job of unique
  ) {

    const eligibility =
      isNigeriaEligible(job);


    if (
      !eligibility.eligible
    ) {

      continue;
    }


    if (
      !isRemote(job)
    ) {

      continue;
    }


    if (
      isForeignOnly(job)
    ) {

      continue;
    }


    accepted.push(job);
  }


  // ==========================================================
  // FORMAT
  // ==========================================================

  const formatted =
    accepted.map(
      job =>
        formatJob(
          job,
          false
        )
    );


  const result = {

    jobs: formatted,

    totalNigeria:
      nigeriaTotal,

    totalWorldwide:
      worldwideTotal,

    total:
      formatted.length

  };


  cache.set(
    cacheKey,
    {
      time: Date.now(),
      data: result
    }
  );


  return result;
}


// ============================================================
// EMAIL EXTRACTION
// ============================================================

function extractEmails(job) {

  const text =
    cleanHtml(

      `${job.description || ""} ` +
      `${job.excerpt || ""}`

    );


  const matches =
    text.match(
      /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi
    ) || [];


  return [
    ...new Set(
      matches.map(
        email =>
          email.toLowerCase()
      )
    )
  ];
}


// ============================================================
// URL EXTRACTION
// ============================================================

function extractUrls(job) {

  const text =
    `${job.description || ""} ${job.excerpt || ""}`;


  const matches =
    text.match(
      /https?:\/\/[^\s"'<>]+/gi
    ) || [];


  return [
    ...new Set(

      matches

        .map(
          url =>
            url.replace(
              /[),.;]+$/,
              ""
            )
        )

        .filter(url => {

          try {

            const host =
              new URL(url)
                .hostname
                .toLowerCase();


            return (

              !host.includes(
                "himalayas.app"
              ) &&

              !host.includes(
                "linkedin.com"
              ) &&

              !host.includes(
                "indeed.com"
              )

            );

          } catch {

            return false;
          }
        })

    )
  ];
}


// ============================================================
// APPLICATION
// ============================================================

function getApplication(job) {

  const emails =
    extractEmails(job);


  const urls =
    extractUrls(job);


  const applicationLink =
    String(
      job.applicationLink || ""
    ).trim();


  if (
    emails.length
  ) {

    return {

      type: "email",

      email:
        emails[0],

      url:
        applicationLink ||
        urls[0] ||
        ""

    };
  }


  if (
    applicationLink
  ) {

    return {

      type:
        "application_link",

      email: "",

      url:
        applicationLink

    };
  }


  if (
    urls.length
  ) {

    return {

      type:
        "company_website",

      email: "",

      url:
        urls[0]

    };
  }


  return {

    type:
      "application_only",

    email: "",

    url: ""

  };
}


// ============================================================
// JOB CATEGORY
// ============================================================

function getJobType(job) {

  const text =
    getJobText(job);


  if (
    /customer support|customer service|customer care|chat support|live chat|help desk/
      .test(text)
  ) {
    return "Customer Service";
  }


  if (
    /sales|business development|appointment setter|lead generation/
      .test(text)
  ) {
    return "Sales";
  }


  if (
    /virtual assistant|administrative assistant|executive assistant|personal assistant/
      .test(text)
  ) {
    return "Virtual Assistant";
  }


  if (
    /data entry|data processing/
      .test(text)
  ) {
    return "Data Entry";
  }


  if (
    /data annotation|data labeling|ai trainer|ai evaluator|ai rater/
      .test(text)
  ) {
    return "AI & Data Annotation";
  }


  if (
    /social media|community manager/
      .test(text)
  ) {
    return "Social Media";
  }


  if (
    /marketing|digital marketing|growth marketing/
      .test(text)
  ) {
    return "Marketing";
  }


  if (
    /content writer|content creator|copywriter|blog writer/
      .test(text)
  ) {
    return "Writing";
  }


  if (
    /graphic designer|graphic design|canva designer/
      .test(text)
  ) {
    return "Graphic Design";
  }


  if (
    /customer success|client success|customer experience/
      .test(text)
  ) {
    return "Customer Success";
  }


  if (
    /account manager|account management/
      .test(text)
  ) {
    return "Account Management";
  }


  if (
    /recruiter|recruitment|talent acquisition|human resources/
      .test(text)
  ) {
    return "Recruitment & HR";
  }


  if (
    /bookkeeper|bookkeeping|accounting|finance/
      .test(text)
  ) {
    return "Finance";
  }


  if (
    /ecommerce|e-commerce|shopify/
      .test(text)
  ) {
    return "E-commerce";
  }


  if (
    /research assistant|research analyst|research specialist/
      .test(text)
  ) {
    return "Research";
  }


  if (
    /online tutor|online teacher|tutor|teacher/
      .test(text)
  ) {
    return "Education";
  }


  if (
    /healthcare|medical writer|clinical research/
      .test(text)
  ) {
    return "Healthcare";
  }


  if (
    /project coordinator|project assistant|project manager/
      .test(text)
  ) {
    return "Project Management";
  }


  if (
    /web developer|frontend developer|front-end developer/
      .test(text)
  ) {
    return "Web Development";
  }


  if (
    /software developer|software engineer|programmer/
      .test(text)
  ) {
    return "Software Development";
  }


  return "Other Remote Job";
}


// ============================================================
// SALARY
// ============================================================

function formatSalary(job) {

  const min =
    job.minSalary;

  const max =
    job.maxSalary;


  if (
    min === null ||
    min === undefined
  ) {

    return "Salary not specified";
  }


  let result =
    `${job.currency || ""} ${Number(min).toLocaleString()}`;


  if (
    max !== null &&
    max !== undefined
  ) {

    result +=
      ` - ${Number(max).toLocaleString()}`;
  }


  if (
    job.salaryPeriod
  ) {

    result +=
      ` / ${job.salaryPeriod}`;
  }


  return result.trim();
}


// ============================================================
// FORMAT JOB
// ============================================================

function formatJob(
  job,
  visa = false
) {

  const restrictions =
    getLocations(job);


  let location =
    "Remote — Nigeria eligible";


  if (
    restrictions.length
  ) {

    const names =
      restrictions

        .map(
          item =>
            item?.name ||
            item?.alpha2 ||
            item?.slug ||
            ""
        )

        .filter(Boolean);


    if (
      names.length
    ) {

      location =
        `Remote — ${names.join(", ")}`;
    }
  }


  const application =
    getApplication(job);


  return {

    id:
      job.guid ||
      `${job.companySlug || "company"}-${job.title || "job"}`,

    title:
      job.title ||
      "Remote Job",

    company:
      job.companyName ||
      "Company not specified",

    companySlug:
      job.companySlug || "",

    companyLogo:
      job.companyLogo || "",

    location,

    locationRestrictions:
      restrictions,

    timezoneRestrictions:
      Array.isArray(
        job.timezoneRestrictions
      )
        ? job.timezoneRestrictions
        : [],

    description:
      cleanHtml(
        job.description ||
        job.excerpt ||
        ""
      ),

    excerpt:
      cleanHtml(
        job.excerpt ||
        ""
      ),

    applyUrl:
      application.url || "",

    applyEmail:
      application.email || "",

    applyMethod:
      application.type,

    salary_min:
      job.minSalary ?? null,

    salary_max:
      job.maxSalary ?? null,

    salary_period:
      job.salaryPeriod || "",

    currency:
      job.currency || "",

    salary:
      formatSalary(job),

    employmentType:
      job.employmentType || "",

    type:
      job.employmentType ||
      "Full Time",

    seniority:
      Array.isArray(job.seniority)
        ? job.seniority.join(", ")
        : "",

    category:
      Array.isArray(job.categories)
        ? job.categories.join(", ")
        : "",

    parentCategory:
      Array.isArray(job.parentCategories)
        ? job.parentCategories.join(", ")
        : "",

    jobType:
      getJobType(job),

    remote:
      true,

    nigeriaFriendly:
      !visa,

    visaSponsorship:
      visa,

    created:
      job.pubDate
        ? new Date(
            job.pubDate
          ).toISOString()
        : "",

    expiryDate:
      job.expiryDate
        ? new Date(
            job.expiryDate
          ).toISOString()
        : "",

    source:
      "Himalayas",

    sourceUrl:
      "https://himalayas.app/",

    sourceNotice:
      "Job data sourced from Himalayas"

  };
}


// ============================================================
// VISA JOBS
// ============================================================

async function getVisaJobs(
  search = "",
  page = 1
) {

  const cacheKey =
    `visa:${search}:${page}`;


  const cached =
    cache.get(cacheKey);


  if (
    cached &&
    Date.now() - cached.time <
      CACHE_TIME
  ) {

    return cached.data;
  }


  const searches =
    search
      ? [search]
      : [

          "visa sponsorship",
          "visa sponsored",
          "work visa",
          "employer sponsorship",
          "work permit",
          "skilled worker",
          "sponsorship available"

        ];


  const allJobs = [];


  for (
    const term of searches
  ) {

    try {

      const result =
        await searchHimalayas({

          search:
            term,

          page

        });


      allJobs.push(
        ...result.jobs
      );

    } catch (error) {

      console.error(
        `Visa search failed: ${term}`,
        error.message
      );
    }
  }


  const seen =
    new Set();


  const unique =
    allJobs.filter(job => {

      const key =
        job.guid ||
        job.applicationLink ||
        `${job.companySlug || ""}-${job.title || ""}`;


      if (
        seen.has(key)
      ) {

        return false;
      }


      seen.add(key);

      return true;
    });


  const strongVisa = [

    "visa sponsorship",
    "visa sponsored",
    "work visa sponsorship",
    "employer sponsorship",
    "employer sponsored",
    "work permit sponsorship",
    "work permit sponsored",
    "skilled worker sponsorship",
    "sponsorship available",
    "sponsor visa",
    "visa support",
    "immigration sponsorship",
    "will sponsor",
    "sponsor a work visa",
    "sponsorship provided",
    "visa assistance"

  ];


  const negativeVisa = [

    "no visa sponsorship",
    "no sponsorship",
    "visa sponsorship not available",
    "visa sponsorship unavailable",
    "we do not sponsor",
    "we don't sponsor",
    "cannot sponsor",
    "can't sponsor",
    "unable to sponsor",
    "not able to sponsor"

  ];


  const accepted =
    unique.filter(job => {

      const text =
        getJobText(job);


      const negative =
        negativeVisa.some(
          term =>
            text.includes(term)
        );


      if (
        negative
      ) {

        return false;
      }


      return strongVisa.some(
        term =>
          text.includes(term)
      );
    });


  const formatted =
    accepted
      .slice(0, 50)
      .map(
        job =>
          formatJob(
            job,
            true
          )
      );


  const result = {

    jobs:
      formatted,

    total:
      formatted.length

  };


  cache.set(
    cacheKey,
    {
      time: Date.now(),
      data: result
    }
  );


  return result;
}


// ============================================================
// TELEGRAM HTML ESCAPE
// ============================================================

function telegramEscape(value = "") {

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}


// ============================================================
// TELEGRAM POST
// ============================================================

async function sendTelegramJob(job) {

  if (
    !TELEGRAM_BOT_TOKEN ||
    !TELEGRAM_CHANNEL_ID
  ) {

    return {

      success: false,

      skipped: true,

      reason:
        "Telegram environment variables are missing"

    };
  }


  const jobId =
    String(job.id || "");


  if (
    telegramPostedJobs.has(jobId)
  ) {

    return {

      success: true,

      skipped: true,

      reason:
        "Already posted"

    };
  }


  const title =
    telegramEscape(
      job.title
    );


  const company =
    telegramEscape(
      job.company
    );


  const location =
    telegramEscape(
      job.location
    );


  const salary =
    telegramEscape(
      job.salary
    );


  const type =
    telegramEscape(
      job.jobType
    );


  let message =

`<b>🇳🇬 NEW REMOTE JOB</b>

<b>${title}</b>

🏢 <b>Company:</b> ${company}
🌍 <b>Location:</b> ${location}
💼 <b>Category:</b> ${type}
💰 <b>Salary:</b> ${salary}`;


  if (
    job.employmentType
  ) {

    message +=
      `\n📋 <b>Type:</b> ${telegramEscape(job.employmentType)}`;
  }


  if (
    job.seniority
  ) {

    message +=
      `\n🎯 <b>Level:</b> ${telegramEscape(job.seniority)}`;
  }


  message +=

`

🔗 <a href="${job.applyUrl || "https://himalayas.app/"}">APPLY FOR THIS JOB</a>

📌 Source: Himalayas`;


  // Telegram messages have a maximum length.
  if (
    message.length > 3900
  ) {

    message =
      message.slice(
        0,
        3900
      ) +
      "\n\n🔗 Apply: " +
      job.applyUrl;
  }


  const url =
    `${TELEGRAM_API}/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;


  const response =
    await fetch(
      url,
      {

        method:
          "POST",

        headers: {
          "Content-Type":
            "application/json"
        },

        body:
          JSON.stringify({

            chat_id:
              TELEGRAM_CHANNEL_ID,

            text:
              message,

            parse_mode:
              "HTML",

            disable_web_page_preview:
              false

          })

      }
    );


  const data =
    await response.json();


  if (
    !response.ok ||
    !data.ok
  ) {

    throw new Error(
      data?.description ||
      `Telegram HTTP ${response.status}`
    );
  }


  telegramPostedJobs.add(
    jobId
  );


  return {

    success: true,

    messageId:
      data?.result?.message_id || null

  };
}


// ============================================================
// POST JOBS TO TELEGRAM
// ============================================================

async function postJobsToTelegram(
  jobs,
  limit = 10
) {

  if (
    !TELEGRAM_BOT_TOKEN ||
    !TELEGRAM_CHANNEL_ID
  ) {

    return {

      enabled: false,

      posted: 0,

      skipped: 0,

      errors: []

    };
  }


  let posted = 0;
  let skipped = 0;

  const errors = [];


  for (
    const job of jobs.slice(
      0,
      limit
    )
  ) {

    try {

      const result =
        await sendTelegramJob(job);


      if (
        result.skipped
      ) {

        skipped++;

      } else {

        posted++;
      }


      // Small delay to avoid hammering Telegram.
      await new Promise(
        resolve =>
          setTimeout(
            resolve,
            1000
          )
      );

    } catch (error) {

      console.error(
        "Telegram post error:",
        error.message
      );


      errors.push({

        job:
          job.title,

        error:
          error.message

      });
    }
  }


  return {

    enabled: true,

    posted,

    skipped,

    errors

  };
}


// ============================================================
// HOME
// ============================================================

app.get(
  "/",
  (req, res) => {

    res.json({

      success: true,

      status:
        "online",

      message:
        "International Remote Jobs API is running",

      source:
        "Himalayas",

      hunter:
        process.env.HUNTER_API_KEY
          ? "enabled"
          : "disabled",

      telegram:
        TELEGRAM_BOT_TOKEN &&
        TELEGRAM_CHANNEL_ID
          ? "enabled"
          : "disabled",

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


      const page =
        Math.max(
          1,
          parseInt(
            req.query.page || "1",
            10
          )
        );


      const result =
        await getRemoteJobs(
          search,
          page
        );


      res.json({

        success: true,

        type:
          "international-remote",

        applicants:
          "Nigeria",

        count:
          result.jobs.length,

        totalNigeria:
          result.totalNigeria,

        totalWorldwide:
          result.totalWorldwide,

        page,

        jobs:
          result.jobs

      });

    } catch (error) {

      console.error(
        error
      );


      res.status(500).json({

        success: false,

        error:
          "Failed to fetch jobs",

        message:
          error.message

      });
    }
  }
);


// ============================================================
// VISA
// ============================================================

app.get(
  "/api/jobs/visa",
  async (req, res) => {

    try {

      const search =
        String(
          req.query.search || ""
        ).trim();


      const page =
        Math.max(
          1,
          parseInt(
            req.query.page || "1",
            10
          )
        );


      const result =
        await getVisaJobs(
          search,
          page
        );


      res.json({

        success: true,

        type:
          "visa-sponsorship",

        applicants:
          "Nigeria",

        count:
          result.jobs.length,

        page,

        jobs:
          result.jobs

      });

    } catch (error) {

      console.error(
        error
      );


      res.status(500).json({

        success: false,

        error:
          "Failed to fetch visa jobs",

        message:
          error.message

      });
    }
  }
);


// ============================================================
// HIMALAYAS TEST
// ============================================================

app.get(
  "/api/test-himalayas",
  async (req, res) => {

    try {

      const result =
        await searchHimalayas({

          country:
            "NG",

          page:
            1

        });


      res.json({

        success: true,

        total:
          result.totalCount,

        returned:
          result.jobs.length,

        jobs:
          result.jobs
            .slice(0, 10)
            .map(job => ({

              title:
                job.title,

              company:
                job.companyName,

              location:
                job.locationRestrictions,

              application:
                job.applicationLink,

              guid:
                job.guid

            }))

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
// DEBUG
// ============================================================

app.get(
  "/api/jobs/remote/debug",
  async (req, res) => {

    try {

      const search =
        String(
          req.query.search || ""
        ).trim();


      const nigeria =
        await searchHimalayas({

          search,

          country:
            "NG",

          page:
            1

        });


      const worldwide =
        await searchHimalayas({

          search,

          worldwide:
            true,

          page:
            1

        });


      res.json({

        success: true,

        search,

        nigeriaRawCount:
          nigeria.jobs.length,

        nigeriaTotal:
          nigeria.totalCount,

        worldwideRawCount:
          worldwide.jobs.length,

        worldwideTotal:
          worldwide.totalCount,

        jobs: [

          ...nigeria.jobs,

          ...worldwide.jobs

        ].slice(0, 50).map(job => ({

          title:
            job.title,

          company:
            job.companyName,

          locations:
            job.locationRestrictions,

          nigeria:
            isNigeriaEligible(job),

          remote:
            isRemote(job),

          foreignOnly:
            isForeignOnly(job),

          application:
            job.applicationLink

        }))

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
// TELEGRAM TEST
// ============================================================

app.get(
  "/api/telegram/test",
  async (req, res) => {

    try {

      if (
        !TELEGRAM_BOT_TOKEN
      ) {

        return res.status(400).json({

          success: false,

          error:
            "TELEGRAM_BOT_TOKEN is missing"

        });
      }


      if (
        !TELEGRAM_CHANNEL_ID
      ) {

        return res.status(400).json({

          success: false,

          error:
            "TELEGRAM_CHANNEL_ID is missing"

        });
      }


      const url =
        `${TELEGRAM_API}/bot${TELEGRAM_BOT_TOKEN}/getMe`;


      const response =
        await fetch(url);


      const data =
        await response.json();


      if (
        !response.ok ||
        !data.ok
      ) {

        return res.status(400).json({

          success: false,

          error:
            data.description ||
            "Telegram bot test failed"

        });
      }


      res.json({

        success: true,

        message:
          "Telegram bot token is working",

        bot: {

          id:
            data.result.id,

          username:
            data.result.username,

          name:
            data.result.first_name

        },

        channel:
          TELEGRAM_CHANNEL_ID

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
// MANUAL TELEGRAM POST
// ============================================================

app.get(
  "/api/telegram/post",
  async (req, res) => {

    try {

      const result =
        await getRemoteJobs(
          "",
          1
        );


      const telegram =
        await postJobsToTelegram(
          result.jobs,
          10
        );


      res.json({

        success: true,

        jobsFound:
          result.jobs.length,

        telegram

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
// AUTOMATIC TELEGRAM JOB CHECK
//
// Checks every 6 hours while the Render process is running.
// ============================================================

async function automaticTelegramCheck() {

  if (
    !TELEGRAM_BOT_TOKEN ||
    !TELEGRAM_CHANNEL_ID
  ) {

    console.log(
      "Telegram automatic posting: DISABLED"
    );

    return;
  }


  try {

    console.log(
      "Checking jobs for Telegram..."
    );


    const result =
      await getRemoteJobs(
        "",
        1
      );


    console.log(
      `Telegram job check found ${result.jobs.length} jobs`
    );


    const telegram =
      await postJobsToTelegram(
        result.jobs,
        10
      );


    console.log(
      "Telegram result:",
      telegram
    );

  } catch (error) {

    console.error(
      "Automatic Telegram check failed:",
      error.message
    );
  }
}


// ============================================================
// START
// ============================================================

app.listen(
  PORT,
  () => {

    console.log(
      `Server running on port ${PORT}`
    );


    console.log(
      `Hunter: ${
        process.env.HUNTER_API_KEY
          ? "ENABLED"
          : "DISABLED"
      }`
    );


    console.log(
      `Telegram: ${
        TELEGRAM_BOT_TOKEN &&
        TELEGRAM_CHANNEL_ID
          ? "ENABLED"
          : "DISABLED"
      }`
    );


    // Start Telegram check after server starts.
    setTimeout(
      automaticTelegramCheck,
      5000
    );


    // Check every 6 hours.
    setInterval(
      automaticTelegramCheck,
      6 * 60 * 60 * 1000
    );

  }
);
