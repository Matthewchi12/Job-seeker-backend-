// ========================================
// NIGERIA-FRIENDLY REMOTE JOBS BACKEND
// + VISA SPONSORSHIP JOBS
// HIMALAYAS API
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
// REMOTE JOB CATEGORIES
// ========================================
//
// Broad non-tech remote jobs.
//
// Technology is intentionally limited.
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
  // VIRTUAL ASSISTANT
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
  // CUSTOMER SUCCESS / ACCOUNT MANAGEMENT
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
  // LOW AMOUNT ONLY
  // ========================================

  "web developer",
  "frontend developer",
  "software developer"

];


// ========================================
// VISA SPONSORSHIP SEARCHES
// ========================================
//
// These are separate from remote jobs.
//
// These searches look for jobs mentioning:
//
// - Visa sponsorship
// - Work visa
// - Visa sponsored
// - Skilled worker sponsorship
// - Relocation
// - Employer sponsorship
//
// ========================================

const VISA_SEARCHES = [

  "visa sponsorship",
  "visa sponsored",
  "visa sponsorship available",
  "work visa sponsorship",
  "work visa",
  "visa support",
  "employer sponsorship",
  "employer sponsored",
  "sponsorship available",
  "skilled worker sponsorship",
  "skilled worker visa",
  "relocation assistance",
  "relocation support",
  "relocation package",
  "international applicants",
  "sponsor visa",
  "visa sponsorship jobs"

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
// CHECK NIGERIA ELIGIBILITY
// ========================================

function checkNigeriaFriendlyJob(job) {

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


  const countries =
    restrictions.map(country => {

      return {

        alpha2:
          String(
            country?.alpha2 || ""
          ).toLowerCase(),

        name:
          String(
            country?.name || ""
          ).toLowerCase(),

        slug:
          String(
            country?.slug || ""
          ).toLowerCase()

      };

    });


  // ========================================
  // NIGERIA
  // ========================================

  const nigeria =
    countries.some(country => {

      return (

        country.alpha2 === "ng" ||

        country.name === "nigeria" ||

        country.slug === "nigeria"

      );

    });


  if (nigeria) {

    return {

      accepted: true,

      reason: "nigeria"

    };

  }


  // ========================================
  // AFRICA
  // ========================================

  const africa =
    countries.some(country => {

      return (

        country.name.includes(
          "africa"
        ) ||

        country.slug.includes(
          "africa"
        )

      );

    });


  if (africa) {

    return {

      accepted: true,

      reason: "africa"

    };

  }


  // ========================================
  // NOT AVAILABLE IN NIGERIA
  // ========================================

  return {

    accepted: false,

    reason:
      "restricted_outside_nigeria"

  };

}


// ========================================
// SEARCH HIMALAYAS
// ========================================
//
// For remote jobs:
// country=NG
//
// For visa jobs:
// no country restriction
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
    // NIGERIA FILTER
    // ========================================

    if (nigeriaOnly) {

      url.searchParams.set(
        "country",
        "NG"
      );

    }


    // ========================================
    // SEARCH TERM
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
    // SORT BY RECENT
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
        ? "(Nigeria)"
        : "(Visa)"
    );


    const response =
      await fetch(
        url.toString()
      );


    if (!response.ok) {

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


  } catch (error) {

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


      seen.add(key);

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
// FORMAT HIMALAYAS JOB
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

        .map(country => {

          return (

            country?.name ||

            country?.alpha2 ||

            country?.slug ||

            ""

          );

        })

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
  // CATEGORY
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
  // VISA FLAG
  // ========================================

  const visaSponsorship =
    options.visaSponsorship === true;


  // ========================================
  // RETURN JOB
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

      Array.isArray(
        job.timezoneRestrictions
      )

        ? job.timezoneRestrictions

        : [],

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
      visaSponsorship
        ? false
        : true,

    nigeriaFriendly:
      visaSponsorship
        ? false
        : true,

    visaSponsorship,

    source:
      "Himalayas",

    sourceUrl:
      "https://himalayas.app/"

  };

}


// ========================================
// GET DIVERSE REMOTE JOBS
// ========================================

