// ========================================
// INTERNATIONAL REMOTE JOBS BACKEND
//
// FOR NIGERIANS
//
// SOURCES:
// 1. Himalayas
// 2. Hunter (optional email enrichment)
//
// IMPORTANT:
// - Nigeria jobs
// - Worldwide remote jobs
// - Visa sponsorship jobs
// - Never invent emails
// ========================================

const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 10000;


// ========================================
// API
// ========================================

const HIMALAYAS_SEARCH_API =
  "https://himalayas.app/jobs/api/search";

const HUNTER_API =
  "https://api.hunter.io/v2";


// ========================================
// CACHE
// ========================================

const cache = new Map();

const CACHE_TIME =
  30 * 60 * 1000;


// ========================================
// FETCH HELPER
// ========================================

async function fetchJson(url) {

  const response = await fetch(url);

  if (!response.ok) {

    throw new Error(
      `HTTP ${response.status}`
    );

  }

  return await response.json();

}


// ========================================
// CLEAN HTML
// ========================================

function cleanHtml(html = "") {

  return String(html)

    .replace(
      /<script[^>]*>[\s\S]*?<\/script>/gi,
      ""
    )

    .replace(
      /<style[^>]*>[\s\S]*?<\/style>/gi,
      ""
    )

    .replace(
      /<[^>]+>/g,
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
      /&lt;/gi,
      "<"
    )

    .replace(
      /&gt;/gi,
      ">"
    )

    .replace(
      /&#39;/gi,
      "'"
    )

    .replace(
      /&quot;/gi,
      '"'
    )

    .replace(
      /\s+/g,
      " "
    )

    .trim();

}


// ========================================
// JOB TEXT
// ========================================

function getJobText(job) {

  return cleanHtml(

    `${job.title || ""} ` +
    `${job.excerpt || ""} ` +
    `${job.description || ""} ` +
    `${Array.isArray(job.categories)
      ? job.categories.join(" ")
      : ""} ` +
    `${Array.isArray(job.parentCategories)
      ? job.parentCategories.join(" ")
      : ""}`

  ).toLowerCase();

}


// ========================================
// LOCATION
// ========================================

function getLocations(job) {

  return Array.isArray(
    job.locationRestrictions
  )
    ? job.locationRestrictions
    : [];

}


// ========================================
// IS NIGERIA ELIGIBLE?
// ========================================

function isNigeriaEligible(job) {

  const locations =
    getLocations(job);

  // Empty means worldwide
  if (
    locations.length === 0
  ) {

    return {
      eligible: true,
      reason: "worldwide"
    };

  }


  const nigeria =
    locations.some(location => {

      const alpha2 =
        String(
          location?.alpha2 || ""
        ).toLowerCase();

      const name =
        String(
          location?.name || ""
        ).toLowerCase();

      const slug =
        String(
          location?.slug || ""
        ).toLowerCase();

      return (
        alpha2 === "ng" ||
        name === "nigeria" ||
        slug === "nigeria"
      );

    });


  if (nigeria) {

    return {
      eligible: true,
      reason: "nigeria"
    };

  }


  // Africa-wide jobs
  const africa =
    locations.some(location => {

      const name =
        String(
          location?.name || ""
        ).toLowerCase();

      const slug =
        String(
          location?.slug || ""
        ).toLowerCase();

      return (
        name === "africa" ||
        slug === "africa"
      );

    });


  if (africa) {

    return {
      eligible: true,
      reason: "africa"
    };

  }


  return {
    eligible: false,
    reason: "other_country"
  };

}


// ========================================
// REMOTE CHECK
// ========================================

function isRemote(job) {

  const text =
    getJobText(job);

  const badTerms = [

    "on-site only",
    "onsite only",
    "on site only",

    "office based only",
    "office-based only",

    "must work on site",
    "must work onsite",

    "must work in the office",

    "fully onsite",
    "fully on-site",

    "in-office only",
    "in office only"

  ];


  const found =
    badTerms.some(
      term =>
        text.includes(term)
    );


  return !found;

}


