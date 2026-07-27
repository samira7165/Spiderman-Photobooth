import prisma from "./prisma.js";
import { generateImage } from "./ai-service.js";
import { getTemplate } from "./templates.js";
import { generateQRCode } from "./qrcode.js";
import { saveFile } from "./storage.js";
import { nanoid } from "nanoid";

// =============================================================
// DB-BASED QUEUE PROCESSOR
// =============================================================
// Max concurrent jobs (1 = sequential processing)
const MAX_CONCURRENT = 1;

// In-memory lock to prevent double-processing in the same instance
let activeJobs = 0;

/**
 * Try to process the next queued job.
 * Called by the status polling endpoint.
 * Returns true if a job was picked up.
 */
export async function tryProcessNext() {
  if (activeJobs >= MAX_CONCURRENT) {
    return false;
  }

  // Find the oldest queued request
  const job = await prisma.photoRequest.findFirst({
    where: { status: "queued" },
    orderBy: { createdAt: "asc" },
  });

  if (!job) return false;

  // Check if anything is already processing
  const processingCount = await prisma.photoRequest.count({
    where: { status: "processing" },
  });

  if (processingCount >= MAX_CONCURRENT) return false;

  // Claim the job
  activeJobs++;
  try {
    await prisma.photoRequest.update({
      where: { id: job.id },
      data: { status: "processing" },
    });

    // Process it
    await processJob(job);
  } catch (err) {
    console.error(`[Queue] Job ${job.id} failed:`, err);
    await prisma.photoRequest.update({
      where: { id: job.id },
      data: {
        status: "failed",
        errorMsg: err.message,
      },
    });
  } finally {
    activeJobs--;
  }

  return true;
}

/**
 * Process a single photo generation job.
 */
async function processJob(job) {
  console.log(`[Queue] Processing job ${job.id} (Hall ${job.hall}, Template ${job.templateId})`);

  // 1. Get the template
  const template = await getTemplate(job.templateId);

  // 2. Generate image with AI
  const { imageBuffer, usedApi } = await generateImage(
    template.prompt,
    template.referenceImage
  );

  // 3. Generate unique code (e.g., SP-A1B2C3)
  const code = `SP-${nanoid(6).toUpperCase()}`;

  // 4. Save the generated image (local file in dev, Vercel Blob in prod)
  const filename = `${code}.png`;
  const imageUrl = await saveFile(filename, imageBuffer, "image/png");

  // 5. Generate QR code pointing to the image viewer page
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const viewerUrl = `${baseUrl}/view/${code}`;
  const qrCodeDataUrl = await generateQRCode(viewerUrl);

  // Save QR code the same way
  const qrBuffer = Buffer.from(qrCodeDataUrl.split(",")[1], "base64");
  const qrFilename = `${code}-qr.png`;
  const qrCodeUrl = await saveFile(qrFilename, qrBuffer, "image/png");

  // 6. Update DB with results
  await prisma.photoRequest.update({
    where: { id: job.id },
    data: {
      status: "completed",
      code,
      imageUrl,
      qrCodeUrl,
      usedApi,
    },
  });

  console.log(`[Queue] Job ${job.id} completed → Code: ${code}`);
}

/**
 * Get queue position for a specific request.
 */
export async function getQueuePosition(requestId) {
  const request = await prisma.photoRequest.findUnique({
    where: { id: requestId },
  });

  if (!request) return null;

  if (request.status !== "queued") {
    return { position: 0, status: request.status };
  }

  // Count how many are ahead in the queue
  const ahead = await prisma.photoRequest.count({
    where: {
      status: "queued",
      createdAt: { lt: request.createdAt },
    },
  });

  // +1 for currently processing
  const processing = await prisma.photoRequest.count({
    where: { status: "processing" },
  });

  return {
    position: ahead + processing + 1,
    status: "queued",
  };
}
