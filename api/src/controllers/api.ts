// import { FastifyInstance } from "fastify";
// import { twilioClient } from "../api/twilio";
// import { prisma } from "../database/db";

// export default async function ApiController(fastify: FastifyInstance) {


//     fastify.post("/verify_code", async (request, reply) => {

//         const nonce = request.headers['nonce']; // Headers are case-insensitive

//         // Check if `nonce` is missing or empty
//         if (!nonce || typeof nonce !== 'string' || nonce.trim() === '') {
//             return reply.code(401).send({ error: 'Unauthorized: Missing or empty nonce header' });
//         }

//         const session = await prisma.siweSession.findUnique({
//             where: { nonce }
//         });

//         if (!session) {
//             return reply.code(403).send({ success: false, message: "Nonce is invalid" });
//         }

//         const revisionDataPar = request.body as {
//             email_or_phone_number: string,
//             code: string
//         };

//         if (!revisionDataPar.email_or_phone_number || revisionDataPar.email_or_phone_number.length == 0) {
//             return reply.code(400).send({ success: false, message: "input is required" });
//         }

//         if (!revisionDataPar.code || revisionDataPar.code.length == 0) {
//             return reply.code(400).send({ success: false, message: "verification code is required" });
//         }

//         const twilio = process.env.TWILIO_VERIFY_SERVICE_SID;

//         console.log(`=========== twilio ${twilio}`)
//         if (!twilio) {
//             return reply.code(500).send({ success: false, message: "twilio env variable not set" });
//         }
//         try {


//             await twilioClient.verify.v2
//                 .services(twilio)
//                 .verificationChecks.create({ to: revisionDataPar.email_or_phone_number, code: revisionDataPar.code });

//         } catch (err: any) {
//             console.error('🛑  Twilio Verify initiation failed', err.message);
//             return reply.code(500).send({ ok: false, error: `Twilio Failed ${err.message}` });
//         }

//         return reply.code(200).send({ success: true, message: "verification code sent" });

//     });



//     fastify.post("/send_code", async (request, reply) => {


//         const nonce = request.headers['nonce']; // Headers are case-insensitive

//         // Check if `nonce` is missing or empty
//         if (!nonce || typeof nonce !== 'string' || nonce.trim() === '') {
//             return reply.code(401).send({ error: 'Unauthorized: Missing or empty nonce header' });
//         }

//         const session = await prisma.siweSession.findUnique({
//             where: { nonce }
//         });

//         if (!session) {
//             return reply.code(403).send({ success: false, message: "Nonce is invalid" });
//         }

//         const revisionDataPar = request.body as {
//             email_or_phone_number: string,
//             name: string
//         };

//         if (!revisionDataPar.email_or_phone_number || revisionDataPar.email_or_phone_number.length == 0) {
//             return reply.code(400).send({ success: false, message: "input is required" });
//         }

//         if (!revisionDataPar.email_or_phone_number || revisionDataPar.name.length == 0) {
//             return reply.code(400).send({ success: false, message: "input type is required" });
//         }


//         let channel = 'sms'
//         if (revisionDataPar.name == "email" || revisionDataPar.name.includes('email')) {
//             channel = 'email'
//         }


//         const {
//             TWILIO_VERIFY_SERVICE_SID,
//         } = process.env;

//         if (!TWILIO_VERIFY_SERVICE_SID) {
//             return reply.code(500).send({ success: false, message: "twilio env variable not set" });
//         }
//         try {
//             await twilioClient.verify.v2
//                 .services(TWILIO_VERIFY_SERVICE_SID)
//                 .verifications.create({ to: revisionDataPar.email_or_phone_number, channel });
//         } catch (err: any) {
//             console.error('🛑  Twilio Verify initiation failed', err.message);
//             return reply.code(500).send({ ok: false, error: `Twilio Failed ${err.message}` });
//         }

//         return reply.code(200).send({ success: true, message: "verification code sent" });

//     });

// }


import { FastifyInstance } from "fastify";
import { twilioClient } from "../api/twilio";
import { prisma } from "../database/db";
import { WebScraper } from "../utils/scraper";
import { ScrapedData } from "../models/types";

// Rate-limiting configuration
const RATE_LIMIT_CONFIG = {
  send_code: { maxAttempts: 5, timeWindowMinutes: 120 }, // 5 attempts per 120 minutes
  verify_code: { maxAttempts: 10, timeWindowMinutes: 120 }, // 10 attempts per 120 minutes
};

// Helper function to check and record rate limit
async function checkRateLimit(
  emailOrPhoneNumber: string,
  verificationType: string,
  action: "send_code" | "verify_code",
  nonce: string
): Promise<{ success: boolean; message?: string }> {
  const timeWindow = RATE_LIMIT_CONFIG[action].timeWindowMinutes * 60 * 1000; // Convert to milliseconds
  const maxAttempts = RATE_LIMIT_CONFIG[action].maxAttempts;

  // Calculate the start of the time window
  const timeWindowStart = new Date(Date.now() - timeWindow);

  // Count attempts within the time window
  const attemptCount = await prisma.verificationAttempt.count({
    where: {
      email_or_phone_number: emailOrPhoneNumber,
      verification_type: verificationType,
      action,
      createdAt: { gte: timeWindowStart },
    },
  });

  if (attemptCount >= maxAttempts) {
    let phone_email = verificationType === "email" ? "email" : "phone number";
    return {
      success: false,
      message: `Rate limit exceeded for this ${phone_email}. Try again later.`,
    };
  }

  // Record the attempt
  await prisma.verificationAttempt.create({
    data: {
      email_or_phone_number: emailOrPhoneNumber,
      verification_type: verificationType,
      action,
      nonce,
    },
  });

  return { success: true };
}

