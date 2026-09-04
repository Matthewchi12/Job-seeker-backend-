const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 10000;


/*
========================================
HIMALAYAS API
========================================

FREE
NO API KEY
NO SIGN UP REQUIRED
========================================
*/

const HIMALAYAS_API =
  "https://himalayas.app/jobs/api/search";


/*
========================================
CACHE
========================================

Himalayas data is refreshed daily.
We cache results so your website does
not repeatedly hit the API.

Cache: 30 minutes
========================================
*/

const cache = new Map();

const CACHE_TIME =
  30 * 60 * 1000;


/*
========================================
CLEAN HTML
========================================
*/

function cleanHtml(html = "") {

  return String(html)
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, " ")
    .trim();

}


/*
========================================
GET LOCATION RESTRICTIONS
========================================
*/

function getLocationRestrictions(job) {

  return Array.isArray(
    job?.locationRestrictions
  )
    ? job.locationRestrictions
    : [];

}


/*
========================================
CHECK NIGERIA ELIGIBILITY
========================================

Accepted:

🇳🇬 Nigeria
🌍 Worldwide
🌍 Africa

Empty locationRestrictions means
worldwide on Himalayas.

IMPORTANT:

We do NOT accept a job just because
the title says "remote".

The location restriction must allow
Nigeria or have no restriction.
========================================
*/

function checkNigeriaFriendlyJob(job) {

  const restrictions =
    getLocationRestrictions(job);


  /*
  ========================================
  WORLDWIDE
  ========================================

  Himalayas documents that an empty
  locationRestrictions array means
  worldwide.
  */

  if (
    restrictions.length === 0
  ) {

    return {

      accepted: true,

      reason: "worldwide"

    };

  }


  /*
  ========================================
  CHECK RESTRICTIONS
  ========================================
  */

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


  /*
  ========================================
  NIGERIA
  ========================================
  */

  const nigeria =
    countries.some(country =>

      country.alpha2 === "ng" ||

      country.name === "nigeria" ||

      country.slug === "nigeria"

    );


  if (nigeria) {

    return {

      accepted: true,

      reason: "nigeria"

    };

  }


  /*
  ========================================
  AFRICA
  ========================================

  Some listings may use a regional
  restriction.
  */

  const africa =
    countries.some(country =>

      country.name.includes("africa") ||

      country.slug.includes("africa")

    );


  if (africa) {

    return {

      accepted: true,

      reason: "africa"

    };

  }


  /*
  ========================================
  OTHER COUNTRY
  ========================================

  Example:

  United States ❌
  United Kingdom ❌
  Canada ❌
  India ❌
  Australia ❌
  Germany ❌
  ========================================
  */

  return {

    accepted: false,

    reason:
      "restricted_outside_nigeria"

  };

}


/*
========================================
SEARCH HIMALAYAS
========================================
*/

