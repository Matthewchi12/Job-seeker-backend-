// ========================================
// INTERNATIONAL REMOTE JOBS BACKEND
//
// FOR:
// 🇳🇬 Nigerians looking for:
// - International remote jobs
// - Remote jobs they can do from Nigeria
// - Visa sponsorship jobs
//
// SOURCES:
// 1. Himalayas - jobs
// 2. Hunter - public professional emails
//
// IMPORTANT:
// NEVER invent HR/company emails.
// ========================================

const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 10000;


// ========================================
// API SETTINGS
// ========================================

const HIMALAYAS_SEARCH_API =
  "https://himalayas.app/jobs/api/search";

const HIMALAYAS_API =
  "https://himalayas.app/jobs/api";

const HUNTER_API =
  "https://api.hunter.io/v2";


// ========================================
// CACHE
// ========================================

const cache = new Map();

const CACHE_TIME =
  30 * 60 * 1000;


// ========================================
// JOB SEARCH TERMS
// ========================================

const JOB_SEARCHES = [

  "customer service",
  "customer support",
  "customer support specialist",
  "customer care",
  "client support",
  "client services",
  "support specialist",
  "chat support",
  "live chat support",
  "email support",
  "help desk",

  "sales representative",
  "sales specialist",
  "sales associate",
  "sales executive",
  "inside sales",
  "sales support",
  "business development",
  "business development representative",
  "account executive",
  "appointment setter",
  "lead generation",

  "virtual assistant",
  "administrative assistant",
  "administrative support",
  "executive assistant",
  "personal assistant",
  "remote assistant",

  "data entry",
  "data entry specialist",
  "data processing",

  "operations assistant",
  "operations specialist",
  "operations coordinator",
  "order processing",
  "order management",

  "marketing assistant",
  "marketing specialist",
  "digital marketing",
  "marketing coordinator",
  "growth marketing",

  "social media",
  "social media assistant",
  "social media specialist",
  "social media manager",
  "community manager",

  "content writer",
  "content creator",
  "copywriter",
  "blog writer",
  "technical writer",

  "graphic designer",
  "graphic design",
  "Canva designer",
  "visual designer",

  "customer success",
  "customer success specialist",
  "client success",
  "customer experience",

  "account manager",
  "account management",
  "client manager",

  "recruiter",
  "recruitment specialist",
  "talent acquisition",
  "HR assistant",
  "human resources",

  "bookkeeper",
  "bookkeeping",
  "accounting assistant",
  "accounts assistant",
  "finance assistant",

  "ecommerce",
  "ecommerce assistant",
  "ecommerce specialist",
  "shopify assistant",

  "research assistant",
  "research specialist",
  "research analyst",

  "AI data annotation",
  "data annotation",
  "AI trainer",
  "AI evaluator",
  "AI rater",
  "data labeling",

  "online tutor",
  "online teacher",

  "medical writer",
  "clinical research",
  "healthcare",

  "project coordinator",
  "project assistant",
  "project manager",

  "web developer",
  "software developer"

];


// ========================================
// VISA SEARCHES
// ========================================

const VISA_SEARCHES = [

  "visa sponsorship",
  "visa sponsored",
  "work visa sponsorship",
  "employer sponsorship",
  "work permit sponsorship",
  "skilled worker sponsorship",
  "sponsorship available",
  "visa support",
  "immigration sponsorship"

];


// ========================================
// VISA KEYWORDS
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
  "will sponsor",
  "sponsor a work visa",
  "sponsorship provided",
  "visa assistance"

];


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
  "without sponsorship"

];


// ========================================
// REMOTE NEGATIVE TERMS
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
// FOREIGN-ONLY TERMS
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

  "us residents only",
  "usa residents only",
  "uk residents only",
  "canada residents only",
  "australia residents only",

  "must be located in the united states",
  "must be located in the us",
  "must be located in the usa",

  "must be based in the united states",
  "must be based in the us",
  "must be based in the usa",

  "must reside in the united states",
  "must reside in the us",
  "must reside in the usa"

];


