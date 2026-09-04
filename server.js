// ========================================
// NIGERIA JOBS BACKEND
//
// RETURNS ONLY:
//
// 1. 🇳🇬 REMOTE JOBS NIGERIANS CAN DO
//    FROM NIGERIA
//
// 2. ✈️ VISA SPONSORSHIP JOBS
//    NIGERIANS CAN APPLY FOR FROM NIGERIA
//
// SOURCE: HIMALAYAS API
// ========================================

const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 10000;


// ========================================
// HIMALAYAS API
// ========================================

const HIMALAYAS_API =
  "https://himalayas.app/jobs/api/search";


// ========================================
// CACHE
// ========================================

const cache = new Map();

const CACHE_TIME =
  30 * 60 * 1000;


// ========================================
// REMOTE JOB SEARCHES
// ========================================
//
// These are broad job types.
//
// Tech is intentionally small.
//
// All results are passed through the
// Nigeria eligibility filter before returning.
//
// ========================================

const JOB_SEARCHES = [

  // ========================================
  // CUSTOMER SERVICE
  // ========================================

  "customer service",
  "customer service representative",
  "customer support",
  "customer support specialist",
  "customer care",
  "customer care representative",
  "client support",
  "client services",
  "support specialist",
  "support representative",
  "chat support",
  "live chat support",
  "email support",
  "call center",
  "call centre",
  "help desk",
  "customer success",
  "customer success specialist",

  // ========================================
  // SALES
  // ========================================

  "sales specialist",
  "sales representative",
  "sales associate",
  "sales executive",
  "inside sales",
  "remote sales",
  "sales support",
  "business development",
  "business development representative",
  "account manager",
  "account executive",
  "appointment setter",
  "lead generation",

  // ========================================
  // VIRTUAL ASSISTANT / ADMIN
  // ========================================

  "virtual assistant",
  "virtual administrative assistant",
  "administrative assistant",
  "administrative support",
  "executive assistant",
  "personal assistant",
  "remote assistant",
  "office assistant",
  "data entry",
  "data entry specialist",

  // ========================================
  // OPERATIONS
  // ========================================

  "operations assistant",
  "operations specialist",
  "operations coordinator",
  "operations",
  "order processing",
  "order management",

  // ========================================
  // SOCIAL MEDIA / MARKETING
  // ========================================

  "social media",
  "social media assistant",
  "social media specialist",
  "social media manager",
  "marketing",
  "marketing assistant",
  "marketing specialist",
  "digital marketing",
  "marketing coordinator",

  // ========================================
  // WRITING
  // ========================================

  "content writer",
  "content writing",
  "content creator",
  "copywriter",
  "copywriting",
  "blog writer",
  "technical writer",
  "writer",

  // ========================================
  // GRAPHIC DESIGN
  // ========================================

  "graphic designer",
  "graphic design",
  "Canva designer",
  "Canva",
  "visual designer",
  "creative designer",
  "social media designer",

  // ========================================
  // CUSTOMER SUCCESS
  // ========================================

  "customer success",
  "customer success specialist",
  "client success",
  "account manager",
  "account management",
  "client manager",

  // ========================================
  // RECRUITMENT / HR
  // ========================================

  "recruiter",
  "recruitment specialist",
  "talent acquisition",
  "HR assistant",
  "human resources",
  "HR coordinator",

  // ========================================
  // FINANCE / BOOKKEEPING
  // ========================================

  "bookkeeper",
  "bookkeeping",
  "accounting assistant",
  "accounts assistant",
  "finance assistant",
  "finance",
  "accounting",

  // ========================================
  // E-COMMERCE
  // ========================================

  "ecommerce",
  "ecommerce assistant",
  "ecommerce specialist",
  "ecommerce manager",
  "shopify assistant",
  "online store assistant",

  // ========================================
  // RESEARCH
  // ========================================

  "research assistant",
  "research specialist",
  "research",

  // ========================================
  // AI / DATA ANNOTATION
  // ========================================

  "AI data annotation",
  "data annotation",
  "AI trainer",
  "AI evaluator",
  "AI rater",
  "data labeling",

  // ========================================
  // EDUCATION
  // ========================================

  "online tutor",
  "online teacher",
  "tutor",
  "teacher",
  "education assistant",

  // ========================================
  // HEALTHCARE / MEDICAL
  // ========================================

  "healthcare",
  "medical assistant",
  "medical writer",
  "clinical research",
  "healthcare assistant",

  // ========================================
  // PROJECT / BUSINESS
  // ========================================

  "project coordinator",
  "project assistant",
  "project manager",
  "business operations",
  "business assistant",

  // ========================================
  // TECHNOLOGY
  // SMALL AMOUNT ONLY
  // ========================================

  "web developer",
  "software developer"

];


