// ========================================
// INTERNATIONAL REMOTE JOBS BACKEND
//
// PURPOSE:
//
// 1. INTERNATIONAL REMOTE JOBS
//    THAT A PERSON IN NIGERIA CAN DO
//    FROM NIGERIA
//
// 2. VISA SPONSORSHIP JOBS
//
// SOURCE: HIMALAYAS API
// ========================================

const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 10000;


// ========================================
// HIMALAYAS API
// ========================================

const HIMALAYAS_API =
  "https://himalayas.app/jobs/api/search";


// ========================================
// CACHE
// ========================================

const cache = new Map();

const CACHE_TIME =
  30 * 60 * 1000;


// ========================================
// REMOTE JOB SEARCHES
// ========================================

const JOB_SEARCHES = [

  // CUSTOMER SERVICE
  "customer service",
  "customer service representative",
  "customer support",
  "customer support specialist",
  "customer care",
  "customer care representative",
  "client support",
  "client services",
  "support specialist",
  "support representative",
  "chat support",
  "live chat support",
  "email support",
  "call center",
  "call centre",
  "help desk",

  // SALES
  "sales specialist",
  "sales representative",
  "sales associate",
  "sales executive",
  "inside sales",
  "sales support",
  "business development",
  "business development representative",
  "account executive",
  "appointment setter",
  "lead generation",

  // VIRTUAL ASSISTANT
  "virtual assistant",
  "virtual administrative assistant",
  "administrative assistant",
  "administrative support",
  "executive assistant",
  "personal assistant",
  "remote assistant",
  "office assistant",

  // DATA ENTRY
  "data entry",
  "data entry specialist",
  "data entry clerk",
  "data processing",
  "data specialist",

  // OPERATIONS
  "operations assistant",
  "operations specialist",
  "operations coordinator",
  "operations",
  "order processing",
  "order management",

  // MARKETING
  "marketing",
  "marketing assistant",
  "marketing specialist",
  "digital marketing",
  "marketing coordinator",
  "growth marketing",

  // SOCIAL MEDIA
  "social media",
  "social media assistant",
  "social media specialist",
  "social media manager",
  "community manager",

  // WRITING
  "content writer",
  "content writing",
  "content creator",
  "copywriter",
  "copywriting",
  "blog writer",
  "technical writer",
  "writer",

  // GRAPHIC DESIGN
  "graphic designer",
  "graphic design",
  "Canva designer",
  "visual designer",
  "creative designer",
  "social media designer",

  // CUSTOMER SUCCESS
  "customer success",
  "customer success specialist",
  "client success",
  "customer experience",

  // ACCOUNT MANAGEMENT
  "account manager",
  "account management",
  "client manager",
  "client relationship manager",

  // RECRUITMENT / HR
  "recruiter",
  "recruitment specialist",
  "talent acquisition",
  "HR assistant",
  "human resources",
  "HR coordinator",

  // FINANCE
  "bookkeeper",
  "bookkeeping",
  "accounting assistant",
  "accounts assistant",
  "finance assistant",
  "accounting",
  "accounts payable",
  "accounts receivable",

  // E-COMMERCE
  "ecommerce",
  "ecommerce assistant",
  "ecommerce specialist",
  "ecommerce manager",
  "shopify assistant",
  "online store assistant",

  // RESEARCH
  "research assistant",
  "research specialist",
  "research analyst",

  // AI
  "AI data annotation",
  "data annotation",
  "AI trainer",
  "AI evaluator",
  "AI rater",
  "data labeling",
  "data labeling specialist",

  // EDUCATION
  "online tutor",
  "online teacher",
  "tutor",
  "teacher",
  "education assistant",

  // HEALTHCARE
  "healthcare",
  "medical assistant",
  "medical writer",
  "clinical research",
  "healthcare assistant",

  // PROJECT / BUSINESS
  "project coordinator",
  "project assistant",
  "project manager",
  "business operations",
  "business assistant",

  // SMALL AMOUNT OF TECH
  "web developer",
  "software developer"

];


// ========================================
// VISA SEARCHES
// ========================================

const VISA_SEARCHES = [

  "visa sponsorship",
  "visa sponsored",
  "visa sponsorship available",
  "work visa sponsorship",
  "employer sponsorship",
  "employer sponsored",
  "work permit sponsorship",
  "work permit sponsored",
  "skilled worker visa",
  "skilled worker sponsorship",
  "sponsorship available",
  "sponsor visa",
  "visa support",
  "immigration sponsorship",
  "work authorization sponsorship"

];


// ========================================
// STRONG VISA TERMS
// ========================================