// ========================================
// HTML CLEANER
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

  return (

    `${job.title || ""} ` +
    `${job.description || ""} ` +
    `${job.excerpt || ""} ` +

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

function getLocationRestrictions(job) {

  return Array.isArray(
    job.locationRestrictions
  )
    ? job.locationRestrictions
    : [];

}


// ========================================
// TIMEZONE
// ========================================

function getTimezoneRestrictions(job) {

  return Array.isArray(
    job.timezoneRestrictions
  )
    ? job.timezoneRestrictions
    : [];

}


// ========================================
// NIGERIA LOCATION CHECK
// ========================================

function checkNigeriaLocation(job) {

  const restrictions =
    getLocationRestrictions(job);


  // Worldwide
  if (
    restrictions.length === 0
  ) {

    return {
      accepted: true,
      reason: "worldwide"
    };

  }


  const locations =
    restrictions.map(location => ({

      alpha2:
        String(
          location?.alpha2 || ""
        )
        .toLowerCase(),

      name:
        String(
          location?.name || ""
        )
        .toLowerCase(),

      slug:
        String(
          location?.slug || ""
        )
        .toLowerCase()

    }));


  // Nigeria
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
      reason: "nigeria_allowed"
    };

  }


  // Africa
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
      reason: "africa_allowed"
    };

  }


  return {
    accepted: false,
    reason: "restricted_to_other_location"
  };

}


// ========================================
// TIMEZONE CHECK
// ========================================

function checkNigeriaTimezone(job) {

  const timezones =
    getTimezoneRestrictions(job);


  if (
    timezones.length === 0
  ) {

    return {
      accepted: true,
      reason: "all_timezones"
    };

  }


  const normalized =
    timezones.map(
      timezone =>
        String(timezone)
          .toLowerCase()
          .replace(/\s/g, "")
    );


  const nigeria =
    normalized.some(
      timezone =>
        timezone === "1" ||
        timezone === "+1" ||
        timezone === "utc+1" ||
        timezone === "gmt+1" ||
        timezone === "01" ||
        timezone === "+01"
    );


  if (
    nigeria
  ) {

    return {
      accepted: true,
      reason: "nigeria_timezone"
    };

  }


  // Do not aggressively reject
  return {
    accepted: true,
    reason: "timezone_not_confirmed_conflict"
  };

}


// ========================================
// REMOTE CHECK
// ========================================

function checkRemote(job) {

  const text =
    getJobText(job);


  const onsite =
    REMOTE_NEGATIVE_TERMS.some(
      term =>
        text.includes(term)
    );


  if (
    onsite
  ) {

    return {
      accepted: false,
      reason: "onsite_only"
    };

  }


  return {
    accepted: true,
    reason: "remote_listing"
  };

}


// ========================================
// DESCRIPTION LOCATION CHECK
// ========================================

function checkDescriptionLocation(job) {

  const text =
    getJobText(job);


  const foreign =
    FOREIGN_ONLY_TERMS.some(
      term =>
        text.includes(term)
    );


  if (
    foreign
  ) {

    return {
      accepted: false,
      reason: "foreign_only"
    };

  }


  return {
    accepted: true,
    reason: "no_foreign_only_restriction"
  };

}


// ========================================
// EMAIL EXTRACTION
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
// URL EXTRACTION
// ========================================

function extractUrls(job) {

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
        !host.includes("himalayas.app") &&
        !host.includes("linkedin.com")
      ) {

        return host;

      }

    } catch {}

  }


  return "";

}


