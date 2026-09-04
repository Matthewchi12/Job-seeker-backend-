// ============================================================
// INTERNATIONAL FULLY REMOTE JOBS BACKEND
// NIGERIANS CAN APPLY FROM NIGERIA
//
// SOURCE: HIMALAYAS
//
// RETURNS:
// 1. FULLY REMOTE JOBS
// 2. JOBS THAT ALLOW NIGERIA
// 3. WORLDWIDE REMOTE JOBS
// 4. NIGERIA-SPECIFIC REMOTE JOBS
// 5. VISA SPONSORSHIP JOBS
//
// DOES NOT:
// - Return onsite jobs
// - Return hybrid jobs
// - Return jobs restricted to US/UK/etc.
// - Invent application emails
// ============================================================

const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 10000;


// ============================================================
// HIMALAYAS
// ============================================================

const HIMALAYAS_SEARCH_API =
  "https://himalayas.app/jobs/api/search";


// ============================================================
// CACHE
// ============================================================

const cache = new Map();

const CACHE_TIME =
  10 * 60 * 1000;


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
      "API returned invalid JSON"
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
// GET ALL JOB TEXT
// ============================================================

function getJobText(job) {

  const categories =
    Array.isArray(job.categories)
      ? job.categories.join(" ")
      : "";

  const parentCategories =
    Array.isArray(job.parentCategories)
      ? job.parentCategories.join(" ")
      : "";

  const locations =
    Array.isArray(job.locationRestrictions)
      ? job.locationRestrictions
          .map(location =>
            `${location?.name || ""} ${
              location?.slug || ""
            } ${
              location?.alpha2 || ""
            }`
          )
          .join(" ")
      : "";

  const timezone =
    Array.isArray(job.timezoneRestrictions)
      ? job.timezoneRestrictions
          .map(item =>
            typeof item === "string"
              ? item
              : `${item?.name || ""} ${
                  item?.slug || ""
                }`
          )
          .join(" ")
      : "";

  return cleanHtml(

    `${job.title || ""} ` +
    `${job.excerpt || ""} ` +
    `${job.description || ""} ` +
    `${categories} ` +
    `${parentCategories} ` +
    `${locations} ` +
    `${timezone}`

  ).toLowerCase();
}


// ============================================================
// LOCATION RESTRICTIONS
// ============================================================

function getLocations(job) {

  if (
    !Array.isArray(
      job.locationRestrictions
    )
  ) {

    return [];
  }

  return job.locationRestrictions;
}


// ============================================================
// CHECK NIGERIA ELIGIBILITY
//
// Empty restrictions = worldwide
// Nigeria = accepted
// Africa = accepted
//
// Other country-only restrictions = rejected
// ============================================================

function checkNigeriaEligibility(job) {

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


  let hasNigeria = false;
  let hasAfrica = false;


  for (
    const location of locations
  ) {

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


    if (
      alpha2 === "ng" ||
      name === "nigeria" ||
      slug === "nigeria"
    ) {

      hasNigeria = true;
    }


    if (
      name === "africa" ||
      slug === "africa"
    ) {

      hasAfrica = true;
    }
  }


  if (hasNigeria) {

    return {
      eligible: true,
      reason: "nigeria"
    };
  }


  if (hasAfrica) {

    return {
      eligible: true,
      reason: "africa"
    };
  }


  return {
    eligible: false,
    reason: "country_restricted"
  };
}


// ============================================================
// FULLY REMOTE CHECK
//
// We deliberately reject:
// - hybrid
// - onsite
// - office
// - location-required
//
// Because the website is for FULLY REMOTE jobs.
// ============================================================

function isFullyRemote(job) {

  const text =
    getJobText(job);


  const rejectedTerms = [

    "hybrid",

    "hybrid remote",

    "remote/hybrid",

    "remote / hybrid",

    "on-site",

    "onsite",

    "on site",

    "office based",

    "office-based",

    "office based role",

    "office-based role",

    "in office",

    "in-office",

    "work from office",

    "working from office",

    "must work from office",

    "must work in office",

    "must work onsite",

    "must work on-site",

    "must be onsite",

    "must be on-site",

    "location required",

    "relocation required",

    "relocate to",

    "relocation assistance"

  ];


  for (
    const term of rejectedTerms
  ) {

    if (
      text.includes(term)
    ) {

      return false;
    }
  }


  // Himalayas is a remote-jobs platform.
  // If there is no explicit onsite/hybrid restriction,
  // we can treat the job as remote.
  return true;
}


// ============================================================
// FOREIGN-ONLY CHECK
// ============================================================