const STRONG_VISA_KEYWORDS = [

  "visa sponsorship",
  "visa sponsored",
  "visa sponsorship available",
  "work visa sponsorship",
  "employer sponsorship",
  "employer sponsored",
  "work permit sponsorship",
  "work permit sponsored",
  "skilled worker visa",
  "skilled worker sponsorship",
  "sponsorship available",
  "sponsor visa",
  "visa support",
  "immigration sponsorship",
  "work authorization sponsorship",
  "will sponsor",
  "sponsor a work visa",
  "sponsorship provided",
  "visa assistance"

];


// ========================================
// VISA NEGATIVE TERMS
// ========================================

const VISA_NEGATIVE_KEYWORDS = [

  "no visa sponsorship",
  "no sponsorship",
  "visa sponsorship not available",
  "visa sponsorship unavailable",
  "we do not sponsor",
  "we don't sponsor",
  "cannot sponsor",
  "can't sponsor",
  "unable to sponsor",
  "not able to sponsor",
  "without sponsorship",
  "must have the right to work",
  "must already have the right to work",
  "must be authorized to work",
  "must already be authorized to work",
  "visa sponsorship is not available"

];


// ========================================
// REMOTE NEGATIVE TERMS
// ========================================
//
// We DO NOT require the word "remote".
//
// Himalayas itself is a remote-jobs API.
//
// We only reject jobs that clearly say
// they are not remote.
// ========================================

const REMOTE_NEGATIVE_TERMS = [

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


// ========================================
// COUNTRY RESTRICTION PATTERNS
// ========================================
//
// These are used to detect situations where
// the description clearly restricts applicants
// to another country.
//
// Example:
//
// "Must be based in the United States"
//
// = REJECT
//
// "Must be based in Nigeria"
//
// = ACCEPT
// ========================================

const COUNTRY_RESTRICTION_PATTERNS = [

  /\bmust be based in\b/gi,
  /\bmust reside in\b/gi,
  /\bmust live in\b/gi,
  /\bonly open to candidates in\b/gi,
  /\bonly available to candidates in\b/gi,
  /\bonly applicants from\b/gi,
  /\bonly hiring in\b/gi,
  /\bavailable only in\b/gi,
  /\bresidents of\b/gi,
  /\bresident of\b/gi,
  /\bcandidates must be located in\b/gi,
  /\bcandidates must reside in\b/gi,
  /\bapplicants must be located in\b/gi,
  /\bus residents only\b/gi,
  /\buk residents only\b/gi,
  /\bcanada residents only\b/gi,
  /\baustralia residents only\b/gi,
  /\beurope residents only\b/gi

];


// ========================================
// EXPLICIT FOREIGN-ONLY PHRASES
// ========================================

const FOREIGN_ONLY_TERMS = [

  "us only",
  "usa only",
  "united states only",
  "u.s. only",
  "uk only",
  "united kingdom only",
  "canada only",
  "australia only",
  "europe only",

  "must be located in the united states",
  "must be located in the us",
  "must be located in the usa",

  "must be based in the united states",
  "must be based in the us",
  "must be based in the usa",

  "must reside in the united states",
  "must reside in the us",
  "must reside in the usa",

  "us residents only",
  "usa residents only",
  "uk residents only",
  "canada residents only",
  "australia residents only"

];


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
// GET JOB TEXT
// ========================================

function getJobText(job) {

  return (

    `${job.title || ""} ` +
    `${job.description || ""} ` +
    `${job.excerpt || ""} ` +

    `${
      Array.isArray(job.categories)
        ? job.categories.join(" ")
        : ""
    } ` +

    `${
      Array.isArray(job.parentCategories)
        ? job.parentCategories.join(" ")
        : ""
    }`

  ).toLowerCase();

}


// ========================================
// LOCATION RESTRICTIONS
// ========================================

function getLocationRestrictions(job) {

  return Array.isArray(
    job?.locationRestrictions
  )
    ? job.locationRestrictions
    : [];

}


// ========================================
// TIMEZONE RESTRICTIONS
// ========================================

function getTimezoneRestrictions(job) {

  return Array.isArray(
    job?.timezoneRestrictions
  )
    ? job.timezoneRestrictions
    : [];

}


// ========================================
// CHECK LOCATION
// ========================================
//
// IMPORTANT:
//
// We are NOT saying:
//
// "Nigeria must appear"
//
// Instead:
//
// - Worldwide = ACCEPT
// - Nigeria = ACCEPT
// - Africa = ACCEPT if no conflicting restriction
// - Other countries = reject ONLY when the
//   listing explicitly requires that location
//
// This is because a worldwide remote job has
// no location restriction and can be worked
// from Nigeria.
// ========================================

function checkNigeriaLocation(job) {

  const restrictions =
    getLocationRestrictions(job);


  // ========================================
  // WORLDWIDE
  // ========================================

  if (
    restrictions.length === 0
  ) {

    return {

      accepted: true,

      reason:
        "worldwide_no_location_restriction"

    };

  }


  const locations =
    restrictions.map(
      location => ({

        alpha2:
          String(
            location?.alpha2 || ""
          )
          .toLowerCase()
          .trim(),

        name:
          String(
            location?.name || ""
          )
          .toLowerCase()
          .trim(),

        slug:
          String(
            location?.slug || ""
          )
          .toLowerCase()
          .trim()

      })
    );


  // ========================================
  // NIGERIA
  // ========================================

  const nigeria =
    locations.some(
      location =>

        location.alpha2 === "ng" ||

        location.name === "nigeria" ||

        location.slug === "nigeria"

    );


  if (
    nigeria
  ) {

    return {

      accepted: true,

      reason:
        "nigeria_explicitly_allowed"

    };

  }


  // ========================================
  // AFRICA
  // ========================================

  const africa =
    locations.some(
      location =>

        location.name === "africa" ||

        location.slug === "africa"

    );


  if (
    africa
  ) {

    return {

      accepted: true,

      reason:
        "africa_region_allowed"

    };

  }


  // ========================================
  // OTHER COUNTRIES
  //
  // Example:
  //
  // United States
  // United Kingdom
  //
  // These are assumed restricted because
  // Himalayas says locationRestrictions are
  // countries where candidates must be based.
  // ========================================

  return {

    accepted: false,

    reason:
      "restricted_to_other_location"

  };

}


// ========================================
// CHECK TIMEZONE
// ========================================
//
// Nigeria = UTC+1.
//
// Empty timezone restrictions means the
// company does not restrict timezone.
//
// If timezone restrictions exist, we only
// reject when Nigeria clearly cannot overlap.
// ========================================

function normalizeTimezone(value) {

  return String(
    value || ""
  )
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "")
    .replace("utc", "")
    .replace("gmt", "")
    .replace(":00", "");

}


