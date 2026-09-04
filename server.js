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
GENERAL REMOTE JOB SEARCH TERMS
========================================

Used when the user does NOT enter
a specific job title.

This allows the website to search
different types of jobs.
========================================
*/

const GENERAL_REMOTE_SEARCHES = [

  "remote",

  "work from home",

  "work from anywhere",

  "worldwide remote",

  "international remote",

  "remote customer service",

  "remote customer support",

  "remote data entry",

  "remote data analyst",

  "remote administrative",

  "remote virtual assistant",

  "remote sales",

  "remote marketing",

  "remote social media",

  "remote content writer",

  "remote copywriter",

  "remote graphic designer",

  "remote software developer",

  "remote web developer",

  "remote IT",

  "remote accounting",

  "remote finance",

  "remote human resources",

  "remote recruiter",

  "remote project manager",

  "remote operations",

  "remote research",

  "remote healthcare",

  "remote medical",

  "remote education",

  "remote teacher",

  "remote translator",

  "remote AI",

  "remote artificial intelligence",

  "remote machine learning",

  "remote engineering"

];


/*
========================================
REMOTE JOB CHECK
========================================
*/

function isRemoteJob(job) {

  const text = [

    job?.title || "",

    job?.location?.display_name || job?.location || "",

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

    "distributed workforce",

    "fully remote",

    "100% remote",

    "remote position",

    "remote job",

    "home based",

    "home-based",

    "location independent",

    "location-independent",

    "virtual position",

    "virtual job",

    "telecommute",

    "telecommuting"

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
    String(
      job?.location?.display_name ||
      job?.location ||
      ""
    ).toLowerCase();


  const description =
    String(
      job?.description || ""
    ).toLowerCase();


  const text =
    `${title} ${location} ${description}`;


  /*
  MUST ACTUALLY BE REMOTE
  */

  if (!isRemoteJob(job)) {
    return false;
  }


  /*
  ========================================
  EXPLICIT COUNTRY RESTRICTIONS
  ========================================
  */

  const restrictions = [

    /*
    UNITED STATES
    */

    "us only",
    "usa only",
    "u.s. only",
    "u.s.a. only",

    "us residents only",
    "usa residents only",

    "us-based applicants only",
    "usa-based applicants only",

    "us based applicants only",
    "usa based applicants only",

    "must be located in the us",
    "must be located in usa",
    "must be located in the usa",

    "must reside in the us",
    "must reside in usa",
    "must reside in the usa",

    "only applicants located in the us",
    "only applicants located in usa",

    "only available to us residents",
    "only available to usa residents",

    "us work authorization required",
    "usa work authorization required",

    "must have us work authorization",
    "must have usa work authorization",

    "right to work in the us",
    "right to work in usa",
    "right to work in the usa",

    "authorized to work in the us",
    "authorized to work in usa",

    /*
    UNITED KINGDOM
    */

    "uk only",
    "u.k. only",

    "uk residents only",
    "u.k. residents only",

    "uk-based applicants only",
    "uk based applicants only",

    "must be located in the uk",
    "must reside in the uk",

    "only applicants located in the uk",

    "uk work authorization required",

    "must have uk work authorization",

    "right to work in the uk",

    "authorized to work in the uk",

    /*
    CANADA
    */

    "canada only",

    "canadian residents only",
    "canada residents only",

    "canada-based applicants only",
    "canada based applicants only",

    "must be located in canada",
    "must reside in canada",

    "only applicants located in canada",

    "canadian work authorization required",

    "must have canadian work authorization",

    "right to work in canada",

    "authorized to work in canada",

    /*
    AUSTRALIA
    */

    "australia only",

    "australian residents only",

    "australia-based applicants only",
    "australia based applicants only",

    "must be located in australia",
    "must reside in australia",

    "only applicants located in australia",

    "australian work authorization required",

    "must have australian work authorization",

    "right to work in australia",

    "authorized to work in australia",

    /*
    NEW ZEALAND
    */

    "new zealand only",

    "new zealand residents only",

    "must be located in new zealand",
    "must reside in new zealand",

    "right to work in new zealand",

    "authorized to work in new zealand",

    /*
    EUROPE
    */

    "eu residents only",
    "european residents only",

    "eu-based applicants only",
    "eu based applicants only",

    "must be located in the eu",
    "must reside in the eu",

    "right to work in the eu",

    "europe work authorization required",

    "european work authorization required",

    /*
    OTHER COUNTRY RESTRICTIONS
    */

    "germany only",
    "france only",
    "ireland only",
    "netherlands only",
    "singapore only",
    "india only",
    "south africa only",

    "residents of germany only",
    "residents of france only",
    "residents of ireland only",
    "residents of netherlands only",
    "residents of singapore only",
    "residents of india only"

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
  WORLDWIDE / INTERNATIONAL SIGNALS
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

    "global workforce",

    "international applicants",

    "international candidates",

    "international applicants welcome",

    "international candidates welcome",

    "open to international candidates",

    "open to international applicants",

    "open to applicants worldwide",

    "open to candidates worldwide",

    "open worldwide",

    "worldwide applicants",

    "worldwide candidates",

    "remote worldwide",

    "remote globally",

    "globally distributed",

    "distributed team",

    "distributed workforce",

    "fully distributed",

    "location independent",

    "location-independent",

    "no geographic restrictions",

    "no geographical restrictions",

    "all locations",

    "all countries",

    "global applicants",

    "global candidates"

  ];


  /*
  ========================================
  NIGERIA / AFRICA SIGNALS
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

    "sub saharan africa",

    "west africa",

    "east africa",

    "ghana",

    "kenya",

    "egypt",

    "morocco",

    "south africa",

    "african countries",

    "african applicants",

    "african candidates"

  ];


  /*
  ========================================
  PHYSICAL REMOTE RESTRICTIONS
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

    "remote: uk",

    "remote in canada",
    "remote - canada",
    "remote, canada",

    "remote: canada",

    "remote in australia",
    "remote - australia",
    "remote, australia",

    "remote: australia",

    "remote in germany",
    "remote - germany",

    "remote in france",
    "remote - france",

    "remote in ireland",
    "remote - ireland"

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
  WORLDWIDE = ACCEPT
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
  NIGERIA / AFRICA = ACCEPT
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

  If the job is genuinely remote and
  contains no explicit country restriction,
  allow it.

  This prevents us from unnecessarily
  removing legitimate remote jobs.
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
      String(
        job.id ||
        `${job.title}-${job.company}-${job.url}`
      )
        .toLowerCase()
        .trim();


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
      job.title ||
      "Untitled job",

    company:
      job.company?.display_name ||
      "Company not specified",

    location:
      job.location?.display_name ||
      "Remote",

    description:
      job.description ||
      "",

    salary:
      job.salary_min != null
        ? `${job.salary_min} - ${job.salary_max || ""}`
        : "Not specified",

    url:
      job.redirect_url ||
      "",

    created:
      job.created ||
      null,

    remote:
      true,

    nigeriaFriendly:
      true

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
      "ADZUNA_APP_ID or ADZUNA_APP_KEY is missing in Render Environment Variables"
    );

  }


  const safeKeyword =
    String(keyword || "").trim();


  if (!safeKeyword) {

    throw new Error(
      "Adzuna search keyword is empty"
    );

  }


  const url =
    `https://api.adzuna.com/v1/api/jobs/${country}/search/${page}` +
    `?app_id=${encodeURIComponent(ADZUNA_APP_ID)}` +
    `&app_key=${encodeURIComponent(ADZUNA_APP_KEY)}` +
    `&results_per_page=50` +
    `&what=${encodeURIComponent(safeKeyword)}` +
    `&content-type=application/json`;


  console.log(
    `Adzuna request: ${country} | ${safeKeyword}`
  );


  const response =
    await fetch(url);


  const text =
    await response.text();


  if (!response.ok) {

    console.error(
      `Adzuna ${country} error:`,
      text.substring(0, 500)
    );


    throw new Error(
      `Adzuna ${response.status}: ${text.substring(0, 500)}`
    );

  }


  let data;


  try {

    data =
      JSON.parse(text);

  } catch {

    throw new Error(
      "Adzuna returned invalid JSON: " +
      text.substring(0, 300)
    );

  }


  const jobs =
    Array.isArray(data.results)
      ? data.results
      : [];


  console.log(
    `Adzuna ${country} returned ${jobs.length} jobs`
  );


  return jobs;

}


/*
========================================
GET ALL TYPES OF WORLDWIDE REMOTE JOBS
========================================
*/

async function getRemoteJobs(search) {

  const userSearch =
    String(search || "").trim();


  /*
  ========================================
  IF USER SEARCHES A SPECIFIC JOB
  ========================================

  Example:

  data analyst

  nurse

  graphic designer

  accountant

  teacher

  etc.
  */

  let searchTerms;


  if (userSearch) {

    searchTerms = [

      userSearch,

      `${userSearch} remote`,

      `${userSearch} work from home`,

      `${userSearch} work from anywhere`,

      `${userSearch} worldwide`,

      `${userSearch} international remote`

    ];

  }


  /*
  ========================================
  IF SEARCH BOX IS EMPTY
  ========================================

  Search many different job fields.
  */

  else {

    searchTerms =
      GENERAL_REMOTE_SEARCHES;

  }


  /*
  Remove duplicate search terms
  */

  searchTerms =
    [...new Set(searchTerms)];


  const results = [];


  /*
  ========================================
  SEARCH ALL INTERNATIONAL COUNTRIES
  ========================================
  */

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


        /*
        IMPORTANT:

        Filter the ORIGINAL Adzuna job
        before formatting it.

        This makes the remote check more
        reliable.
        */

        const filtered =
          jobs.filter(
            isNigeriaFriendlyRemoteJob
          );


        const formatted =
          filtered.map(
            formatJob
          );


        console.log(

          `${country} | ${keyword} | ` +
          `found: ${jobs.length} | ` +
          `accepted: ${formatted.length}`

        );


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


  return removeDuplicates(
    results
  );

}


/*
========================================
VISA SPONSORSHIP CHECK
========================================
*/

function isVisaJob(job) {

  const text = (

    `${job?.title || ""} ` +

    `${job?.location?.display_name || job?.location || ""} ` +

    `${job?.description || ""}`

  ).toLowerCase();


  const visaWords = [

    "visa sponsorship",

    "visa sponsor",

    "sponsorship available",

    "visa sponsorship available",

    "sponsorship provided",

    "visa provided",

    "work visa",

    "work permit",

    "skilled worker visa",

    "skilled worker",

    "tier 2 visa",

    "sponsor visa",

    "employer sponsorship",

    "employer sponsored",

    "visa support",

    "visa assistance",

    "immigration sponsorship",

    "relocation assistance",

    "relocation package",

    "relocation support"

  ];


  return visaWords.some(
    word => text.includes(word)
  );

}


/*
========================================
GET VISA SPONSORSHIP JOBS
========================================
*/

async function getVisaJobs(
  search,
  location = ""
) {

  const safeSearch =
    String(
      search || "customer support"
    ).trim();


  const safeLocation =
    String(
      location || ""
    ).trim();


  if (!safeSearch) {
    return [];
  }


  const searchTerms = [

    `${safeSearch} visa sponsorship`,

    `${safeSearch} sponsorship`,

    `${safeSearch} work visa`,

    `${safeSearch} skilled worker`,

    `${safeSearch} visa`,

    `${safeSearch} employer sponsorship`,

    `${safeSearch} relocation`

  ];


  const results = [];


  /*
  ========================================
  COUNTRY MAP
  ========================================
  */

  let countries =
    INTERNATIONAL_COUNTRIES;


  if (safeLocation) {

    const locationLower =
      safeLocation.toLowerCase();


    const countryMap = {

      uk: "gb",
      gb: "gb",

      usa: "us",
      us: "us",

      canada: "ca",
      ca: "ca",

      australia: "au",
      au: "au",

      "new zealand": "nz",
      nz: "nz",

      germany: "de",
      de: "de",

      france: "fr",
      fr: "fr",

      netherlands: "nl",
      nl: "nl",

      ireland: "ie",
      ie: "ie",

      "south africa": "za",
      za: "za",

      singapore: "sg",
      sg: "sg",

      india: "in",
      in: "in"

    };


    if (
      countryMap[locationLower]
    ) {

      countries = [

        countryMap[
          locationLower
        ]

      ];

    }

  }


  /*
  ========================================
  SEARCH
  ========================================
  */

  for (
    const country
    of countries
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


        /*
        Check original Adzuna data
        */

        const filtered =
          jobs.filter(
            isVisaJob
          );


        const formatted =
          filtered.map(
            formatJob
          );


        console.log(

          `${country} | ${keyword} | ` +
          `found: ${jobs.length} | ` +
          `visa accepted: ${formatted.length}`

        );


        results.push(
          ...formatted
        );


      } catch (error) {

        console.error(

          `Visa ${country} search failed:`,

          error.message

        );

      }

    }

  }


  return removeDuplicates(
    results
  );

}