function isForeignOnly(job) {

  const text =
    getJobText(job);


  const restrictedTerms = [

    "us residents only",
    "usa residents only",

    "u.s. residents only",

    "uk residents only",

    "canada residents only",

    "australia residents only",

    "united states residents only",

    "united kingdom residents only",

    "must be located in the united states",

    "must be located in the us",

    "must be located in the usa",

    "must reside in the united states",

    "must reside in the us",

    "must reside in the usa",

    "must be based in the united states",

    "must be based in the us",

    "must be based in the usa",

    "must live in the united states",

    "must live in the us",

    "only applicants in the us",

    "only applicants in the usa",

    "only applicants in the uk",

    "only applicants in canada"

  ];


  return restrictedTerms.some(
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
    "Himalayas request:",
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


  // ----------------------------------------------------------
  // NIGERIA
  // ----------------------------------------------------------

  try {

    const result =
      await searchHimalayas({

        search,

        country:
          "NG",

        worldwide:
          false,

        page

      });


    nigeriaJobs =
      result.jobs;

    nigeriaTotal =
      result.totalCount;

  } catch (error) {

    console.error(
      "Nigeria search error:",
      error.message
    );
  }


  // ----------------------------------------------------------
  // WORLDWIDE
  // ----------------------------------------------------------

  try {

    const result =
      await searchHimalayas({

        search,

        worldwide:
          true,

        page

      });


    worldwideJobs =
      result.jobs;

    worldwideTotal =
      result.totalCount;

  } catch (error) {

    console.error(
      "Worldwide search error:",
      error.message
    );
  }


  // ----------------------------------------------------------
  // COMBINE
  // ----------------------------------------------------------

  const combined =
    deduplicateJobs([

      ...nigeriaJobs,

      ...worldwideJobs

    ]);


  // ----------------------------------------------------------
  // FILTER
  // ----------------------------------------------------------

  const accepted = [];


  for (
    const job of combined
  ) {

    const nigeria =
      checkNigeriaEligibility(
        job
      );


    if (
      !nigeria.eligible
    ) {

      continue;
    }


    if (
      !isFullyRemote(job)
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


  // ----------------------------------------------------------
  // FORMAT
  // ----------------------------------------------------------

  const formatted =
    accepted.map(job =>
      formatJob(
        job,
        false
      )
    );


  const result = {

    jobs:
      formatted,

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
      time:
        Date.now(),

      data:
        result
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

        .map(url =>
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


            if (
              host.includes(
                "himalayas.app"
              )
            ) {

              return false;
            }


            if (
              host.includes(
                "linkedin.com"
              )
            ) {

              return false;
            }


            if (
              host.includes(
                "indeed.com"
              )
            ) {

              return false;
            }


            return true;

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
    applicationLink
  ) {

    return {

      type:
        "application_link",

      email:
        emails[0] || "",

      url:
        applicationLink

    };
  }


  if (
    emails.length
  ) {

    return {

      type:
        "email",

      email:
        emails[0],

      url:
        urls[0] || ""

    };
  }


  if (
    urls.length
  ) {

    return {

      type:
        "company_website",

      email:
        "",

      url:
        urls[0]

    };
  }


  return {

    type:
      "application_only",

    email:
      "",

    url:
      ""

  };
}


// ============================================================
// CATEGORY
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


  let salary =
    `${job.currency || ""} ${Number(min).toLocaleString()}`;


  if (
    max !== null &&
    max !== undefined
  ) {

    salary +=
      ` - ${Number(max).toLocaleString()}`;
  }


  if (
    job.salaryPeriod
  ) {

    salary +=
      ` / ${job.salaryPeriod}`;
  }


  return salary.trim();
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


  const nigeria =
    checkNigeriaEligibility(
      job
    );


  let allowedLocation =
    "Nigeria";


  if (
    nigeria.reason ===
    "worldwide"
  ) {

    allowedLocation =
      "Worldwide";
  }


  if (
    nigeria.reason ===
    "nigeria"
  ) {

    allowedLocation =
      "Nigeria";
  }


  if (
    nigeria.reason ===
    "africa"
  ) {

    allowedLocation =
      "Africa";
  }


  const application =
    getApplication(job);


  return {

    id:
      job.guid ||
      job.applicationLink ||
      `${job.companySlug || "company"}-${job.title || "job"}`,

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
    // VERY IMPORTANT
    // ========================================================

    remote:
      true,

    remoteType:
      "FULLY_REMOTE",

    workArrangement:
      "Fully Remote",

    remoteLabel:
      "100% Remote",

    nigeriaEligible:
      !visa,

    eligibility:
      visa
        ? "Visa sponsorship information found"
        : `Can work remotely from ${allowedLocation}`,

    location:
      `Fully Remote — ${allowedLocation}`,

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
      application.url ||
      "",

    applyEmail:
      application.email ||
      "",

    applyMethod:
      application.type,


    salary_min:
      job.minSalary ??
      null,

    salary_max:
      job.maxSalary ??
      null,

    salary_period:
      job.salaryPeriod ||
      "",

    currency:
      job.currency ||
      "",

    salary:
      formatSalary(job),


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
        : "",


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


    jobType:
      getJobType(job),


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

          page:
            page

        });


      allJobs.push(
        ...result.jobs
      );

    } catch (error) {

      console.error(
        "Visa search:",
        term,
        error.message
      );
    }
  }


  const unique =
    deduplicateJobs(
      allJobs
    );


  const positiveTerms = [

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


  const negativeTerms = [

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


      if (
        negativeTerms.some(
          term =>
            text.includes(term)
        )
      ) {

        return false;
      }


      if (
        !isFullyRemote(job)
      ) {

        return false;
      }


      return positiveTerms.some(
        term =>
          text.includes(term)
      );
    });


  const formatted =
    accepted
      .slice(0, 50)
      .map(job =>
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
      time:
        Date.now(),

      data:
        result
    }
  );


  return result;
}