function checkNigeriaTimezone(job) {

  const timezones =
    getTimezoneRestrictions(job);


  // ========================================
  // NO TIMEZONE RESTRICTION
  // ========================================

  if (
    timezones.length === 0
  ) {

    return {

      accepted: true,

      reason:
        "all_timezones_allowed"

    };

  }


  const nigeriaAllowed =
    timezones.some(
      timezone => {

        const value =
          normalizeTimezone(
            timezone
          );

        return (

          value === "1" ||

          value === "+1" ||

          value === "01" ||

          value === "+01" ||

          value === "1:00" ||

          value === "+1:00" ||

          value === "01:00" ||

          value === "+01:00"

        );

      }
    );


  if (
    nigeriaAllowed
  ) {

    return {

      accepted: true,

      reason:
        "nigeria_timezone_allowed"

    };

  }


  // ========================================
  // TIMEZONE RESTRICTION EXISTS BUT WE
  // CANNOT CONFIRM IT EXCLUDES NIGERIA.
  //
  // Do not aggressively delete the job.
  // ========================================

  return {

    accepted: true,

    reason:
      "timezone_restriction_not_confirmed_conflict"

  };

}


// ========================================
// CHECK REMOTE
// ========================================
//
// Himalayas is a remote jobs API.
//
// Therefore we DO NOT require:
//
// "remote"
// "work from home"
//
// in the description.
//
// We only reject obvious on-site-only jobs.
// ========================================

function checkExplicitRemote(job) {

  const text =
    getJobText(job);


  const hasNegative =
    REMOTE_NEGATIVE_TERMS.some(
      term =>
        text.includes(term)
    );


  if (
    hasNegative
  ) {

    return {

      accepted: false,

      reason:
        "onsite_only"

    };

  }


  return {

    accepted: true,

    reason:
      "himalayas_remote_listing"

  };

}


// ========================================
// CHECK DESCRIPTION COUNTRY RESTRICTION
// ========================================

function checkRemoteDescription(job) {

  const text =
    getJobText(job);


  // ========================================
  // FOREIGN ONLY TERMS
  // ========================================

  const foreignOnly =
    FOREIGN_ONLY_TERMS.some(
      term =>
        text.includes(term)
    );


  if (
    foreignOnly
  ) {

    return {

      accepted: false,

      reason:
        "foreign_country_only"

    };

  }


  // ========================================
  // COUNTRY RESTRICTION PATTERNS
  // ========================================

  for (
    const pattern of
    COUNTRY_RESTRICTION_PATTERNS
  ) {

    const matches =
      text.match(
        pattern
      );


    if (
      !matches
    ) {

      continue;

    }


    for (
      const match of matches
    ) {

      const index =
        text.indexOf(
          match
        );


      const nearby =
        text.substring(
          index,
          index + 300
        );


      // ========================================
      // NIGERIA ALLOWED
      // ========================================

      if (
        nearby.includes("nigeria") ||
        nearby.includes("nigerian")
      ) {

        continue;

      }


      // ========================================
      // OTHER LOCATION
      // ========================================

      return {

        accepted: false,

        reason:
          "description_location_restriction"

      };

    }

  }


  return {

    accepted: true,

    reason:
      "no_conflicting_location_description"

  };

}


