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

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID;

/*
========================================
HEALTH CHECK
========================================
*/

app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "JobFinder backend is running",
    adzunaConfigured: Boolean(
      ADZUNA_APP_ID && ADZUNA_APP_KEY
    ),
    telegramConfigured: Boolean(
      TELEGRAM_BOT_TOKEN && TELEGRAM_CHANNEL_ID
    )
  });
});

/*
========================================
ADZUNA JOB SEARCH
========================================
*/

async function getJobs(
  country = "gb",
  keyword = "jobs",
  location = ""
) {
  if (!ADZUNA_APP_ID || !ADZUNA_APP_KEY) {
    throw new Error(
      "Adzuna API credentials are missing."
    );
  }

  const url =
    `https://api.adzuna.com/v1/api/jobs/${country}/search/1`;

  try {
    const response = await axios.get(url, {
      params: {
        app_id: ADZUNA_APP_ID,
        app_key: ADZUNA_APP_KEY,
        results_per_page: 20,
        what: keyword,
        where: location
      },
      timeout: 20000
    });

    return response.data?.results || [];
  } catch (error) {
    console.error(
      "Adzuna request failed:",
      error.response?.data || error.message
    );

    throw new Error(
      "Unable to fetch jobs from Adzuna."
    );
  }
}

/*
========================================
FORMAT JOB
========================================
*/

function formatJob(job) {
  return {
    id: String(
      job.id ||
      `${job.title || "job"}-${job.created || Date.now()}`
    ),

    title:
      job.title || "Job Opportunity",

    company:
      job.company?.display_name || "Company",

    location:
      job.location?.display_name ||
      "Location not specified",

    description:
      job.description ||
      "No description available.",

    salary:
      job.salary_min
        ? `${job.salary_min} - ${
            job.salary_max || ""
          }`
        : "Salary not specified",

    url:
      job.redirect_url || "",

    created:
      job.created || null
  };
}

/*
========================================
CLEAN DESCRIPTION
========================================
*/

function cleanDescription(description) {
  if (!description) {
    return "No description available.";
  }

  return String(description)
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/*
========================================
REMOTE JOB CHECK
========================================
*/

function isRemoteJob(job) {
  const text = (
    `${job.title} ` +
    `${job.location} ` +
    `${job.description}`
  ).toLowerCase();

  return (
    text.includes("remote") ||
    text.includes("work from home") ||
    text.includes("work-from-home") ||
    text.includes("remote working")
  );
}

/*
========================================
WEBSITE JOB API
========================================
*/

app.get("/api/jobs", async (req, res) => {
  try {
    const search = String(
      req.query.search || "jobs"
    ).trim();

    const location = String(
      req.query.location || ""
    ).trim();

    const type = String(
      req.query.type || "all"
    ).toLowerCase();

    let country = "gb";

    if (type === "nigeria") {
      country = "ng";
    }

    if (type === "international") {
      country = "gb";
    }

    if (type === "remote") {
      country = "gb";
    }

    const jobs = await getJobs(
      country,
      search,
      location
    );

    let formattedJobs =
      jobs.map(formatJob);

    if (type === "remote") {
      formattedJobs =
        formattedJobs.filter(isRemoteJob);
    }

    const uniqueJobs = [];
    const seen = new Set();

    for (const job of formattedJobs) {
      const key =
        job.id ||
        job.url ||
        job.title;

      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      uniqueJobs.push(job);
    }

    res.json({
      success: true,
      count: uniqueJobs.length,
      jobs: uniqueJobs
    });

  } catch (error) {
    console.error(
      "Jobs API error:",
      error.message
    );

    res.status(500).json({
      success: false,
      message:
        error.message ||
        "Unable to fetch jobs.",
      jobs: []
    });
  }
});

/*
========================================
TELEGRAM POST
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
      "Job has no application URL:",
      job.title
    );

    return false;
  }

  const description =
    cleanDescription(job.description);

  const message =
`🚨 NEW JOB OPPORTUNITY

💼 ${job.title}

🏢 ${job.company}

📍 ${job.location}

💰 ${job.salary}

📝 ${description.substring(0, 500)}

🔗 APPLY HERE:
${job.url}

#Jobs #JobOpportunity #NigeriaJobs #RemoteJobs`;

  try {
    const telegramURL =
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

    await axios.post(
      telegramURL,
      {
        chat_id: TELEGRAM_CHANNEL_ID,
        text: message,
        disable_web_page_preview: false
      },
      {
        timeout: 15000
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
TEMPORARY DUPLICATE MEMORY
========================================
*/

const postedJobs = new Set();

/*
========================================
AUTOMATIC TELEGRAM JOB POSTING
========================================
*/

async function fetchAndPostJobs() {
  console.log(
    "Checking for new jobs..."
  );

  try {
    const jobs = await getJobs(
      "gb",
      "remote jobs",
      ""
    );

    const formattedJobs =
      jobs.map(formatJob);

    console.log(
      `Found ${formattedJobs.length} jobs.`
    );

    for (const job of formattedJobs) {
      if (postedJobs.has(job.id)) {
        continue;
      }

      const posted =
        await postToTelegram(job);

      if (posted) {
        postedJobs.add(job.id);
      }
    }

  } catch (error) {
    console.error(
      "Automatic job fetch failed:",
      error.message
    );
  }
}

/*
========================================
AUTOMATIC POSTING
========================================

DISABLED FOR NOW.

We will enable this after testing
the website, Adzuna and Telegram.
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
