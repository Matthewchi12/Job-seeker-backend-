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
ADZUNA SEARCH
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
              20,

            what:
              keyword,

            where:
              location,

            sort_by:
              "date",

            "content-type":
              "application/json"
          },

          timeout: 20000,

          headers: {
            Accept:
              "application/json"
          }
        }
      );


    return (
      response.data?.results ||
      []
    );

  } catch (error) {

    console.error(
      `Adzuna ${country} failed:`,
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
      /&quot;/gi,
      '"'
    )

    .replace(
      /&#39;/gi,
      "'"
    )

    .replace(
      /\s+/g,
      " "
    )

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

    "certificate of sponsorship available",

    "cos sponsorship",

    "immigration sponsorship",

    "relocation assistance",

    "relocation package",

    "relocation support",

    "international candidates",

    "overseas candidates",

    "visa support"

  ];


  return visaWords.some(
    word =>
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


  return words.some(
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


  const location =
    job.location?.display_name ||
    "Location not specified";


  const remote =
    isRemoteJob({

      title:
        job.title,

      location:
        location,

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


  const scholarship =
    isScholarship({

      title:
        job.title,

      description:
        description
    });


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


  return {

    id:
      String(
        job.id ||
        `${job.title}-${job.created}`
      ),

    title:
      job.title ||
      "Job Opportunity",

    company:
      job.company?.display_name ||
      "Company",

    location:
      location,

    description:
      description ||
      "No description available.",

    salary:
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

    remote:
      remote,

    visaSponsorship:
      visaSponsorship,

    scholarship:
      scholarship,

    category:
      job.category?.label ||
      ""
  };
}


/*
========================================
DUPLICATE REMOVAL
========================================
*/

function removeDuplicates(jobs) {

  const unique = [];

  const seen =
    new Set();


  for (
    const job of jobs
  ) {

    const key =
      job.url ||
      `${job.title}-${job.company}-${job.location}`;


    if (
      seen.has(key)
    ) {

      continue;
    }


    seen.add(key);

    unique.push(job);
  }


  return unique;
}


/*
========================================
SORT JOBS
========================================
*/

function sortJobs(jobs) {

  return jobs.sort(
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
SEARCH NIGERIA
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
SEARCH NIGERIA REMOTE
========================================
*/

async function getNigeriaRemoteJobs(
  search
) {

  const searches = [

    `${search} remote`,

    `${search} work from home`,

    `remote ${search}`

  ];


  let allJobs = [];


  for (
    const keyword
    of searches
  ) {

    const jobs =
      await getJobs(
        "ng",
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


  /*
  Do NOT throw away jobs just because
  Adzuna's description doesn't contain
  the word remote.

  The search itself already requested
  remote jobs.
  */

  return removeDuplicates(
    allJobs
  );
}


/*
========================================
SEARCH REMOTE INTERNATIONAL
========================================
*/

async function getRemoteJobs(
  search
) {

  const searches = [

    `${search} remote`,

    `remote ${search}`,

    `${search} work from home`

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


  /*
  Important:

  We do not filter with
  job.remote here.

  Adzuna already received
  "remote" in the search.
  */

  return removeDuplicates(
    allJobs
  );
}


/*
========================================
VISA SPONSORSHIP JOBS
========================================
*/

async function getVisaJobs(
  search
) {

  const searches = [

    `${search} visa sponsorship`,

    `${search} visa sponsor`,

    `${search} work visa`,

    `${search} relocation`

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


  return removeDuplicates(
    allJobs
  );
}


/*
========================================
SCHOLARSHIPS
========================================

NOTE:

Adzuna is primarily a job-ad API.
We search scholarship/fellowship
terms here, but this is NOT a dedicated
scholarship database.

A separate scholarship source can
be added later.
========================================
*/

async function getScholarships(
  search
) {

  const searches = [

    `${search} scholarship`,

    `${search} fellowship`,

    `${search} fully funded`,

    `${search} studentship`

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


  return removeDuplicates(
    allJobs
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

  let allJobs = [];


  for (
    const country
    of INTERNATIONAL_COUNTRIES
  ) {

    const jobs =
      await getJobs(
        country,
        search,
        location,
        1
      );


    allJobs.push(
      ...jobs.map(
        formatJob
      )
    );
  }


  return removeDuplicates(
    allJobs
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


      let jobs = [];


      /*
      ====================================
      ALL
      ====================================
      */

      if (
        type === "all"
      ) {

        /*
        Use a small number of searches
        so the API is not overloaded.
        */

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
          jobs.filter(
            job => {

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
              For remote searches,
              allow remote jobs even when
              their physical location is
              not the requested location.
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
            }
          );
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
        "Jobs API error:",
        error.message
      );


      res.status(
        500
      ).json({

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


  if (
    !job.url
  ) {

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
TEMPORARY POST MEMORY
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


    /*
    Only post the first 10 new jobs
    during each check.
    */

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


      if (
        posted
      ) {

        postedJobs.add(
          job.id
        );

        postedCount++;
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
AUTOMATIC POSTING DISABLED
========================================

KEEP DISABLED UNTIL TELEGRAM
HAS BEEN TESTED.
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