// ============================================================
// TELEGRAM ESCAPE
// ============================================================

function telegramEscape(value = "") {

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
// TELEGRAM
// ============================================================

async function sendTelegramJob(job) {

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
        "Telegram is not configured"

    };
  }


  const jobId =
    String(
      job.id || ""
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

`<b>🇳🇬 FULLY REMOTE JOB</b>

<b>${title}</b>

🏢 <b>Company:</b> ${company}

🌍 <b>Work Arrangement:</b> FULLY REMOTE

🇳🇬 <b>Location:</b> Nigeria eligible

💼 <b>Category:</b> ${category}

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


  if (
    applyUrl
  ) {

    message +=

`\n\n🔗 <a href="${telegramEscape(applyUrl)}">APPLY FOR THIS JOB</a>`;
  }


  message +=
    "\n\n📌 Source: Himalayas";


  if (
    message.length > 3900
  ) {

    message =
      message.slice(
        0,
        3900
      );
  }


  const telegramUrl =
    `${TELEGRAM_API}/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;


  const response =
    await fetch(
      telegramUrl,
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

    success:
      true,

    messageId:
      data?.result?.message_id ||
      null

  };
}


// ============================================================
// POST TO TELEGRAM
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
        "International Fully Remote Jobs API is running",

      source:
        "Himalayas",

      rules: {

        remote:
          "FULLY REMOTE ONLY",

        nigeria:
          "Nigeria eligible",

        hybrid:
          "rejected",

        onsite:
          "rejected",

        foreignOnly:
          "rejected"

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

        success:
          true,

        type:
          "FULLY_REMOTE",

        workArrangement:
          "Fully Remote",

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
        "Remote endpoint:",
        error
      );


      res.status(500).json({

        success:
          false,

        error:
          "Failed to fetch fully remote jobs",

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

        success:
          true,

        type:
          "FULLY_REMOTE_VISA_SPONSORSHIP",

        workArrangement:
          "Fully Remote",

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
        "Visa endpoint:",
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
// HIMALAYAS TEST
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

        nigeria: {

          total:
            nigeria.totalCount,

          returned:
            nigeria.jobs.length

        },

        worldwide: {

          total:
            worldwide.totalCount,

          returned:
            worldwide.jobs.length

        },

        sample:
          [

            ...nigeria.jobs,

            ...worldwide.jobs

          ]
            .slice(0, 10)
            .map(job => ({

              title:
                job.title,

              company:
                job.companyName,

              locationRestrictions:
                job.locationRestrictions,

              application:
                job.applicationLink,

              guid:
                job.guid

            }))

      });

    } catch (error) {

      console.error(
        "Himalayas test:",
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

          ...nigeria.jobs,

          ...worldwide.jobs

        ]);


      res.json({

        success:
          true,

        search,

        nigeriaRaw:
          nigeria.jobs.length,

        nigeriaTotal:
          nigeria.totalCount,

        worldwideRaw:
          worldwide.jobs.length,

        worldwideTotal:
          worldwide.totalCount,

        checked:
          jobs.length,

        jobs:
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

                nigeriaEligible:
                  eligibility,

                fullyRemote:
                  isFullyRemote(job),

                foreignOnly:
                  isForeignOnly(job),

                application:
                  job.applicationLink

              };

            })

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
        await fetch(
          url
        );


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
            data.description ||
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
          "",
          1
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
      "Checking fully remote jobs for Telegram..."
    );


    const result =
      await getRemoteJobs(
        "",
        1
      );


    console.log(
      `Found ${result.jobs.length} fully remote jobs`
    );


    await postJobsToTelegram(
      result.jobs,
      10
    );

  } catch (error) {

    console.error(
      "Telegram automatic check:",
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
      "Remote mode: FULLY REMOTE ONLY"
    );


    console.log(
      "Nigeria eligibility: ENABLED"
    );


    console.log(
      `Telegram: ${
        TELEGRAM_BOT_TOKEN &&
        TELEGRAM_CHANNEL_ID
          ? "ENABLED"
          : "DISABLED"
      }`
    );


    setTimeout(
      automaticTelegramCheck,
      5000
    );


    setInterval(
      automaticTelegramCheck,
      6 * 60 * 60 * 1000
    );

  }
);