// ========================================
// EXTRACT EMAILS
// ========================================

function extractEmails(job) {

  const text =
    cleanHtml(
      `${job.description || ""} ${job.excerpt || ""}`
    );


  const emails =
    text.match(
      /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi
    ) || [];


  return [
    ...new Set(
      emails.map(
        email =>
          email.toLowerCase()
      )
    )
  ];

}


// ========================================
// EXTRACT EXTERNAL URLS
// ========================================

function extractExternalUrls(job) {

  const text =
    `${job.description || ""} ${job.excerpt || ""}`;


  const urls =
    text.match(
      /https?:\/\/[^\s"'<>]+/gi
    ) || [];


  return [
    ...new Set(
      urls

        .map(
          url =>
            url.replace(
              /[),.;]+$/,
              ""
            )
        )

        .filter(
          url => {

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
                ) &&

                !host.includes(
                  "weworkremotely.com"
                )

              );

            } catch {

              return false;

            }

          }
        )
    )
  ];

}


// ========================================
// CHECK APPLICATION
// ========================================
//
// IMPORTANT:
//
// Application is NO LONGER a filter.
//
// We simply collect:
//
// 1. Email
// 2. External company URL
// 3. Himalayas application URL
//
// A job will NOT disappear just because
// an email is unavailable.
// ========================================

function getApplicationMethod(job) {

  const emails =
    extractEmails(job);


  const externalUrls =
    extractExternalUrls(job);


  const originalUrl =
    String(
      job.applicationLink ||
      ""
    ).trim();


  if (
    emails.length > 0
  ) {

    return {

      method:
        "Email",

      email:
        emails[0],

      url:
        externalUrls[0] ||
        originalUrl ||
        ""

    };

  }


  if (
    externalUrls.length > 0
  ) {

    return {

      method:
        "Company Website",

      email:
        "",

      url:
        externalUrls[0]

    };

  }


  if (
    originalUrl
  ) {

    return {

      method:
        "Application Link",

      email:
        "",

      url:
        originalUrl

    };

  }


  return {

    method:
      "No application link found",

    email:
      "",

    url:
      ""

  };

}


// ========================================
// FINAL REMOTE CHECK
// ========================================

function checkNigeriaFriendlyJob(job) {

  // ========================================
  // 1. LOCATION
  // ========================================

  const location =
    checkNigeriaLocation(
      job
    );


  if (
    !location.accepted
  ) {

    return {

      accepted: false,

      reason:
        location.reason

    };

  }


  // ========================================
  // 2. TIMEZONE
  // ========================================

  const timezone =
    checkNigeriaTimezone(
      job
    );


  if (
    !timezone.accepted
  ) {

    return {

      accepted: false,

      reason:
        timezone.reason

    };

  }


  // ========================================
  // 3. REMOTE
  // ========================================

  const remote =
    checkExplicitRemote(
      job
    );


  if (
    !remote.accepted
  ) {

    return {

      accepted: false,

      reason:
        remote.reason

    };

  }


  // ========================================
  // 4. DESCRIPTION
  // ========================================

  const description =
    checkRemoteDescription(
      job
    );


  if (
    !description.accepted
  ) {

    return {

      accepted: false,

      reason:
        description.reason

    };

  }


  // ========================================
  // APPLICATION
  //
  // NOT A FILTER.
  // ========================================

  const application =
    getApplicationMethod(
      job
    );


  // ========================================
  // ACCEPT
  // ========================================

  return {

    accepted: true,

    reason:
      "international_remote_job_nigeria_eligible",

    application

  };

}


// ========================================
// VISA SPONSORSHIP CHECK
// ========================================