// ========================================
// VISA SPONSORSHIP SEARCHES
// ========================================
//
// These searches are NOT restricted to
// Nigeria.
//
// We search globally because the person
// may need to relocate to another country.
//
// ========================================

const VISA_SEARCHES = [

  "visa sponsorship",
  "visa sponsored",
  "visa sponsorship available",
  "work visa sponsorship",
  "employer sponsorship",
  "employer sponsored",
  "work permit sponsorship",
  "work permit",
  "skilled worker visa",
  "skilled worker sponsorship",
  "sponsorship available",
  "sponsor visa",
  "visa support",
  "immigration sponsorship",
  "immigration support",
  "international sponsorship"

];


// ========================================
// VISA KEYWORDS
// ========================================
//
// IMPORTANT:
//
// These are stronger sponsorship terms.
//
// "relocation" alone is NOT enough.
//
// ========================================

const STRONG_VISA_KEYWORDS = [

  "visa sponsorship",
  "visa sponsored",
  "visa sponsorship available",
  "work visa sponsorship",
  "employer sponsorship",
  "employer sponsored",
  "work permit sponsorship",
  "work permit sponsored",
  "skilled worker visa",
  "skilled worker sponsorship",
  "sponsorship available",
  "sponsor visa",
  "visa support",
  "immigration sponsorship",
  "immigration support"

];


// ========================================
// REMOTE EXCLUSION KEYWORDS
// ========================================
//
// If a job explicitly says the worker must
// be located somewhere other than Nigeria,
// reject it.
//
// ========================================

const REMOTE_EXCLUSION_PATTERNS = [

  /\bmust be based in\b/gi,
  /\bmust reside in\b/gi,
  /\bmust live in\b/gi,
  /\bonly open to candidates in\b/gi,
  /\bonly available to candidates in\b/gi,
  /\bonly applicants from\b/gi,
  /\bonly hiring in\b/gi,
  /\bavailable only in\b/gi,
  /\bresidents of\b/gi,
  /\bresident of\b/gi,
  /\bworking from the united kingdom only\b/gi,
  /\buk residents only\b/gi,
  /\bus residents only\b/gi,
  /\bcanada residents only\b/gi,
  /\beurope residents only\b/gi

];


// ========================================
// CLEAN HTML
// ========================================

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


// ========================================
// GET LOCATION RESTRICTIONS
// ========================================

function getLocationRestrictions(job) {

  return Array.isArray(
    job?.locationRestrictions
  )
    ? job.locationRestrictions
    : [];

}


// ========================================
// GET TIMEZONE RESTRICTIONS
// ========================================

function getTimezoneRestrictions(job) {

  return Array.isArray(
    job?.timezoneRestrictions
  )
    ? job.timezoneRestrictions
    : [];

}


// ========================================
// CHECK NIGERIA LOCATION
// ========================================
//
// Nigeria timezone = UTC+1.
//
// If a job has timezone restrictions and
// Nigeria's UTC+1 is NOT included,
// the job is rejected.
//
// If timezone restrictions are empty,
// we do not reject based on timezone.
//
// ========================================

function checkNigeriaTimezone(job) {

  const timezones =
    getTimezoneRestrictions(job);


  // No timezone restriction
  if (
    timezones.length === 0
  ) {

    return {

      accepted: true,

      reason: "no_timezone_restriction"

    };

  }


  const nigeriaTimezone =
    timezones.some(
      timezone =>
        Number(timezone) === 1
    );


  if (
    nigeriaTimezone
  ) {

    return {

      accepted: true,

      reason: "nigeria_utc_plus_1_allowed"

    };

  }


  return {

    accepted: false,

    reason:
      "nigeria_timezone_not_allowed"

  };

}