// ========================================
// FOREIGN ONLY
// ========================================

function isForeignOnly(job) {

  const text =
    getJobText(job);


  const badTerms = [

    "us residents only",
    "usa residents only",

    "uk residents only",

    "canada residents only",

    "australia residents only",

    "united states residents only",

    "must be located in the united states",

    "must be located in the us",

    "must be located in the usa",

    "must reside in the united states",

    "must reside in the us",

    "must reside in the usa",

    "must be based in the united states",

    "must be based in the us",

    "must be based in the usa"

  ];


  return badTerms.some(
    term =>
      text.includes(term)
  );

}


// ========================================
// SEARCH HIMALAYAS
// ========================================

async function searchHimalayas({
  search = "",
  country = "",
  worldwide = false,
  page = 1
}) {

  const url =
    new URL(
      HIMALAYAS_SEARCH_API
    );


  if (search) {

    url.searchParams.set(
      "q",
      search
    );

  }


  if (country) {

    url.searchParams.set(
      "country",
      country
    );

  }


  if (worldwide) {

    url.searchParams.set(
      "worldwide",
      "true"
    );

  }


  url.searchParams.set(
    "sort",
    "recent"
  );


  url.searchParams.set(
    "page",
    String(page)
  );


  console.log(
    "Himalayas request:",
    url.toString()
  );


  const data =
    await fetchJson(
      url.toString()
    );


  return {

    jobs:
      Array.isArray(data.jobs)
        ? data.jobs
        : [],

    totalCount:
      Number(
        data.totalCount || 0
      )

  };

}


// ========================================
// GET NIGERIA + WORLDWIDE JOBS
// ========================================

async function getRemoteJobs(
  search = "",
  page = 1
) {

  const cacheKey =
    `remote:${search}:${page}`;


  const cached =
    cache.get(
      cacheKey
    );


  if (
    cached &&
    Date.now() - cached.time <
      CACHE_TIME
  ) {

    return cached.data;

  }


  let nigeriaJobs = [];
  let worldwideJobs = [];

  let nigeriaTotal = 0;
  let worldwideTotal = 0;


  try {

    // ========================================
    // NIGERIA
    // ========================================

    const nigeria =
      await searchHimalayas({

        search,

        country:
          "NG",

        worldwide:
          false,

        page

      });


    nigeriaJobs =
      nigeria.jobs;

    nigeriaTotal =
      nigeria.totalCount;


  } catch (error) {

    console.error(
      "Nigeria search failed:",
      error.message
    );

  }


  // ========================================
  // WORLDWIDE
  // ========================================

  try {

    const worldwide =
      await searchHimalayas({

        search,

        country:
          "",

        worldwide:
          true,

        page

      });


    worldwideJobs =
      worldwide.jobs;

    worldwideTotal =
      worldwide.totalCount;


  } catch (error) {

    console.error(
      "Worldwide search failed:",
      error.message
    );

  }


  // ========================================
  // COMBINE
  // ========================================

  const combined = [

    ...nigeriaJobs,

    ...worldwideJobs

  ];


  // ========================================
  // DEDUPLICATE
  // ========================================

  const seen =
    new Set();


  const unique =
    combined.filter(job => {

      const key =
        job.guid ||
        job.applicationLink ||
        `${job.companySlug || ""}-${job.title || ""}`;


      if (
        seen.has(key)
      ) {

        return false;

      }


      seen.add(key);

      return true;

    });


  // ========================================
  // FILTER
  // ========================================

  const accepted = [];


  for (
    const job of unique
  ) {

    const location =
      isNigeriaEligible(
        job
      );


    if (
      !location.eligible
    ) {

      continue;

    }


    if (
      !isRemote(job)
    ) {

      continue;

    }


    if (
      isForeignOnly(job)
    ) {

      continue;

    }


    accepted.push(
      job
    );

  }


  // ========================================
  // FORMAT
  // ========================================

  const formatted =
    accepted.map(
      job =>
        formatJob(
          job,
          false
        )
    );


  const result = {

    jobs:
      formatted,

    totalNigeria:
      nigeriaTotal,

    totalWorldwide:
      worldwideTotal,

    total:
      formatted.length

  };


  cache.set(
    cacheKey,
    {

      time:
        Date.now(),

      data:
        result

    }
  );


  return result;

}


