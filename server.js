const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 10000;

const ADZUNA_APP_ID = process.env.ADZUNA_APP_ID;
const ADZUNA_APP_KEY = process.env.ADZUNA_APP_KEY;


/*
========================================
INTERNATIONAL COUNTRIES
========================================
*/

const INTERNATIONAL_COUNTRIES = [
  "gb",
  "us",
  "ca",
  "au",
  "nz",
  "de",
  "fr",
  "nl",
  "ie",
  "za",
  "sg",
  "in"
];


/*
========================================
REMOTE JOB CHECK
========================================
*/

function isRemoteJob(job) {

  const text = [
    job?.title || "",
    job?.location || "",
    job?.description || ""
  ]
    .join(" ")
    .toLowerCase();

  const remoteWords = [
    "remote",
    "work from home",
    "work-from-home",
    "work from anywhere",
    "work-from-anywhere",
    "worldwide",
    "anywhere in the world",
    "distributed team",
    "fully remote",
    "100% remote",
    "remote position",
    "remote job"
  ];

  return remoteWords.some(word =>
    text.includes(word)
  );
}


/*
========================================
NIGERIA-FRIENDLY REMOTE JOB CHECK
========================================
*/

function isNigeriaFriendlyRemoteJob(job) {

  const title =
    String(job?.title || "").toLowerCase();

  const location =
    String(job?.location || "").toLowerCase();

  const description =
    String(job?.description || "").toLowerCase();

  const text =
    `${title} ${location} ${description}`;


  /*
  MUST BE REMOTE
  */

  if (!isRemoteJob(job)) {
    return false;
  }


  /*
  ========================================
  EXPLICIT FOREIGN RESTRICTIONS
  ========================================
  */

  const restrictions = [

    "us only",
    "usa only",
    "u.s. only",
    "u.s.a. only",

    "us residents only",
    "usa residents only",

    "us-based applicants only",
    "usa-based applicants only",

    "must be located in the us",
    "must be located in usa",
    "must be located in the usa",

    "must reside in the us",
    "must reside in usa",
    "must reside in the usa",

    "only applicants located in the us",
    "only available to us residents",

    "us work authorization required",
    "usa work authorization required",

    "must have us work authorization",
    "must have usa work authorization",

    "right to work in the us",
    "right to work in usa",
    "right to work in the usa",


    "uk only",
    "u.k. only",

    "uk residents only",

    "uk-based applicants only",

    "must be located in the uk",
    "must reside in the uk",

    "only applicants located in the uk",

    "uk work authorization required",

    "must have uk work authorization",

    "right to work in the uk",


    "canada only",

    "canadian residents only",
    "canada residents only",

    "canada-based applicants only",

    "must be located in canada",
    "must reside in canada",

    "only applicants located in canada",

    "canadian work authorization required",

    "must have canadian work authorization",

    "right to work in canada",


    "australia only",

    "australian residents only",

    "australia-based applicants only",

    "must be located in australia",
    "must reside in australia",

    "only applicants located in australia",

    "australian work authorization required",

    "must have australian work authorization",

    "right to work in australia",


    "new zealand only",

    "new zealand residents only",

    "must be located in new zealand",
    "must reside in new zealand",

    "right to work in new zealand",


    "eu residents only",
    "european residents only",

    "eu-based applicants only",

    "must be located in the eu",
    "must reside in the eu",

    "right to work in the eu",

    "europe work authorization required"

  ];


  if (
    restrictions.some(
      phrase => text.includes(phrase)
    )
  ) {
    return false;
  }


  /*
  ========================================
  WORLDWIDE SIGNAL
  ========================================
  */

  const worldwideWords = [

    "worldwide",

    "work from anywhere",
    "work-from-anywhere",

    "anywhere in the world",

    "anywhere",

    "any location",

    "any country",

    "global remote",

    "globally remote",

    "international applicants",

    "international candidates",

    "international applicants welcome",

    "international candidates welcome",

    "open to international candidates",

    "open to international applicants",

    "open to applicants worldwide",

    "open to candidates worldwide",

    "open worldwide",

    "distributed team",

    "distributed workforce",

    "fully distributed",

    "location independent",

    "location-independent"

  ];


  /*
  ========================================
  NIGERIA / AFRICA SIGNAL
  ========================================
  */

  const africaWords = [

    "nigeria",
    "nigerian",

    "nigeria-based",
    "nigeria based",

    "africa",
    "african",

    "africa-based",
    "africa based",

    "sub-saharan africa",

    "west africa",
    "east africa",

    "ghana",
    "kenya",
    "egypt",
    "morocco",
    "south africa"

  ];


  /*
  ========================================
  PHYSICAL RESTRICTIONS
  ========================================
  */

  const physicalRestrictions = [

    "remote in the us",
    "remote in usa",
    "remote in the usa",

    "remote - us",
    "remote - usa",

    "remote, us",
    "remote, usa",

    "remote: us",
    "remote: usa",

    "remote in the uk",
    "remote - uk",
    "remote, uk",

    "remote in canada",
    "remote - canada",
    "remote, canada",

    "remote in australia",
    "remote - australia",
    "remote, australia"

  ];


  if (
    physicalRestrictions.some(
      phrase => text.includes(phrase)
    )
  ) {
    return false;
  }


  /*
  ========================================
  ACCEPT WORLDWIDE
  ========================================
  */

  if (
    worldwideWords.some(
      word => text.includes(word)
    )
  ) {
    return true;
  }


  /*
  ========================================
  ACCEPT NIGERIA / AFRICA
  ========================================
  */

  if (
    africaWords.some(
      word => text.includes(word)
    )
  ) {
    return true;
  }


  /*
  ========================================
  GENERIC REMOTE
  ========================================

  We allow generic remote jobs where
  there is no explicit country restriction.
  */

  return true;
}


