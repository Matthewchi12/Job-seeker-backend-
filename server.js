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
REMOTE JOB CATEGORIES
========================================

These cover many types of work.

We DO NOT rely on generic "remote"
alone to decide whether Nigerians can
work from the job.
========================================
*/

const REMOTE_CATEGORIES = [

  // General
  "remote jobs",

  // Customer service
  "customer service",
  "customer support",
  "support specialist",
  "customer success",
  "call center",

  // Virtual assistance
  "virtual assistant",
  "administrative assistant",
  "personal assistant",
  "virtual receptionist",

  // Data
  "data entry",
  "data analyst",
  "data analysis",
  "data annotation",
  "data labeling",
  "research assistant",
  "research analyst",

  // Sales
  "sales",
  "sales representative",
  "business development",
  "account manager",
  "appointment setter",

  // Marketing
  "digital marketing",
  "marketing",
  "social media",
  "social media manager",
  "content marketing",
  "SEO",

  // Writing
  "writer",
  "content writer",
  "copywriter",
  "technical writer",
  "editor",
  "proofreader",

  // Design
  "graphic designer",
  "graphic design",
  "UI designer",
  "UX designer",
  "product designer",
  "video editor",

  // Technology
  "software developer",
  "software engineer",
  "web developer",
  "frontend developer",
  "backend developer",
  "full stack developer",
  "javascript developer",
  "react developer",
  "python developer",

  // IT
  "IT support",
  "IT specialist",
  "technical support",
  "cybersecurity",
  "cloud engineer",
  "DevOps",

  // Finance
  "accounting",
  "accountant",
  "bookkeeper",
  "finance",
  "financial analyst",

  // HR
  "human resources",
  "HR",
  "recruiter",
  "recruitment",

  // Management
  "project manager",
  "product manager",
  "operations",
  "operations manager",

  // AI
  "AI trainer",
  "AI evaluator",
  "AI data",
  "machine learning",
  "AI specialist",
  "AI annotator",

  // Education
  "online teacher",
  "online tutor",
  "teacher",
  "tutor",
  "online instructor",

  // Healthcare
  "healthcare",
  "medical",
  "medical writer",
  "healthcare support",
  "medical researcher",

  // Translation
  "translator",
  "translation",
  "language specialist"
];


/*
========================================
STRONG ELIGIBILITY SEARCHES
========================================

These are deliberately strong.

We DO NOT use only:

"remote"

because that can return UK-only,
US-only, Canada-only etc.
========================================
*/

const ELIGIBILITY_SEARCHES = [

  "remote Nigeria",

  "remote Africa",

  "remote worldwide",

  "worldwide remote",

  "work from anywhere",

  "work from Nigeria",

  "work from Africa",

  "open to international applicants"

];


/*
========================================
REMOTE SIGNALS
========================================
*/

const REMOTE_SIGNALS = [

  "remote",
  "work from home",
  "work-from-home",
  "work from anywhere",
  "work-from-anywhere",
  "home based",
  "home-based",
  "fully remote",
  "100% remote",
  "remote position",
  "remote role",
  "remote job",
  "telecommute",
  "telecommuting"

];


/*
========================================
NIGERIA SIGNALS
========================================
*/

const NIGERIA_SIGNALS = [

  "remote nigeria",
  "remote - nigeria",
  "remote, nigeria",
  "remote: nigeria",

  "remote from nigeria",

  "work from nigeria",
  "work-from-nigeria",

  "working from nigeria",
  "working-from-nigeria",

  "based in nigeria",
  "located in nigeria",

  "nigeria-based",
  "nigeria based",

  "nigerian applicants",
  "nigerian candidates",

  "nigeria applicants",
  "nigeria candidates",

  "open to nigerians",

  "open to nigerian applicants",
  "open to nigerian candidates",

  "hire in nigeria",
  "hiring in nigeria",

  "employees in nigeria",

  "available in nigeria",

  "nigeria remote"

];