// ========================================
// CHECK NIGERIA LOCATION RESTRICTION
// ========================================

function checkNigeriaLocation(job) {

  const restrictions =
    getLocationRestrictions(job);


  // ========================================
  // WORLDWIDE
  // ========================================

  if (
    restrictions.length === 0
  ) {

    return {

      accepted: true,

      reason: "worldwide"

    };

  }


  // ========================================
  // NORMALIZE
  // ========================================

  const locations =
    restrictions.map(
      location => {

        return {

          alpha2:
            String(
              location?.alpha2 || ""
            ).toLowerCase(),

          name:
            String(
              location?.name || ""
            ).toLowerCase(),

          slug:
            String(
              location?.slug || ""
            ).toLowerCase()

        };

      }
    );


  // ========================================
  // NIGERIA
  // ========================================

  const nigeria =
    locations.some(
      location => {

        return (

          location.alpha2 === "ng" ||

          location.name === "nigeria" ||

          location.slug === "nigeria"

        );

      }
    );


  if (
    nigeria
  ) {

    return {

      accepted: true,

      reason: "nigeria"

    };

  }


  // ========================================
  // AFRICA
  // ========================================

  const africa =
    locations.some(
      location => {

        return (

          location.name.includes(
            "africa"
          ) ||

          location.slug.includes(
            "africa"
          )

        );

      }
    );


  if (
    africa
  ) {

    return {

      accepted: true,

      reason: "africa"

    };

  }


  // ========================================
  // OTHERWISE REJECT
  // ========================================

  return {

    accepted: false,

    reason:
      "restricted_outside_nigeria"

  };

}


// ========================================
// CHECK EXPLICIT REMOTE RESTRICTIONS
// ========================================

function checkRemoteDescription(job) {

  const text = (

    `${job.title || ""} ` +

    `${job.description || ""} ` +

    `${job.excerpt || ""}`

  ).toLowerCase();


  // ========================================
  // EXPLICIT NIGERIA ACCEPTANCE
  // ========================================

  if (
    text.includes("nigeria") ||
    text.includes("nigerian")
  ) {

    // If it mentions Nigeria and does not
    // contain an explicit contradictory
    // location restriction, allow it.

  }


  // ========================================
  // COUNTRY-SPECIFIC RESTRICTION
  // ========================================

  for (
    const pattern of
    REMOTE_EXCLUSION_PATTERNS
  ) {

    const match =
      text.match(pattern);


    if (
      match
    ) {

      const index =
        text.indexOf(
          match[0]
        );


      const nearby =
        text.substring(
          index,
          index + 150
        );


      // If the nearby text explicitly
      // mentions Nigeria, don't reject.

      if (
        nearby.includes("nigeria") ||
        nearby.includes("nigerian")
      ) {

        continue;

      }


      return {

        accepted: false,

        reason:
          "explicit_country_restriction"

      };

    }

  }


  return {

    accepted: true,

    reason:
      "no_explicit_country_exclusion"

  };

}


// ========================================
// FINAL NIGERIA REMOTE CHECK
// ========================================
//
// A remote job is accepted ONLY when:
//
// 1. Location allows Nigeria/worldwide
// 2. Timezone allows Nigeria OR no timezone
//    restriction exists
// 3. Description does not explicitly
//    restrict workers to another country
//
// ========================================

function checkNigeriaFriendlyJob(job) {

  const locationCheck =
    checkNigeriaLocation(
      job
    );


  if (
    !locationCheck.accepted
  ) {

    return {

      accepted: false,

      reason:
        locationCheck.reason

    };

  }


  const timezoneCheck =
    checkNigeriaTimezone(
      job
    );


  if (
    !timezoneCheck.accepted
  ) {

    return {

      accepted: false,

      reason:
        timezoneCheck.reason

    };

  }


  const descriptionCheck =
    checkRemoteDescription(
      job
    );


  if (
    !descriptionCheck.accepted
  ) {

    return {

      accepted: false,

      reason:
        descriptionCheck.reason

    };

  }


  return {

    accepted: true,

    reason:
      `${locationCheck.reason}_${timezoneCheck.reason}`

  };

}


