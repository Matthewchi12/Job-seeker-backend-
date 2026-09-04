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

const ADZUNA_APP_ID =
  process.env.ADZUNA_APP_ID;

const ADZUNA_APP_KEY =
  process.env.ADZUNA_APP_KEY;

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

    message:
      "JobFinder backend is running",

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
COUNTRIES
========================================
*/

const INTERNATIONAL_COUNTRIES = [
  "gb",
  "us",
  "ca",
  "au"
];


/*
========================================
SEARCH ADZUNA
========================================
*/

async function getJobs(
  country = "gb",
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


  const url =
    `https://api.adzuna.com/v1/api/jobs/${country}/search/${page}`;


  try {

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
              50,

            what:
              keyword,

            where:
              location,

            sort_by:
              "date",

            content_type:
              "application/json"

          },

          timeout: 30000

        }
      );


    return (
      response.data?.results ||
      []
    );


  } catch (error) {

    console.error(
      `Adzuna ${country} request failed:`,
      error.response?.data ||
      error.message
    );

    return [];

  }

}


/*
========================================
CLEAN DESCRIPTION
========================================
*/

function cleanDescription(
  description
) {

  if (!description) {

    return "";

  }


  return String(description)

    .replace(
      /<[^>]*>/g,
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
      /\s+/g,
      " "
    )

    .trim();

}


/*
========================================
REMOTE JOB DETECTION
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

    "telecommute",

    "telecommuting"

  ];


  return remoteWords.some(
    word =>
      text.includes(word)
  );

}


/*
========================================
VISA SPONSORSHIP DETECTION
========================================
*/