// ========================================
// EMAIL EXTRACTION
// ========================================

function extractEmails(job) {

  const text =
    cleanHtml(

      `${job.description || ""} ` +
      `${job.excerpt || ""}`

    );


  const matches =
    text.match(
      /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi
    ) || [];


  return [
    ...new Set(
      matches.map(
        email =>
          email.toLowerCase()
      )
    )
  ];

}


// ========================================
// URL EXTRACTION
// ========================================

function extractUrls(job) {

  const text =
    `${job.description || ""} ${job.excerpt || ""}`;


  const matches =
    text.match(
      /https?:\/\/[^\s"'<>]+/gi
    ) || [];


  return [
    ...new Set(

      matches

        .map(
          url =>
            url.replace(
              /[),.;]+$/,
              ""
            )
        )

        .filter(url => {

          try {

            const host =
              new URL(
                url
              )
              .hostname
              .toLowerCase();


            return (

              !host.includes(
                "himalayas.app"
              ) &&

              !host.includes(
                "linkedin.com"
              ) &&

              !host.includes(
                "indeed.com"
              )

            );

          } catch {

            return false;

          }

        })

    )
  ];

}


// ========================================
// APPLICATION
// ========================================

function getApplication(job) {

  const emails =
    extractEmails(job);


  const urls =
    extractUrls(job);


  const applicationLink =
    String(
      job.applicationLink || ""
    ).trim();


  if (
    emails.length
  ) {

    return {

      type:
        "email",

      email:
        emails[0],

      url:
        applicationLink ||
        urls[0] ||
        ""

    };

  }


  if (
    applicationLink
  ) {

    return {

      type:
        "application_link",

      email:
        "",

      url:
        applicationLink

    };

  }


  if (
    urls.length
  ) {

    return {

      type:
        "company_website",

      email:
        "",

      url:
        urls[0]

    };

  }


  return {

    type:
      "application_only",

    email:
      "",

    url:
      ""

  };

}


// ========================================
// COMPANY DOMAIN
// ========================================

function getCompanyDomain(job) {

  const urls =
    extractUrls(job);


  for (
    const url of urls
  ) {

    try {

      const host =
        new URL(
          url
        )
        .hostname
        .toLowerCase()
        .replace(
          /^www\./,
          ""
        );


      if (
        host &&
        !host.includes(
          "himalayas.app"
        )
      ) {

        return host;

      }

    } catch {}

  }


  return "";

}


// ========================================
// HUNTER
// ========================================