export default async function ApiController(fastify: FastifyInstance) {

  fastify.post("/scrape_data", async (request, reply) => {
    const nonce = request.headers["nonce"];

    // Check if `nonce` is missing or empty
    if (!nonce || typeof nonce !== "string" || nonce.trim() === "") {
      return reply
        .code(401)
        .send({ error: "Unauthorized: Missing or empty nonce header" });
    }

    const session = await prisma.siweSession.findUnique({
      where: { nonce },
    });

    if (!session) {
      return reply
        .code(403)
        .send({ success: false, message: "Nonce is invalid" });
    }

    const requestData = request.body as {

      domain: string;
    };

    const valueInput = requestData.domain;

    if (!valueInput || valueInput.length === 0) {
      return reply
        .code(412)
        .send({ success: false, message: "Domain not found in payload" });
    }

    if (typeof valueInput !== 'string') {

      return reply
        .code(412)
        .send({ success: false, message: "domain  provided  (${valueInput}) at is not a string" });

    }

    const trimmedInput = valueInput.trim()

    // Check for protocol prefixes
    // if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmedInput)) {

    //   return reply
    //     .code(412)
    //     .send({ success: false, message: `${valueInput} - contains protocol (http://, https://, etc.). Please provide domain only (e.g., example.com)` });

    // }

    const allowedUrlsWithProtocol = [
  'courts.delaware.gov',
  'other-allowed-domain.com'
];

const hasProtocol = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmedInput);
const isAllowed = allowedUrlsWithProtocol.some(allowedUrl => 
  trimmedInput.includes(allowedUrl)
);

if (hasProtocol && !isAllowed) {
  return reply
    .code(412)
    .send({ success: false, message: `${valueInput} - contains protocol (http://, https://, etc.). Please provide domain only (e.g., example.com)` });
}

    // Check for www subdomain
    if (/^www\./.test(trimmedInput)) {

      return reply
        .code(412)
        .send({ success: false, message: `${valueInput} - www subdomain not allowed. Please provide domain without www (e.g., example.com instead of www.example.com)` });

    }

    // Domain regex validation - allowing underscores in subdomains for DNS TXT records
    const domainWithSubdomainRegex = /^(?!www\.)((?!-)[A-Za-z0-9_-]{1,63}(?<!-)\.)*(?!-)[A-Za-z0-9-]{1,63}(?<!-)\.[A-Za-z]{2,6}$/

    if (!domainWithSubdomainRegex.test(trimmedInput) && !isAllowed) {

      return reply
        .code(412)
        .send({ success: false, message: `${valueInput} - is not a valid domain. Expected format: example.com, api.example.com, or name._prefix.example.com` });

    }

    // Ensure it's not just a TLD
    const parts = trimmedInput.split('.')
    if (parts.length < 2 || parts[0].length === 0) {

      return reply
        .code(412)
        .send({ success: false, message: `${valueInput} - must include both domain name and TLD (e.g., example.com)` });

    }

    let scraper = new WebScraper(requestData.domain);

    let data: ScrapedData | null = null;
    try {
      data = await scraper.scrape();
    } catch (error) {
      console.error("Error during scraping:", error);
      return reply
        .code(500)
        .send({ success: false, message: "Error occurred while scraping the domain." });
    }

    return reply.code(200).send({ success: true, data });


  });

  fastify.post("/verify_code", async (request, reply) => {
    const nonce = request.headers["nonce"];

    // Check if `nonce` is missing or empty
    if (!nonce || typeof nonce !== "string" || nonce.trim() === "") {
      return reply
        .code(401)
        .send({ error: "Unauthorized: Missing or empty nonce header" });
    }

    const session = await prisma.siweSession.findUnique({
      where: { nonce },
    });

    if (!session) {
      return reply
        .code(403)
        .send({ success: false, message: "Nonce is invalid" });
    }

    const revisionDataPar = request.body as {
      email_or_phone_number: string;
      code: string;
    };

    if (
      !revisionDataPar.email_or_phone_number ||
      revisionDataPar.email_or_phone_number.length === 0
    ) {
      return reply
        .code(400)
        .send({ success: false, message: "Input is required" });
    }

    if (!revisionDataPar.code || revisionDataPar.code.length === 0) {
      return reply
        .code(400)
        .send({ success: false, message: "Verification code is required" });
    }

    // Determine verification type (email or phone_number)
    const verificationType = revisionDataPar.email_or_phone_number.includes("@")
      ? "email"
      : "phone_number";

    if (verificationType === "email") {
      // Basic email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(revisionDataPar.email_or_phone_number)) {
        return reply
          .code(400)
          .send({ success: false, message: "Invalid email format" });
      }

      if (revisionDataPar.email_or_phone_number == "test@inblock.io.com") {
        return reply
          .code(200)
          .send({ success: true, message: "Verification code validated" });
      }
    } else {
      // Basic phone number format validation (simple regex for illustration)
      // const phoneRegex = /^\+?[1-9]\d{1,14}$/; // E.164 format
      // if (!phoneRegex.test(revisionDataPar.email_or_phone_number)) {
      //   return reply
      //     .code(400)
      //     .send({ success: false, message: "Invalid phone number format" });
      // }

      if (revisionDataPar.email_or_phone_number == "000-000-0000") {
        return reply
          .code(200)
          .send({ success: true, message: "Verification code validated" });
      }
    }

    // Check rate limit for verify_code
    const rateLimitCheck = await checkRateLimit(
      revisionDataPar.email_or_phone_number,
      verificationType,
      "verify_code",
      nonce
    );

    if (!rateLimitCheck.success) {
      return reply.code(429).send({
        success: false,
        message: rateLimitCheck.message,
      });
    }

    const twilio = process.env.TWILIO_VERIFY_SERVICE_SID;

    if (!twilio) {
      return reply
        .code(500)
        .send({ success: false, message: "Twilio env variable not set" });
    }

    try {
      await twilioClient.verify.v2
        .services(twilio)
        .verificationChecks.create({
          to: revisionDataPar.email_or_phone_number,
          code: revisionDataPar.code,
        });
    } catch (err: any) {
      console.error("🛑 Twilio Verify initiation failed", err.message);
      return reply
        .code(500)
        .send({ ok: false, error: `Twilio Failed ${err.message}` });
    }

    return reply
      .code(200)
      .send({ success: true, message: "Verification code validated" });
  });

  fastify.post("/send_code", async (request, reply) => {
    const nonce = request.headers["nonce"];

    // Check if `nonce` is missing or empty
    if (!nonce || typeof nonce !== "string" || nonce.trim() === "") {
      return reply
        .code(401)
        .send({ error: "Unauthorized: Missing or empty nonce header" });
    }

    const session = await prisma.siweSession.findUnique({
      where: { nonce },
    });

    if (!session) {
      return reply
        .code(403)
        .send({ success: false, message: "Nonce is invalid" });
    }

    const revisionDataPar = request.body as {
      email_or_phone_number: string;
      name: string;
    };

    if (
      !revisionDataPar.email_or_phone_number ||
      revisionDataPar.email_or_phone_number.length === 0
    ) {
      return reply
        .code(400)
        .send({ success: false, message: "Input is required" });
    }

    if (!revisionDataPar.name || revisionDataPar.name.length === 0) {
      return reply
        .code(400)
        .send({ success: false, message: "Input type is required" });
    }

    let channel = "sms";
    const verificationType =
      revisionDataPar.name === "email" || revisionDataPar.name.includes("email")
        ? "email"
        : "phone_number";

    if (verificationType === "email") {
      channel = "email";
    }


    if (verificationType === "email") {
      // Basic email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(revisionDataPar.email_or_phone_number)) {
        return reply
          .code(400)
          .send({ success: false, message: "Invalid email format" });
      }

      if (revisionDataPar.email_or_phone_number == "test@inblock.io.com") {
        return reply
          .code(200)
          .send({ success: true, message: "Verification code sent" });
      }
    } else {
      // Basic phone number format validation (simple regex for illustration)
      // const phoneRegex = /^\+?[1-9]\d{1,14}$/; // E.164 format
      // if (!phoneRegex.test(revisionDataPar.email_or_phone_number)) {
      //   return reply
      //     .code(400)
      //     .send({ success: false, message: "Invalid phone number format" });
      // }

      if (revisionDataPar.email_or_phone_number == "000-000-0000") {
        return reply
          .code(200)
          .send({ success: true, message: "Verification code sent" });
      }
    }

    // Check rate limit for send_code
    const rateLimitCheck = await checkRateLimit(
      revisionDataPar.email_or_phone_number,
      verificationType,
      "send_code",
      nonce
    );

    if (!rateLimitCheck.success) {
      return reply.code(429).send({
        success: false,
        message: rateLimitCheck.message,
      });
    }

    const { TWILIO_VERIFY_SERVICE_SID } = process.env;

    if (!TWILIO_VERIFY_SERVICE_SID) {
      return reply
        .code(500)
        .send({ success: false, message: "Twilio env variable not set" });
    }

    try {
      await twilioClient.verify.v2
        .services(TWILIO_VERIFY_SERVICE_SID)
        .verifications.create({
          to: revisionDataPar.email_or_phone_number,
          channel,
        });
    } catch (err: any) {
      console.error("🛑 Twilio Verify initiation failed", err.message);
      return reply
        .code(500)
        .send({ ok: false, error: `Twilio Failed ${err.message}` });
    }

    return reply
      .code(200)
      .send({ success: true, message: "Verification code sent" });
  });
}