function hasVisaSponsorship(
  job
) {

  const text = (

    `${job.title || ""} ` +

    `${job.description || ""}`

  ).toLowerCase();


  const sponsorshipWords = [

    "visa sponsorship",

    "visa sponsor",

    "sponsorship available",

    "sponsorship provided",

    "sponsor visa",

    "work visa",

    "work permit",

    "skilled worker visa",

    "certificate of sponsorship",

    "certificate of sponsorship available",

    "cos sponsorship",

    "immigration sponsorship",

    "relocation assistance",

    "relocation package",

    "relocation support",

    "international candidates",

    "overseas candidates"

  ];


  return sponsorshipWords.some(
    word =>
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


  const remote =
    isRemoteJob({

      title:
        job.title,

      location:
        job.location?.display_name,

      description:
        description

    });


  const visaSponsorship =
    hasVisaSponsorship({

      title:
        job.title,

      description:
        description

    });


  return {

    id: String(

      job.id ||

      `${

        job.title ||

        "job"

      }-${

        job.created ||

        Date.now()

      }`

    ),


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
      description ||
      "No description available.",


    salary:

      job.salary_min ||

      job.salary_max

        ? `${

            job.salary_min
              ? job.salary_min
              : ""

          }${

            job.salary_min ||
            job.salary_max
              ? " - "
              : ""

          }${

            job.salary_max
              ? job.salary_max
              : ""

          }`

        : "Salary not specified",


    type:
      job.contract_type ||
      job.contract_time ||
      "Full-time",


    url:
      job.redirect_url ||
      "",


    created:
      job.created ||
      null,


    remote:
      remote,


    visaSponsorship:
      visaSponsorship

  };

}


/*
========================================
JOB SCORE
========================================

Higher score = appears first
========================================
*/

function calculateJobScore(
  job
) {

  let score = 0;


  // Remote jobs get high priority
  if (job.remote) {

    score += 100;

  }


  // Visa sponsorship gets high priority
  if (
    job.visaSponsorship
  ) {

    score += 100;

  }


  // Remote + sponsorship
  if (
    job.remote &&
    job.visaSponsorship
  ) {

    score += 100;

  }


  // Nigeria jobs
  const location =
    (
      job.location ||
      ""
    ).toLowerCase();


  if (
    location.includes(
      "nigeria"
    )
  ) {

    score += 80;

  }


  // Recent jobs
  if (job.created) {

    const createdDate =
      new Date(
        job.created
      );

    const age =
      Date.now() -
      createdDate.getTime();


    const days =
      age /
      (
        1000 *
        60 *
        60 *
        24
      );


    if (days <= 1) {

      score += 30;

    } else if (days <= 3) {

      score += 20;

    } else if (days <= 7) {

      score += 10;

    }

  }


  return score;

}


/*
========================================
REMOVE DUPLICATES
========================================
*/

function removeDuplicates(
  jobs
) {

  const uniqueJobs = [];

  const seen =
    new Set();


  for (
    const job of jobs
  ) {

    const key =
      job.url ||

      `${

        job.title

      }-${

        job.company

      }-${

        job.location

      }`;


    if (
      seen.has(key)
    ) {

      continue;

    }


    seen.add(key);

    uniqueJobs.push(job);

  }


  return uniqueJobs;

}


/*
========================================
FETCH NIGERIA JOBS
========================================
*/

async function getNigeriaJobs(
  search
) {

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
FETCH REMOTE JOBS
========================================
*/

async function getRemoteJobs(
  search
) {

  const searches = [

    `${search} remote`,

    `remote ${search}`,

    `${search} work from home`,

    `${search} remote visa sponsorship`

  ];


  let allJobs = [];


  for (
    const country
    of INTERNATIONAL_COUNTRIES
  ) {

    for (
      const keyword
      of searches
    ) {

      const jobs =
        await getJobs(
          country,
          keyword,
          "",
          1
        );


      allJobs.push(
        ...jobs.map(
          formatJob
        )
      );

    }

  }


  return allJobs.filter(
    job =>
      job.remote
  );

}


/*
========================================
FETCH VISA SPONSORSHIP JOBS
========================================
*/

async function getVisaJobs(
  search
) {

  const searches = [

    `${search} visa sponsorship`,

    `${search} visa sponsor`,

    `${search} work visa`,

    `${search} relocation sponsorship`

  ];


  let allJobs = [];


  for (
    const country
    of INTERNATIONAL_COUNTRIES
  ) {

    for (
      const keyword
      of searches
    ) {

      const jobs =
        await getJobs(
          country,
          keyword,
          "",
          1
        );


      allJobs.push(
        ...jobs.map(
          formatJob
        )

      );

    }

  }


  return allJobs.filter(
    job =>
      job.visaSponsorship
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
        ).toLowerCase();


      let jobs = [];


      /*
      ========================================
      NIGERIA
      ========================================
      */

      if (
        type === "nigeria"
      ) {

        jobs =
          await getNigeriaJobs(
            search
          );

      }


      /*
      ========================================
      REMOTE
      ========================================
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
      ========================================
      VISA SPONSORSHIP
      ========================================
      */

      else if (
        type ===
        "visa"
      ) {

        jobs =
          await getVisaJobs(
            search
          );

      }


      /*
      ========================================
      INTERNATIONAL
      ========================================
      */

      else if (
        type ===
        "international"
      ) {

        for (
          const country
          of INTERNATIONAL_COUNTRIES
        ) {

          const results =
            await getJobs(
              country,
              search,
              location,
              1
            );


          jobs.push(
            ...results.map(
              formatJob
            )
          );

        }

      }


      /*
      ========================================
      ALL JOBS
      ========================================
      */

      else {

        // Nigeria jobs
        const nigeria =
          await getNigeriaJobs(
            search
          );


        jobs.push(
          ...nigeria
        );


        // Remote jobs
        const remote =
          await getRemoteJobs(
            search
          );


        jobs.push(
          ...remote
        );


        // Visa sponsorship jobs
        const visa =
          await getVisaJobs(
            search
          );


        jobs.push(
          ...visa
        );

      }


      /*
      ========================================
      LOCATION FILTER
      ========================================
      */

      if (
        location
      ) {

        const locationText =
          location.toLowerCase();


        jobs =
          jobs.filter(
            job => {

              const jobLocation =
                (
                  job.location ||
                  ""
                ).toLowerCase();


              return jobLocation.includes(
                locationText
              );

            }
          );

      }


      /*
      ========================================
      REMOVE DUPLICATES
      ========================================
      */

      jobs =
        removeDuplicates(
          jobs
        );


      /*
      ========================================
      SORT JOBS
      ========================================
      */

      jobs.sort(
        (
          a,
          b
        ) => {

          return (
            calculateJobScore(b) -
            calculateJobScore(a)
          );

        }
      );


      /*
      ========================================
      LIMIT RESULTS
      ========================================
      */

      jobs =
        jobs.slice(
          0,
          100
        );


      /*
      ========================================
      RESPONSE
      ========================================
      */

      res.json({

        success: true,

        count:
          jobs.length,

        jobs

      });


    } catch (error) {

      console.error(
        "Jobs API error:",
        error.message
      );


      res.status(
        500
      ).json({

        success: false,

        message:
          error.message ||
          "Unable to fetch jobs.",

        jobs: []

      });

    }

  }
);


/*
========================================
TELEGRAM POST
========================================
*/

async function postToTelegram(
  job
) {

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


  const badges = [

    job.remote
      ? "🏠 REMOTE"
      : "",

    job.visaSponsorship
      ? "✈️ VISA SPONSORSHIP"
      : ""

  ]
    .filter(Boolean)
    .join(" | ");


  const description =
    cleanDescription(
      job.description
    );


  const message =

`🚨 NEW JOB OPPORTUNITY

${badges}

💼 ${job.title}

🏢 ${job.company}

📍 ${job.location}

💰 ${job.salary}

📝 ${description.substring(
  0,
  500
)}

🔗 APPLY HERE:
${job.url}

#Jobs #JobOpportunity #NigeriaJobs #RemoteJobs #VisaSponsorship`;


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
TEMPORARY DUPLICATE MEMORY
========================================
*/

const postedJobs =
  new Set();


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

    const jobs =
      await getRemoteJobs(
        "jobs"
      );


    const visaJobs =
      await getVisaJobs(
        "jobs"
      );


    const nigeriaJobs =
      await getNigeriaJobs(
        "jobs"
      );


    const allJobs =
      removeDuplicates([

        ...jobs,

        ...visaJobs,

        ...nigeriaJobs

      ]);


    allJobs.sort(
      (
        a,
        b
      ) =>
        calculateJobScore(b) -
        calculateJobScore(a)
    );


    console.log(
      `Found ${allJobs.length} jobs.`
    );


    for (
      const job
      of allJobs
    ) {

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

Enable only after testing Telegram.
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
