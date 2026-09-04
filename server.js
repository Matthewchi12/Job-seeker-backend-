// ============================================================
// INTERNATIONAL REMOTE JOBS FOR NIGERIANS
// ============================================================
//
// PURPOSE:
// Find REAL international remote jobs that a person can
// apply for and work from Nigeria.
//
// SOURCE:
// Himalayas Remote Jobs API
//
// ACCEPTS:
// ✅ Worldwide remote jobs
// ✅ Nigeria-eligible remote jobs
// ✅ Africa-eligible remote jobs
//
// REJECTS:
// ❌ Onsite jobs
// ❌ Hybrid jobs
// ❌ Jobs restricted to another country
//
// ALSO:
// ✅ Search
// ✅ Pagination
// ✅ Salary
// ✅ Categories
// ✅ Application links
// ✅ Telegram auto-posting
// ✅ Debug endpoint
//
// ============================================================

const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 10000;


// ============================================================
// HIMALAYAS API
// ============================================================

const HIMALAYAS_SEARCH_API =
  "https://himalayas.app/jobs/api/search";


// ============================================================
// SETTINGS
// ============================================================

// Number of Himalayas pages to check.
// Each page can contain up to 20 jobs.
const MAX_PAGES = 3;

// Cache for 30 minutes.
// Himalayas itself refreshes its data approximately daily.
const CACHE_TIME =
  30 * 60 * 1000;

const cache = new Map();


// ============================================================
// TELEGRAM
// ============================================================

const TELEGRAM_BOT_TOKEN =
  process.env.TELEGRAM_BOT_TOKEN || "";

const TELEGRAM_CHANNEL_ID =
  process.env.TELEGRAM_CHANNEL_ID || "";

const TELEGRAM_API =
  "https://api.telegram.org";

const telegramPostedJobs =
  new Set();


// ============================================================
// FETCH JSON
// ============================================================

async function fetchJson(url) {

  const response = await fetch(url);

  const text =
    await response.text();

  if (!response.ok) {

    throw new Error(
      `HTTP ${response.status}: ${text.slice(0, 500)}`
    );
  }

  try {

    return JSON.parse(text);

  } catch {

    throw new Error(
      "Himalayas returned invalid JSON"
    );
  }
}


// ============================================================
// CLEAN HTML
// ============================================================

function cleanHtml(value = "") {

  return String(value)

    .replace(
      /<script[^>]*>[\s\S]*?<\/script>/gi,
      " "
    )

    .replace(
      /<style[^>]*>[\s\S]*?<\/style>/gi,
      " "
    )

    .replace(
      /<[^>]+>/g,
      " "
    )

    .replace(
      /&nbsp;/gi,
      " "
    )

    .replace(
      /&amp;/gi,
      "&"
    )

    .replace(
      /&lt;/gi,
      "<"
    )

    .replace(
      /&gt;/gi,
      ">"
    )

    .replace(
      /&#39;/gi,
      "'"
    )

    .replace(
      /&quot;/gi,
      '"'
    )

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
    `${Array.isArray(job.categories)
      ? job.categories.join(" ")
      : ""} ` +
    `${Array.isArray(job.parentCategories)
      ? job.parentCategories.join(" ")
      : ""}`

  ).toLowerCase();
}


// ============================================================
// LOCATION RESTRICTIONS
// ============================================================

function getLocations(job) {

  return Array.isArray(
    job.locationRestrictions
  )
    ? job.locationRestrictions
    : [];
}


// ============================================================
// GET LOCATION NAMES
// ============================================================

function getLocationNames(job) {

  return getLocations(job)
    .map(location => {

      return {

        alpha2:
          String(
            location?.alpha2 || ""
          ).toUpperCase(),

        name:
          String(
            location?.name || ""
          ).toLowerCase(),

        slug:
          String(
            location?.slug || ""
          ).toLowerCase()

      };

    });
}