async function findCompanyEmail(job) {

  const apiKey =
    process.env.HUNTER_API_KEY;


  if (
    !apiKey
  ) {

    return {

      found:
        false,

      email:
        "",

      name:
        "",

      position:
        "",

      domain:
        ""

    };

  }


  const domain =
    getCompanyDomain(job);


  if (
    !domain
  ) {

    return {

      found:
        false,

      email:
        "",

      name:
        "",

      position:
        "",

      domain:
        ""

    };

  }


  const cacheKey =
    `hunter:${domain}`;


  const cached =
    cache.get(
      cacheKey
    );


  if (
    cached &&
    Date.now() - cached.time <
      24 * 60 * 60 * 1000
  ) {

    return cached.data;

  }


  try {

    const url =
      new URL(
        `${HUNTER_API}/domain-search`
      );


    url.searchParams.set(
      "domain",
      domain
    );


    url.searchParams.set(
      "api_key",
      apiKey
    );


    url.searchParams.set(
      "limit",
      "10"
    );


    const data =
      await fetchJson(
        url.toString()
      );


    const emails =
      data?.data?.emails || [];


    if (
      !emails.length
    ) {

      return {

        found:
          false,

        email:
          "",

        name:
          "",

        position:
          "",

        domain

      };

    }


    const scored =
      emails.map(
        person => {

          const email =
            String(
              person.value || ""
            ).toLowerCase();


          const position =
            String(
              person.position || ""
            ).toLowerCase();


          let score =
            Number(
              person.confidence || 0
            );


          if (
            /^(hr|careers|career|jobs|recruiting|recruitment|talent|hiring|people|info|contact)@/i
              .test(email)
          ) {

            score += 100;

          }


          if (
            /hr|human resources|recruit|recruiting|recruitment|talent|hiring|people|talent acquisition/
              .test(position)
          ) {

            score += 80;

          }


          return {

            ...person,

            score

          };

        }
      );


    scored.sort(
      (
        a,
        b
      ) =>
        b.score -
        a.score
    );


    const best =
      scored[0];


    const result = {

      found:
        Boolean(
          best?.value
        ),

      email:
        best?.value || "",

      name:
        [
          best?.first_name,
          best?.last_name
        ]
          .filter(Boolean)
          .join(" "),

      position:
        best?.position || "",

      domain

    };


    cache.set(
      cacheKey,
      {

        time:
          Date.now(),

        data:
          result

      }
    );


    return result;

  } catch (error) {

    console.error(
      "Hunter failed:",
      error.message
    );


    return {

      found:
        false,

      email:
        "",

      name:
        "",

      position:
        "",

      domain

    };

  }

}


// ========================================
// JOB CATEGORY
// ========================================

function getJobType(job) {

  const text =
    getJobText(job);


  if (
    /customer support|customer service|customer care|chat support|live chat|help desk/
      .test(text)
  ) {

    return "Customer Service";

  }


  if (
    /sales|business development|appointment setter|lead generation/
      .test(text)
  ) {

    return "Sales";

  }


  if (
    /virtual assistant|administrative assistant|executive assistant|personal assistant/
      .test(text)
  ) {

    return "Virtual Assistant";

  }


  if (
    /data entry|data processing/
      .test(text)
  ) {

    return "Data Entry";

  }


  if (
    /data annotation|data labeling|ai trainer|ai evaluator|ai rater/
      .test(text)
  ) {

    return "AI & Data Annotation";

  }


  if (
    /social media|community manager/
      .test(text)
  ) {

    return "Social Media";

  }


  if (
    /marketing|digital marketing|growth marketing/
      .test(text)
  ) {

    return "Marketing";

  }


  if (
    /content writer|content creator|copywriter|blog writer/
      .test(text)
  ) {

    return "Writing";

  }


  if (
    /graphic designer|graphic design|canva designer/
      .test(text)
  ) {

    return "Graphic Design";

  }


  if (
    /customer success|client success|customer experience/
      .test(text)
  ) {

    return "Customer Success";

  }


  if (
    /account manager|account management/
      .test(text)
  ) {

    return "Account Management";

  }


  if (
    /recruiter|recruitment|talent acquisition|human resources/
      .test(text)
  ) {

    return "Recruitment & HR";

  }


  if (
    /bookkeeper|bookkeeping|accounting|finance/
      .test(text)
  ) {

    return "Finance";

  }


  if (
    /ecommerce|e-commerce|shopify/
      .test(text)
  ) {

    return "E-commerce";

  }


  if (
    /research assistant|research analyst|research specialist/
      .test(text)
  ) {

    return "Research";

  }


  if (
    /online tutor|online teacher|tutor|teacher/
      .test(text)
  ) {

    return "Education";

  }


  if (
    /healthcare|medical writer|clinical research/
      .test(text)
  ) {

    return "Healthcare";

  }


  if (
    /project coordinator|project assistant|project manager/
      .test(text)
  ) {

    return "Project Management";

  }


  if (
    /web developer|frontend developer|front-end developer/
      .test(text)
  ) {

    return "Web Development";

  }


  if (
    /software developer|software engineer|programmer/
      .test(text)
  ) {

    return "Software Development";

  }


  return "Other Remote Job";

}