/*
========================================
REMOVE DUPLICATES
========================================
*/

function removeDuplicates(jobs) {

  const seen = new Set();

  return jobs.filter(job => {

    const key =
      job.id ||
      `${job.title}-${job.company}-${job.url}`
        .toLowerCase();

    if (seen.has(key)) {
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

function formatJob(job) {

  return {

    id:
      job.id ||
      `${job.title}-${job.company?.display_name || ""}`,

    title:
      job.title || "Untitled job",

    company:
      job.company?.display_name ||
      "Company not specified",

    location:
      job.location?.display_name ||
      "Remote",

    description:
      job.description || "",

    salary:
      job.salary_min
        ? `${job.salary_min} - ${job.salary_max || ""}`
        : "Not specified",

    url:
      job.redirect_url || "",

    created:
      job.created || null,

    remote: true,

    nigeriaFriendly: true

  };
}


/*
========================================
GET JOBS FROM ADZUNA
========================================
*/

async function getJobs(
  country,
  keyword,
  page = 1
) {

  if (
    !ADZUNA_APP_ID ||
    !ADZUNA_APP_KEY
  ) {
    throw new Error(
      "ADZUNA_APP_ID or ADZUNA_APP_KEY is missing"
    );
  }


  const url =
    `https://api.adzuna.com/v1/api/jobs/${country}/search/${page}` +
    `?app_id=${encodeURIComponent(ADZUNA_APP_ID)}` +
    `&app_key=${encodeURIComponent(ADZUNA_APP_KEY)}` +
    `&results_per_page=50` +
    `&what=${encodeURIComponent(keyword)}` +
    `&content-type=application/json`;


  const response =
    await fetch(url);


  if (!response.ok) {

    const errorText =
      await response.text();

    throw new Error(
      `Adzuna ${response.status}: ${errorText}`
    );
  }


  const data =
    await response.json();


  return Array.isArray(data.results)
    ? data.results
    : [];
}


/*
========================================
GET INTERNATIONAL REMOTE JOBS
========================================
*/

async function getRemoteJobs(search) {

  const safeSearch =
    String(search || "").trim();


  if (!safeSearch) {
    return [];
  }


  const searchTerms = [

    `${safeSearch} remote`,
    `${safeSearch} work from home`,
    `${safeSearch} work from anywhere`

  ];


  const results = [];


  for (
    const country
    of INTERNATIONAL_COUNTRIES
  ) {

    for (
      const keyword
      of searchTerms
    ) {

      try {

        const jobs =
          await getJobs(
            country,
            keyword,
            1
          );


        const formatted =
          jobs
            .map(formatJob)
            .filter(isNigeriaFriendlyRemoteJob);


        results.push(
          ...formatted
        );


      } catch (error) {

        console.error(
          `Remote ${country} search failed:`,
          error.message
        );

      }

    }

  }


  return removeDuplicates(results);
}


/*
========================================
HEALTH CHECK
========================================
*/

app.get("/", (req, res) => {

  res.json({

    success: true,

    message:
      "Nigeria Remote Jobs API is running",

    status:
      "online"

  });

});


/*
========================================
REMOTE JOB API
========================================
*/

app.get(
  "/api/jobs/remote",
  async (req, res) => {

    try {

      const search =
        String(
          req.query.search ||
          "customer support"
        ).trim();


      const jobs =
        await getRemoteJobs(search);


      res.json({

        success: true,

        count: jobs.length,

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
          error.message ||
          "Failed to fetch jobs",

        jobs: []

      });

    }

  }
);


/*
========================================
SERVER
========================================
*/

app.listen(
  PORT,
  "0.0.0.0",
  () => {

    console.log(
      `Server running on port ${PORT}`
    );

  }
);
