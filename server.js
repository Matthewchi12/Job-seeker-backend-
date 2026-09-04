/*
========================================
GET JOBS FROM ADZUNA
========================================
*/

async function getJobs(country, keyword, page = 1) {

  if (!ADZUNA_APP_ID || !ADZUNA_APP_KEY) {
    throw new Error(
      "ADZUNA_APP_ID or ADZUNA_APP_KEY is missing in Render Environment Variables"
    );
  }

  const url =
    `https://api.adzuna.com/v1/api/jobs/${country}/search/${page}` +
    `?app_id=${encodeURIComponent(ADZUNA_APP_ID)}` +
    `&app_key=${encodeURIComponent(ADZUNA_APP_KEY)}` +
    `&results_per_page=50` +
    `&what=${encodeURIComponent(keyword)}` +
    `&content-type=application/json`;

  console.log("Adzuna request:", country, keyword);

  const response = await fetch(url);

  const text = await response.text();

  if (!response.ok) {
    throw new Error(
      `Adzuna ${response.status}: ${text}`
    );
  }

  let data;

  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(
      "Adzuna returned invalid JSON: " + text.substring(0, 300)
    );
  }

  console.log(
    `Adzuna ${country} returned ${
      Array.isArray(data.results)
        ? data.results.length
        : 0
    } jobs`
  );

  return Array.isArray(data.results)
    ? data.results
    : [];
}


/*
========================================
GET INTERNATIONAL REMOTE JOBS
========================================
*/

async function getRemoteJobs(search) {

  const safeSearch =
    String(search || "customer support").trim();

  const searchTerms = [
    safeSearch,
    `${safeSearch} remote`,
    `${safeSearch} work from home`
  ];

  const results = [];

  for (const country of INTERNATIONAL_COUNTRIES) {

    for (const keyword of searchTerms) {

      try {

        const jobs = await getJobs(
          country,
          keyword,
          1
        );

        /*
        IMPORTANT:
        First format the jobs.
        Then check if they are remote.
        */

        const formatted = jobs.map(formatJob);

        const filtered = formatted.filter(
          isNigeriaFriendlyRemoteJob
        );

        console.log(
          `${country} | ${keyword} | ` +
          `found: ${jobs.length} | ` +
          `accepted: ${filtered.length}`
        );

        results.push(...filtered);

      } catch (error) {

        /*
        DON'T HIDE THE ERROR
        */

        console.error(
          `❌ ${country} | ${keyword} FAILED:`,
          error.message
        );

      }
    }
  }

  const uniqueJobs =
    removeDuplicates(results);

  console.log(
    `========================================`
  );

  console.log(
    `TOTAL JOBS FOUND: ${results.length}`
  );

  console.log(
    `TOTAL UNIQUE JOBS: ${uniqueJobs.length}`
  );

  console.log(
    `========================================`
  );

  return uniqueJobs;
}