async function getRemoteJobs(
  search = "",
  page = 1
) {

  const cacheKey =
    `diverse-${search.toLowerCase()}-${page}`;


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
  // NO SEARCH
  // ========================================

  else {

    const CATEGORIES_PER_PAGE = 6;


    const startIndex =
      (
        (page - 1) *
        CATEGORIES_PER_PAGE
      ) %
      JOB_SEARCHES.length;


    const selectedCategories = [];


    for (
      let i = 0;
      i < CATEGORIES_PER_PAGE;
      i++
    ) {

      const index =
        (
          startIndex + i
        ) %
        JOB_SEARCHES.length;


      selectedCategories.push(
        JOB_SEARCHES[index]
      );

    }


    console.log(
      "Remote categories used:",
      selectedCategories
    );


    // ========================================
    // FETCH ONLY 6 SEARCHES
    // ========================================

    const results =
      await Promise.all(

        selectedCategories.map(
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
    `Raw remote jobs collected: ${rawJobs.length}`
  );


  // ========================================
  // REMOVE DUPLICATES
  // ========================================

  rawJobs =
    removeDuplicates(
      rawJobs
    );


  console.log(
    `After duplicates removed: ${rawJobs.length}`
  );


  // ========================================
  // NIGERIA FILTER
  // ========================================

  const nigeriaFriendlyJobs =
    rawJobs.filter(
      job => {

        const result =
          checkNigeriaFriendlyJob(
            job
          );


        return result.accepted;

      }
    );


  console.log(
    `Nigeria-friendly jobs: ${nigeriaFriendlyJobs.length}`
  );


  // ========================================
  // FORMAT
  // ========================================

  const jobs =
    nigeriaFriendlyJobs.map(
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
// GET VISA SPONSORSHIP JOBS
// ========================================
//
// IMPORTANT:
//
// These jobs are NOT restricted to Nigeria.
//
// They may be located in:
//
// UK
// Canada
// USA
// Australia
// Europe
// Other countries
//
// The purpose is to find employers/jobs
// mentioning sponsorship or relocation.
//
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
  // USER VISA SEARCH
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
  // DEFAULT VISA SEARCH
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
      "Visa searches used:",
      selectedSearches
    );


    // ========================================
    // FETCH ONLY 6 SEARCHES
    // ========================================

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
    `Raw visa jobs collected: ${rawJobs.length}`
  );


  // ========================================
  // REMOVE DUPLICATES
  // ========================================

  rawJobs =
    removeDuplicates(
      rawJobs
    );


  console.log(
    `Visa jobs after duplicates removed: ${rawJobs.length}`
  );


  // ========================================
  // VISA FILTER
  // ========================================
  //
  // We only keep jobs where the title,
  // description, excerpt or category
  // actually mentions sponsorship,
  // visa, relocation, or related terms.
  //
  // ========================================

  const visaJobs =
    rawJobs.filter(
      job => {

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


        const visaKeywords = [

          "visa sponsorship",
          "visa sponsored",
          "sponsorship available",
          "sponsor visa",
          "work visa",
          "visa support",
          "employer sponsorship",
          "employer sponsored",
          "skilled worker visa",
          "skilled worker sponsorship",
          "relocation assistance",
          "relocation support",
          "relocation package",
          "visa sponsorship available"

        ];


        return visaKeywords.some(
          keyword =>
            text.includes(
              keyword
            )
        );

      }
    );


  console.log(
    `Confirmed visa/sponsorship jobs: ${visaJobs.length}`
  );


  // ========================================
  // FORMAT
  // ========================================

  const jobs =
    visaJobs.map(
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
        "Nigeria Remote Jobs API is running",

      status:
        "online",

      source:
        "Himalayas",

      api:
        "Free public API",

      endpoints: {

        remote:
          "/api/jobs/remote",

        jobs:
          "/api/jobs",

        visa:
          "/api/jobs/visa",

        debug:
          "/api/jobs/remote/debug"

      }

    });

  }
);


// ========================================
// REMOTE JOBS
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

        error:
          "Failed to fetch remote jobs",

        message:
          error.message

      });

    }

  }
);


// ========================================
// VISA SPONSORSHIP JOBS
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

        jobs

      });


    } catch (error) {

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
// DEBUG
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

    } catch (error) {

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

        jobs

      });


    } catch (error) {

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
