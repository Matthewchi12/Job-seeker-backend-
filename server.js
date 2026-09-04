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
GENERAL REMOTE JOB SEARCHES
========================================
*/

const GENERAL_REMOTE_SEARCHES = [

  "remote",
  "work from home",
  "work from anywhere",
  "worldwide remote",
  "international remote",
  "remote Nigeria",
  "remote Africa",

  // Customer service
  "customer service remote",
  "customer support remote",
  "support specialist remote",
  "customer success remote",
  "call center remote",

  // Virtual assistance
  "virtual assistant remote",
  "virtual assistant Nigeria",
  "administrative assistant remote",
  "personal assistant remote",

  // Data
  "data entry remote",
  "data analyst remote",
  "data analysis remote",
  "data annotation remote",
  "data labeling remote",
  "research assistant remote",
  "research remote",

  // Sales
  "sales remote",
  "sales representative remote",
  "business development remote",
  "account manager remote",

  // Marketing
  "digital marketing remote",
  "marketing remote",
  "social media remote",
  "social media manager remote",
  "content marketing remote",

  // Writing
  "writer remote",
  "content writer remote",
  "copywriter remote",
  "technical writer remote",
  "editor remote",

  // Design
  "graphic designer remote",
  "graphic design remote",
  "UI designer remote",
  "UX designer remote",
  "product designer remote",

  // Technology
  "software developer remote",
  "software engineer remote",
  "web developer remote",
  "frontend developer remote",
  "backend developer remote",
  "full stack developer remote",
  "javascript developer remote",
  "react developer remote",
  "python developer remote",

  // IT
  "IT support remote",
  "IT specialist remote",
  "technical support remote",
  "cybersecurity remote",
  "cloud engineer remote",
  "DevOps remote",

  // Finance
  "accounting remote",
  "accountant remote",
  "bookkeeper remote",
  "finance remote",

  // HR
  "human resources remote",
  "HR remote",
  "recruiter remote",
  "recruitment remote",

  // Management
  "project manager remote",
  "product manager remote",
  "operations remote",
  "operations manager remote",

  // AI
  "AI trainer remote",
  "AI evaluator remote",
  "AI data remote",
  "machine learning remote",
  "AI specialist remote",

  // Education
  "online teacher remote",
  "online tutor remote",
  "teacher remote",
  "tutor remote",

  // Healthcare
  "healthcare remote",
  "medical remote",
  "medical writer remote",
  "healthcare support remote",

  // Translation
  "translator remote",
  "translation remote"
];