function checkVisaSponsorship(job) {

  const text =
    getJobText(job);


  // ========================================
  // NEGATIVE
  // ========================================

  const hasNegative =
    VISA_NEGATIVE_KEYWORDS.some(
      keyword =>
        text.includes(
          keyword
        )
    );


  if (
    hasNegative
  ) {

    return {

      accepted: false,

      reason:
        "sponsorship_not_available",

      matchedKeywords: []

    };

  }


  // ========================================
  // STRONG TERMS
  // ========================================

  const matchedKeywords =
    STRONG_VISA_KEYWORDS.filter(
      keyword =>
        text.includes(
          keyword
        )
    );


  if (
    matchedKeywords.length === 0
  ) {

    return {

      accepted: false,

      reason:
        "no_clear_visa_sponsorship",

      matchedKeywords: []

    };

  }


  const application =
    getApplicationMethod(
      job
    );


  return {

    accepted: true,

    reason:
      "confirmed_sponsorship_language",

    matchedKeywords,

    application

  };

}


// ========================================
// SEARCH HIMALAYAS
// ========================================

async function searchHimalayas(
  search = "",
  page = 1,
  nigeriaOnly = true
) {

  try {

    const url =
      new URL(
        HIMALAYAS_API
      );


    // ========================================
    // IMPORTANT
    //
    // We use country=NG to help retrieve jobs
    // relevant to Nigeria.
    //
    // BUT we DO NOT use:
    //
    // exclude_worldwide=true
    //
    // because worldwide jobs are exactly the
    // international jobs we want.
    // ========================================

    if (
      nigeriaOnly
    ) {

      url.searchParams.set(
        "country",
        "NG"
      );

    }


    // ========================================
    // SEARCH TERM
    // ========================================

    if (
      search &&
      search.trim()
    ) {

      url.searchParams.set(
        "q",
        search.trim()
      );

    }


    // ========================================
    // SORT
    // ========================================

    url.searchParams.set(
      "sort",
      "recent"
    );


    // ========================================
    // PAGE
    // ========================================

    url.searchParams.set(
      "page",
      String(page)
    );


    console.log(
      "Himalayas:",
      search || "all",
      nigeriaOnly
        ? "INTERNATIONAL REMOTE / NIGERIA ELIGIBLE"
        : "VISA GLOBAL"
    );


    const response =
      await fetch(
        url.toString()
      );


    if (
      !response.ok
    ) {

      console.error(
        "Himalayas HTTP error:",
        response.status
      );

      return [];

    }


    const data =
      await response.json();


    if (
      !Array.isArray(
        data.jobs
      )
    ) {

      return [];

    }


    console.log(
      `Himalayas returned ${data.jobs.length} jobs`
    );


    return data.jobs;

  } catch (
    error
  ) {

    console.error(
      "Himalayas request failed:",
      error.message
    );

    return [];

  }

}


// ========================================
// REMOVE DUPLICATES
// ========================================

function removeDuplicates(
  jobs
) {

  const seen =
    new Set();


  return jobs.filter(
    job => {

      const key =

        job.guid ||

        job.applicationLink ||

        `${job.title || ""}-${job.companyName || ""}`;


      if (
        seen.has(
          key
        )
      ) {

        return false;

      }


      seen.add(
        key
      );


      return true;

    }
  );

}


// ========================================
// CLASSIFY JOB TYPE
// ========================================

function getJobType(
  job
) {

  const text =
    getJobText(
      job
    );


  if (
    /customer service|customer support|customer care|chat support|live chat|email support|call center|call centre|help desk|support representative/.test(text)
  ) {

    return "Customer Service";

  }


  if (
    /sales representative|sales specialist|sales associate|sales executive|inside sales|business development|appointment setter|lead generation|account executive/.test(text)
  ) {

    return "Sales";

  }


  if (
    /virtual assistant|virtual administrative assistant|remote assistant|personal assistant/.test(text)
  ) {

    return "Virtual Assistant";

  }


  if (
    /administrative assistant|administrative support|executive assistant|office assistant/.test(text)
  ) {

    return "Administrative";

  }


  if (
    /data entry|data processing|data specialist/.test(text)
  ) {

    return "Data Entry";

  }


  if (
    /data annotation|data labeling|ai trainer|ai evaluator|ai rater|artificial intelligence/.test(text)
  ) {

    return "AI & Data Annotation";

  }


  if (
    /social media|community manager/.test(text)
  ) {

    return "Social Media";

  }


  if (
    /marketing|digital marketing|growth marketing/.test(text)
  ) {

    return "Marketing";

  }


  if (
    /content writer|content writing|copywriter|copywriting|blog writer|technical writer/.test(text)
  ) {

    return "Writing";

  }


  if (
    /graphic designer|graphic design|canva designer|visual designer|creative designer/.test(text)
  ) {

    return "Graphic Design";

  }


  if (
    /customer success|client success|customer experience/.test(text)
  ) {

    return "Customer Success";

  }


  if (
    /account manager|account management|client manager|client relationship/.test(text)
  ) {

    return "Account Management";

  }


  if (
    /recruiter|recruitment|talent acquisition|human resources|hr assistant|hr coordinator/.test(text)
  ) {

    return "Recruitment & HR";

  }


  if (
    /bookkeeper|bookkeeping|accounting|accounts payable|accounts receivable|finance assistant/.test(text)
  ) {

    return "Finance & Bookkeeping";

  }


  if (
    /ecommerce|e-commerce|shopify|online store/.test(text)
  ) {

    return "E-commerce";

  }


  if (
    /research assistant|research specialist|research analyst/.test(text)
  ) {

    return "Research";

  }


  if (
    /online tutor|online teacher|tutor|teacher|education assistant/.test(text)
  ) {

    return "Education";

  }


  if (
    /healthcare|medical assistant|medical writer|clinical research/.test(text)
  ) {

    return "Healthcare";

  }


  if (
    /operations|order processing|order management/.test(text)
  ) {

    return "Operations";

  }


  if (
    /project coordinator|project assistant|project manager|business operations|business assistant/.test(text)
  ) {

    return "Project & Business";

  }


  if (
    /web developer|frontend developer|front-end developer/.test(text)
  ) {

    return "Web Development";

  }


  if (
    /software developer|software engineer|developer|programmer/.test(text)
  ) {

    return "Software Development";

  }


  return "Other Remote Job";

}


