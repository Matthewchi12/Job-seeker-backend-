/*
========================================
NIGERIA-FRIENDLY REMOTE JOB CHECK
========================================

ONLY accept remote jobs that appear to be
available to someone working from Nigeria.

We reject country-restricted jobs.

We require a worldwide / international /
Africa / Nigeria signal for jobs that don't
explicitly mention Nigeria.
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
  ========================================
  MUST BE REMOTE
  ========================================
  */

  if (!isRemoteJob(job)) {
    return false;
  }


  /*
  ========================================
  COUNTRY RESTRICTIONS
  ========================================
  */

  const restrictions = [

    /* UNITED STATES */

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

    "us residents",
    "usa residents",

    "residents of the us",
    "residents of usa",

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

    /* UNITED KINGDOM */

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

    /* CANADA */

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

    /* AUSTRALIA */

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

    "must have australian work authorization",

    "right to work in australia",

    "authorized to work in australia",

    /* NEW ZEALAND */

    "new zealand only",

    "new zealand residents only",

    "new zealand residents",

    "must be located in new zealand",

    "must reside in new zealand",

    "right to work in new zealand",

    "authorized to work in new zealand",

    /* EUROPE */

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

    /* OTHER COUNTRIES */

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

    /* LOCATION-BASED REMOTE */

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


  /*
  ========================================
  REJECT EXPLICIT RESTRICTIONS
  ========================================
  */

  if (
    restrictions.some(
      phrase => text.includes(phrase)
    )
  ) {
    return false;
  }


  /*
  ========================================
  NIGERIA SIGNAL
  ========================================
  */

  const nigeriaSignals = [

    "nigeria",

    "nigerian",

    "nigeria-based",

    "nigeria based",

    "based in nigeria",

    "located in nigeria",

    "remote from nigeria",

    "work from nigeria",

    "working from nigeria",

    "nigerian applicants",

    "nigerian candidates",

    "nigeria applicants",

    "nigeria candidates"

  ];


  /*
  ========================================
  AFRICA SIGNAL
  ========================================
  */

  const africaSignals = [

    "africa",

    "african",

    "africa-based",

    "africa based",

    "based in africa",

    "remote africa",

    "remote - africa",

    "remote, africa",

    "african applicants",

    "african candidates",

    "sub-saharan africa",

    "sub saharan africa",

    "west africa",

    "east africa",

    "ghana",

    "kenya",

    "south africa",

    "nigeria"

  ];


  /*
  ========================================
  WORLDWIDE SIGNAL
  ========================================
  */

  const worldwideSignals = [

    "worldwide",

    "remote worldwide",

    "work from anywhere",

    "work-from-anywhere",

    "anywhere in the world",

    "anywhere around the world",

    "open worldwide",

    "open to applicants worldwide",

    "open to candidates worldwide",

    "worldwide applicants",

    "worldwide candidates",

    "international applicants",

    "international candidates",

    "international applicants welcome",

    "international candidates welcome",

    "open to international applicants",

    "open to international candidates",

    "global remote",

    "remote globally",

    "globally remote",

    "global applicants",

    "global candidates",

    "global team",

    "globally distributed",

    "distributed team",

    "distributed workforce",

    "fully distributed",

    "location independent",

    "location-independent",

    "no geographic restrictions",

    "no geographical restrictions",

    "any location",

    "any country",

    "all countries",

    "all locations"

  ];


  /*
  ========================================
  EXPLICIT NIGERIA = ACCEPT
  ========================================
  */

  if (
    nigeriaSignals.some(
      signal => text.includes(signal)
    )
  ) {
    return true;
  }


  /*
  ========================================
  AFRICA = ACCEPT
  ========================================
  */

  if (
    africaSignals.some(
      signal => text.includes(signal)
    )
  ) {
    return true;
  }


  /*
  ========================================
  WORLDWIDE = ACCEPT
  ========================================
  */

  if (
    worldwideSignals.some(
      signal => text.includes(signal)
    )
  ) {
    return true;
  }


  /*
  ========================================
  IMPORTANT
  ========================================

  Do NOT automatically accept every generic
  "remote" job.

  This prevents jobs such as:

  "Work from Home - Orlando, Florida"

  from being shown to Nigerians when the
  employer hasn't indicated international
  eligibility.
  ========================================
  */

  return false;

}
