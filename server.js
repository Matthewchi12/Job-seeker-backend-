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
// These searches are intentionally broad.
// The goal is NOT to return only tech jobs.
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

  // Virtual assistance / administration
  "virtual assistant",
  "administrative",
  "operations",
  "data entry",

  // Data / AI
  "data",
  "data annotation",
  "AI",

  // Writing / communication
  "writer",
  "content",
  "copywriter",

  // Marketing / sales
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

  // Healthcare / medical
  "healthcare",
  "medical",
  "clinical",

  // Research
  "research",

  // HR / recruitment
  "human resources",
  "recruiter",

  // E-commerce
  "ecommerce",

  // Project / business
  "project manager",
  "business",

  // General remote work
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
// Accepted:
//
// 1. Worldwide job
// 2. Nigeria-specific job
// 3. Africa-wide job
//
// Rejected:
//
// Jobs explicitly restricted to countries
// that do not include Nigeria.
//
// ========================================

function checkNigeriaFriendlyJob(job) {

  const restrictions =
    getLocationRestrictions(job);


  // Empty restrictions means worldwide
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


    // Nigeria search returns jobs
    // available to Nigeria, including
    // worldwide jobs.
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
      "Himalayas:",
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


    // Frontend compatibility
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
      "Returning cached jobs"
    );

    return cached.jobs;

  }


  let rawJobs = [];


  // ========================================
  // USER SEARCH
  // ========================================
  //
  // If user searches something specific,
  // use that search directly.
  //
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
  // NO SPECIFIC SEARCH
  // ========================================
  //
  // Pull jobs from different categories.
  //
  // ========================================

  else {

    const results =
      await Promise.all(

        JOB_SEARCHES.map(
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
  // FORMAT JOBS
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
