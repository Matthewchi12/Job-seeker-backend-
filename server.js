// ========================================
// NIGERIA-FRIENDLY REMOTE JOBS BACKEND
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
// Broad categories.
// These are rotated to avoid sending
// too many API requests at once.
//
// ========================================

const JOB_SEARCHES = [

  // Technology
  "software",
  "IT",
  "developer",

  // Customer service
  "customer service",
  "customer support",
  "technical support",

  // Virtual assistance
  "virtual assistant",
  "administrative",
  "operations",
  "data entry",

  // Data / AI
  "data",
  "data annotation",
  "AI",

  // Writing
  "writer",
  "content",
  "copywriter",

  // Marketing / Sales
  "marketing",
  "social media",
  "sales",

  // Design
  "designer",
  "graphic design",
  "UX",

  // Finance
  "accounting",
  "finance",
  "bookkeeper",

  // Education
  "teacher",
  "tutor",
  "education",

  // Healthcare
  "healthcare",
  "medical",
  "clinical",

  // Research
  "research",

  // HR
  "human resources",
  "recruiter",

  // E-commerce
  "ecommerce",

  // Business
  "project manager",
  "business",

  // General remote
  "remote"

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
//
// ACCEPT:
//
// 1. Worldwide
// 2. Nigeria
// 3. Africa
//
// REJECT:
//
// Explicit countries that do not
// include Nigeria.
//
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

async function searchHimalayas(
  search = "",
  page = 1
) {

  try {

    const url =
      new URL(
        HIMALAYAS_API
      );


    // ========================================
    // IMPORTANT
    // ========================================
    //
    // country=NG asks Himalayas for jobs
    // available in Nigeria, including
    // worldwide jobs.
    //
    // ========================================

    url.searchParams.set(
      "country",
      "NG"
    );


    if (
      search &&
      search.trim()
    ) {

      url.searchParams.set(
        "q",
        search.trim()
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
      "Himalayas search:",
      search || "all"
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
    job.currency || "";

  const period =
    job.salaryPeriod || "";


  if (
    min === null ||
    min === undefined
  ) {

    return "Salary not specified";

  }


  const formattedMin =
    Number(min).toLocaleString();


  let result =
    `${currency} ${formattedMin}`;


  if (
    max !== null &&
    max !== undefined &&
    max !== ""
  ) {

    const formattedMax =
      Number(max).toLocaleString();


    result +=
      ` - ${formattedMax}`;

  }


  if (period) {

    result +=
      ` / ${period}`;

  }


  return result.trim();

}


// ========================================
// FORMAT HIMALAYAS JOB
// ========================================

function formatHimalayasJob(
  job
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
  // RETURN JOB
  // ========================================

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

      formatSalary(job),

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
      true,

    nigeriaFriendly:
      true,

    source:
      "Himalayas",

    sourceUrl:
      "https://himalayas.app/"

  };

}


// ========================================
// GET DIVERSE REMOTE JOBS
// ========================================
//
// IMPORTANT:
//
// We DO NOT request all 30 categories
// simultaneously.
//
// Instead we rotate through the categories.
//
// This gives the website different types
// of jobs while reducing API pressure.
//
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
      "Returning cached jobs"
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
        page
      );

  }


  // ========================================
  // NO SEARCH
  // ========================================

  else {

    // Number of categories per request
    const CATEGORIES_PER_PAGE = 6;


    // Rotate categories based on page
    const startIndex =
      ((page - 1) *
        CATEGORIES_PER_PAGE) %
      JOB_SEARCHES.length;


    const selectedCategories = [];


    for (
      let i = 0;
      i < CATEGORIES_PER_PAGE;
      i++
    ) {

      const index =
        (startIndex + i) %
        JOB_SEARCHES.length;


      selectedCategories.push(
        JOB_SEARCHES[index]
      );

    }


    console.log(
      "Categories used:",
      selectedCategories
    );


    // ========================================
    // ONLY 6 REQUESTS
    // ========================================

    const results =
      await Promise.all(

        selectedCategories.map(
          searchTerm =>

            searchHimalayas(
              searchTerm,
              page
            )

        )

      );


    results.forEach(
      jobs => {

        if (
          Array.isArray(jobs)
        ) {

          rawJobs.push(
            ...jobs
          );

        }

      }
    );

  }


  console.log(
    `Raw jobs collected: ${rawJobs.length}`
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
  // NIGERIA-FRIENDLY FILTER
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
      formatHimalayasJob
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
        "Free public API"

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