// ========================================
// FORMAT SALARY
// ========================================

function formatSalary(
  job
) {

  const min =
    job.minSalary;

  const max =
    job.maxSalary;

  const currency =
    job.currency ||
    "";

  const period =
    job.salaryPeriod ||
    "";


  if (
    min === null ||
    min === undefined
  ) {

    return "Salary not specified";

  }


  let result =
    `${currency} ${Number(min).toLocaleString()}`;


  if (
    max !== null &&
    max !== undefined &&
    max !== ""
  ) {

    result +=
      ` - ${Number(max).toLocaleString()}`;

  }


  if (
    period
  ) {

    result +=
      ` / ${period}`;

  }


  return result.trim();

}


// ========================================
// FORMAT JOB
// ========================================

function formatHimalayasJob(
  job,
  options = {}
) {

  const restrictions =
    getLocationRestrictions(
      job
    );


  // ========================================
  // LOCATION DISPLAY
  // ========================================

  let location =
    "Remote — Nigeria eligible";


  if (
    restrictions.length > 0
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
      names.length > 0
    ) {

      location =
        `Remote — ${names.join(", ")}`;

    }

  }


  const description =
    cleanHtml(
      job.description ||
      job.excerpt ||
      ""
    );


  const categories =

    Array.isArray(
      job.categories
    )

      ? job.categories.join(", ")

      : "";


  const parentCategories =

    Array.isArray(
      job.parentCategories
    )

      ? job.parentCategories.join(", ")

      : "";


  const seniority =

    Array.isArray(
      job.seniority
    )

      ? job.seniority.join(", ")

      : "";


  const visaSponsorship =
    options.visaSponsorship === true;


  const application =
    getApplicationMethod(
      job
    );


  return {

    id:

      job.guid ||

      `${job.companySlug || "company"}-${job.title || "job"}`,

    title:

      job.title ||
      "Job",

    company:

      job.companyName ||
      "Company not specified",

    companyLogo:

      job.companyLogo ||
      "",

    // ========================================
    // LOCATION
    // ========================================

    location,

    locationRestrictions:
      restrictions,

    timezoneRestrictions:
      getTimezoneRestrictions(job),

    // ========================================
    // DESCRIPTION
    // ========================================

    description,

    excerpt:
      cleanHtml(
        job.excerpt || ""
      ),

    // ========================================
    // APPLICATION
    // ========================================

    url:
      application.url || "",

    applyUrl:
      application.url || "",

    applyEmail:
      application.email || "",

    applyMethod:
      application.method || "Application Link",

    applicationMethod:
      application.method || "Application Link",

    // ========================================
    // DATES
    // ========================================

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

    // ========================================
    // SALARY
    // ========================================

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

    // ========================================
    // EMPLOYMENT
    // ========================================

    contract_type:
      job.employmentType || "",

    contract_time:
      job.employmentType || "",

    type:
      job.employmentType ||
      "Full Time",

    employmentType:
      job.employmentType || "",

    // ========================================
    // CATEGORY
    // ========================================

    category:
      categories,

    parentCategory:
      parentCategories,

    jobType:
      getJobType(job),

    seniority,

    // ========================================
    // STATUS
    // ========================================

    remote:
      true,

    nigeriaFriendly:
      !visaSponsorship,

    visaSponsorship,

    // ========================================
    // SOURCE
    // ========================================

    source:
      "Himalayas",

    sourceUrl:
      "https://himalayas.app/"

  };

}


