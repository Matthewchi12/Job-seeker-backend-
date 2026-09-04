// ============================================================
// JOBFINDER BACKEND
// INTERNATIONAL REMOTE JOBS NIGERIANS CAN DO FROM NIGERIA
//
// SOURCE: HIMALAYAS PUBLIC JOBS API
//
// RULES:
// 1. Fully remote only
// 2. International / worldwide jobs allowed
// 3. Nigeria explicitly allowed = eligible
// 4. Africa explicitly allowed = eligible
// 5. Worldwide/no geographic restriction = eligible
// 6. Country-restricted jobs excluding Nigeria = rejected
// 7. Hybrid / onsite jobs = rejected
//
// ENDPOINTS:
// GET /
// GET /api/health
// GET /api/test-himalayas
// GET /api/jobs/remote
// GET /api/jobs/remote/debug
// GET /api/jobs/visa
//
// ============================================================

const express = require("express");
const cors = require("cors");

const app = express();


// ============================================================
// CONFIGURATION
// ============================================================

const PORT =
  process.env.PORT || 10000;

const HIMALAYAS_API =
  "https://himalayas.app/jobs/api/search";


// Number of pages to request for EACH search.
// Himalayas search pages normally contain up to 20 jobs.
const MAX_PAGES =
  Number(process.env.MAX_API_PAGES || 5);


// Maximum final jobs returned to frontend.
const MAX_RESULTS =
  Number(process.env.MAX_RESULTS || 100);


// ============================================================
// EXPRESS
// ============================================================

app.use(cors());

app.use(
  express.json()
);


// ============================================================
// REQUEST TIMEOUT
// ============================================================

const FETCH_TIMEOUT =
  15000;


// ============================================================
// CACHE
// ============================================================

const CACHE_TTL =
  10 * 60 * 1000;

let jobsCache = {
  time: 0,
  jobs: []
};


// ============================================================
// SEARCH CATEGORIES
//
// Multiple searches are used because a single generic
// Himalayas request may not expose enough suitable jobs.
// ============================================================

const SEARCH_TERMS = [

  "",

  "customer support",

  "customer service",

  "virtual assistant",

  "data entry",

  "data analyst",

  "data",

  "AI",

  "AI trainer",

  "AI evaluator",

  "machine learning",

  "software",

  "software engineer",

  "developer",

  "engineering",

  "product",

  "project manager",

  "project management",

  "marketing",

  "digital marketing",

  "sales",

  "business development",

  "content writer",

  "writer",

  "copywriter",

  "content",

  "social media",

  "graphic designer",

  "designer",

  "UX",

  "UI",

  "accounting",

  "finance",

  "operations",

  "research",

  "research assistant",

  "healthcare",

  "medical",

  "recruiter",

  "human resources",

  "HR",

  "administrative",

  "community",

  "education",

  "translator",

  "technical support"

];


// ============================================================
// FETCH JSON WITH TIMEOUT
// ============================================================