// ========================================
// SALARY
// ========================================

function formatSalary(job) {

  const min =
    job.minSalary;

  const max =
    job.maxSalary;


  if (
    min === null ||
    min === undefined
  ) {

    return "Salary not specified";

  }


  let result =
    `${job.currency || ""} ${Number(min).toLocaleString()}`;


  if (
    max !== null &&
    max !== undefined
  ) {

    result +=
      ` - ${Number(max).toLocaleString()}`;

  }


  if (
    job.salaryPeriod
  ) {

    result +=
      ` / ${job.salaryPeriod}`;

  }


  return result.trim();

}


// ========================================
// FORMAT JOB
// ========================================

function formatJob(
  job,
  visa = false
) {

  const restrictions =
    getLocations(job);


  let location =
    "Remote — Nigeria eligible";


  if (
    restrictions.length
  ) {

    const names =
      restrictions

        .map(
          item =>
            item?.name ||
            item?.alpha2 ||
            item?.slug ||
            ""
        )

        .filter(Boolean);


    if (
      names.length
    ) {

      location =
        `Remote — ${names.join(", ")}`;

    }

  }


  const application =
    getApplication(job);


  return {

    id:
      job.guid ||
      `${job.companySlug || "company"}-${job.title || "job"}`,

    title:
      job.title || "Remote Job",

    company:
      job.companyName ||
      "Company not specified",

    companySlug:
      job.companySlug || "",

    companyLogo:
      job.companyLogo || "",

    location,

    locationRestrictions:
      restrictions,

    timezoneRestrictions:
      Array.isArray(
        job.timezoneRestrictions
      )
        ? job.timezoneRestrictions
        : [],

    description:
      cleanHtml(
        job.description ||
        job.excerpt ||
        ""
      ),

    excerpt:
      cleanHtml(
        job.excerpt ||
        ""
      ),

    applyUrl:
      application.url || "",

    applyEmail:
      application.email || "",

    applyMethod:
      application.type,

    salary_min:
      job.minSalary ?? null,

    salary_max:
      job.maxSalary ?? null,

    salary_period:
      job.salaryPeriod || "",

    currency:
      job.currency || "",

    salary:
      formatSalary(job),

    employmentType:
      job.employmentType || "",

    type:
      job.employmentType ||
      "Full Time",

    seniority:
      Array.isArray(job.seniority)
        ? job.seniority.join(", ")
        : "",

    category:
      Array.isArray(job.categories)
        ? job.categories.join(", ")
        : "",

    parentCategory:
      Array.isArray(job.parentCategories)
        ? job.parentCategories.join(", ")
        : "",

    jobType:
      getJobType(job),

    remote:
      true,

    nigeriaFriendly:
      !visa,

    visaSponsorship:
      visa,

    created:
      job.pubDate
        ? new Date(
            job.pubDate
          ).toISOString()
        : "",

    expiryDate:
      job.expiryDate
        ? new Date(
            job.expiryDate
          ).toISOString()
        : "",

    source:
      "Himalayas",

    sourceUrl:
      "https://himalayas.app/",

    sourceNotice:
      "Job data sourced from Himalayas"

  };

}


// ========================================
// VISA JOBS
// ========================================