// ========================================
// CHECK VISA SPONSORSHIP
// ========================================
//
// IMPORTANT:
//
// A job is NOT considered sponsored just
// because it says "relocation".
//
// It must contain genuine sponsorship,
// work visa, work permit, employer
// sponsorship, skilled worker visa, etc.
//
// ========================================

function checkVisaSponsorship(job) {

  const text = (

    `${job.title || ""} ` +

    `${job.description || ""} ` +

    `${job.excerpt || ""} ` +

    `${Array.isArray(job.categories)
      ? job.categories.join(" ")
      : ""} ` +

    `${Array.isArray(job.parentCategories)
      ? job.parentCategories.join(" ")
      : ""}`

  ).toLowerCase();


  // ========================================
  // STRONG SPONSORSHIP MATCH
  // ========================================

  const matchedKeywords =
    STRONG_VISA_KEYWORDS.filter(
      keyword =>
        text.includes(
          keyword
        )
    );


  if (
    matchedKeywords.length === 0
  ) {

    return {

      accepted: false,

      reason:
        "no_clear_visa_sponsorship",

      matchedKeywords: []

    };

  }


  return {

    accepted: true,

    reason:
      "visa_sponsorship_found",

    matchedKeywords

  };

}


// ========================================
// SEARCH HIMALAYAS
// ========================================
//
// nigeriaOnly = true
//
//    country=NG
//
// nigeriaOnly = false
//
//    global search for sponsorship
//
// ========================================

async function searchHimalayas(
  search = "",
  page = 1,
  nigeriaOnly = true
) {

  try {

    const url =
      new URL(
        HIMALAYAS_API
      );


    // ========================================
    // NIGERIA SEARCH
    // ========================================

    if (
      nigeriaOnly
    ) {

      url.searchParams.set(
        "country",
        "NG"
      );

    }


    // ========================================
    // SEARCH
    // ========================================

    if (
      search &&
      search.trim()
    ) {

      url.searchParams.set(
        "q",
        search.trim()
      );

    }


    // ========================================
    // SORT
    // ========================================

    url.searchParams.set(
      "sort",
      "recent"
    );


    // ========================================
    // PAGE
    // ========================================

    url.searchParams.set(
      "page",
      String(page)
    );


    console.log(
      "Himalayas search:",
      search || "all",
      nigeriaOnly
        ? "(REMOTE/NIGERIA)"
        : "(VISA/GLOBAL)"
    );


    const response =
      await fetch(
        url.toString()
      );


    if (
      !response.ok
    ) {

      console.error(
        "Himalayas error:",
        response.status,
        response.statusText
      );

      return [];

    }


    const data =
      await response.json();


    if (
      !Array.isArray(
        data.jobs
      )
    ) {

      return [];

    }


    return data.jobs;

  } catch (
    error
  ) {

    console.error(
      "Himalayas request failed:",
      error.message
    );

    return [];

  }

}


// ========================================
// REMOVE DUPLICATES
// ========================================

function removeDuplicates(
  jobs
) {

  const seen =
    new Set();


  return jobs.filter(
    job => {

      const key =

        job.guid ||

        job.applicationLink ||

        `${job.title || ""}-${job.companyName || ""}`;


      if (
        seen.has(key)
      ) {

        return false;

      }


      seen.add(
        key
      );


      return true;

    }
  );

}


// ========================================
// FORMAT SALARY
// ========================================

function formatSalary(
  job
) {

  const min =
    job.minSalary;

  const max =
    job.maxSalary;

  const currency =
    job.currency ||
    "";

  const period =
    job.salaryPeriod ||
    "";


  if (
    min === null ||
    min === undefined
  ) {

    return "Salary not specified";

  }


  const formattedMin =
    Number(
      min
    ).toLocaleString();


  let result =
    `${currency} ${formattedMin}`;


  if (
    max !== null &&
    max !== undefined &&
    max !== ""
  ) {

    const formattedMax =
      Number(
        max
      ).toLocaleString();


    result +=
      ` - ${formattedMax}`;

  }


  if (
    period
  ) {

    result +=
      ` / ${period}`;

  }


  return result.trim();

}