/*
========================================
AFRICA SIGNALS
========================================
*/

const AFRICA_SIGNALS = [

  "remote africa",
  "remote - africa",
  "remote, africa",
  "remote: africa",

  "remote from africa",

  "work from africa",
  "work-from-africa",

  "working from africa",
  "working-from-africa",

  "africa-based",
  "africa based",

  "based in africa",
  "located in africa",

  "african applicants",
  "african candidates",

  "open to africans",

  "open to african applicants",
  "open to african candidates",

  "hire in africa",
  "hiring in africa",

  "employees in africa",

  "available in africa",

  "sub-saharan africa",
  "sub saharan africa",

  "west africa",
  "east africa"

];


/*
========================================
WORLDWIDE SIGNALS
========================================
*/

const WORLDWIDE_SIGNALS = [

  "work from anywhere",

  "work-from-anywhere",

  "anywhere in the world",

  "anywhere around the world",

  "remote worldwide",

  "worldwide remote",

  "open worldwide",

  "open to applicants worldwide",

  "open to candidates worldwide",

  "worldwide applicants",

  "worldwide candidates",

  "open to international applicants",

  "open to international candidates",

  "international applicants welcome",

  "international candidates welcome",

  "open to applicants globally",

  "open to candidates globally",

  "global applicants",

  "global candidates",

  "remote globally",

  "globally remote",

  "location independent",

  "location-independent",

  "no geographic restrictions",

  "no geographical restrictions",

  "any country",

  "all countries",

  "all locations"

];


/*
========================================
HARD RESTRICTIONS
========================================

If the job clearly says applicants must
be in another country, reject it.
========================================
*/

const HARD_RESTRICTIONS = [

  // USA

  "us only",
  "usa only",
  "u.s. only",
  "u.s.a. only",

  "us residents only",
  "usa residents only",

  "us-based only",
  "usa-based only",

  "us based only",
  "usa based only",

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
  "only applicants located in the usa",

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
  "authorized to work in the usa",

  "us work permit required",
  "usa work permit required",


  // UK

  "uk only",
  "u.k. only",

  "uk residents only",
  "u.k. residents only",

  "uk-based only",
  "uk based only",

  "uk-based applicants only",
  "uk based applicants only",

  "must be located in the uk",
  "must reside in the uk",

  "only applicants located in the uk",

  "uk work authorization required",

  "must have uk work authorization",

  "right to work in the uk",

  "authorized to work in the uk",

  "uk work permit required",


  // Canada

  "canada only",
  "canadian only",

  "canadian residents only",
  "canada residents only",

  "canada-based only",
  "canada based only",

  "canada-based applicants only",
  "canada based applicants only",

  "must be located in canada",
  "must reside in canada",

  "only applicants located in canada",

  "canadian work authorization required",

  "must have canadian work authorization",

  "right to work in canada",

  "authorized to work in canada",

  "canada work permit required",


  // Australia

  "australia only",
  "australian only",

  "australian residents only",
  "australia residents only",

  "australia-based only",
  "australia based only",

  "australia-based applicants only",
  "australia based applicants only",

  "must be located in australia",
  "must reside in australia",

  "only applicants located in australia",

  "australian work authorization required",

  "right to work in australia",

  "authorized to work in australia",

  "australia work permit required",


  // New Zealand

  "new zealand only",
  "new zealand residents only",
  "new zealand residents",

  "new zealand-based only",
  "new zealand based only",

  "must be located in new zealand",
  "must reside in new zealand",

  "right to work in new zealand",

  "authorized to work in new zealand",


  // Europe

  "eu only",
  "eu residents only",
  "european residents only",

  "eu-based only",
  "eu based only",

  "eu-based applicants only",
  "eu based applicants only",

  "must be located in the eu",
  "must reside in the eu",

  "right to work in the eu",

  "europe work authorization required",
  "european work authorization required",


  // Germany

  "germany only",
  "german residents only",
  "residents of germany only",

  "must be located in germany",
  "must reside in germany",

  "right to work in germany",

  // France

  "france only",
  "french residents only",
  "residents of france only",

  "must be located in france",
  "must reside in france",

  "right to work in france",

  // Ireland

  "ireland only",
  "irish residents only",
  "residents of ireland only",

  "must be located in ireland",
  "must reside in ireland",

  "right to work in ireland",

  // Netherlands

  "netherlands only",
  "dutch residents only",
  "residents of netherlands only",

  "must be located in netherlands",
  "must reside in netherlands",

  "right to work in netherlands",

  // Singapore

  "singapore only",
  "singapore residents only",
  "residents of singapore only",

  "must be located in singapore",
  "must reside in singapore",

  "right to work in singapore",

  // India

  "india only",
  "indian residents only",
  "residents of india only",

  "must be located in india",
  "must reside in india",

  "right to work in india",

  // South Africa

  "south africa only",
  "south african residents only",

  "must be located in south africa",
  "must reside in south africa",

  "right to work in south africa",


  // Remote-location restrictions

  "remote - us",
  "remote - usa",
  "remote, us",
  "remote, usa",
  "remote: us",
  "remote: usa",

  "remote - uk",
  "remote, uk",
  "remote: uk",

  "remote - canada",
  "remote, canada",
  "remote: canada",

  "remote - australia",
  "remote, australia",
  "remote: australia",

  "remote - germany",
  "remote, germany",

  "remote - france",
  "remote, france",

  "remote - ireland",
  "remote, ireland",

  "remote - india",
  "remote, india",

  "remote - singapore",
  "remote, singapore",

  "remote - south africa",
  "remote, south africa"

];