/*
========================================
HEALTH CHECK
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
        "online"

    });

  }
);


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
          req.query.search || ""
        ).trim();


      console.log(
        "========================================"
      );

      console.log(
        "REMOTE JOB REQUEST"
      );

      console.log(
        "Search:",
        search || "ALL REMOTE JOB FIELDS"
      );

      console.log(
        "========================================"
      );


      const jobs =
        await getRemoteJobs(
          search
        );


      res.json({

        success: true,

        count:
          jobs.length,

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
          "Failed to fetch remote jobs",

        jobs: []

      });

    }

  }
);


/*
========================================
VISA JOB API
========================================
*/

app.get(
  "/api/jobs/visa",
  async (req, res) => {

    try {

      const search =
        String(
          req.query.search ||
          "customer support"
        ).trim();


      const location =
        String(
          req.query.location ||
          ""
        ).trim();


      console.log(
        "========================================"
      );

      console.log(
        "VISA JOB REQUEST"
      );

      console.log(
        "Search:",
        search
      );

      console.log(
        "Location:",
        location || "Worldwide"
      );

      console.log(
        "========================================"
      );


      const jobs =
        await getVisaJobs(
          search,
          location
        );


      res.json({

        success: true,

        count:
          jobs.length,

        jobs

      });


    } catch (error) {

      console.error(
        "Visa jobs error:",
        error
      );


      res.status(500).json({

        success: false,

        error:
          error.message ||
          "Failed to fetch visa jobs",

        jobs: []

      });

    }

  }
);