// ========================================
// FORMAT JOB
// ========================================

function formatHimalayasJob(
  job,
  options = {}
) {

  const restrictions =
    getLocationRestrictions(
      job
    );


  // ========================================
  // LOCATION
  // ========================================

  let location =
    "Worldwide";


  if (
    restrictions.length > 0
  ) {

    location =
      restrictions

        .map(
          country => {

            return (

              country?.name ||

              country?.alpha2 ||

              country?.slug ||

              ""

            );

          }
        )

        .filter(Boolean)

        .join(", ");

  }


  // ========================================
  // DESCRIPTION
  // ========================================

  const description =
    cleanHtml(
      job.description ||
      job.excerpt ||
      ""
    );


  // ========================================
  // CATEGORIES
  // ========================================

  const categories =

    Array.isArray(
      job.categories
    )

      ? job.categories.join(", ")

      : "";


  const parentCategories =

    Array.isArray(
      job.parentCategories
    )

      ? job.parentCategories.join(", ")

      : "";


  // ========================================
  // SENIORITY
  // ========================================

  const seniority =

    Array.isArray(
      job.seniority
    )

      ? job.seniority.join(", ")

      : "";


  // ========================================
  // VISA
  // ========================================

  const visaSponsorship =
    options.visaSponsorship === true;


  // ========================================
  // RETURN
  // ========================================

  return {

    id:

      job.guid ||

      `${job.companySlug || "company"}-${job.title || "job"}`,

    title:

      job.title ||
      "Job",

    company:

      job.companyName ||
      "Company not specified",

    companyLogo:

      job.companyLogo ||
      "",

    location,

    locationRestrictions:

      restrictions,

    timezoneRestrictions:

      getTimezoneRestrictions(
        job
      ),

    description,

    excerpt:

      cleanHtml(
        job.excerpt ||
        ""
      ),

    url:

      job.applicationLink ||
      "",

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

      formatSalary(
        job
      ),

    contract_type:

      job.employmentType ||
      "",

    contract_time:

      job.employmentType ||
      "",

    type:

      job.employmentType ||
      "Full-time",

    employmentType:

      job.employmentType ||
      "",

    category:

      categories,

    parentCategory:

      parentCategories,

    seniority,

    remote:
      !visaSponsorship,

    nigeriaFriendly:
      !visaSponsorship,

    visaSponsorship,

    source:
      "Himalayas",

    sourceUrl:
      "https://himalayas.app/"

  };

}


// ========================================
// GET REMOTE JOBS
// ========================================

async function getRemoteJobs(
  search = "",
  page = 1
) {

  const cacheKey =
    `remote-${search.toLowerCase()}-${page}`;


  const cached =
    cache.get(
      cacheKey
    );


  if (
    cached &&
    Date.now() - cached.time <
      CACHE_TIME
  ) {

    console.log(
      "Returning cached remote jobs"
    );

    return cached.jobs;

  }


  let rawJobs = [];


  // ========================================
  // USER SEARCH
  // ========================================

  if (
    search &&
    search.trim()
  ) {

    rawJobs =
      await searchHimalayas(
        search,
        page,
        true
      );

  }


  // ========================================
  // DEFAULT SEARCH
  // ========================================

  else {

    const SEARCHES_PER_PAGE = 6;


    const startIndex =
      (
        (page - 1) *
        SEARCHES_PER_PAGE
      ) %
      JOB_SEARCHES.length;


    const selectedSearches = [];


    for (
      let i = 0;
      i < SEARCHES_PER_PAGE;
      i++
    ) {

      const index =
        (
          startIndex + i
        ) %
        JOB_SEARCHES.length;


      selectedSearches.push(
        JOB_SEARCHES[index]
      );

    }


    console.log(
      "Remote searches:",
      selectedSearches
    );


    const results =
      await Promise.all(

        selectedSearches.map(
          searchTerm =>

            searchHimalayas(
              searchTerm,
              page,
              true
            )

        )

      );


    results.forEach(
      jobs => {

        if (
          Array.isArray(
            jobs
          )
        ) {

          rawJobs.push(
            ...jobs
          );

        }

      }
    );

  }


  console.log(
    `Raw remote jobs: ${rawJobs.length}`
  );


  // ========================================
  // DUPLICATES
  // ========================================

  rawJobs =
    removeDuplicates(
      rawJobs
    );


  console.log(
    `Remote after duplicates: ${rawJobs.length}`
  );


  // ========================================
  // NIGERIA FILTER
  // ========================================

  const acceptedJobs =
    [];


  rawJobs.forEach(
    job => {

      const check =
        checkNigeriaFriendlyJob(
          job
        );


      if (
        check.accepted
      ) {

        acceptedJobs.push(
          job
        );

      }

    }
  );


  console.log(
    `Remote jobs allowed in Nigeria: ${acceptedJobs.length}`
  );


  // ========================================
  // FORMAT
  // ========================================

  const jobs =
    acceptedJobs.map(
      job =>
        formatHimalayasJob(
          job,
          {
            visaSponsorship:
              false
          }
        )
    );


  // ========================================
  // CACHE
  // ========================================

  cache.set(
    cacheKey,
    {

      time:
        Date.now(),

      jobs

    }
  );


  return jobs;

}