// ============================================================
// NIGERIA ELIGIBILITY
// ============================================================
//
// IMPORTANT:
//
// locationRestrictions = []
// means WORLDWIDE.
//
// Nigeria:
// NG
//
// Africa-wide:
// Africa
//
// Any other specific country:
// reject
//
// ============================================================

function checkNigeriaEligibility(job) {

  const locations =
    getLocationNames(job);


  // ----------------------------------------------------------
  // WORLDWIDE
  // ----------------------------------------------------------

  if (
    locations.length === 0
  ) {

    return {

      eligible: true,

      reason:
        "worldwide",

      label:
        "Worldwide"

    };
  }


  // ----------------------------------------------------------
  // NIGERIA
  // ----------------------------------------------------------

  const nigeria =
    locations.some(location => {

      return (

        location.alpha2 === "NG" ||

        location.name === "nigeria" ||

        location.slug === "nigeria"

      );

    });


  if (nigeria) {

    return {

      eligible: true,

      reason:
        "nigeria",

      label:
        "Nigeria"

    };
  }


  // ----------------------------------------------------------
  // AFRICA
  // ----------------------------------------------------------

  const africa =
    locations.some(location => {

      return (

        location.name === "africa" ||

        location.slug === "africa"

      );

    });


  if (africa) {

    return {

      eligible: true,

      reason:
        "africa",

      label:
        "Africa"

    };
  }


  // ----------------------------------------------------------
  // COUNTRY RESTRICTED
  // ----------------------------------------------------------

  return {

    eligible: false,

    reason:
      "country_restricted",

    label:
      locations
        .map(location =>
          location.name
        )
        .join(", ")

  };
}


// ============================================================
// REMOTE CHECK
// ============================================================
//
// Himalayas is a remote-job API.
//
// We only reject jobs where the listing explicitly says
// hybrid/onsite.
//
// DO NOT reject simply because the description mentions
// "office", "New York", "relocation", etc.
// Those words can appear in legitimate remote jobs.
//
// ============================================================

function isFullyRemote(job) {

  const text =
    getJobText(job);


  const hardRejectTerms = [

    /\bhybrid\b/i,

    /\bhybrid remote\b/i,

    /\bremote\/hybrid\b/i,

    /\bremote \/ hybrid\b/i,

    /\bon[- ]site\b/i,

    /\bonsite\b/i,

    /\bwork from office\b/i,

    /\bworking from office\b/i,

    /\bmust work in office\b/i,

    /\bmust work onsite\b/i,

    /\bmust work on-site\b/i,

    /\bmust be onsite\b/i,

    /\bmust be on-site\b/i,

    /\boffice[- ]based role\b/i,

    /\boffice[- ]based position\b/i

  ];


  for (
    const pattern of hardRejectTerms
  ) {

    if (
      pattern.test(text)
    ) {

      return false;
    }
  }


  return true;
}


// ============================================================
// EXPLICIT FOREIGN-ONLY CHECK
// ============================================================
//
// This is an additional safety filter.
//
// ============================================================

