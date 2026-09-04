// ============================================================
// TELEGRAM CONFIGURATION
// ============================================================

const TELEGRAM_BOT_TOKEN =
  process.env.TELEGRAM_BOT_TOKEN || "";

const TELEGRAM_CHAT_ID =
  process.env.TELEGRAM_CHAT_ID || "";

const TELEGRAM_ENABLED =
  Boolean(
    TELEGRAM_BOT_TOKEN &&
    TELEGRAM_CHAT_ID
  );


// ============================================================
// TELEGRAM POSTED-JOBS MEMORY
//
// Prevents the same job from being posted repeatedly.
// This memory resets if Render restarts.
// ============================================================

const postedTelegramJobs =
  new Set();


// ============================================================
// SEND TELEGRAM MESSAGE
// ============================================================

async function sendTelegramMessage(text) {

  if (!TELEGRAM_ENABLED) {

    console.log(
      "Telegram disabled: missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID"
    );

    return {
      success: false,
      disabled: true
    };

  }


  const url =
    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;


  const response =
    await fetch(
      url,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json"
        },

        body: JSON.stringify({

          chat_id:
            TELEGRAM_CHAT_ID,

          text,

          parse_mode:
            "HTML",

          disable_web_page_preview:
            false

        })

      }
    );


  const data =
    await response.json();


  if (!response.ok || !data.ok) {

    throw new Error(
      data.description ||
      `Telegram HTTP ${response.status}`
    );

  }


  return data;

}


// ============================================================
// ESCAPE TELEGRAM HTML
// ============================================================

function escapeTelegramHtml(
  value
) {

  return String(
    value || ""
  )
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    );
}


// ============================================================
// CREATE TELEGRAM JOB MESSAGE
// ============================================================

function createTelegramJobMessage(
  job
) {

  const title =
    escapeTelegramHtml(
      job.title
    );

  const company =
    escapeTelegramHtml(
      job.company
    );

  const location =
    escapeTelegramHtml(
      job.location ||
      "Worldwide"
    );

  const employment =
    escapeTelegramHtml(
      job.employmentType ||
      "Full Time"
    );

  const salary =
    escapeTelegramHtml(
      job.salary ||
      "Salary not specified"
    );

  const url =
    job.applicationUrl ||
    job.url ||
    "";


  let message =

`<b>🆕 NEW INTERNATIONAL REMOTE JOB</b>

💼 <b>${title}</b>

🏢 Company: ${company}

🌍 Location: ${location}

🏠 <b>100% REMOTE</b>

🇳🇬 <b>Nigerians can apply from Nigeria</b>

💼 Type: ${employment}

💰 Salary: ${salary}`;


  if (url) {

    message +=

`\n\n🔗 <a href="${escapeTelegramHtml(url)}">APPLY NOW</a>`;

  }


  message +=

`\n\n📌 Source: Himalayas`;

  return message;

}


// ============================================================
// POST NEW JOBS TO TELEGRAM
// ============================================================

async function postNewJobsToTelegram(
  jobs
) {

  if (!TELEGRAM_ENABLED) {

    return {
      enabled: false,
      posted: 0
    };

  }


  let posted = 0;


  for (
    const job of jobs
  ) {

    const jobKey =
      String(
        job.id ||
        `${job.title}-${job.company}`
      )
        .toLowerCase()
        .trim();


    if (!jobKey) {

      continue;

    }


    // Already posted
    if (
      postedTelegramJobs.has(
        jobKey
      )
    ) {

      continue;

    }


    try {

      const message =
        createTelegramJobMessage(
          job
        );


      await sendTelegramMessage(
        message
      );


      postedTelegramJobs.add(
        jobKey
      );


      posted++;


      console.log(
        `📨 Telegram posted: ${job.title}`
      );


      // Small delay between posts
      await new Promise(
        resolve =>
          setTimeout(
            resolve,
            1000
          )
      );


    } catch (error) {

      console.error(
        `❌ Telegram post failed for ${job.title}:`,
        error.message
      );

    }

  }


  return {
    enabled: true,
    posted
  };

}