// ========================================
// GET VISA JOBS
// ========================================

async function getVisaJobs(
  search = "",
  page = 1
) {

  const cacheKey =
    `visa-${search.toLowerCase()}-${page}`;


  const cached =
    cache.get(
      cacheKey
    );


  if (
    cached &&
    Date.now() - cached.time <
      CACHE_TIME
  ) {

    console.log(
      "Returning cached visa jobs"
    );

    return cached.jobs;

  }


  let rawJobs = [];


  // ========================================
  // USER SEARCH
  // ========================================

  if (
    search &&
    search.trim()
  ) {

    rawJobs =
      await searchHimalayas(
        `${search} visa sponsorship`,
        page,
        false
      );

  }


  // ========================================
  // DEFAULT SEARCH
  // ========================================

  else {

    const SEARCHES_PER_PAGE = 6;


    const startIndex =
      (
        (page - 1) *
        SEARCHES_PER_PAGE
      ) %
      VISA_SEARCHES.length;


    const selectedSearches = [];


    for (
      let i = 0;
      i < SEARCHES_PER_PAGE;
      i++
    ) {

      const index =
        (
          startIndex + i
        ) %
        VISA_SEARCHES.length;


      selectedSearches.push(
        VISA_SEARCHES[index]
      );

    }


    console.log(
      "Visa searches:",
      selectedSearches
    );


    const results =
      await Promise.all(

        selectedSearches.map(
          searchTerm =>

            searchHimalayas(
              searchTerm,
              page,
              false
            )

        )

      );


    results.forEach(
      jobs => {

        if (
          Array.isArray(
            jobs
          )
        ) {

          rawJobs.push(
            ...jobs
          );

        }

      }

    );

  }


  console.log(
    `Raw visa jobs: ${rawJobs.length}`
  );


  // ========================================
  // DUPLICATES
  // ========================================

  rawJobs =
    removeDuplicates(
      rawJobs
    );


  // ========================================
  // VISA SPONSORSHIP FILTER
  // ========================================

  const acceptedVisaJobs =
    [];


  rawJobs.forEach(
    job => {

      const check =
        checkVisaSponsorship(
          job
        );


      if (
        check.accepted
      ) {

        acceptedVisaJobs.push(
          job
        );

      }

    }
  );


  console.log(
    `Confirmed visa sponsorship jobs: ${acceptedVisaJobs.length}`
  );


  // ========================================
  // FORMAT
  // ========================================

  const jobs =
    acceptedVisaJobs.map(
      job =>
        formatHimalayasJob(
          job,
          {
            visaSponsorship:
              true
          }
        )
    );


  // ========================================
  // CACHE
  // ========================================

  cache.set(
    cacheKey,
    {

      time:
        Date.now(),

      jobs

    }
  );


  return jobs;

}


