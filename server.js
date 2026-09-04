const express = require("express");
const axios = require("axios");
const dotenv = require("dotenv");
const cors = require("cors");

dotenv.config();

const app = express();

const PORT = process.env.PORT || 3000;

/*
========================================
MIDDLEWARE
========================================
*/

app.use(cors());
app.use(express.json());

/*
========================================
ENVIRONMENT VARIABLES
========================================
*/

const ADZUNA_APP_ID = process.env.ADZUNA_APP_ID;
const ADZUNA_APP_KEY = process.env.ADZUNA_APP_KEY;

const TELEGRAM_BOT_TOKEN =
  process.env.TELEGRAM_BOT_TOKEN;

const TELEGRAM_CHANNEL_ID =
  process.env.TELEGRAM_CHANNEL_ID;

/*
========================================
CONFIGURATION
========================================
*/

const INTERNATIONAL_COUNTRIES = [
  "gb",
  "us",
  "ca",
  "au"
];

const CACHE_TIME = 5 * 60 * 1000;

const jobCache = new Map();

/*
========================================
HEALTH CHECK
========================================
*/

app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "JobFinder backend is running",

    adzunaConfigured:
      Boolean(
        ADZUNA_APP_ID &&
        ADZUNA_APP_KEY
      ),

    telegramConfigured:
      Boolean(
        TELEGRAM_BOT_TOKEN &&
        TELEGRAM_CHANNEL_ID
      )
  });
});

/*
========================================
ROOT
========================================
*/

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "JobFinder API is running",
    endpoints: [
      "/health",
      "/api/jobs"
    ]
  });
});

/*
========================================
CLEAN DESCRIPTION
========================================
*/