// ========================================
// GET REMOTE JOBS
// ========================================

async function getRemoteJobs(
  search = "",
  page = 1
) {

  const cacheKey =
    `remote-${search.toLowerCase()}-${page}`;


  const cached =
    cache.get(
      cacheKey
    );


  if (
    cached &&
    Date.now() - cached.time <
      CACHE_TIME
  ) {

    return cached.jobs;

  }


  let rawJobs = [];


  // ========================================
  // USER SEARCH
  // ========================================

  if (
    search
  ) {

    rawJobs =
      await searchHimalayas(
        search,
        page,
        true
      );

  }


  // ========================================
  // DEFAULT FEED
  // ========================================

  else {

    const SEARCHES_PER_PAGE =
      12;


    const startIndex =
      (
        (page - 1) *
        SEARCHES_PER_PAGE
      ) %
      JOB_SEARCHES.length;


    const selectedSearches =
      [];


    for (
      let i = 0;
      i < SEARCHES_PER_PAGE;
      i++
    ) {

      const index =
        (
          startIndex + i
        ) %
        JOB_SEARCHES.length;


      selectedSearches.push(
        JOB_SEARCHES[index]
      );

    }


    console.log(
      "Remote searches:",
      selectedSearches
    );


    const results =
      await Promise.all(

        selectedSearches.map(
          searchTerm =>
            searchHimalayas(
              searchTerm,
              page,
              true
            )
        )

      );


    results.forEach(
      jobs => {

        if (
          Array.isArray(jobs)
        ) {

          rawJobs.push(
            ...jobs
          );

        }

      }
    );

  }


  // ========================================
  // REMOVE DUPLICATES
  // ========================================

  rawJobs =
    removeDuplicates(
      rawJobs
    );


  // ========================================
  // FILTER
  // ========================================

  const acceptedJobs =
    [];


  rawJobs.forEach(
    job => {

      const result =
        checkNigeriaFriendlyJob(
          job
        );


      if (
        result.accepted
      ) {

        acceptedJobs.push(
          {
            job,
            application:
              result.application
          }
        );

      }

    }
  );


  // ========================================
  // FORMAT
  // ========================================

  const jobs =
    acceptedJobs.map(
      item => {

        return formatHimalayasJob(
          item.job,
          {
            visaSponsorship:
              false
          }
        );

      }
    );


  // ========================================
  // CACHE
  // ========================================

  cache.set(
    cacheKey,
    {

      time:
        Date.now(),

      jobs

    }
  );


  console.log(
    `Remote jobs returned: ${jobs.length}`
  );


  return jobs;

}


// ========================================
// GET VISA JOBS
// ========================================

async function getVisaJobs(
  search = "",
  page = 1
) {

  const cacheKey =
    `visa-${search.toLowerCase()}-${page}`;


  const cached =
    cache.get(
      cacheKey
    );


  if (
    cached &&
    Date.now() - cached.time <
      CACHE_TIME
  ) {

    return cached.jobs;

  }


  let rawJobs = [];


  // ========================================
  // USER SEARCH
  // ========================================

  if (
    search
  ) {

    rawJobs =
      await searchHimalayas(
        `${search} visa sponsorship`,
        page,
        false
      );

  }


  // ========================================
  // DEFAULT VISA SEARCH
  // ========================================

  else {

    const SEARCHES_PER_PAGE =
      8;


    const startIndex =
      (
        (page - 1) *
        SEARCHES_PER_PAGE
      ) %
      VISA_SEARCHES.length;


    const selectedSearches =
      [];


    for (
      let i = 0;
      i < SEARCHES_PER_PAGE;
      i++
    ) {

      const index =
        (
          startIndex + i
        ) %
        VISA_SEARCHES.length;


      selectedSearches.push(
        VISA_SEARCHES[index]
      );

    }


    console.log(
      "Visa searches:",
      selectedSearches
    );


    const results =
      await Promise.all(

        selectedSearches.map(
          searchTerm =>
            searchHimalayas(
              searchTerm,
              page,
              false
            )
        )

      );


    results.forEach(
      jobs => {

        if (
          Array.isArray(jobs)
        ) {

          rawJobs.push(
            ...jobs
          );

        }

      }

    );

  }


  // ========================================
  // DUPLICATES
  // ========================================

  rawJobs =
    removeDuplicates(
      rawJobs
    );


  // ========================================
  // FILTER VISA
  // ========================================

  const acceptedVisaJobs =
    [];


  rawJobs.forEach(
    job => {

      const result =
        checkVisaSponsorship(
          job
        );


      if (
        result.accepted
      ) {

        acceptedVisaJobs.push(
          {
            job,
            application:
              result.application
          }
        );

      }

    }
  );


  // ========================================
  // FORMAT
  // ========================================

  const jobs =
    acceptedVisaJobs.map(
      item => {

        return formatHimalayasJob(
          item.job,
          {
            visaSponsorship:
              true
          }
        );

      }
    );


  // ========================================
  // CACHE
  // ========================================

  cache.set(
    cacheKey,
    {

      time:
        Date.now(),

      jobs

    }

  );


  console.log(
    `Visa sponsorship jobs returned: ${jobs.length}`
  );


  return jobs;

}