async function getVisaJobs(
  search = "",
  page = 1
) {

  const cacheKey =
    `visa:${search}:${page}`;


  const cached =
    cache.get(
      cacheKey
    );


  if (
    cached &&
    Date.now() - cached.time <
      CACHE_TIME
  ) {

    return cached.data;

  }


  const searches =
    search
      ? [search]
      : [

          "visa sponsorship",

          "visa sponsored",

          "work visa",

          "employer sponsorship",

          "work permit",

          "skilled worker",

          "sponsorship available"

        ];


  const allJobs = [];


  // IMPORTANT:
  // Run sequentially instead of Promise.all
  // to reduce rate-limit problems.

  for (
    const term of searches
  ) {

    try {

      const result =
        await searchHimalayas({

          search:
            term,

          country:
            "",

          worldwide:
            false,

          page

        });


      allJobs.push(
        ...result.jobs
      );


    } catch (error) {

      console.error(
        `Visa search failed for ${term}:`,
        error.message
      );

    }

  }


  // ========================================
  // DEDUPLICATE
  // ========================================

  const seen =
    new Set();


  const unique =
    allJobs.filter(job => {

      const key =
        job.guid ||
        job.applicationLink ||
        `${job.companySlug || ""}-${job.title || ""}`;


      if (
        seen.has(key)
      ) {

        return false;

      }


      seen.add(key);

      return true;

    });


  // ========================================
  // VISA FILTER
  // ========================================

  const strongVisa = [

    "visa sponsorship",

    "visa sponsored",

    "work visa sponsorship",

    "employer sponsorship",

    "employer sponsored",

    "work permit sponsorship",

    "work permit sponsored",

    "skilled worker sponsorship",

    "sponsorship available",

    "sponsor visa",

    "visa support",

    "immigration sponsorship",

    "will sponsor",

    "sponsor a work visa",

    "sponsorship provided",

    "visa assistance"

  ];


  const negativeVisa = [

    "no visa sponsorship",

    "no sponsorship",

    "visa sponsorship not available",

    "visa sponsorship unavailable",

    "we do not sponsor",

    "we don't sponsor",

    "cannot sponsor",

    "can't sponsor",

    "unable to sponsor",

    "not able to sponsor"

  ];


  const accepted =
    unique.filter(job => {

      const text =
        getJobText(job);


      const negative =
        negativeVisa.some(
          term =>
            text.includes(term)
        );


      if (
        negative
      ) {

        return false;

      }


      return strongVisa.some(
        term =>
          text.includes(term)
      );

    });


  const formatted =
    accepted
      .slice(0, 50)
      .map(
        job =>
          formatJob(
            job,
            true
          )
      );


  const result = {

    jobs:
      formatted,

    total:
      formatted.length

  };


  cache.set(
    cacheKey,
    {

      time:
        Date.now(),

      data:
        result

    }
  );


  return result;

}


// ========================================
// HOME
// ========================================

app.get(
  "/",
  (req, res) => {

    res.json({

      success:
        true,

      status:
        "online",

      message:
        "International Remote Jobs API is running",

      source:
        "Himalayas",

      hunter:
        process.env.HUNTER_API_KEY
          ? "enabled"
          : "disabled",

      endpoints: {

        remote:
          "/api/jobs/remote",

        search:
          "/api/jobs/remote?search=customer%20support",

        visa:
          "/api/jobs/visa",

        debug:
          "/api/jobs/remote/debug"

      }

    });

  }
);


// ========================================
// REMOTE
// ========================================

app.get(
  "/api/jobs/remote",
  async (
    req,
    res
  ) => {

    try {

      const search =
        String(
          req.query.search || ""
        ).trim();


      const page =
        Math.max(
          1,
          parseInt(
            req.query.page || "1",
            10
          )
        );


      const result =
        await getRemoteJobs(
          search,
          page
        );


      res.json({

        success:
          true,

        type:
          "international-remote",

        applicants:
          "Nigeria",

        count:
          result.jobs.length,

        totalNigeria:
          result.totalNigeria,

        totalWorldwide:
          result.totalWorldwide,

        page,

        jobs:
          result.jobs

      });

    } catch (error) {

      console.error(
        error
      );


      res.status(500).json({

        success:
          false,

        error:
          "Failed to fetch jobs",

        message:
          error.message

      });

    }

  }
);