// ========================================
// DIRECT APPLICATION
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


  // Direct email in job listing
  if (
    emails.length > 0
  ) {

    return {

      type:
        "email",

      email:
        emails[0],

      url:
        applicationLink || urls[0] || ""

    };

  }


  // Company website
  if (
    urls.length > 0
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


  // Himalayas application
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
// HUNTER EMAIL SEARCH
// ========================================
//
// This only runs when:
// HUNTER_API_KEY exists.
//
// We prioritize generic/company/HR/recruitment
// emails over random employee emails.
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

      contactName:
        "",

      position:
        "",

      confidence:
        null,

      source:
        "not_configured",

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

      contactName:
        "",

      position:
        "",

      confidence:
        null,

      source:
        "company_domain_not_found",

      domain:
        ""

    };

  }


  const cacheKey =
    `hunter-${domain}`;


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


    const response =
      await fetch(
        url.toString()
      );


    if (
      !response.ok
    ) {

      console.error(
        "Hunter error:",
        response.status
      );


      return {

        found:
          false,

        email:
          "",

        contactName:
          "",

        position:
          "",

        confidence:
          null,

        source:
          "hunter_error",

        domain

      };

    }


    const data =
      await response.json();


    const emails =
      data?.data?.emails || [];


    if (
      !emails.length
    ) {

      const result = {

        found:
          false,

        email:
          "",

        contactName:
          "",

        position:
          "",

        confidence:
          null,

        source:
          "no_public_email_found",

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

    }


    // ========================================
    // SCORE CONTACT
    // ========================================

    const scored =
      emails.map(
        person => {

          const email =
            String(
              person.value || ""
            )
            .toLowerCase();


          const position =
            String(
              person.position || ""
            )
            .toLowerCase();


          const type =
            String(
              person.type || ""
            )
            .toLowerCase();


          let score =
            Number(
              person.confidence || 0
            );


          // Generic company/HR addresses
          if (
            /^(hr|careers|career|jobs|recruiting|recruitment|talent|hiring|people|info|hello|contact|support|admin)@/i
              .test(email)
          ) {

            score += 100;

          }


          // HR positions
          if (
            /hr|human resources|recruit|recruiting|recruitment|talent|hiring|people|head of people|talent acquisition/
              .test(position)
          ) {

            score += 80;

          }


          // Generic email type
          if (
            type === "generic"
          ) {

            score += 30;

          }


          return {

            ...person,

            finalScore:
              score

          };

        }
      );


    scored.sort(
      (
        a,
        b
      ) =>
        b.finalScore -
        a.finalScore
    );


    const best =
      scored[0];


    if (
      !best?.value
    ) {

      return {

        found:
          false,

        email:
          "",

        contactName:
          "",

        position:
          "",

        confidence:
          null,

        source:
          "no_email",

        domain

      };

    }


    const result = {

      found:
        true,

      email:
        best.value,

      contactName:
        [
          best.first_name,
          best.last_name
        ]
          .filter(Boolean)
          .join(" "),

      position:
        best.position || "",

      confidence:
        best.confidence || null,

      source:
        "Hunter",

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

  } catch (
    error
  ) {

    console.error(
      "Hunter request failed:",
      error.message
    );


    return {

      found:
        false,

      email:
        "",

      contactName:
        "",

      position:
        "",

      confidence:
        null,

      source:
        "hunter_request_failed",

      domain

    };

  }

}


// ========================================
// JOB TYPE
// ========================================