// ========================================
// HOME
// ========================================

app.get(
  "/",
  (req, res) => {

    res.json({

      success: true,

      message:
        "International Remote Jobs API is running",

      status:
        "online",

      source:
        "Himalayas",

      rules: {

        jobType:
          "International remote jobs",

        nigeria:
          "Must not be explicitly excluded",

        worldwide:
          "Accepted when no location restriction exists",

        remote:
          "Himalayas remote listings; obvious onsite-only jobs rejected",

        application:
          "Application link, company website or email when available"

      },

      endpoints: {

        remote:
          "/api/jobs/remote",

        visa:
          "/api/jobs/visa",

        jobs:
          "/api/jobs",

        debug:
          "/api/jobs/remote/debug"

      }

    });

  }
);


// ========================================
// REMOTE ENDPOINT
// ========================================

app.get(
  "/api/jobs/remote",
  async (req, res) => {

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


      const jobs =
        await getRemoteJobs(
          search,
          page
        );


      res.json({

        success:
          true,

        count:
          jobs.length,

        page,

        type:
          "international-remote",

        applicants:
          "Nigeria",

        rules: {

          international:
            true,

          nigeriaEligible:
            true,

          worldwide:
            true,

          onsiteOnly:
            false

        },

        jobs

      });

    } catch (
      error
    ) {

      console.error(
        "Remote error:",
        error
      );


      res.status(500).json({

        success:
          false,

        error:
          "Failed to fetch remote jobs",

        message:
          error.message

      });

    }

  }
);


// ========================================
// VISA ENDPOINT
// ========================================

app.get(
  "/api/jobs/visa",
  async (req, res) => {

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


      const jobs =
        await getVisaJobs(
          search,
          page
        );


      res.json({

        success:
          true,

        count:
          jobs.length,

        page,

        type:
          "visa-sponsorship",

        applicants:
          "Nigeria",

        jobs

      });

    } catch (
      error
    ) {

      console.error(
        "Visa error:",
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
// DEBUG ENDPOINT
// ========================================

app.get(
  "/api/jobs/remote/debug",
  async (req, res) => {

    try {

      const search =
        String(
          req.query.search || ""
        ).trim();


      const jobs =
        await getRemoteJobs(
          search,
          1
        );


      const results =
        jobs.map(
          job => ({

            id:
              job.id,

            title:
              job.title,

            company:
              job.company,

            jobType:
              job.jobType,

            location:
              job.location,

            locationRestrictions:
              job.locationRestrictions,

            timezoneRestrictions:
              job.timezoneRestrictions,

            remote:
              job.remote,

            nigeriaFriendly:
              job.nigeriaFriendly,

            applyMethod:
              job.applyMethod,

            applyEmail:
              job.applyEmail,

            applyUrl:
              job.applyUrl,

            url:
              job.url

          })
        );


      res.json({

        success:
          true,

        search,

        count:
          results.length,

        rules: {

          internationalRemote:
            true,

          worldwide:
            "ACCEPTED",

          explicitNigeria:
            "NOT REQUIRED",

          remote:
            "REMOTE LISTING FROM HIMALAYAS",

          application:
            "APPLICATION LINK / COMPANY WEBSITE / EMAIL"

        },

        jobs:
          results

      });

    } catch (
      error
    ) {

      console.error(
        "Debug error:",
        error
      );


      res.status(500).json({

        success:
          false,

        error:
          "Debug failed",

        message:
          error.message

      });

    }

  }
);


// ========================================
// GENERAL JOBS ENDPOINT
// ========================================

app.get(
  "/api/jobs",
  async (req, res) => {

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


      const jobs =
        await getRemoteJobs(
          search,
          page
        );


      res.json({

        success:
          true,

        count:
          jobs.length,

        page,

        type:
          "international-remote",

        applicants:
          "Nigeria",

        jobs

      });

    } catch (
      error
    ) {

      console.error(
        "Jobs error:",
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
// START SERVER
// ========================================

app.listen(
  PORT,
  () => {

    console.log(
      `Server running on port ${PORT}`
    );

  }
);
