const express = require("express");
const axios = require("axios");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config();

const app = express();

const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use(express.static(path.join(__dirname, "public")));


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
HEALTH CHECK
========================================
*/

app.get("/health", (req, res) => {

  res.json({
    success: true,
    message: "JobFinder backend is running",
    adzunaConfigured:
      Boolean(ADZUNA_APP_ID && ADZUNA_APP_KEY),
    telegramConfigured:
      Boolean(
        TELEGRAM_BOT_TOKEN &&
        TELEGRAM_CHANNEL_ID
      )
  });

});


/*
========================================
GET JOBS FROM ADZUNA
========================================
*/

async function getJobs(
  country = "gb",
  keyword = "developer",
  location = ""
) {

  if (!ADZUNA_APP_ID || !ADZUNA_APP_KEY) {

    console.error(
      "Adzuna API credentials are missing."
    );

    return [];

  }


  try {

    const url =
      `https://api.adzuna.com/v1/api/jobs/${country}/search/1`;


    const response = await axios.get(url, {

      params: {

        app_id: ADZUNA_APP_ID,

        app_key: ADZUNA_APP_KEY,

        results_per_page: 20,

        what: keyword,

        where: location

      },

      timeout: 15000

    });


    return response.data?.results || [];


  } catch (error) {

    console.error(
      "Adzuna error:",
      error.response?.data ||
      error.message
    );

    return [];

  }

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
      `${job.title}-${job.company?.display_name}-${job.created}`,

    title:
      job.title ||
      "Job Opportunity",

    company:
      job.company?.display_name ||
      "Company",

    location:
      job.location?.display_name ||
      "Location not specified",

    description:
      job.description ||
      "No description available.",

    salary:
      job.salary_min
        ? `${job.salary_min} - ${job.salary_max || ""}`
        : "Salary not specified",

    url:
      job.redirect_url ||
      "",

    created:
      job.created ||
      null

  };

}


/*
========================================
GET JOBS FOR WEBSITE
========================================
*/

app.get("/api/jobs", async (req, res) => {

  try {

    const search =
      String(
        req.query.search || "jobs"
      ).trim();


    const location =
      String(
        req.query.location || ""
      ).trim();


    const type =
      String(
        req.query.type || "all"
      ).toLowerCase();


    /*
    ====================================
    DETERMINE COUNTRY
    ====================================
    */

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


    /*
    ====================================
    FETCH JOBS
    ====================================
    */

    const jobs = await getJobs(
      country,
      search,
      location
    );


    /*
    ====================================
    FORMAT JOBS
    ====================================
    */

    const formattedJobs =
      jobs.map(formatJob);


    /*
    ====================================
    REMOTE FILTER
    ====================================
    */

    let finalJobs =
      formattedJobs;


    if (type === "remote") {

      finalJobs =
        formattedJobs.filter(job => {

          const text =
            `${job.title} ${job.location} ${job.description}`
              .toLowerCase();

          return (
            text.includes("remote") ||
            text.includes("work from home") ||
            text.includes("work-from-home")
          );

        });

    }


    res.json({

      success: true,

      count: finalJobs.length,

      jobs: finalJobs

    });


  } catch (error) {

    console.error(
      "Jobs API error:",
      error
    );


    res.status(500).json({

      success: false,

      message:
        "Unable to fetch jobs",

      jobs: []

    });

  }

});


/*
========================================
CLEAN DESCRIPTION
========================================
*/

function cleanDescription(
  description
) {

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
TELEGRAM POST FUNCTION
========================================
*/

async function postToTelegram(job) {

  if (
    !TELEGRAM_BOT_TOKEN ||
    !TELEGRAM_CHANNEL_ID
  ) {

    console.log(
      "Telegram is not configured."
    );

    return false;

  }


  if (!job.url) {

    console.log(
      "Skipping job without application URL:",
      job.title
    );

    return false;

  }


  try {

    const description =
      cleanDescription(
        job.description
      );


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


    const telegramURL =
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;


    await axios.post(

      telegramURL,

      {

        chat_id:
          TELEGRAM_CHANNEL_ID,

        text: message,

        disable_web_page_preview: false

      },

      {

        timeout: 15000

      }

    );


    console.log(
      "Posted to Telegram:",
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
AUTOMATIC JOB FETCHER
========================================
*/

async function fetchAndPostJobs() {

  console.log(
    "Checking for new jobs..."
  );


  try {

    const jobs =
      await getJobs(
        "gb",
        "remote jobs",
        ""
      );


    const formattedJobs =
      jobs.map(formatJob);


    console.log(
      `Found ${formattedJobs.length} jobs.`
    );


    /*
    ==================================
    TEMPORARY PROTECTION
    ==================================

    This prevents the same job from being
    posted multiple times while the server
    remains running.

    MongoDB will be added later for
    permanent duplicate protection.
    */

    for (const job of formattedJobs) {

      if (
        postedJobs.has(job.id)
      ) {

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
      "Automatic job fetch error:",
      error.message
    );

  }

}


/*
========================================
TEMPORARY DUPLICATE PROTECTION
========================================
*/

const postedJobs = new Set();


/*
========================================
START AUTOMATIC FETCH
========================================
*/

setTimeout(() => {

  fetchAndPostJobs();

}, 30000);


/*
========================================
RUN EVERY 30 MINUTES
========================================
*/

setInterval(() => {

  fetchAndPostJobs();

}, 30 * 60 * 1000);


/*
========================================
START SERVER
========================================
*/

app.listen(PORT, () => {

  console.log(
    `JobFinder running on port ${PORT}`
  );

});