// ========================================
// HOME
// ========================================

app.get(
  "/",
  (req, res) => {

    res.json({

      success:
        true,

      message:
        "Nigeria Jobs API is running",

      status:
        "online",

      source:
        "Himalayas",

      api:
        "Free public API",

      endpoints: {

        remote:
          "/api/jobs/remote",

        visa:
          "/api/jobs/visa",

        jobs:
          "/api/jobs",

        debug:
          "/api/jobs/remote/debug"

      }

    });

  }
);


// ========================================
// REMOTE JOBS ENDPOINT
// ========================================

app.get(
  "/api/jobs/remote",
  async (req, res) => {

    try {

      const search =
        String(
          req.query.search ||
          ""
        ).trim();


      const page =
        Math.max(

          1,

          parseInt(
            req.query.page ||
            "1",
            10
          )

        );


      const jobs =
        await getRemoteJobs(
          search,
          page
        );


      res.json({

        success:
          true,

        count:
          jobs.length,

        page,

        type:
          "remote",

        country:
          "Nigeria",

        jobs

      });

    } catch (
      error
    ) {

      console.error(
        "Remote jobs error:",
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


// ========================================
// VISA SPONSORSHIP ENDPOINT
// ========================================

app.get(
  "/api/jobs/visa",
  async (req, res) => {

    try {

      const search =
        String(
          req.query.search ||
          ""
        ).trim();


      const page =
        Math.max(

          1,

          parseInt(
            req.query.page ||
            "1",
            10
          )

        );


      const jobs =
        await getVisaJobs(
          search,
          page
        );


      res.json({

        success:
          true,

        count:
          jobs.length,

        page,

        type:
          "visa-sponsorship",

        applicants:
          "Nigeria",

        jobs

      });

    } catch (
      error
    ) {

      console.error(
        "Visa jobs error:",
        error
      );


      res.status(500).json({

        success:
          false,

        error:
          "Failed to fetch visa sponsorship jobs",

        message:
          error.message

      });

    }

  }
);


// ========================================
// REMOTE DEBUG
// ========================================

app.get(
  "/api/jobs/remote/debug",
  async (req, res) => {

    try {

      const search =
        String(
          req.query.search ||
          ""
        ).trim();


      const jobs =
        await getRemoteJobs(
          search,
          1
        );


      const results =
        jobs.map(
          job => {

            const check =
              checkNigeriaFriendlyJob(
                job
              );


            return {

              id:
                job.id,

              title:
                job.title,

              company:
                job.company,

              location:
                job.location,

              locationRestrictions:
                job.locationRestrictions,

              timezoneRestrictions:
                job.timezoneRestrictions,

              accepted:
                check.accepted,

              reason:
                check.reason,

              category:
                job.category,

              url:
                job.url

            };

          }
        );


      res.json({

        success:
          true,

        search,

        count:
          results.length,

        jobs:
          results

      });

    } catch (
      error
    ) {

      console.error(
        "Debug error:",
        error
      );


      res.status(500).json({

        success:
          false,

        error:
          "Debug search failed",

        message:
          error.message

      });

    }

  }
);


// ========================================
// GENERAL JOBS ENDPOINT
// ========================================
//
// This remains the remote jobs feed.
//
// ========================================

app.get(
  "/api/jobs",
  async (req, res) => {

    try {

      const search =
        String(
          req.query.search ||
          ""
        ).trim();


      const page =
        Math.max(

          1,

          parseInt(
            req.query.page ||
            "1",
            10
          )

        );


      const jobs =
        await getRemoteJobs(
          search,
          page
        );


      res.json({

        success:
          true,

        count:
          jobs.length,

        page,

        type:
          "remote",

        country:
          "Nigeria",

        jobs

      });

    } catch (
      error
    ) {

      console.error(
        "Jobs endpoint error:",
        error
      );


      res.status(500).json({

        success:
          false,

        error:
          "Failed to fetch jobs",

        message:
          error.message

      });

    }

  }
);


// ========================================
// START SERVER
// ========================================

app.listen(
  PORT,
  () => {

    console.log(
      `Server running on port ${PORT}`
    );

  }
);
