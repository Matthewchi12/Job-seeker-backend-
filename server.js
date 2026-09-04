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
  const safeKeyword = String(keyword || "").trim();
  if (!safeKeyword) {
    throw new Error("Adzuna search keyword is empty");
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
  try {
    const response = await fetch(url);
    const text = await response.text();
    if (!response.ok) {
      console.error(
        `❌ Adzuna ${country} HTTP ${response.status}:`,
        text.substring(0, 500)
      );
      throw new Error(
        `Adzuna ${response.status}: ${text.substring(0, 500)}`
      );
    }
    let data;
    try {
      data = JSON.parse(text);
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
  } catch (error) {
    console.error(
      `❌ Adzuna ${country} request failed:`,
      error.message
    );
    throw error;
  }
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
        Format jobs first.
        Then check whether they are
        suitable for Nigerians working remotely.
        */
        const formatted = jobs
          .map(formatJob)
          .filter(Boolean);
        const filtered =
          formatted.filter(
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
        Continue searching other countries
        even if one Adzuna request fails.
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
/*
========================================
GET VISA SPONSORSHIP JOBS
========================================
*/
async function getVisaJobs(search) {
  const safeSearch =
    String(search || "customer support").trim();
  /*
  Don't search only for the exact phrase
  "visa sponsorship".
  Different employers use different wording.
  */
  const searchTerms = [
    `${safeSearch} visa sponsorship`,
    `${safeSearch} visa`,
    `${safeSearch} sponsorship`,
    `${safeSearch} work visa`,
    `${safeSearch} skilled worker`
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
        const formatted = jobs
          .map(formatJob)
          .filter(Boolean);
        /*
        Check the actual job text for
        sponsorship/visa-related wording.
        */
        const filtered = formatted.filter(job => {
          const text = (
            `${job.title || ""} ` +
            `${job.description || ""} ` +
            `${job.location || ""} ` +
            `${job.company || ""}`
          ).toLowerCase();
          return (
            text.includes("visa") ||
            text.includes("sponsor") ||
            text.includes("work permit") ||
            text.includes("work visa") ||
            text.includes("skilled worker") ||
            text.includes("relocation")
          );
        });
        console.log(
          `${country} | ${keyword} | ` +
          `found: ${jobs.length} | ` +
          `visa accepted: ${filtered.length}`
        );
        results.push(...filtered);
      } catch (error) {
        console.error(
          `❌ ${country} | ${keyword} VISA FAILED:`,
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
    `TOTAL VISA JOBS FOUND: ${results.length}`
  );
  console.log(
    `TOTAL UNIQUE VISA JOBS: ${uniqueJobs.length}`
  );
  console.log(
    `========================================`
  );
  return uniqueJobs;
}