async function fetchJson(url) {

  const controller =
    new AbortController();

  const timeout =
    setTimeout(
      () => controller.abort(),
      FETCH_TIMEOUT
    );


  try {

    const response =
      await fetch(
        url,
        {
          method: "GET",

          headers: {
            "Accept":
              "application/json",

            "User-Agent":
              "JobFinder International Remote Jobs"
          },

          signal:
            controller.signal
        }
      );


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
// EXTRACT JOB ARRAY
//
// Handles different possible response structures.
// ============================================================

function extractJobs(data) {

  if (
    Array.isArray(data)
  ) {

    return data;

  }


  if (
    Array.isArray(
      data?.jobs
    )
  ) {

    return data.jobs;

  }


  if (
    Array.isArray(
      data?.data
    )
  ) {

    return data.data;

  }


  if (
    Array.isArray(
      data?.results
    )
  ) {

    return data.results;

  }


  if (
    Array.isArray(
      data?.items
    )
  ) {

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

    .replace(
      /<[^>]*>/g,
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
      /&quot;/gi,
      '"'
    )

    .replace(
      /&#39;/gi,
      "'"
    )

    .replace(
      /\s+/g,
      " "
    )

    .trim();

}


// ============================================================
// SAFE TEXT
// ============================================================

function textValue(value) {

  if (
    value === null ||
    value === undefined
  ) {

    return "";

  }


  if (
    typeof value === "string"
  ) {

    return cleanHtml(
      value
    );

  }


  if (
    typeof value === "number"
  ) {

    return String(value);

  }


  return cleanHtml(
    JSON.stringify(value)
  );

}


// ============================================================
// JOB DESCRIPTION
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
// COMBINED JOB TEXT
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
// LOCATION TEXT
// ============================================================

function getRestrictionText(job) {

  return getLocationRestrictions(
    job
  )

    .map(item => {

      return [

        item?.name,

        item?.alpha2,

        item?.slug

      ]

        .filter(Boolean)

        .join(" ");

    })

    .join(" ")

    .toLowerCase();

}


// ============================================================
// NIGERIA ELIGIBILITY
//
// Himalayas documentation:
// locationRestrictions: []
// means worldwide.
//
// Therefore an empty array is eligible.
//
// Nigeria = eligible
// Africa = eligible
//
// A specific foreign-only country is rejected.
// ============================================================

function isNigeriaEligible(job) {

  const restrictions =
    getLocationRestrictions(
      job
    );


  // ----------------------------------------
  // WORLDWIDE
  // ----------------------------------------

  if (
    restrictions.length === 0
  ) {

    return {
      eligible: true,

      reason:
        "Worldwide job with no geographic restriction"
    };

  }


  const restrictionText =
    getRestrictionText(
      job
    );


  // ----------------------------------------
  // NIGERIA
  // ----------------------------------------

  const nigeriaAllowed =
    restrictionText.includes(
      "nigeria"
    ) ||

    restrictionText.includes(
      " niger "
    ) ||

    restrictionText.includes(
      "ng"
    );


  if (
    nigeriaAllowed
  ) {

    return {
      eligible: true,

      reason:
        "Nigeria is included in the allowed locations"
    };

  }


  // ----------------------------------------
  // AFRICA
  // ----------------------------------------

  const africaAllowed =
    restrictionText.includes(
      "africa"
    );


  if (
    africaAllowed
  ) {

    return {
      eligible: true,

      reason:
        "Africa is included in the allowed locations"
    };

  }


  // ----------------------------------------
  // EXPLICIT FOREIGN-ONLY RESTRICTIONS
  // ----------------------------------------

  const foreignOnlyPatterns = [

    "united states only",

    "us only",

    "usa only",

    "u.s. only",

    "u.s.a. only",

    "us citizens only",

    "u.s. citizens only",

    "us residents only",

    "u.s. residents only",

    "canada only",

    "canadian only",

    "canada residents only",

    "united kingdom only",

    "uk only",

    "uk residents only",

    "europe only",

    "eu only",

    "european union only",

    "australia only",

    "australian only",

    "new zealand only"

  ];


  for (
    const pattern
    of foreignOnlyPatterns
  ) {

    if (
      restrictionText.includes(
        pattern
      )
    ) {

      return {
        eligible: false,

        reason:
          `Foreign-only restriction: ${pattern}`
      };

    }

  }


  // ----------------------------------------
  // COUNTRY RESTRICTED
  //
  // If specific countries are listed and
  // Nigeria/Africa is not among them,
  // do not assume Nigerian eligibility.
  // ----------------------------------------

  return {
    eligible: false,

    reason:
      "Job is geographically restricted and Nigeria is not listed"
  };

}


// ============================================================
// FULLY REMOTE CHECK
// ============================================================

function isFullyRemote(job) {

  // ----------------------------------------
  // Explicit structured remote fields
  // ----------------------------------------

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
        "Backend/API identifies the job as fully remote"
    };

  }


  const text =
    getJobText(
      job
    );


  // ----------------------------------------
  // REJECT ONSITE
  // ----------------------------------------

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

    "must be in the office",

    "required to be in the office",

    "located at our office"

  ];


  for (
    const pattern
    of onsitePatterns
  ) {

    if (
      text.includes(
        pattern
      )
    ) {

      return {
        remote: false,

        reason:
          `Onsite indicator: ${pattern}`
      };

    }

  }


  // ----------------------------------------
  // REJECT HYBRID
  // ----------------------------------------

  const hybridPatterns = [

    "hybrid",

    "hybrid remote",

    "partially remote",

    "partly remote",

    "remote and office",

    "remote/office"

  ];


  for (
    const pattern
    of hybridPatterns
  ) {

    if (
      text.includes(
        pattern
      )
    ) {

      return {
        remote: false,

        reason:
          `Hybrid indicator: ${pattern}`
      };

    }

  }


  // ----------------------------------------
  // Explicit remote wording
  // ----------------------------------------

  const remotePatterns = [

    "fully remote",

    "100% remote",

    "100% remote",

    "remote",

    "work from home",

    "work-from-home",

    "distributed team",

    "distributed",

    "remote first",

    "remote-first",

    "remote position",

    "remote role",

    "remote job",

    "home based",

    "home-based",

    "location independent"

  ];


  for (
    const pattern
    of remotePatterns
  ) {

    if (
      text.includes(
        pattern
      )
    ) {

      return {
        remote: true,

        reason:
          `Remote indicator: ${pattern}`
      };

    }

  }


  // ----------------------------------------
  // Worldwide + no onsite evidence
  //
  // Himalayas worldwide jobs are generally
  // remote jobs. Accept these.
  // ----------------------------------------

  const restrictions =
    getLocationRestrictions(
      job
    );


  if (
    restrictions.length === 0
  ) {

    return {
      remote: true,

      reason:
        "Worldwide job with no onsite/hybrid indicator"
    };

  }


  return {
    remote: false,

    reason:
      "No reliable fully-remote indicator"
  };

}