function cleanDescription(description) {

  if (!description) {
    return "";
  }

  return String(description)
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/*
========================================
REMOTE DETECTION
========================================
*/

function isRemoteJob(job) {

  const text = (
    `${job.title || ""} ` +
    `${job.location || ""} ` +
    `${job.description || ""}`
  ).toLowerCase();

  const remoteWords = [
    "remote",
    "fully remote",
    "100% remote",
    "work from home",
    "work-from-home",
    "working from home",
    "home based",
    "home-based",
    "remote working",
    "remote work",
    "distributed team",
    "virtual position",
    "virtual job",
    "telecommute",
    "telecommuting",
    "anywhere"
  ];

  return remoteWords.some(word =>
    text.includes(word)
  );
}

/*
========================================
VISA SPONSORSHIP DETECTION
========================================
*/

function hasVisaSponsorship(job) {

  const text = (
    `${job.title || ""} ` +
    `${job.description || ""}`
  ).toLowerCase();

  const visaWords = [
    "visa sponsorship",
    "visa sponsor",
    "sponsorship available",
    "sponsorship provided",
    "sponsor visa",
    "work visa",
    "work permit",
    "skilled worker visa",
    "certificate of sponsorship",
    "cos sponsorship",
    "immigration sponsorship",
    "relocation assistance",
    "relocation package",
    "relocation support",
    "international candidates",
    "overseas candidates",
    "visa support"
  ];

  return visaWords.some(word =>
    text.includes(word)
  );
}

/*
========================================
SCHOLARSHIP DETECTION
========================================
*/

function isScholarship(job) {

  const text = (
    `${job.title || ""} ` +
    `${job.description || ""}`
  ).toLowerCase();

  const words = [
    "scholarship",
    "scholarships",
    "fully funded",
    "fully-funded",
    "funded scholarship",
    "student funding",
    "study grant",
    "education grant",
    "fellowship",
    "fellowships",
    "studentship",
    "phd funding",
    "masters funding",
    "research funding"
  ];

  return words.some(word =>
    text.includes(word)
  );
}

/*
========================================
FORMAT JOB
========================================
*/

function formatJob(job) {

  const description =
    cleanDescription(
      job.description
    );

  const location =
    job.location?.display_name ||
    "Location not specified";

  let salary =
    "Salary not specified";

  if (
    job.salary_min &&
    job.salary_max
  ) {

    salary =
      `${job.salary_min} - ${job.salary_max}`;

  } else if (
    job.salary_min
  ) {

    salary =
      `${job.salary_min}+`;

  } else if (
    job.salary_max
  ) {

    salary =
      `Up to ${job.salary_max}`;
  }

  const formatted = {

    id:
      String(
        job.id ||
        `${job.title}-${job.created}-${Math.random()}`
      ),

    title:
      job.title ||
      "Job Opportunity",

    company:
      job.company?.display_name ||
      "Company",

    location,

    description:
      description ||
      "No description available.",

    salary,

    type:
      job.contract_type ||
      job.contract_time ||
      "Job",

    url:
      job.redirect_url ||
      "",

    created:
      job.created ||
      null,

    category:
      job.category?.label ||
      ""
  };

  formatted.remote =
    isRemoteJob(formatted);

  formatted.visaSponsorship =
    hasVisaSponsorship(formatted);

  formatted.scholarship =
    isScholarship(formatted);

  return formatted;
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
      job.url ||
      `${job.title}-${job.company}-${job.location}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);

    return true;
  });
}

/*
========================================
SORT JOBS
========================================
*/

function sortJobs(jobs) {

  return [...jobs].sort(
    (a, b) => {

      const dateA =
        a.created
          ? new Date(a.created).getTime()
          : 0;

      const dateB =
        b.created
          ? new Date(b.created).getTime()
          : 0;

      return dateB - dateA;
    }
  );
}

/*
========================================
ADZUNA API
========================================
*/

async function getJobs(
  country,
  keyword = "jobs",
  location = "",
  page = 1
) {

  if (
    !ADZUNA_APP_ID ||
    !ADZUNA_APP_KEY
  ) {

    throw new Error(
      "Adzuna API credentials are missing."
    );
  }

  const cacheKey =
    `${country}|${keyword}|${location}|${page}`
      .toLowerCase();

  const cached =
    jobCache.get(cacheKey);

  if (
    cached &&
    Date.now() - cached.time < CACHE_TIME
  ) {

    console.log(
      "Using cached:",
      cacheKey
    );

    return cached.jobs;
  }

  const url =
    `https://api.adzuna.com/v1/api/jobs/${country}/search/${page}`;

  try {

    console.log(
      `Searching Adzuna: ${country} | ${keyword} | ${location}`
    );

    const response =
      await axios.get(
        url,
        {
          params: {

            app_id:
              ADZUNA_APP_ID,

            app_key:
              ADZUNA_APP_KEY,

            results_per_page:
              20,

            what:
              keyword,

            where:
              location,

            sort_by:
              "date"
          },

          timeout: 20000,

          headers: {
            Accept:
              "application/json"
          }
        }
      );

    const jobs =
      response.data?.results || [];

    console.log(
      `Adzuna ${country}: ${jobs.length} jobs`
    );

    jobCache.set(
      cacheKey,
      {
        time: Date.now(),
        jobs
      }
    );

    return jobs;

  } catch (error) {

    const status =
      error.response?.status;

    const data =
      error.response?.data;

    console.error(
      "================================="
    );

    console.error(
      "ADZUNA ERROR"
    );

    console.error(
      "Country:",
      country
    );

    console.error(
      "Keyword:",
      keyword
    );

    console.error(
      "Status:",
      status
    );

    console.error(
      "Response:",
      data
    );

    console.error(
      "Message:",
      error.message
    );

    console.error(
      "================================="
    );

    throw new Error(
      `Adzuna request failed (${status || error.message})`
    );
  }
}

/*
========================================
NIGERIA JOBS
========================================
*/

async function getNigeriaJobs(search) {

  const jobs =
    await getJobs(
      "ng",
      search,
      "",
      1
    );

  return jobs.map(
    formatJob
  );
}

/*
========================================
NIGERIA REMOTE
========================================
*/

async function getNigeriaRemoteJobs(search) {

  /*
  One request instead of three.
  */

  const jobs =
    await getJobs(
      "ng",
      `${search} remote`,
      "",
      1
    );

  return jobs
    .map(formatJob)
    .filter(job =>
      job.remote ||
      job.title.toLowerCase().includes("remote") ||
      job.description.toLowerCase().includes("remote")
    );
}

/*
========================================
INTERNATIONAL REMOTE
========================================
*/

async function getRemoteJobs(search) {

  const results = [];

  /*
  One request per country.
  */

  for (
    const country
    of INTERNATIONAL_COUNTRIES
  ) {

    try {

      const jobs =
        await getJobs(
          country,
          `${search} remote`,
          "",
          1
        );

      results.push(
        ...jobs.map(formatJob)
      );

    } catch (error) {

      console.error(
        `Remote ${country} failed:`,
        error.message
      );
    }
  }

  return removeDuplicates(
    results
  );
}

/*
========================================
VISA SPONSORSHIP
========================================
*/

async function getVisaJobs(search) {

  const results = [];

  /*
  One request per country.
  */

  for (
    const country
    of INTERNATIONAL_COUNTRIES
  ) {

    try {

      const jobs =
        await getJobs(
          country,
          `${search} visa sponsorship`,
          "",
          1
        );

      results.push(
        ...jobs
          .map(formatJob)
          .filter(job =>
            job.visaSponsorship ||
            job.title
              .toLowerCase()
              .includes("visa")
          )
      );

    } catch (error) {

      console.error(
        `Visa ${country} failed:`,
        error.message
      );
    }
  }

  return removeDuplicates(
    results
  );
}

/*
========================================
SCHOLARSHIPS
========================================
*/

async function getScholarships(search) {

  const results = [];

  /*
  Adzuna is NOT a dedicated
  scholarship database.

  This searches job advertisements
  containing scholarship/fellowship
  keywords.
  */

  for (
    const country
    of INTERNATIONAL_COUNTRIES
  ) {

    try {

      const jobs =
        await getJobs(
          country,
          `${search} scholarship`,
          "",
          1
        );

      results.push(
        ...jobs
          .map(formatJob)
          .filter(job =>
            job.scholarship
          )
      );

    } catch (error) {

      console.error(
        `Scholarship ${country} failed:`,
        error.message
      );
    }
  }

  return removeDuplicates(
    results
  );
}

/*
========================================
INTERNATIONAL JOBS
========================================
*/

async function getInternationalJobs(
  search,
  location = ""
) {

  const results = [];

  for (
    const country
    of INTERNATIONAL_COUNTRIES
  ) {

    try {

      const jobs =
        await getJobs(
          country,
          search,
          location,
          1
        );

      results.push(
        ...jobs.map(formatJob)
      );

    } catch (error) {

      console.error(
        `International ${country} failed:`,
        error.message
      );
    }
  }

  return removeDuplicates(
    results
  );
}

/*
========================================
MAIN JOB API
========================================
*/

app.get(
  "/api/jobs",
  async (req, res) => {

    try {

      const search =
        String(
          req.query.search ||
          "jobs"
        ).trim();

      const location =
        String(
          req.query.location ||
          ""
        ).trim();

      const type =
        String(
          req.query.type ||
          "all"
        )
        .trim()
        .toLowerCase();

      console.log(
        "================================="
      );

      console.log(
        "JOB REQUEST"
      );

      console.log(
        "Search:",
        search
      );

      console.log(
        "Location:",
        location
      );

      console.log(
        "Type:",
        type
      );

      console.log(
        "================================="
      );

      let jobs = [];

      /*
      ====================================
      ALL
      ====================================
      */

      if (
        type === "all"
      ) {

        const nigeria =
          await getNigeriaJobs(
            search
          );

        const remote =
          await getRemoteJobs(
            search
          );

        jobs = [
          ...nigeria,
          ...remote
        ];
      }

      /*
      ====================================
      NIGERIA
      ====================================
      */

      else if (
        type === "nigeria"
      ) {

        jobs =
          await getNigeriaJobs(
            search
          );
      }

      /*
      ====================================
      NIGERIA REMOTE
      ====================================
      */

      else if (
        type === "nigeria-remote" ||
        type === "nigeria_remote"
      ) {

        jobs =
          await getNigeriaRemoteJobs(
            search
          );
      }

      /*
      ====================================
      REMOTE
      ====================================
      */

      else if (
        type === "remote"
      ) {

        jobs =
          await getRemoteJobs(
            search
          );
      }

      /*
      ====================================
      VISA
      ====================================
      */

      else if (
        type === "visa" ||
        type === "sponsorship"
      ) {

        jobs =
          await getVisaJobs(
            search
          );
      }

      /*
      ====================================
      SCHOLARSHIPS
      ====================================
      */

      else if (
        type === "scholarship" ||
        type === "scholarships"
      ) {

        jobs =
          await getScholarships(
            search
          );
      }

      /*
      ====================================
      INTERNATIONAL
      ====================================
      */

      else if (
        type === "international"
      ) {

        jobs =
          await getInternationalJobs(
            search,
            location
          );
      }

      /*
      ====================================
      UNKNOWN TYPE
      ====================================
      */

      else {

        jobs =
          await getInternationalJobs(
            search,
            location
          );
      }

      /*
      ====================================
      LOCATION FILTER
      ====================================
      */

      if (
        location &&
        type !== "international"
      ) {

        const wantedLocation =
          location.toLowerCase();

        jobs =
          jobs.filter(job => {

            const jobLocation =
              (
                job.location ||
                ""
              ).toLowerCase();

            const description =
              (
                job.description ||
                ""
              ).toLowerCase();

            /*
            Remote jobs are allowed
            even if physical location
            doesn't match.
            */

            if (
              job.remote &&
              (
                type === "remote" ||
                type === "nigeria-remote" ||
                type === "nigeria_remote"
              )
            ) {

              return true;
            }

            return (
              jobLocation.includes(
                wantedLocation
              ) ||
              description.includes(
                wantedLocation
              )
            );
          });
      }

      /*
      ====================================
      REMOVE DUPLICATES
      ====================================
      */

      jobs =
        removeDuplicates(
          jobs
        );

      /*
      ====================================
      SORT
      ====================================
      */

      jobs =
        sortJobs(
          jobs
        );

      /*
      ====================================
      LIMIT
      ====================================
      */

      jobs =
        jobs.slice(
          0,
          100
        );

      /*
      ====================================
      RESPONSE
      ====================================
      */

      res.json({

        success: true,

        count:
          jobs.length,

        jobs

      });

    } catch (error) {

      console.error(
        "================================="
      );

      console.error(
        "JOB API ERROR"
      );

      console.error(
        error
      );

      console.error(
        "================================="
      );

      res.status(500).json({

        success: false,

        message:
          "Unable to fetch jobs.",

        error:
          error.message,

        jobs: []

      });
    }
  }
);

/*
========================================
TELEGRAM
========================================
*/

async function postToTelegram(job) {

  if (
    !TELEGRAM_BOT_TOKEN ||
    !TELEGRAM_CHANNEL_ID
  ) {

    console.log(
      "Telegram credentials are missing."
    );

    return false;
  }

  if (!job.url) {

    console.log(
      "Job has no URL:",
      job.title
    );

    return false;
  }

  const badges = [

    job.remote
      ? "🏠 REMOTE"
      : "",

    job.visaSponsorship
      ? "✈️ VISA SPONSORSHIP"
      : "",

    job.scholarship
      ? "🎓 SCHOLARSHIP"
      : ""

  ]
    .filter(Boolean)
    .join(" | ");

  const description =
    cleanDescription(
      job.description
    );

  const message =

`🚨 NEW OPPORTUNITY

${badges}

💼 ${job.title}

🏢 ${job.company}

📍 ${job.location}

💰 ${job.salary}

📝 ${description.substring(
  0,
  500
)}

🔗 APPLY / VIEW:
${job.url}

#Jobs #JobOpportunity #NigeriaJobs #RemoteJobs #VisaSponsorship #Scholarships`;

  try {

    const telegramURL =
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

    await axios.post(
      telegramURL,
      {
        chat_id:
          TELEGRAM_CHANNEL_ID,

        text:
          message,

        disable_web_page_preview:
          false
      },
      {
        timeout:
          15000
      }
    );

    console.log(
      "Telegram post successful:",
      job.title
    );

    return true;

  } catch (error) {

    console.error(
      "Telegram error:",
      error.response?.data ||
      error.message
    );

    return false;
  }
}

/*
========================================
POSTED JOB MEMORY
========================================
*/

const postedJobs =
  new Set();

/*
========================================
AUTOMATIC TELEGRAM POSTING
========================================
*/

async function fetchAndPostJobs() {

  console.log(
    "Checking for new jobs..."
  );

  try {

    const nigeria =
      await getNigeriaJobs(
        "jobs"
      );

    const nigeriaRemote =
      await getNigeriaRemoteJobs(
        "jobs"
      );

    const remote =
      await getRemoteJobs(
        "jobs"
      );

    const visa =
      await getVisaJobs(
        "jobs"
      );

    const allJobs =
      removeDuplicates([

        ...nigeria,

        ...nigeriaRemote,

        ...remote,

        ...visa

      ]);

    const sorted =
      sortJobs(
        allJobs
      );

    console.log(
      `Found ${sorted.length} jobs.`
    );

    let postedCount = 0;

    for (
      const job
      of sorted
    ) {

      if (
        postedCount >= 10
      ) {
        break;
      }

      if (
        postedJobs.has(
          job.id
        )
      ) {
        continue;
      }

      const posted =
        await postToTelegram(
          job
        );

      if (posted) {

        postedJobs.add(
          job.id
        );

        postedCount++;
      }
    }

  } catch (error) {

    console.error(
      "Automatic posting failed:",
      error.message
    );
  }
}

/*
========================================
AUTOMATIC POSTING DISABLED
========================================

KEEP THIS DISABLED FOR NOW.
========================================
*/

// setTimeout(() => {
//   fetchAndPostJobs();
// }, 30000);

// setInterval(() => {
//   fetchAndPostJobs();
// }, 30 * 60 * 1000);

/*
========================================
START SERVER
========================================
*/

app.listen(
  PORT,
  "0.0.0.0",
  () => {

    console.log(
      `JobFinder backend running on port ${PORT}`
    );

  }
);