/*
========================================
IS REMOTE JOB
========================================
*/

function isRemoteJob(job) {

  const title =
    String(job?.title || "").toLowerCase();

  const location =
    String(
      job?.location?.display_name ||
      job?.location ||
      ""
    ).toLowerCase();

  const description =
    String(job?.description || "").toLowerCase();

  const text =
    `${title} ${location} ${description}`;

  return REMOTE_SIGNALS.some(
    signal => text.includes(signal)
  );
}


/*
========================================
GET JOB TEXT
========================================
*/

function getJobText(job) {

  const title =
    String(job?.title || "").toLowerCase();

  const location =
    String(
      job?.location?.display_name ||
      job?.location ||
      ""
    ).toLowerCase();

  const description =
    String(job?.description || "").toLowerCase();

  return {
    title,
    location,
    description,
    text: `${title} ${location} ${description}`
  };
}


/*
========================================
CHECK NIGERIA/AFRICA ELIGIBILITY
========================================

IMPORTANT:

Generic remote is NOT enough.

The job needs strong evidence that
someone outside the advertised country
can actually work remotely.
========================================
*/

function checkNigeriaFriendlyRemoteJob(job) {

  const {
    location,
    text
  } = getJobText(job);


  /*
  ========================================
  1. MUST BE REMOTE
  ========================================
  */

  if (!isRemoteJob(job)) {

    return {
      accepted: false,
      reason: "not_remote"
    };

  }


  /*
  ========================================
  2. HARD RESTRICTION
  ========================================
  */

  const hardRestriction =
    HARD_RESTRICTIONS.find(
      phrase => text.includes(phrase)
    );

  if (hardRestriction) {

    return {
      accepted: false,
      reason: "foreign_country_restriction",
      matched: hardRestriction
    };

  }


  /*
  ========================================
  3. NIGERIA
  ========================================
  */

  const nigeriaSignal =
    NIGERIA_SIGNALS.find(
      signal => text.includes(signal)
    );

  if (nigeriaSignal) {

    return {
      accepted: true,
      reason: "nigeria_friendly",
      matched: nigeriaSignal
    };

  }


  /*
  ========================================
  4. AFRICA
  ========================================
  */

  const africaSignal =
    AFRICA_SIGNALS.find(
      signal => text.includes(signal)
    );

  if (africaSignal) {

    return {
      accepted: true,
      reason: "africa_friendly",
      matched: africaSignal
    };

  }


  /*
  ========================================
  5. WORLDWIDE
  ========================================
  */

  const worldwideSignal =
    WORLDWIDE_SIGNALS.find(
      signal => text.includes(signal)
    );

  if (worldwideSignal) {

    return {
      accepted: true,
      reason: "worldwide",
      matched: worldwideSignal
    };

  }


  /*
  ========================================
  6. IMPORTANT LOCATION CHECK
  ========================================

  If Adzuna says:

  South West London
  London
  New York
  California
  Toronto
  Sydney
  etc.

  and there is NO strong Nigeria/Africa/
  worldwide signal, reject it.

  This is what stops generic jobs such
  as:

  "Remote - London"

  from appearing.
  ========================================
  */

  const foreignLocationWords = [

    "london",
    "england",
    "united kingdom",
    "uk",
    "new york",
    "california",
    "texas",
    "florida",
    "united states",
    "usa",
    "canada",
    "toronto",
    "vancouver",
    "australia",
    "sydney",
    "melbourne",
    "new zealand",
    "auckland",
    "germany",
    "berlin",
    "france",
    "paris",
    "ireland",
    "dublin",
    "netherlands",
    "amsterdam",
    "singapore",
    "india",
    "delhi",
    "mumbai",
    "south africa",
    "johannesburg",
    "cape town"

  ];

  const foreignLocation =
    foreignLocationWords.find(
      word => location.includes(word)
    );

  if (foreignLocation) {

    return {
      accepted: false,
      reason: "foreign_location_without_nigeria_africa_worldwide",
      matched: foreignLocation
    };

  }


  /*
  ========================================
  7. GENERIC REMOTE
  ========================================

  This is intentionally rejected.
  ========================================
  */

  return {
    accepted: false,
    reason: "generic_remote_no_location_eligibility"
  };

}