async function searchHimalayas(
  search = "",
  page = 1
) {

  try {

    const url =
      new URL(HIMALAYAS_API);


    /*
    ========================================
    COUNTRY = NIGERIA
    ========================================

    Himalayas supports country filtering.
    ========================================
    */

    url.searchParams.set(
      "country",
      "NG"
    );


    /*
    ========================================
    WORLDWIDE TOO
    ========================================

    We make a separate worldwide request
    so Nigerians also get jobs that have
    no location restrictions.
    ========================================
    */

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
      "Himalayas request:",
      url.toString()
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


/*
========================================
WORLDWIDE SEARCH
========================================
*/

async function searchWorldwide(
  search = "",
  page = 1
) {

  try {

    const url =
      new URL(HIMALAYAS_API);


    /*
    ========================================
    SEARCH
    ========================================
    */

    if (
      search &&
      search.trim()
    ) {

      url.searchParams.set(
        "q",
        search.trim()
      );

    }


    /*
    ========================================
    WORLDWIDE ONLY
    ========================================
    */

    url.searchParams.set(
      "worldwide",
      "true"
    );


    url.searchParams.set(
      "sort",
      "recent"
    );


    url.searchParams.set(
      "page",
      String(page)
    );


    console.log(
      "Himalayas worldwide request:",
      url.toString()
    );


    const response =
      await fetch(
        url.toString()
      );


    if (!response.ok) {

      console.error(
        "Himalayas worldwide error:",
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
      "Himalayas worldwide request failed:",
      error.message
    );

    return [];

  }

}


/*
========================================
REMOVE DUPLICATES
========================================
*/

function removeDuplicates(jobs) {

  const seen =
    new Set();


  return jobs.filter(job => {

    const key =
      job.guid ||
      `${job.title}-${job.companySlug}`;


    if (
      seen.has(key)
    ) {

      return false;

    }


    seen.add(key);

    return true;

  });

}


/*
========================================
FORMAT JOB
========================================
*/

function formatHimalayasJob(job) {

  const restrictions =
    getLocationRestrictions(job);


  let location =
    "Worldwide";


  if (
    restrictions.length > 0
  ) {

    location =
      restrictions
        .map(country =>

          country?.name ||
          country?.alpha2 ||
          country?.slug ||
          ""

        )
        .filter(Boolean)
        .join(", ");

  }


  return {

    id:
      job.guid ||
      `${job.companySlug || "company"}-${job.title}`,

    title:
      job.title || "",

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

    description:
      job.description ||
      job.excerpt ||
      "",

    excerpt:
      job.excerpt ||
      "",

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
      "annual",

    currency:
      job.currency ||
      "",

    contract_type:
      job.employmentType ||
      "",

    contract_time:
      job.employmentType ||
      "",

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

    seniority:
      Array.isArray(
        job.seniority
      )
        ? job.seniority.join(", ")
        : "",

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


/*
========================================
GET REMOTE JOBS
========================================
*/

async function getRemoteJobs(
  search = "",
  page = 1
) {

  const cacheKey =
    `${search.toLowerCase()}-${page}`;


  /*
  ========================================
  CACHE CHECK
  ========================================
  */

  const cached =
    cache.get(cacheKey);


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


  /*
  ========================================
  GET NIGERIA JOBS
  ========================================
  */

  const nigeriaJobs =
    await searchHimalayas(
      search,
      page
    );


  /*
  ========================================
  GET WORLDWIDE JOBS
  ========================================
  */

  const worldwideJobs =
    await searchWorldwide(
      search,
      page
    );


  /*
  ========================================
  COMBINE
  ========================================
  */

  let allJobs = [

    ...nigeriaJobs,

    ...worldwideJobs

  ];


  console.log(
    `Raw Himalayas jobs: ${allJobs.length}`
  );


  /*
  ========================================
  REMOVE DUPLICATES
  ========================================
  */

  allJobs =
    removeDuplicates(
      allJobs
    );


  /*
  ========================================
  FINAL ELIGIBILITY FILTER
  ========================================
  */

  allJobs =
    allJobs.filter(job => {

      const check =
        checkNigeriaFriendlyJob(
          job
        );


      return check.accepted;

    });


  console.log(
    `Nigeria-friendly jobs: ${allJobs.length}`
  );


  /*
  ========================================
  FORMAT
  ========================================
  */

  const jobs =
    allJobs.map(
      formatHimalayasJob
    );


  /*
  ========================================
  SAVE CACHE
  ========================================
  */

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


/*
========================================
ROOT
========================================
*/

app.get(
  "/",
  (req, res) => {

    res.json({

      success: true,

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


/*
========================================
REMOTE JOBS
========================================

/api/jobs/remote

/api/jobs/remote?search=customer%20service

/api/jobs/remote?search=virtual%20assistant

/api/jobs/remote?search=data%20entry

/api/jobs/remote?search=software%20developer
========================================
*/

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


      const jobs =
        await getRemoteJobs(
          search,
          page
        );


      res.json({

        success: true,

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

        success: false,

        error:
          "Failed to fetch remote jobs",

        message:
          error.message

      });

    }

  }
);


/*
========================================
REMOTE DEBUG
========================================
*/

app.get(
  "/api/jobs/remote/debug",
  async (req, res) => {

    try {

      const search =
        String(
          req.query.search || ""
        ).trim();


      const nigeriaJobs =
        await searchHimalayas(
          search,
          1
        );


      const worldwideJobs =
        await searchWorldwide(
          search,
          1
        );


      const allJobs =
        removeDuplicates([

          ...nigeriaJobs,

          ...worldwideJobs

        ]);


      const results =
        allJobs.map(job => {

          const check =
            checkNigeriaFriendlyJob(
              job
            );


          return {

            id:
              job.guid || "",

            title:
              job.title || "",

            company:
              job.companyName || "",

            locationRestrictions:
              job.locationRestrictions || [],

            accepted:
              check.accepted,

            reason:
              check.reason,

            url:
              job.applicationLink || ""

          };

        });


      res.json({

        success: true,

        search,

        count:
          results.length,

        jobs:
          results

      });

    } catch (error) {

      console.error(
        "Remote debug error:",
        error
      );


      res.status(500).json({

        success: false,

        error:
          "Debug search failed",

        message:
          error.message

      });

    }

  }
);


/*
========================================
GENERAL JOBS
========================================

/api/jobs

/api/jobs?type=remote

/api/jobs?search=customer service
========================================
*/

app.get(
  "/api/jobs",
  async (req, res) => {

    try {

      const type =
        String(
          req.query.type || ""
        ).toLowerCase();


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


      /*
      ====================================
      REMOTE
      ====================================
      */

      const jobs =
        await getRemoteJobs(
          search,
          page
        );


      res.json({

        success: true,

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

        success: false,

        error:
          "Failed to fetch jobs",

        message:
          error.message

      });

    }

  }
);


/*
========================================
START SERVER
========================================
*/

app.listen(
  PORT,
  () => {

    console.log(
      `Server running on port ${PORT}`
    );

  }
);