// ========================================
// VISA
// ========================================

app.get(
  "/api/jobs/visa",
  async (
    req,
    res
  ) => {

    try {

      const search =
        String(
          req.query.search || ""
        ).trim();


      const page =
        Math.max(
          1,
          parseInt(
            req.query.page || "1",
            10
          )
        );


      const result =
        await getVisaJobs(
          search,
          page
        );


      res.json({

        success:
          true,

        type:
          "visa-sponsorship",

        applicants:
          "Nigeria",

        count:
          result.jobs.length,

        page,

        jobs:
          result.jobs

      });

    } catch (error) {

      console.error(
        error
      );


      res.status(500).json({

        success:
          false,

        error:
          "Failed to fetch visa jobs",

        message:
          error.message

      });

    }

  }
);


// ========================================
// DEBUG
// ========================================

app.get(
  "/api/jobs/remote/debug",
  async (
    req,
    res
  ) => {

    try {

      const search =
        String(
          req.query.search || ""
        ).trim();


      // Get raw Nigeria results
      const nigeria =
        await searchHimalayas({

          search,

          country:
            "NG",

          worldwide:
            false,

          page:
            1

        });


      // Get raw worldwide results
      const worldwide =
        await searchHimalayas({

          search,

          country:
            "",

          worldwide:
            true,

          page:
            1

        });


      const nigeriaChecks =
        nigeria.jobs.map(
          job => ({

            title:
              job.title,

            company:
              job.companyName,

            locationRestrictions:
              job.locationRestrictions,

            nigeria:
              isNigeriaEligible(job),

            remote:
              isRemote(job),

            foreignOnly:
              isForeignOnly(job)

          })
        );


      const worldwideChecks =
        worldwide.jobs.map(
          job => ({

            title:
              job.title,

            company:
              job.companyName,

            locationRestrictions:
              job.locationRestrictions,

            nigeria:
              isNigeriaEligible(job),

            remote:
              isRemote(job),

            foreignOnly:
              isForeignOnly(job)

          })
        );


      res.json({

        success:
          true,

        search,

        nigeriaRawCount:
          nigeria.jobs.length,

        nigeriaTotal:
          nigeria.totalCount,

        worldwideRawCount:
          worldwide.jobs.length,

        worldwideTotal:
          worldwide.totalCount,

        hunterEnabled:
          Boolean(
            process.env.HUNTER_API_KEY
          ),

        nigeriaJobs:
          nigeriaChecks,

        worldwideJobs:
          worldwideChecks

      });

    } catch (error) {

      res.status(500).json({

        success:
          false,

        error:
          error.message

      });

    }

  }
);


// ========================================
// TEST HIMALAYAS
// ========================================

app.get(
  "/api/test-himalayas",
  async (
    req,
    res
  ) => {

    try {

      const result =
        await searchHimalayas({

          search:
            "",

          country:
            "NG",

          worldwide:
            false,

          page:
            1

        });


      res.json({

        success:
          true,

        total:
          result.totalCount,

        returned:
          result.jobs.length,

        jobs:
          result.jobs.slice(
            0,
            10
          ).map(
            job => ({

              title:
                job.title,

              company:
                job.companyName,

              location:
                job.locationRestrictions,

              application:
                job.applicationLink

            })
          )

      });

    } catch (error) {

      res.status(500).json({

        success:
          false,

        error:
          error.message

      });

    }

  }
);


// ========================================
// START
// ========================================

app.listen(
  PORT,
  () => {

    console.log(
      `Server running on port ${PORT}`
    );

    console.log(
      `Hunter: ${
        process.env.HUNTER_API_KEY
          ? "ENABLED"
          : "DISABLED"
      }`
    );

  }
);