/*
========================================
SIMPLE BOOLEAN VERSION
========================================
*/

function isNigeriaFriendlyRemoteJob(job) {

  return checkNigeriaFriendlyRemoteJob(job)
    .accepted;

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
      job.redirect_url ||
      `${job.title}-${job.company?.display_name || ""}`;

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

    id: job.id,

    title: job.title,

    company:
      job.company?.display_name ||
      "Company not specified",

    location:
      job.location?.display_name ||
      "Remote",

    description:
      job.description || "",

    url:
      job.redirect_url || "",

    created:
      job.created || "",

    salary_min:
      job.salary_min || null,

    salary_max:
      job.salary_max || null,

    salary_is_predicted:
      job.salary_is_predicted || false,

    contract_type:
      job.contract_type || "",

    contract_time:
      job.contract_time || "",

    category:
      job.category?.label ||
      job.category?.tag ||
      "",

    remote: true,

    nigeriaFriendly: true

  };

}


/*
========================================
ADZUNA API
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

    console.error(
      "Missing ADZUNA_APP_ID or ADZUNA_APP_KEY"
    );

    return [];

  }


  try {

    const url =
      `https://api.adzuna.com/v1/api/jobs/${country}/search/${page}` +
      `?app_id=${encodeURIComponent(ADZUNA_APP_ID)}` +
      `&app_key=${encodeURIComponent(ADZUNA_APP_KEY)}` +
      `&results_per_page=50` +
      `&what=${encodeURIComponent(keyword)}`;


    const response =
      await fetch(url);


    if (!response.ok) {

      console.error(
        `Adzuna ${country} error:`,
        response.status,
        response.statusText
      );

      return [];

    }


    const data =
      await response.json();


    return Array.isArray(data.results)
      ? data.results
      : [];

  } catch (error) {

    console.error(
      `Adzuna request failed for ${country}:`,
      error.message
    );

    return [];

  }

}


/*
========================================
BUILD REMOTE SEARCHES
========================================

Instead of relying on:

"customer service remote"

we prioritize:

"customer service remote Nigeria"
"customer service remote Africa"
"customer service worldwide remote"
etc.

This greatly reduces foreign-only listings.
========================================
*/