/*
========================================
REMOTE JOB CHECK
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

  const remoteSignals = [

    "remote",
    "work from home",
    "work-from-home",
    "work from anywhere",
    "work-from-anywhere",
    "home based",
    "home-based",
    "fully remote",
    "100% remote",
    "virtual",
    "telecommute",
    "telecommuting"

  ];

  return remoteSignals.some(
    signal => text.includes(signal)
  );
}


/*
========================================
NIGERIA / AFRICA FRIENDLY REMOTE JOB
========================================

A job must:

1. Actually be remote.

2. NOT contain obvious country restrictions.

3. Have strong evidence that applicants
   can work from:

   - Nigeria
   - Africa
   - Worldwide / anywhere

Generic "remote" jobs are NOT accepted.
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
    String(job?.description || "").toLowerCase();

  const text =
    `${title} ${location} ${description}`;


  /*
  ========================================
  1. MUST ACTUALLY BE REMOTE
  ========================================
  */

  if (!isRemoteJob(job)) {
    return false;
  }


  /*
  ========================================
  2. HARD COUNTRY RESTRICTIONS
  ========================================

  These are rejected immediately.
  ========================================
  */

  const restrictions = [

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


    // UK

    "uk only",
    "u.k. only",

    "uk residents only",
    "u.k. residents only",

    "uk residents",
    "u.k. residents",

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


    // Canada

    "canada only",
    "canadian only",

    "canadian residents only",
    "canada residents only",

    "canada residents",

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


    // New Zealand

    "new zealand only",
    "new zealand residents only",
    "new zealand residents",

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


    // Individual countries

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
    "residents of india only",


    // Remote location restrictions

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
    "remote, ireland"

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
  3. NIGERIA SIGNALS
  ========================================
  */

  const nigeriaSignals = [

    "remote nigeria",
    "remote - nigeria",
    "remote, nigeria",

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


  if (
    nigeriaSignals.some(
      signal => text.includes(signal)
    )
  ) {
    return true;
  }


  /*
  ========================================
  4. AFRICA SIGNALS
  ========================================

  These indicate that the employer accepts
  remote workers from Africa.

  We deliberately DO NOT use just
  "africa" or "african" because a job may
  merely mention Africa in its description.
  ========================================
  */

  const africaSignals = [

    "remote africa",
    "remote - africa",
    "remote, africa",

    "remote from africa",

    "work from africa",
    "work-from-africa",

    "working from africa",

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


  if (
    africaSignals.some(
      signal => text.includes(signal)
    )
  ) {
    return true;
  }


  /*
  ========================================
  5. WORLDWIDE REMOTE SIGNALS
  ========================================

  Worldwide means someone in Nigeria can
  potentially work from Nigeria.

  We DO NOT accept weak phrases such as:

  "global team"
  "distributed team"
  "international company"

  because those do not prove that Nigerians
  can apply.
  ========================================
  */

  const worldwideSignals = [

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


  if (
    worldwideSignals.some(
      signal => text.includes(signal)
    )
  ) {
    return true;
  }


  /*
  ========================================
  6. GENERIC REMOTE = REJECT
  ========================================

  Example:

  "Remote"
  "Work from home"
  "Remote - London"
  "Remote - Orlando"

  Without Nigeria/Africa/worldwide evidence,
  it is rejected.
  ========================================
  */

  return false;
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

  if (!ADZUNA_APP_ID || !ADZUNA_APP_KEY) {

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
GET NIGERIA / AFRICA FRIENDLY
REMOTE JOBS
========================================
*/

async function getRemoteJobs(search = "") {

  let searches = [];


  /*
  ========================================
  USER SEARCH
  ========================================
  */

  if (search && search.trim()) {

    const userSearch =
      search.trim();


    searches = [

      `${userSearch} remote Nigeria`,

      `${userSearch} remote Africa`,

      `${userSearch} worldwide remote`,

      `${userSearch} work from anywhere`,

      `${userSearch} international applicants`,

      `${userSearch} remote`

    ];

  } else {

    /*
    ========================================
    DEFAULT BROAD SEARCH
    ========================================
    */

    searches = [

      "remote Nigeria",
      "remote Africa",
      "worldwide remote",
      "work from anywhere",

      // Customer service
      "customer service remote",
      "customer support remote",

      // Virtual assistant
      "virtual assistant remote",

      // Data
      "data entry remote",
      "data analyst remote",
      "data annotation remote",
      "research assistant remote",

      // Sales
      "sales remote",
      "sales representative remote",

      // Marketing
      "marketing remote",
      "social media remote",

      // Writing
      "writer remote",
      "content writer remote",

      // Design
      "graphic designer remote",

      // Technology
      "software developer remote",
      "software engineer remote",
      "web developer remote",
      "frontend developer remote",
      "backend developer remote",
      "full stack developer remote",

      // IT
      "IT support remote",
      "technical support remote",
      "cybersecurity remote",

      // Finance
      "accounting remote",
      "accountant remote",
      "bookkeeper remote",

      // HR
      "HR remote",
      "recruiter remote",

      // Management
      "project manager remote",
      "operations remote",

      // AI
      "AI trainer remote",
      "AI evaluator remote",
      "machine learning remote",

      // Education
      "online teacher remote",
      "online tutor remote",

      // Healthcare
      "healthcare remote",
      "medical writer remote",

      // Translation
      "translator remote"

    ];
  }


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
    `Nigeria/Africa-friendly remote jobs: ${filteredJobs.length}`
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

Examples:

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