/*
========================================
GENERAL JOB API
========================================

Examples:

/api/jobs?type=remote

/api/jobs?search=data%20analyst&type=remote

/api/jobs?search=graphic%20designer&type=remote

/api/jobs?search=nurse&type=visa

/api/jobs?search=data%20analyst&type=visa&location=uk
========================================
*/

app.get(
  "/api/jobs",
  async (req, res) => {

    try {

      const search =
        String(
          req.query.search || ""
        ).trim();


      const type =
        String(
          req.query.type ||
          "remote"
        )
          .trim()
          .toLowerCase();


      const location =
        String(
          req.query.location ||
          ""
        ).trim();


      console.log(
        "========================================"
      );

      console.log(
        "JOB REQUEST"
      );

      console.log(
        "Search:",
        search || "ALL REMOTE JOBS"
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
        "========================================"
      );


      let jobs = [];


      /*
      ========================================
      VISA
      ========================================
      */

      if (

        type === "visa" ||

        type === "sponsorship" ||

        type === "visa sponsorship"

      ) {

        jobs =
          await getVisaJobs(
            search ||
            "customer support",
            location
          );

      }


      /*
      ========================================
      REMOTE
      ========================================
      */

      else {

        jobs =
          await getRemoteJobs(
            search
          );

      }


      res.json({

        success: true,

        count:
          jobs.length,

        jobs

      });


    } catch (error) {

      console.error(
        "Jobs API error:",
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