function buildRemoteSearches(search = "") {

  const searches = [];


  /*
  ========================================
  USER SEARCH
  ========================================
  */

  if (search && search.trim()) {

    const userSearch =
      search.trim();


    for (
      const eligibility of ELIGIBILITY_SEARCHES
    ) {

      searches.push(
        `${userSearch} ${eligibility}`
      );

    }

  }


  /*
  ========================================
  DEFAULT SEARCH
  ========================================
  */

  else {

    /*
    Strong Nigeria/Africa/worldwide
    searches first.
    */

    searches.push(
      ...ELIGIBILITY_SEARCHES
    );


    /*
    Then search categories.

    We intentionally use only a subset
    of category searches to control the
    number of Adzuna API requests.

    The filter still decides whether
    each result is accepted.
    */

    for (
      const category of REMOTE_CATEGORIES
    ) {

      searches.push(
        `${category} remote Nigeria`
      );

      searches.push(
        `${category} remote Africa`
      );

      searches.push(
        `${category} worldwide remote`
      );

    }

  }


  return [
    ...new Set(searches)
  ];

}


/*
========================================
GET REMOTE JOBS
========================================
*/

async function getRemoteJobs(
  search = ""
) {

  const searches =
    buildRemoteSearches(search);


  console.log(
    `Remote searches: ${searches.length}`
  );


  let allJobs = [];


  /*
  ========================================
  SEARCH ADZUNA
  ========================================
  */

  for (
    const country of INTERNATIONAL_COUNTRIES
  ) {

    for (
      const keyword of searches
    ) {

      const jobs =
        await getJobs(
          country,
          keyword,
          1
        );


      if (jobs.length) {

        allJobs.push(
          ...jobs
        );

      }

    }

  }


  console.log(
    `Adzuna raw remote jobs: ${allJobs.length}`
  );


  /*
  ========================================
  REMOVE DUPLICATES
  ========================================
  */

  allJobs =
    removeDuplicates(allJobs);


  console.log(
    `After duplicate removal: ${allJobs.length}`
  );


  /*
  ========================================
  FILTER
  ========================================
  */

  const filteredJobs =
    allJobs.filter(
      isNigeriaFriendlyRemoteJob
    );


  console.log(
    `Nigeria/Africa/worldwide remote jobs: ${filteredJobs.length}`
  );


  /*
  ========================================
  FORMAT
  ========================================
  */

  return filteredJobs.map(
    formatJob
  );

}


/*
========================================
VISA / SPONSORSHIP JOB CHECK
========================================

DO NOT CHANGE THIS SECTION.
========================================
*/

function isVisaJob(job) {

  const title =
    String(job?.title || "")
      .toLowerCase();

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


  const visaSignals = [

    "visa sponsorship",
    "visa sponsor",
    "sponsorship available",
    "sponsorship provided",
    "sponsorship offered",
    "sponsor visa",

    "work visa",
    "work permit",

    "skilled worker visa",
    "tier 2 visa",

    "employer sponsorship",
    "employer sponsored",

    "visa assistance",
    "visa support",

    "relocation assistance",
    "relocation package",
    "relocation support",
    "relocation assistance provided",

    "immigration support",
    "immigration assistance",

    "sponsorship for international applicants",
    "international sponsorship",

    "foreign workers",
    "overseas applicants"

  ];


  return visaSignals.some(
    signal => text.includes(signal)
  );

}


/*
========================================
GET VISA JOBS
========================================

UNCHANGED VISA SYSTEM
========================================
*/