// ============================================================
// FOREIGN-ONLY TEXT CHECK
// ============================================================

function isForeignOnly(job) {

  const text =
    getJobText(
      job
    );


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

    "must reside in canada",

    "uk residents only",

    "must be based in the uk",

    "must reside in the uk",

    "eu residents only",

    "must be based in europe",

    "australian residents only",

    "must be based in australia"

  ];


  return patterns.some(
    pattern =>
      text.includes(
        pattern
      )
  );

}


// ============================================================
// JOB ELIGIBILITY
// ============================================================

function evaluateJob(job) {

  const remoteResult =
    isFullyRemote(
      job
    );


  if (
    !remoteResult.remote
  ) {

    return {
      eligible: false,

      reason:
        `Not fully remote: ${remoteResult.reason}`
    };

  }


  const nigeriaResult =
    isNigeriaEligible(
      job
    );


  if (
    !nigeriaResult.eligible
  ) {

    return {
      eligible: false,

      reason:
        `Nigeria restriction: ${nigeriaResult.reason}`
    };

  }


  if (
    isForeignOnly(job)
  ) {

    return {
      eligible: false,

      reason:
        "Foreign-only wording found in job text"
    };

  }


  return {
    eligible: true,

    reason:
      nigeriaResult.reason
  };

}


// ============================================================
// NORMALIZE JOB
// ============================================================

function normalizeJob(job) {

  const title =
    textValue(
      job.title
    );


  const company =
    textValue(
      job.company ||
      job.companyName ||
      "Company"
    );


  const description =
    getDescription(
      job
    );


  const restrictions =
    getLocationRestrictions(
      job
    );


  let location =
    textValue(
      job.location
    );


  if (
    !location
  ) {

    if (
      restrictions.length === 0
    ) {

      location =
        "Worldwide";

    } else {

      location =
        restrictions
          .map(
            item =>
              item?.name
          )
          .filter(Boolean)
          .join(", ");

    }

  }


  const remoteResult =
    isFullyRemote(
      job
    );


  const nigeriaResult =
    isNigeriaEligible(
      job
    );


  const employmentType =
    textValue(
      job.employmentType ||
      job.contract_type ||
      job.contractTime ||
      job.contract_time ||
      "Full Time"
    );


  const salary =
    formatSalary(
      job
    );


  const applicationUrl =
    getApplicationUrl(
      job
    );


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
      textValue(
        job.excerpt
      ),

    location,

    locationRestrictions:
      restrictions,

    timezoneRestrictions:
      Array.isArray(
        job.timezoneRestrictions
      )
        ? job.timezoneRestrictions
        : [],

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

    nigeriaEligible:
      nigeriaResult.eligible,

    eligibility:
      nigeriaResult.eligible
        ? "Nigerians can apply from Nigeria"
        : "Nigeria eligibility not confirmed",

    eligibilityReason:
      nigeriaResult.reason,

    employmentType,

    seniority:
      Array.isArray(
        job.seniority
      )
        ? job.seniority
        : [],

    salary,

    salary_min:
      job.salaryMin ??
      job.salary_min ??
      null,

    salary_max:
      job.salaryMax ??
      job.salary_max ??
      null,

    currency:
      job.currency ||
      "",

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
    const value
    of possibleUrls
  ) {

    if (
      !value
    ) {

      continue;

    }


    try {

      const parsed =
        new URL(
          String(value)
        );


      if (
        parsed.protocol ===
          "http:" ||

        parsed.protocol ===
          "https:"
      ) {

        return parsed.href;

      }

    } catch {

      // Ignore invalid URL

    }

  }


  return "";

}