function isForeignOnly(job) {

  const text =
    getJobText(job);


  const foreignOnlyPatterns = [

    /us residents only/i,

    /usa residents only/i,

    /u\.s\. residents only/i,

    /uk residents only/i,

    /canada residents only/i,

    /australia residents only/i,

    /united states residents only/i,

    /united kingdom residents only/i,

    /must be located in the united states/i,

    /must be located in the us\b/i,

    /must be located in the usa/i,

    /must reside in the united states/i,

    /must reside in the us\b/i,

    /must reside in the usa/i,

    /must be based in the united states/i,

    /must be based in the us\b/i,

    /must be based in the usa/i,

    /must live in the united states/i,

    /must live in the us\b/i,

    /only applicants in the us\b/i,

    /only applicants in the usa/i,

    /only applicants in the uk/i,

    /only applicants in canada/i

  ];


  return foreignOnlyPatterns.some(
    pattern =>
      pattern.test(text)
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


  return await fetchJson(
    url.toString()
  );
}


// ============================================================
// SEARCH MULTIPLE PAGES
// ============================================================

async function searchMultiplePages(options) {

  const allJobs = [];

  let totalCount = 0;


  for (
    let page = 1;
    page <= MAX_PAGES;
    page++
  ) {

    try {

      const data =
        await searchHimalayas({

          ...options,

          page

        });


      const jobs =
        Array.isArray(data.jobs)
          ? data.jobs
          : [];


      if (
        page === 1
      ) {

        totalCount =
          Number(
            data.totalCount || 0
          );
      }


      allJobs.push(
        ...jobs
      );


      // If fewer than 20 were returned,
      // there may be no more pages.
      if (
        jobs.length < 20
      ) {

        break;
      }

    } catch (error) {

      console.error(
        `Himalayas page ${page}:`,
        error.message
      );

      break;
    }
  }


  return {

    jobs:
      allJobs,

    totalCount

  };
}


// ============================================================
// DEDUPLICATE
// ============================================================

function deduplicateJobs(jobs) {

  const seen =
    new Set();


  return jobs.filter(job => {

    const key =
      String(

        job.guid ||

        job.applicationLink ||

        `${job.companySlug || ""}-${job.title || ""}`

      ).toLowerCase();


    if (
      seen.has(key)
    ) {

      return false;
    }


    seen.add(key);

    return true;

  });
}


// ============================================================
// APPLICATION EMAIL
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

        .map(url =>
          url.replace(
            /[),.;]+$/,
            ""
          )
        )

        .filter(url => {

          try {

            const hostname =
              new URL(url)
                .hostname
                .toLowerCase();


            const blocked = [

              "himalayas.app",

              "linkedin.com",

              "indeed.com"

            ];


            return !blocked.some(
              domain =>
                hostname.includes(
                  domain
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
// APPLICATION METHOD
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


  // Himalayas application link
  if (
    applicationLink
  ) {

    return {

      type:
        "application_link",

      url:
        applicationLink,

      email:
        emails[0] || ""

    };
  }


  // Email
  if (
    emails.length > 0
  ) {

    return {

      type:
        "email",

      url:
        urls[0] || "",

      email:
        emails[0]

    };
  }


  // Website
  if (
    urls.length > 0
  ) {

    return {

      type:
        "company_website",

      url:
        urls[0],

      email:
        ""

    };
  }


  return {

    type:
      "application_only",

    url:
      "",

    email:
      ""

  };
}


// ============================================================
// CATEGORY
// ============================================================

function getJobType(job) {

  const text =
    getJobText(job);


  const categories = [

    {
      name: "Customer Service",
      pattern:
        /customer support|customer service|customer care|chat support|live chat|help desk/
    },

    {
      name: "Sales",
      pattern:
        /sales representative|sales agent|business development|appointment setter|lead generation/
    },

    {
      name: "Virtual Assistant",
      pattern:
        /virtual assistant|administrative assistant|executive assistant|personal assistant/
    },

    {
      name: "Data Entry",
      pattern:
        /data entry|data processing/
    },

    {
      name: "AI & Data Annotation",
      pattern:
        /data annotation|data labeling|ai trainer|ai evaluator|ai rater|machine learning data/
    },

    {
      name: "Social Media",
      pattern:
        /social media|community manager/
    },

    {
      name: "Marketing",
      pattern:
        /digital marketing|growth marketing|marketing specialist/
    },

    {
      name: "Writing",
      pattern:
        /content writer|content creator|copywriter|blog writer/
    },

    {
      name: "Graphic Design",
      pattern:
        /graphic designer|graphic design|canva designer/
    },

    {
      name: "Customer Success",
      pattern:
        /customer success|client success|customer experience/
    },

    {
      name: "Account Management",
      pattern:
        /account manager|account management/
    },

    {
      name: "Recruitment & HR",
      pattern:
        /recruiter|recruitment|talent acquisition|human resources/
    },

    {
      name: "Finance",
      pattern:
        /bookkeeper|bookkeeping|accounting|finance assistant/
    },

    {
      name: "E-commerce",
      pattern:
        /ecommerce|e-commerce|shopify/
    },

    {
      name: "Research",
      pattern:
        /research assistant|research analyst|research specialist/
    },

    {
      name: "Education",
      pattern:
        /online tutor|online teacher|tutor|teacher/
    },

    {
      name: "Healthcare",
      pattern:
        /healthcare|medical writer|clinical research|medical research/
    },

    {
      name: "Project Management",
      pattern:
        /project coordinator|project assistant|project manager/
    },

    {
      name: "Web Development",
      pattern:
        /web developer|frontend developer|front-end developer|wordpress developer/
    },

    {
      name: "Software Development",
      pattern:
        /software developer|software engineer|programmer|backend developer|back-end developer|full-stack developer/
    },

    {
      name: "UI/UX Design",
      pattern:
        /ui\/ux|ux designer|ui designer|product designer/
    },

    {
      name: "Data Analysis",
      pattern:
        /data analyst|business analyst|data analysis/
    },

    {
      name: "SEO",
      pattern:
        /seo specialist|seo manager|search engine optimization/
    },

    {
      name: "Transcription",
      pattern:
        /transcription|transcriber/
    },

    {
      name: "Translation",
      pattern:
        /translator|translation/
    }

  ];


  for (
    const category of categories
  ) {

    if (
      category.pattern.test(text)
    ) {

      return category.name;
    }
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


  const currency =
    job.currency || "";


  let result =
    `${currency} ${Number(min).toLocaleString()}`;


  if (
    max !== null &&
    max !== undefined
  ) {

    result +=
      ` - ${Number(max).toLocaleString()}`;
  }


  const period =
    job.salaryPeriod ||
    "annual";


  result +=
    ` / ${period}`;


  return result.trim();
}


// ============================================================
// DATE
// ============================================================

function formatDate(value) {

  if (
    !value
  ) {

    return "";
  }


  try {

    const date =
      new Date(value);


    if (
      Number.isNaN(
        date.getTime()
      )
    ) {

      return "";
    }


    return date.toISOString();

  } catch {

    return "";
  }
}


// ============================================================
// FORMAT JOB
// ============================================================

function formatJob(job) {

  const eligibility =
    checkNigeriaEligibility(
      job
    );


  const application =
    getApplication(job);


  const id =
    String(

      job.guid ||

      job.applicationLink ||

      `${job.companySlug || "company"}-${job.title || "job"}`

    );


  return {

    id,


    title:
      job.title ||
      "Remote Job",


    company:
      job.companyName ||
      "Company not specified",


    companySlug:
      job.companySlug ||
      "",


    companyLogo:
      job.companyLogo ||
      "",


    // ========================================================
    // REMOTE INFORMATION
    // ========================================================

    remote:
      true,

    remoteType:
      "FULLY_REMOTE",

    workArrangement:
      "Fully Remote",

    workFromHome:
      true,

    remoteLabel:
      "100% Remote",


    // ========================================================
    // NIGERIA
    // ========================================================

    nigeriaEligible:
      eligibility.eligible,

    eligibilityReason:
      eligibility.reason,

    eligibility:
      `Can work remotely from ${eligibility.label}`,

    location:
      `Fully Remote — ${eligibility.label}`,


    locationRestrictions:
      getLocations(job),


    timezoneRestrictions:
      Array.isArray(
        job.timezoneRestrictions
      )
        ? job.timezoneRestrictions
        : [],


    // ========================================================
    // JOB INFORMATION
    // ========================================================

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


    jobType:
      getJobType(job),


    employmentType:
      job.employmentType ||
      "",


    type:
      job.employmentType ||
      "Not specified",


    seniority:
      Array.isArray(
        job.seniority
      )
        ? job.seniority.join(", ")
        : String(
            job.seniority || ""
          ),


    category:
      Array.isArray(
        job.categories
      )
        ? job.categories.join(", ")
        : "",


    parentCategory:
      Array.isArray(
        job.parentCategories
      )
        ? job.parentCategories.join(", ")
        : "",


    // ========================================================
    // SALARY
    // ========================================================

    salary_min:
      job.minSalary ??
      null,

    salary_max:
      job.maxSalary ??
      null,

    salary_period:
      job.salaryPeriod ||
      "annual",

    currency:
      job.currency ||
      "",

    salary:
      formatSalary(job),


    // ========================================================
    // APPLICATION
    // ========================================================

    applyUrl:
      application.url,

    applyEmail:
      application.email,

    applyMethod:
      application.type,


    // ========================================================
    // DATES
    // ========================================================

    created:
      formatDate(
        job.pubDate
      ),

    expiryDate:
      formatDate(
        job.expiryDate
      ),


    // ========================================================
    // SOURCE
    // ========================================================

    source:
      "Himalayas",

    sourceUrl:
      "https://himalayas.app/",

    sourceNotice:
      "Job data sourced from Himalayas"

  };
}


// ============================================================
// GET REMOTE JOBS
// ============================================================

async function getRemoteJobs(
  search = ""
) {

  const cacheKey =
    `remote:${search}`;


  const cached =
    cache.get(cacheKey);


  if (
    cached &&
    Date.now() - cached.time <
      CACHE_TIME
  ) {

    return cached.data;
  }


  // ==========================================================
  // NIGERIA JOBS
  // ==========================================================

  const nigeria =
    await searchMultiplePages({

      search,

      country:
        "NG"

    });


  // ==========================================================
  // WORLDWIDE JOBS
  // ==========================================================

  const worldwide =
    await searchMultiplePages({

      search,

      worldwide:
        true

    });


  // ==========================================================
  // COMBINE
  // ==========================================================

  const combined =
    deduplicateJobs([

      ...nigeria.jobs,

      ...worldwide.jobs

    ]);


  // ==========================================================
  // FILTER
  // ==========================================================

  const accepted = [];


  for (
    const job of combined
  ) {

    const eligibility =
      checkNigeriaEligibility(
        job
      );


    // Must be possible from Nigeria
    if (
      !eligibility.eligible
    ) {

      continue;
    }


    // Must be remote
    if (
      !isFullyRemote(job)
    ) {

      continue;
    }


    // Explicit foreign-only wording
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
      formatJob
    );


  // Newest first
  formatted.sort(
    (a, b) => {

      return new Date(
        b.created || 0
      ) -
      new Date(
        a.created || 0
      );

    }
  );


  const result = {

    jobs:
      formatted,

    total:
      formatted.length,

    nigeriaRaw:
      nigeria.jobs.length,

    nigeriaTotal:
      nigeria.totalCount,

    worldwideRaw:
      worldwide.jobs.length,

    worldwideTotal:
      worldwide.totalCount

  };


  cache.set(
    cacheKey,
    {

      time:
        Date.now(),

      data:
        result

    }
  );


  return result;
}


// ============================================================
// VISA JOB SEARCH
// ============================================================

async function getVisaJobs(
  search = ""
) {

  const terms =
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
    const term of terms
  ) {

    try {

      const result =
        await searchMultiplePages({

          search:
            term

        });


      allJobs.push(
        ...result.jobs
      );

    } catch (error) {

      console.error(
        "Visa search error:",
        error.message
      );
    }
  }


  const unique =
    deduplicateJobs(
      allJobs
    );


  const positivePatterns = [

    /visa sponsorship/i,

    /visa sponsored/i,

    /work visa sponsorship/i,

    /employer sponsorship/i,

    /employer sponsored/i,

    /work permit sponsorship/i,

    /work permit sponsored/i,

    /skilled worker sponsorship/i,

    /sponsorship available/i,

    /sponsor visa/i,

    /visa support/i,

    /immigration sponsorship/i,

    /will sponsor/i,

    /sponsor a work visa/i,

    /sponsorship provided/i,

    /visa assistance/i

  ];


  const negativePatterns = [

    /no visa sponsorship/i,

    /no sponsorship/i,

    /visa sponsorship not available/i,

    /visa sponsorship unavailable/i,

    /we do not sponsor/i,

    /we don't sponsor/i,

    /cannot sponsor/i,

    /can't sponsor/i,

    /unable to sponsor/i,

    /not able to sponsor/i

  ];


  const accepted =
    unique.filter(job => {

      const text =
        getJobText(job);


      // Remove jobs explicitly saying
      // sponsorship is unavailable.
      if (
        negativePatterns.some(
          pattern =>
            pattern.test(text)
        )
      ) {

        return false;
      }


      if (
        !isFullyRemote(job)
      ) {

        return false;
      }


      return positivePatterns.some(
        pattern =>
          pattern.test(text)
      );

    });


  return {

    jobs:
      accepted
        .slice(0, 100)
        .map(
          formatJob
        )
        .map(job => ({

          ...job,

          visaSponsorship:
            true,

          eligibility:
            "Visa sponsorship information found"

        })),

    total:
      accepted.length

  };
}


// ============================================================
// TELEGRAM ESCAPE
// ============================================================

function telegramEscape(
  value = ""
) {

  return String(value)

    .replace(
      /&/g,
      "&amp;"
    )

    .replace(
      /</g,
      "&lt;"
    )

    .replace(
      />/g,
      "&gt;"
    )

    .replace(
      /"/g,
      "&quot;"
    );

}


// ============================================================
// SEND TELEGRAM JOB
// ============================================================

async function sendTelegramJob(
  job
) {

  if (
    !TELEGRAM_BOT_TOKEN ||
    !TELEGRAM_CHANNEL_ID
  ) {

    return {

      success:
        false,

      skipped:
        true,

      reason:
        "Telegram not configured"

    };
  }


  const jobId =
    String(
      job.id
    );


  if (
    telegramPostedJobs.has(
      jobId
    )
  ) {

    return {

      success:
        true,

      skipped:
        true,

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


  const salary =
    telegramEscape(
      job.salary
    );


  const category =
    telegramEscape(
      job.jobType
    );


  const applyUrl =
    job.applyUrl || "";


  let message =

`<b>🇳🇬 INTERNATIONAL REMOTE JOB</b>

<b>${title}</b>

🏢 <b>Company:</b> ${company}

🌍 <b>Work:</b> FULLY REMOTE

🇳🇬 <b>Eligible from:</b> Nigeria

💼 <b>Category:</b> ${category}

💰 <b>Salary:</b> ${salary}`;


  if (
    job.employmentType
  ) {

    message +=
      `\n📋 <b>Type:</b> ${telegramEscape(
        job.employmentType
      )}`;

  }


  if (
    job.seniority
  ) {

    message +=
      `\n🎯 <b>Level:</b> ${telegramEscape(
        job.seniority
      )}`;

  }


  if (
    applyUrl
  ) {

    message +=

`\n\n🔗 <a href="${telegramEscape(
  applyUrl
)}">APPLY NOW</a>`;

  }


  message +=

`\n\n📌 Source: Himalayas`;


  if (
    message.length > 3900
  ) {

    message =
      message.slice(
        0,
        3900
      );
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
      `Telegram error ${response.status}`
    );
  }


  telegramPostedJobs.add(
    jobId
  );


  return {

    success:
      true,

    messageId:
      data?.result?.message_id ||
      null

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

      enabled:
        false,

      posted:
        0,

      skipped:
        0,

      errors:
        []

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
        await sendTelegramJob(
          job
        );


      if (
        result.skipped
      ) {

        skipped++;

      } else {

        posted++;

      }


      // Telegram delay
      await new Promise(
        resolve =>
          setTimeout(
            resolve,
            1000
          )
      );

    } catch (error) {

      errors.push({

        job:
          job.title,

        error:
          error.message

      });

    }

  }


  return {

    enabled:
      true,

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

      success:
        true,

      status:
        "online",

      message:
        "International Remote Jobs API is running",

      source:
        "Himalayas",

      target:
        "Nigerians working remotely from Nigeria",

      rules: {

        remote:
          "FULLY REMOTE",

        nigeria:
          "Nigeria / Worldwide",

        hybrid:
          "REJECTED",

        onsite:
          "REJECTED",

        foreignOnly:
          "REJECTED"

      },

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

        page:
          "/api/jobs/remote?page=2",

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


      const requestedPage =
        Math.max(

          1,

          parseInt(
            req.query.page || "1",
            10
          ) || 1

        );


      const result =
        await getRemoteJobs(
          search
        );


      // The backend loads multiple source pages.
      // This pagination is for your frontend.
      const pageSize = 20;

      const start =
        (requestedPage - 1) *
        pageSize;

      const pageJobs =
        result.jobs.slice(
          start,
          start + pageSize
        );


      res.json({

        success:
          true,

        type:
          "FULLY_REMOTE",

        workArrangement:
          "Fully Remote",

        applicants:
          "Nigeria",

        count:
          pageJobs.length,

        total:
          result.total,

        totalPages:
          Math.ceil(
            result.total /
            pageSize
          ),

        nigeriaTotal:
          result.nigeriaTotal,

        worldwideTotal:
          result.worldwideTotal,

        nigeriaRaw:
          result.nigeriaRaw,

        worldwideRaw:
          result.worldwideRaw,

        page:
          requestedPage,

        pageSize,

        hasNextPage:
          start + pageSize <
          result.total,

        jobs:
          pageJobs,

        source:
          "Himalayas",

        sourceUrl:
          "https://himalayas.app/"

      });

    } catch (error) {

      console.error(
        "REMOTE ERROR:",
        error
      );


      res.status(500).json({

        success:
          false,

        error:
          "Failed to fetch remote jobs",

        message:
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


      const result =
        await getVisaJobs(
          search
        );


      res.json({

        success:
          true,

        type:
          "VISA_SPONSORSHIP",

        applicants:
          "International applicants",

        workArrangement:
          "Remote where specified",

        count:
          result.jobs.length,

        jobs:
          result.jobs,

        source:
          "Himalayas",

        sourceUrl:
          "https://himalayas.app/"

      });

    } catch (error) {

      console.error(
        "VISA ERROR:",
        error
      );


      res.status(500).json({

        success:
          false,

        error:
          "Failed to fetch visa jobs",

        message:
          error.message

      });

    }

  }
);


// ============================================================
// TEST HIMALAYAS
// ============================================================

app.get(
  "/api/test-himalayas",
  async (req, res) => {

    try {

      const nigeria =
        await searchHimalayas({

          country:
            "NG",

          page:
            1

        });


      const worldwide =
        await searchHimalayas({

          worldwide:
            true,

          page:
            1

        });


      res.json({

        success:
          true,

        message:
          "Himalayas API connection is working",

        nigeria: {

          total:
            Number(
              nigeria.totalCount || 0
            ),

          returned:
            Array.isArray(
              nigeria.jobs
            )
              ? nigeria.jobs.length
              : 0

        },

        worldwide: {

          total:
            Number(
              worldwide.totalCount || 0
            ),

          returned:
            Array.isArray(
              worldwide.jobs
            )
              ? worldwide.jobs.length
              : 0

        },

        sample:
          [

            ...(Array.isArray(
              nigeria.jobs
            )
              ? nigeria.jobs
              : []),

            ...(Array.isArray(
              worldwide.jobs
            )
              ? worldwide.jobs
              : [])

          ]

            .slice(0, 10)

            .map(job => ({

              title:
                job.title,

              company:
                job.companyName,

              locationRestrictions:
                job.locationRestrictions,

              timezoneRestrictions:
                job.timezoneRestrictions,

              applicationLink:
                job.applicationLink,

              guid:
                job.guid

            }))

      });

    } catch (error) {

      console.error(
        "HIMALAYAS TEST ERROR:",
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


      const jobs =
        deduplicateJobs([

          ...(Array.isArray(
            nigeria.jobs
          )
            ? nigeria.jobs
            : []),

          ...(Array.isArray(
            worldwide.jobs
          )
            ? worldwide.jobs
            : [])

        ]);


      const debugJobs =
        jobs
          .slice(0, 50)
          .map(job => {

            const eligibility =
              checkNigeriaEligibility(
                job
              );


            return {

              title:
                job.title,

              company:
                job.companyName,

              locationRestrictions:
                job.locationRestrictions,

              timezoneRestrictions:
                job.timezoneRestrictions,

              nigeriaEligible:
                eligibility,

              fullyRemote:
                isFullyRemote(job),

              foreignOnly:
                isForeignOnly(job),

              application:
                job.applicationLink

            };

          });


      res.json({

        success:
          true,

        search,

        nigeriaRaw:
          Array.isArray(
            nigeria.jobs
          )
            ? nigeria.jobs.length
            : 0,

        nigeriaTotal:
          Number(
            nigeria.totalCount || 0
          ),

        worldwideRaw:
          Array.isArray(
            worldwide.jobs
          )
            ? worldwide.jobs.length
            : 0,

        worldwideTotal:
          Number(
            worldwide.totalCount || 0
          ),

        combined:
          jobs.length,

        jobs:
          debugJobs

      });

    } catch (error) {

      console.error(
        "DEBUG ERROR:",
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
  "/api/telegram/test",
  async (req, res) => {

    try {

      if (
        !TELEGRAM_BOT_TOKEN
      ) {

        return res.status(400).json({

          success:
            false,

          error:
            "TELEGRAM_BOT_TOKEN is missing"

        });
      }


      if (
        !TELEGRAM_CHANNEL_ID
      ) {

        return res.status(400).json({

          success:
            false,

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

          success:
            false,

          error:
            data?.description ||
            "Telegram bot test failed"

        });
      }


      res.json({

        success:
          true,

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

        success:
          false,

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
          ""
        );


      const telegram =
        await postJobsToTelegram(
          result.jobs,
          10
        );


      res.json({

        success:
          true,

        jobsFound:
          result.jobs.length,

        telegram

      });

    } catch (error) {

      console.error(
        "TELEGRAM POST ERROR:",
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
// AUTOMATIC TELEGRAM
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
      "Checking new remote jobs for Telegram..."
    );


    const result =
      await getRemoteJobs(
        ""
      );


    console.log(
      `Remote jobs found: ${result.jobs.length}`
    );


    await postJobsToTelegram(
      result.jobs,
      10
    );

  } catch (error) {

    console.error(
      "Automatic Telegram error:",
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
      `Server running on port ${PORT}`
    );

    console.log(
      "===================================="
    );

    console.log(
      "INTERNATIONAL REMOTE JOBS"
    );

    console.log(
      "NIGERIA ELIGIBILITY: ENABLED"
    );

    console.log(
      "FULLY REMOTE: ENABLED"
    );

    console.log(
      `MAX API PAGES: ${MAX_PAGES}`
    );

    console.log(
      `TELEGRAM: ${
        TELEGRAM_BOT_TOKEN &&
        TELEGRAM_CHANNEL_ID
          ? "ENABLED"
          : "DISABLED"
      }`
    );

    console.log(
      "===================================="
    );


    // Check Telegram shortly after startup.
    setTimeout(
      automaticTelegramCheck,
      10000
    );


    // Check every 12 hours.
    setInterval(
      automaticTelegramCheck,
      12 * 60 * 60 * 1000
    );

  }
);