function getJobType(job) {

  const text =
    getJobText(job);


  if (
    /customer service|customer support|customer care|chat support|live chat|email support|call center|call centre|help desk/
      .test(text)
  ) {

    return "Customer Service";

  }


  if (
    /sales representative|sales specialist|sales associate|sales executive|inside sales|business development|appointment setter|lead generation/
      .test(text)
  ) {

    return "Sales";

  }


  if (
    /virtual assistant|administrative assistant|executive assistant|personal assistant|remote assistant/
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
    /content writer|content creator|copywriter|blog writer|technical writer/
      .test(text)
  ) {

    return "Writing";

  }


  if (
    /graphic designer|graphic design|canva designer|visual designer/
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
    /account manager|account management|client manager/
      .test(text)
  ) {

    return "Account Management";

  }


  if (
    /recruiter|recruitment|talent acquisition|human resources|hr assistant/
      .test(text)
  ) {

    return "Recruitment & HR";

  }


  if (
    /bookkeeper|bookkeeping|accounting|accounts payable|accounts receivable|finance/
      .test(text)
  ) {

    return "Finance & Bookkeeping";

  }


  if (
    /ecommerce|e-commerce|shopify|online store/
      .test(text)
  ) {

    return "E-commerce";

  }


  if (
    /research assistant|research specialist|research analyst/
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
    /healthcare|medical assistant|medical writer|clinical research/
      .test(text)
  ) {

    return "Healthcare";

  }


  if (
    /project coordinator|project assistant|project manager|business operations/
      .test(text)
  ) {

    return "Project & Business";

  }


  if (
    /web developer|frontend developer|front-end developer/
      .test(text)
  ) {

    return "Web Development";

  }


  if (
    /software developer|software engineer|developer|programmer/
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


  const currency =
    job.currency || "";


  const period =
    job.salaryPeriod || "";


  let salary =
    `${currency} ${Number(min).toLocaleString()}`;


  if (
    max !== null &&
    max !== undefined
  ) {

    salary +=
      ` - ${Number(max).toLocaleString()}`;

  }


  if (
    period
  ) {

    salary +=
      ` / ${period}`;

  }


  return salary.trim();

}


// ========================================
// FORMAT JOB
// ========================================

async function formatJob(
  job,
  visa = false
) {

  const restrictions =
    getLocationRestrictions(job);


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


  const description =
    cleanHtml(
      job.description ||
      job.excerpt ||
      ""
    );


  const application =
    getApplication(job);


  // ========================================
  // EMAIL ENRICHMENT
  // ========================================

  const companyContact =
    await findCompanyEmail(
      job
    );


  // ========================================
  // FINAL CONTACT
  // ========================================

  let contactType =
    "application_only";


  let contactEmail =
    "";


  let contactName =
    "";


  let contactPosition =
    "";


  if (
    application.email
  ) {

    contactType =
      "job_listing_email";

    contactEmail =
      application.email;

  }


  else if (
    companyContact.found
  ) {

    contactType =
      /hr|recruit|talent|hiring|people/i
        .test(
          `${companyContact.position} ${companyContact.email}`
        )
        ? "hr_contact"
        : "company_contact";


    contactEmail =
      companyContact.email;


    contactName =
      companyContact.contactName;


    contactPosition =
      companyContact.position;

  }


  else if (
    application.url
  ) {

    contactType =
      "direct_application";

  }


  return {

    id:

      job.guid ||

      `${job.companySlug || "company"}-${job.title || "job"}`,

    title:
      job.title || "Job",

    company:
      job.companyName ||
      "Company not specified",

    companySlug:
      job.companySlug || "",

    companyLogo:
      job.companyLogo || "",


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

    applyUrl:
      application.url || "",

    applyEmail:
      application.email || "",

    applyMethod:
      application.type,


    // ========================================
    // COMPANY / HR CONTACT
    // ========================================

    contactType,

    contactEmail,

    contactName,

    contactPosition,

    hrEmail:
      contactType === "hr_contact"
        ? contactEmail
        : "",

    companyEmail:
      contactType === "company_contact"
        ? contactEmail
        : "",

    companyDomain:
      companyContact.domain || "",


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

    employmentType:
      job.employmentType || "",

    type:
      job.employmentType ||
      "Full Time",


    // ========================================
    // CATEGORY
    // ========================================

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


    // ========================================
    // SENIORITY
    // ========================================

    seniority:
      Array.isArray(job.seniority)
        ? job.seniority.join(", ")
        : "",


    // ========================================
    // STATUS
    // ========================================

    remote:
      true,

    nigeriaFriendly:
      !visa,

    visaSponsorship:
      visa,


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
    // SOURCE
    // ========================================

    source:
      "Himalayas",

    sourceUrl:
      "https://himalayas.app/",

    sourceNotice:
      "Job data sourced from Himalayas"
  };

}


// ========================================
// REMOVE DUPLICATES
// ========================================

function removeDuplicates(jobs) {

  const seen =
    new Set();


  return jobs.filter(
    job => {

      const key =
        job.guid ||
        job.applicationLink ||
        `${job.title || ""}-${job.companyName || ""}`;


      if (
        seen.has(key)
      ) {

        return false;

      }


      seen.add(key);

      return true;

    }
  );

}


// ========================================
// SEARCH HIMALAYAS
// ========================================

async function searchHimalayas(
  search = "",
  page = 1,
  options = {}
) {

  try {

    const url =
      new URL(
        HIMALAYAS_SEARCH_API
      );


    if (
      search
    ) {

      url.searchParams.set(
        "q",
        search
      );

    }


    // Nigeria + worldwide
    if (
      options.nigeria
    ) {

      url.searchParams.set(
        "country",
        "NG"
      );

      // IMPORTANT:
      // We do NOT set exclude_worldwide.
      //
      // This allows:
      // Nigeria jobs
      // +
      // Worldwide jobs

    }


    if (
      options.worldwide
    ) {

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
      "Searching Himalayas:",
      search || "all"
    );


    const response =
      await fetch(
        url.toString()
      );


    if (
      !response.ok
    ) {

      console.error(
        "Himalayas:",
        response.status
      );

      return [];

    }


    const data =
      await response.json();


    if (
      !Array.isArray(data.jobs)
    ) {

      return [];

    }


    return data.jobs;

  } catch (
    error
  ) {

    console.error(
      "Himalayas failed:",
      error.message
    );


    return [];

  }

}


// ========================================
// GET REMOTE JOBS
// ========================================

async function getRemoteJobs(
  search = "",
  page = 1
) {

  const cacheKey =
    `remote-${search}-${page}`;


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
  // SEARCH
  // ========================================

  if (
    search
  ) {

    rawJobs =
      await searchHimalayas(
        search,
        page,
        {
          nigeria:
            true
        }
      );

  }


  // ========================================
  // DEFAULT FEED
  // ========================================

  else {

    const selected =
      JOB_SEARCHES.slice(
        0,
        12
      );


    const results =
      await Promise.all(
        selected.map(
          term =>
            searchHimalayas(
              term,
              page,
              {
                nigeria:
                  true
              }
            )
        )
      );


    results.forEach(
      jobs => {

        rawJobs.push(
          ...jobs
        );

      }
    );

  }


  rawJobs =
    removeDuplicates(
      rawJobs
    );


  // ========================================
  // FILTER
  // ========================================

  const accepted = [];


  for (
    const job of rawJobs
  ) {

    const location =
      checkNigeriaLocation(
        job
      );


    if (
      !location.accepted
    ) {

      continue;

    }


    const timezone =
      checkNigeriaTimezone(
        job
      );


    if (
      !timezone.accepted
    ) {

      continue;

    }


    const remote =
      checkRemote(
        job
      );


    if (
      !remote.accepted
    ) {

      continue;

    }


    const description =
      checkDescriptionLocation(
        job
      );


    if (
      !description.accepted
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

  const jobs = [];


  // Limit enrichment requests
  // to avoid using Hunter credits
  // unnecessarily.
  //
  // First 30 jobs only.

  for (
    const job of accepted.slice(0, 30)
  ) {

    jobs.push(
      await formatJob(
        job,
        false
      )
    );

  }


  cache.set(
    cacheKey,
    {

      time:
        Date.now(),

      jobs

    }
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
    `visa-${search}-${page}`;


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


  if (
    search
  ) {

    rawJobs =
      await searchHimalayas(
        `${search} visa sponsorship`,
        page,
        {}
      );

  }


  else {

    const selected =
      VISA_SEARCHES.slice(
        0,
        8
      );


    const results =
      await Promise.all(
        selected.map(
          term =>
            searchHimalayas(
              term,
              page,
              {}
            )
        )
      );


    results.forEach(
      jobs => {

        rawJobs.push(
          ...jobs
        );

      }
    );

  }


  rawJobs =
    removeDuplicates(
      rawJobs
    );


  const accepted = [];


  for (
    const job of rawJobs
  ) {

    const text =
      getJobText(
        job
      );


    const negative =
      VISA_NEGATIVE_KEYWORDS.some(
        keyword =>
          text.includes(
            keyword
          )
      );


    if (
      negative
    ) {

      continue;

    }


    const matched =
      STRONG_VISA_KEYWORDS.some(
        keyword =>
          text.includes(
            keyword
          )
      );


    if (
      !matched
    ) {

      continue;

    }


    accepted.push(
      job
    );

  }


  const jobs = [];


  for (
    const job of accepted.slice(0, 30)
  ) {

    jobs.push(
      await formatJob(
        job,
        true
      )
    );

  }


  cache.set(
    cacheKey,
    {

      time:
        Date.now(),

      jobs

    }
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

      success:
        true,

      status:
        "online",

      message:
        "International Remote Jobs API is running",

      source:
        "Himalayas",

      emailEnrichment:
        process.env.HUNTER_API_KEY
          ? "enabled"
          : "disabled",

      endpoints: {

        remote:
          "/api/jobs/remote",

        visa:
          "/api/jobs/visa",

        search:
          "/api/jobs/remote?search=customer%20support",

        debug:
          "/api/jobs/remote/debug"

      }

    });

  }
);


// ========================================
// REMOTE JOBS
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
// VISA JOBS
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


      const jobs =
        await getRemoteJobs(
          search,
          1
        );


      res.json({

        success:
          true,

        search,

        count:
          jobs.length,

        hunterEnabled:
          Boolean(
            process.env.HUNTER_API_KEY
          ),

        jobs:
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

              nigeriaFriendly:
                job.nigeriaFriendly,

              contactType:
                job.contactType,

              contactEmail:
                job.contactEmail,

              contactName:
                job.contactName,

              contactPosition:
                job.contactPosition,

              hrEmail:
                job.hrEmail,

              companyEmail:
                job.companyEmail,

              companyDomain:
                job.companyDomain,

              applyMethod:
                job.applyMethod,

              applyEmail:
                job.applyEmail,

              applyUrl:
                job.applyUrl

            })
          )

      });

    } catch (
      error
    ) {

      console.error(
        error
      );


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
// START SERVER
// ========================================

app.listen(
  PORT,
  () => {

    console.log(
      `Server running on port ${PORT}`
    );

    console.log(
      `Hunter email enrichment: ${
        process.env.HUNTER_API_KEY
          ? "ENABLED"
          : "DISABLED"
      }`
    );

  }
);