// ============================================================
// FORMAT SALARY
// ============================================================

function formatSalary(job) {

  // Already formatted by API
  if (
    job.salary &&
    typeof job.salary ===
      "string"
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
    job.currency ||
    "";


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
    formatNumber(
      min
    );


  const maxText =
    formatNumber(
      max
    );


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


  if (
    period
  ) {

    result +=
      ` ${period}`;

  }


  return result.trim();

}


// ============================================================
// FORMAT NUMBER
// ============================================================

function formatNumber(
  value
) {

  const number =
    Number(value);


  if (
    Number.isNaN(number)
  ) {

    return String(value);

  }


  return number.toLocaleString();

}


// ============================================================
// SEARCH HIMALAYAS
// ============================================================

async function searchHimalayas(
  searchTerm,
  page
) {

  const params =
    new URLSearchParams();


  if (
    searchTerm
  ) {

    params.set(
      "q",
      searchTerm
    );

  }


  params.set(
    "page",
    String(page)
  );


  // Ask specifically for worldwide jobs.
  //
  // The API may still return geographically
  // restricted jobs, which we filter later.

  params.set(
    "worldwide",
    "true"
  );


  const url =
    `${HIMALAYAS_API}?${params.toString()}`;


  console.log(
    `Himalayas search: "${searchTerm || "ALL"}" page ${page}`
  );


  const data =
    await fetchJson(
      url
    );


  return extractJobs(
    data
  );

}


// ============================================================
// COLLECT RAW JOBS
// ============================================================

async function collectRawJobs() {

  const allJobs = [];


  // Prevent too many simultaneous requests.
  // Process searches sequentially.

  for (
    const searchTerm
    of SEARCH_TERMS
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


        if (
          !jobs.length
        ) {

          break;

        }


        allJobs.push(
          ...jobs
        );


        // If fewer than 20 jobs are returned,
        // there may be no additional page.

        if (
          jobs.length < 20
        ) {

          break;

        }

      } catch (error) {

        console.error(
          `Search failed: "${searchTerm}" page ${page}`,
          error.message
        );


        // Continue with the next search
        break;

      }

    }

  }


  return allJobs;

}


// ============================================================
// DEDUPLICATE
// ============================================================

