/*
========================================
INTERNATIONAL REMOTE
JOBS NIGERIANS CAN DO FROM NIGERIA
========================================
*/

/*
========================================
REMOTE JOB ELIGIBILITY
========================================
*/

function isNigeriaFriendlyRemoteJob(job) {

  const title =
    String(job?.title || "").toLowerCase();

  const location =
    String(job?.location || "").toLowerCase();

  const description =
    String(job?.description || "").toLowerCase();

  const text =
    `${title} ${location} ${description}`;


  /*
  ========================================
  1. MUST BE A REMOTE JOB
  ========================================
  */

  if (!isRemoteJob(job)) {
    return false;
  }


  /*
  ========================================
  2. REMOVE CLEAR COUNTRY RESTRICTIONS
  ========================================
  */

  const countryRestrictions = [

    /*
    United States
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

    /*
    United Kingdom
    */

    "uk only",
    "u.k. only",

    "uk residents only",
    "u.k. residents only",

    "uk-based applicants only",
    "uk based applicants only",

    "must be located in the uk",
    "must be located in uk",

    "must reside in the uk",
    "must reside in uk",

    "only applicants located in the uk",
    "only applicants located in uk",

    "only available to uk residents",

    "uk work authorization required",
    "u.k. work authorization required",

    "must have uk work authorization",

    "right to work in the uk",
    "right to work in uk",

    /*
    Canada
    */

    "canada only",

    "canadian residents only",
    "canada residents only",

    "canada-based applicants only",
    "canada based applicants only",

    "must be located in canada",

    "must reside in canada",

    "only applicants located in canada",

    "only available to canadian residents",
    "only available to canada residents",

    "canadian work authorization required",

    "must have canadian work authorization",

    "right to work in canada",

    /*
    Australia
    */

    "australia only",

    "australian residents only",
    "australia residents only",

    "australia-based applicants only",
    "australia based applicants only",

    "must be located in australia",

    "must reside in australia",

    "only applicants located in australia",

    "only available to australian residents",
    "only available to australia residents",

    "australian work authorization required",

    "must have australian work authorization",

    "right to work in australia",

    /*
    New Zealand
    */

    "new zealand only",

    "new zealand residents only",

    "new zealand-based applicants only",
    "new zealand based applicants only",

    "must be located in new zealand",

    "must reside in new zealand",

    "only applicants located in new zealand",

    "only available to new zealand residents",

    "new zealand work authorization required",

    "right to work in new zealand",

    /*
    Europe
    */

    "eu residents only",
    "european residents only",

    "eu-based applicants only",
    "eu based applicants only",

    "must be located in the eu",
    "must be located in eu",

    "must reside in the eu",
    "must reside in eu",

    "right to work in the eu",

    "europe work authorization required",

    /*
    Other countries
    */

    "germany only",
    "german residents only",
    "must be located in germany",
    "must reside in germany",
    "right to work in germany",

    "france only",
    "french residents only",
    "must be located in france",
    "must reside in france",
    "right to work in france",

    "netherlands only",
    "dutch residents only",
    "must be located in the netherlands",
    "must reside in the netherlands",
    "right to work in the netherlands",

    "ireland only",
    "irish residents only",
    "must be located in ireland",
    "must reside in ireland",
    "right to work in ireland",

    "switzerland only",
    "swiss residents only",
    "must be located in switzerland",
    "must reside in switzerland",
    "right to work in switzerland",

    "spain only",
    "spanish residents only",
    "must be located in spain",
    "must reside in spain",
    "right to work in spain",

    "italy only",
    "italian residents only",
    "must be located in italy",
    "must reside in italy",
    "right to work in italy",

    "sweden only",
    "swedish residents only",
    "must be located in sweden",
    "must reside in sweden",
    "right to work in sweden",

    "norway only",
    "norwegian residents only",
    "must be located in norway",
    "must reside in norway",
    "right to work in norway",

    "denmark only",
    "danish residents only",
    "must be located in denmark",
    "must reside in denmark",
    "right to work in denmark",

    "finland only",
    "finnish residents only",
    "must be located in finland",
    "must reside in finland",
    "right to work in finland"

  ];


  const restricted =
    countryRestrictions.some(
      phrase => text.includes(phrase)
    );


  if (restricted) {
    return false;
  }


  /*
  ========================================
  3. REMOVE EXPLICIT LOCATION REQUIREMENTS
  ========================================
  */

  const locationRequirementPatterns = [

    "must live in",
    "must be based in",
    "must reside in",
    "must be located in",

    "applicants must live in",
    "candidates must live in",

    "applicants must be based in",
    "candidates must be based in",

    "only hiring in",
    "only hiring from",

    "hiring only in",
    "available only in"

  ];


  const restrictedLocations = [

    "united states",
    "usa",
    "u.s.",

    "united kingdom",
    "uk",
    "u.k.",

    "canada",
    "australia",
    "new zealand",

    "germany",
    "france",
    "netherlands",
    "ireland",
    "switzerland",
    "spain",
    "italy",
    "sweden",
    "norway",
    "denmark",
    "finland",

    "europe",
    "european union",
    "eu"

  ];


  const hasLocationRequirement =
    locationRequirementPatterns.some(
      requirement =>
        text.includes(requirement)
    );


  if (hasLocationRequirement) {

    const hasRestrictedLocation =
      restrictedLocations.some(
        country =>
          text.includes(country)
      );

    if (hasRestrictedLocation) {
      return false;
    }
  }


  /*
  ========================================
  4. WORLDWIDE / INTERNATIONAL SIGNALS
  ========================================
  */

  const worldwideWords = [

    "worldwide",
    "remote worldwide",

    "work from anywhere",
    "work-from-anywhere",

    "anywhere in the world",

    "anywhere",

    "any location",

    "any country",

    "global remote",
    "globally remote",
    "remote global",

    "global team",
    "global workforce",
    "global position",

    "international applicants",
    "international candidates",

    "international applicants welcome",
    "international candidates welcome",

    "open to international candidates",
    "open to international applicants",

    "open to applicants worldwide",
    "open to candidates worldwide",

    "open worldwide",

    "remote - worldwide",
    "remote — worldwide",

    "distributed team",
    "distributed workforce",

    "fully distributed",

    "global distributed team",

    "work remotely from anywhere",

    "remote from anywhere",

    "location independent",
    "location-independent"

  ];


  /*
  ========================================
  5. AFRICA / NIGERIA SIGNALS
  ========================================
  */

  const africaWords = [

    "africa",
    "african",

    "africa-based",
    "africa based",

    "sub-saharan africa",

    "west africa",
    "east africa",
    "south africa",

    "nigeria",
    "nigerian",

    "nigeria-based",
    "nigeria based",

    "ghana",
    "kenya",
    "egypt",
    "morocco"

  ];


  /*
  ========================================
  6. REMOTE JOB TYPES
  ========================================
  */

  const remoteJobCategories = [

    /*
    Technology
    */

    "software developer",
    "software engineer",

    "web developer",

    "frontend developer",
    "front-end developer",

    "backend developer",
    "back-end developer",

    "full stack developer",
    "full-stack developer",

    "mobile developer",

    "react developer",

    "javascript developer",

    "python developer",

    "devops",

    "cloud engineer",
    "cloud developer",

    "cybersecurity",
    "cyber security",

    "it support",
    "technical support",
    "tech support",

    /*
    Data
    */

    "data analyst",
    "data analysis",

    "data scientist",
    "data engineer",

    "business analyst",
    "business intelligence",
    "bi analyst",

    "research analyst",
    "research assistant",

    "financial analyst",
    "marketing analyst",

    "data entry",

    /*
    AI
    */

    "ai trainer",
    "ai training",

    "ai annotator",
    "ai annotation",

    "data annotator",
    "data annotation",

    "machine learning",
    "artificial intelligence",

    "llm trainer",
    "ai evaluator",

    /*
    Customer service
    */

    "customer support",
    "customer service",
    "customer success",

    "call center",
    "call centre",

    "help desk",
    "helpdesk",

    /*
    Virtual work
    */

    "virtual assistant",
    "executive assistant",

    "administrative assistant",
    "virtual receptionist",

    /*
    Sales
    */

    "sales representative",
    "sales associate",
    "sales executive",

    "business development",
    "business development representative",

    "account executive",
    "account manager",

    /*
    Marketing
    */

    "digital marketing",
    "digital marketer",

    "social media manager",
    "social media specialist",

    "seo",
    "search engine optimization",

    "content marketing",

    /*
    Writing
    */

    "content writer",
    "content writing",

    "copywriter",
    "copywriting",

    "technical writer",

    "editor",
    "proofreader",

    /*
    Design
    */

    "graphic designer",
    "graphic design",

    "ui designer",
    "ux designer",
    "ui/ux",

    "product designer",

    /*
    Finance
    */

    "accountant",
    "accounting",

    "bookkeeper",
    "finance",

    /*
    Education
    */

    "online tutor",
    "online teacher",
    "remote teacher",

    "teaching",
    "tutor",

    /*
    Healthcare / research
    */

    "healthcare",

    "medical writer",
    "medical writing",

    "clinical research",

    "research coordinator",

    /*
    Operations
    */

    "operations",
    "operations specialist",
    "operations manager",

    "project coordinator",
    "project manager",

    "product manager",

    /*
    HR
    */

    "human resources",
    "hr",

    "recruiter",
    "recruitment",

    "talent acquisition",

    /*
    Other professional remote work
    */

    "consultant",
    "consulting",

    "legal assistant",
    "paralegal",

    "translator",
    "translation",

    "transcription",

    "community manager",
    "community specialist"

  ];


  const hasWorldwideSignal =
    worldwideWords.some(
      word => text.includes(word)
    );


  const hasAfricaSignal =
    africaWords.some(
      word => text.includes(word)
    );


  const hasRemoteCategory =
    remoteJobCategories.some(
      word => text.includes(word)
    );


  /*
  ========================================
  7. PHYSICAL REMOTE RESTRICTIONS
  ========================================
  */

  const physicalRestrictions = [

    "remote in the us",
    "remote in usa",
    "remote in the usa",

    "remote in the uk",
    "remote in uk",

    "remote in canada",

    "remote in australia",

    "remote - us",
    "remote - usa",
    "remote - uk",
    "remote - canada",
    "remote - australia",

    "remote, us",
    "remote, usa",
    "remote, uk",
    "remote, canada",
    "remote, australia",

    "remote: us",
    "remote: usa",
    "remote: uk",
    "remote: canada",
    "remote: australia"

  ];


  const physicalRestriction =
    physicalRestrictions.some(
      word => text.includes(word)
    );


  if (physicalRestriction) {
    return false;
  }


  /*
  ========================================
  8. FINAL ELIGIBILITY
  ========================================
  */

  /*
  Worldwide/international jobs:
  definitely include.
  */

  if (hasWorldwideSignal) {
    return true;
  }


  /*
  Jobs mentioning Africa/Nigeria:
  definitely include.
  */

  if (hasAfricaSignal) {
    return true;
  }


  /*
  Genuine remote professional jobs:
  include when there is no obvious
  country restriction.
  */

  if (hasRemoteCategory) {
    return true;
  }


  /*
  Generic remote job with no obvious
  restriction.

  Keep it because legitimate remote jobs
  may not specify their location.
  */

  return true;
}


