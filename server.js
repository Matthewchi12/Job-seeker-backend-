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
ADZUNA SETTINGS
========================================
*/

const ADZUNA_APP_ID = process.env.ADZUNA_APP_ID;
const ADZUNA_APP_KEY = process.env.ADZUNA_APP_KEY;


/*
========================================
TELEGRAM SETTINGS
========================================
*/

const TELEGRAM_BOT_TOKEN =
  process.env.TELEGRAM_BOT_TOKEN;

const TELEGRAM_CHANNEL_ID =
  process.env.TELEGRAM_CHANNEL_ID;


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

  try {

    const url =
      `https://api.adzuna.com/v1/api/jobs/${country}/search/1`;

    const response = await axios.get(url, {

      params: {

        app_id: ADZUNA_APP_ID,

        app_key: ADZUNA_APP_KEY,

        results_per_page: 20,

        what: keyword,

        where: location,

        content-type: "application/json"

      }

    });


    return response.data.results || [];

  } catch (error) {

    console.error(
      "Adzuna error:",
      error.response?.data || error.message
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

    id: job.id,

    title: job.title || "Job Opportunity",

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

    url: job.redirect_url,

    created: job.created

  };

}


/*
========================================
GET JOBS API FOR WEBSITE
========================================
*/

app.get("/api/jobs", async (req, res) => {

  try {

    const search =
      req.query.search || "jobs";

    const location =
      req.query.location || "";

    const type =
      req.query.type || "international";


    let country = "gb";


    /*
    Nigeria
    */

    if (type === "nigeria") {

      country = "ng";

    }


    /*
    Remote
    */

    if (type === "remote") {

      country = "gb";

    }


    const jobs = await getJobs(
      country,
      search,
      location
    );


    const formattedJobs =
      jobs.map(formatJob);


    res.json({

      success: true,

      count: formattedJobs.length,

      jobs: formattedJobs

    });

  } catch (error) {

    console.error(error);

    res.status(500).json({

      success: false,

      message: "Unable to fetch jobs"

    });

  }

});


/*
========================================
TELEGRAM POST FUNCTION
========================================
*/

async function postToTelegram(job) {

  try {

    const message = `

🚨 NEW JOB OPPORTUNITY

💼 ${job.title}

🏢 ${job.company}

📍 ${job.location}

💰 ${job.salary}

📝 ${job.description
      .replace(/<[^>]*>/g, "")
      .substring(0, 500)}

🔗 APPLY HERE:
${job.url}

#Jobs #JobOpportunity #NigeriaJobs #RemoteJobs

`;


    const telegramURL =
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;


    await axios.post(

      telegramURL,

      {

        chat_id:
          TELEGRAM_CHANNEL_ID,

        text: message,

        disable_web_page_preview: false

      }

    );


    console.log(
      "Posted to Telegram:",
      job.title
    );


  } catch (error) {

    console.error(

      "Telegram error:",

      error.response?.data ||
      error.message

    );

  }

}


/*
========================================
AUTOMATIC TELEGRAM JOB FETCHER
========================================
*/

async function fetchAndPostJobs() {

  console.log(
    "Checking for new jobs..."
  );


  const jobs =
    await getJobs(
      "gb",
      "remote jobs",
      ""
    );


  const formattedJobs =
    jobs.map(formatJob);


  /*
  Temporary duplicate protection
  */

  for (const job of formattedJobs) {

    await postToTelegram(job);

  }

}


/*
========================================
RUN AUTOMATICALLY
========================================
*/

/*
For testing:

Runs 30 seconds after
server starts.
*/

setTimeout(() => {

  fetchAndPostJobs();

}, 30000);


/*
Then every 30 minutes.
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
    `Job Finder running on port ${PORT}`
  );

});