function deduplicateJobs(
  jobs
) {

  const seen =
    new Set();


  const result = [];


  for (
    const job
    of jobs
  ) {

    const key =
      String(

        job.id ||

        job.slug ||

        `${job.title}-${job.company}`

      )

        .toLowerCase()

        .trim();


    if (
      !key
    ) {

      continue;

    }


    if (
      seen.has(key)
    ) {

      continue;

    }


    seen.add(key);

    result.push(
      job
    );

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


  if (
    !forceRefresh &&

    jobsCache.jobs.length > 0 &&

    now -
      jobsCache.time <
      CACHE_TTL
  ) {

    return jobsCache.jobs;

  }


  console.log(
    "Collecting international remote jobs..."
  );


  const rawJobs =
    await collectRawJobs();


  console.log(
    `Raw jobs collected: ${rawJobs.length}`
  );


  const uniqueRawJobs =
    deduplicateJobs(
      rawJobs
    );


  console.log(
    `Unique raw jobs: ${uniqueRawJobs.length}`
  );


  const eligibleJobs = [];


  for (
    const job
    of uniqueRawJobs
  ) {

    const evaluation =
      evaluateJob(
        job
      );


    if (
      !evaluation.eligible
    ) {

      continue;

    }


    const normalized =
      normalizeJob(
        job
      );


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

    time:
      now,

    jobs:
      eligibleJobs

  };


  return eligibleJobs;

}


// ============================================================
// ROOT
// ============================================================

app.get(
  "/",
  (req, res) => {

    res.json({

      success:
        true,

      message:
        "International Remote Jobs API is running",

      server:
        "JobFinder",

      source:
        "Himalayas",

      endpoint:
        "/api/jobs/remote",

      rules: {

        international:
          true,

        fullyRemote:
          true,

        nigeriaEligible:
          true

      }

    });

  }
);


// ============================================================
// HEALTH
// ============================================================

app.get(
  "/api/health",
  (req, res) => {

    res.json({

      success:
        true,

      status:
        "online",

      server:
        "International Remote Jobs API",

      source:
        "Himalayas",

      maxPages:
        MAX_PAGES,

      maxResults:
        MAX_RESULTS,

      cacheJobs:
        jobsCache.jobs.length

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
          jobs
            .slice(
              0,
              5
            )

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


      // ----------------------------------------
      // FRONTEND SEARCH
      // ----------------------------------------

      if (
        search
      ) {

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

                .map(
                  textValue
                )

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
// DEBUG ENDPOINT
// ============================================================

app.get(
  "/api/jobs/remote/debug",
  async (req, res) => {

    try {

      const rawJobs =
        await collectRawJobs();


      const uniqueJobs =
        deduplicateJobs(
          rawJobs
        );


      let eligible =
        0;

      let rejectedRemote =
        0;

      let rejectedNigeria =
        0;

      const rejectedExamples = [];


      for (
        const job
        of uniqueJobs
      ) {

        const evaluation =
          evaluateJob(
            job
          );


        if (
          evaluation.eligible
        ) {

          eligible++;

        } else {

          if (
            evaluation.reason
              .toLowerCase()
              .includes(
                "remote"
              )
          ) {

            rejectedRemote++;

          } else {

            rejectedNigeria++;

          }


          if (
            rejectedExamples.length <
            20
          ) {

            rejectedExamples.push({

              title:
                job.title,

              company:
                job.company,

              location:
                job.location,

              restrictions:
                job.locationRestrictions,

              reason:
                evaluation.reason

            });

          }

        }

      }


      res.json({

        success:
          true,

        rawJobs:
          rawJobs.length,

        uniqueJobs:
          uniqueJobs.length,

        eligibleJobs:
          eligible,

        rejectedRemote,

        rejectedNigeria,

        maxPages:
          MAX_PAGES,

        searches:
          SEARCH_TERMS.length,

        searchTerms:
          SEARCH_TERMS,

        rejectedExamples

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
// VISA JOBS
//
// Searches for jobs mentioning visa sponsorship.
// These are returned separately.
// ============================================================

app.get(
  "/api/jobs/visa",
  async (req, res) => {

    try {

      const visaTerms = [

        "visa sponsorship",

        "visa sponsor",

        "sponsorship",

        "relocation",

        "work visa"

      ];


      const visaJobs = [];


      for (
        const term
        of visaTerms
      ) {

        for (
          let page = 1;
          page <= 3;
          page++
        ) {

          try {

            const jobs =
              await searchHimalayas(
                term,
                page
              );


            if (
              !jobs.length
            ) {

              break;

            }


            for (
              const job
              of jobs
            ) {

              const text =
                getJobText(
                  job
                );


              if (
                text.includes(
                  "visa"
                ) ||

                text.includes(
                  "sponsorship"
                ) ||

                text.includes(
                  "relocation"
                )
              ) {

                visaJobs.push(
                  normalizeJob(
                    job
                  )
                );

              }

            }


            if (
              jobs.length < 20
            ) {

              break;

            }

          } catch {

            break;

          }

        }

      }


      const unique =
        deduplicateJobs(
          visaJobs
        );


      res.json({

        success:
          true,

        count:
          unique.length,

        search:
          "visa sponsorship",

        jobs:
          unique.slice(
            0,
            MAX_RESULTS
          )

      });

    } catch (error) {

      res.status(500).json({

        success:
          false,

        error:
          error.message,

        jobs: []

      });

    }

  }
);


// ============================================================
// MANUAL CACHE REFRESH
// ============================================================

app.get(
  "/api/jobs/refresh",
  async (req, res) => {

    try {

      const jobs =
        await getRemoteJobs(
          true
        );


      res.json({

        success:
          true,

        message:
          "Job cache refreshed",

        count:
          jobs.length

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
      "================================================"
    );

  }
);