/*
========================================
GET INTERNATIONAL REMOTE JOBS
========================================
*/

async function getRemoteJobs(search) {

  const results = [];


  /*
  ========================================
  REMOTE JOB SEARCH
  ========================================
  */

  const searchTerms = [

    `${search} remote`,

    `${search} work from home`,

    `${search} work from anywhere`

  ];


  /*
  Make sure the search value is valid.
  */

  const safeSearch =
    String(search || "").trim();


  if (!safeSearch) {
    return [];
  }


  /*
  ========================================
  SEARCH INTERNATIONAL COUNTRIES
  ========================================
  */

  for (
    const country of INTERNATIONAL_COUNTRIES
  ) {

    for (
      const keyword of searchTerms
    ) {

      try {

        const jobs =
          await getJobs(
            country,
            keyword,
            "",
            1
          );


        if (!Array.isArray(jobs)) {
          continue;
        }


        const formatted =
          jobs
            .map(formatJob)
            .filter(Boolean);


        const nigeriaFriendly =
          formatted.filter(
            isNigeriaFriendlyRemoteJob
          );


        results.push(
          ...nigeriaFriendly
        );


      } catch (error) {

        console.error(
          `Remote ${country} failed:`,
          error?.message || error
        );

      }

    }

  }


  /*
  ========================================
  REMOVE DUPLICATES
  ========================================
  */

  return removeDuplicates(results);
}