async function getVisaJobs(
  selectedCountry = ""
) {

  const visaSearches = [

    "visa sponsorship",
    "visa sponsor",
    "work visa",
    "work permit",
    "employer sponsorship",
    "sponsorship available",
    "relocation assistance",
    "relocation support",
    "international sponsorship",
    "skilled worker visa"

  ];


  const countries =
    selectedCountry &&
    INTERNATIONAL_COUNTRIES.includes(
      selectedCountry.toLowerCase()
    )
      ? [
          selectedCountry.toLowerCase()
        ]
      : INTERNATIONAL_COUNTRIES;


  let allJobs = [];


  /*
  ========================================
  SEARCH
  ========================================
  */

  for (
    const country of countries
  ) {

    for (
      const keyword of visaSearches
    ) {

      const jobs =
        await getJobs(
          country,
          keyword,
          1
        );


      if (jobs.length) {

        allJobs.push(
          ...jobs
        );

      }

    }

  }


  /*
  ========================================
  REMOVE DUPLICATES
  ========================================
  */

  allJobs =
    removeDuplicates(allJobs);


  /*
  ========================================
  FILTER VISA JOBS
  ========================================
  */

  const filteredJobs =
    allJobs.filter(
      isVisaJob
    );


  console.log(
    `Visa jobs found: ${filteredJobs.length}`
  );


  return filteredJobs.map(
    formatJob
  );

}


/*
========================================
ROOT
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
REMOTE JOBS
========================================
*/

app.get(
  "/api/jobs/remote",
  async (req, res) => {

    try {

      const search =
        String(
          req.query.search || ""
        );


      const jobs =
        await getRemoteJobs(
          search
        );


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
          "Failed to fetch remote jobs",

        message:
          error.message

      });

    }

  }
);


/*
========================================
REMOTE DEBUG ENDPOINT
========================================

Use this to test why a particular
job is accepted/rejected.

Example:

/api/jobs/remote/debug?search=customer%20service
========================================
*/

app.get(
  "/api/jobs/remote/debug",
  async (req, res) => {

    try {

      const search =
        String(
          req.query.search || "remote"
        );


      let allJobs = [];


      /*
      Only use a small test search for
      debugging.
      */

      for (
        const country of INTERNATIONAL_COUNTRIES
      ) {

        const jobs =
          await getJobs(
            country,
            search,
            1
          );


        if (jobs.length) {

          allJobs.push(
            ...jobs
          );

        }

      }


      allJobs =
        removeDuplicates(allJobs);


      const results =
        allJobs.slice(0, 100).map(job => {

          const check =
            checkNigeriaFriendlyRemoteJob(
              job
            );


          return {

            id: job.id,

            title:
              job.title,

            company:
              job.company?.display_name ||
              "",

            location:
              job.location?.display_name ||
              "",

            accepted:
              check.accepted,

            reason:
              check.reason,

            matched:
              check.matched || "",

            url:
              job.redirect_url || ""

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
        "Debug error:",
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
VISA JOBS
========================================
*/

app.get(
  "/api/jobs/visa",
  async (req, res) => {

    try {

      const country =
        String(
          req.query.country || ""
        );


      const jobs =
        await getVisaJobs(
          country
        );


      res.json({

        success: true,

        count: jobs.length,

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
          "Failed to fetch visa jobs",

        message:
          error.message

      });

    }

  }
);


/*
========================================
GENERAL JOBS ENDPOINT
========================================

/api/jobs

/api/jobs?type=remote

/api/jobs?type=visa

/api/jobs?type=sponsorship

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
        );


      let jobs = [];


      /*
      ====================================
      VISA / SPONSORSHIP
      ====================================
      */

      if (
        type === "visa" ||
        type === "sponsorship" ||
        type === "visa sponsorship"
      ) {

        jobs =
          await getVisaJobs();

      }


      /*
      ====================================
      REMOTE
      ====================================
      */

      else {

        jobs =
          await getRemoteJobs(
            search
          );

      }


      res.json({

        success: true,

        count: jobs.length,

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
