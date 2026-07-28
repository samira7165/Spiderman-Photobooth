import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import { readFileSync } from "fs";
import path from "path";
import prisma from "./prisma.js";

// =============================================================
// AI SERVICE — two swappable provider slots
// =============================================================
// Slot 1 is tried first, slot 2 is the fallback if slot 1 fails.
// Each slot independently picks which provider backs it (Gemini
// or OpenAI today). Settings are read fresh from the ApiSettings
// table on every call, falling back to .env if unset in the DB,
// so changes in the admin dashboard take effect immediately.
// =============================================================

const PROVIDER_DEFAULTS = {
  gemini: {
    apiKeyEnv: "GEMINI_API_KEY",
    modelEnv: "GEMINI_MODEL",
    defaultModel: "gemini-2.0-flash-exp",
  },
  openai: {
    apiKeyEnv: "OPENAI_API_KEY",
    modelEnv: "OPENAI_MODEL",
    defaultModel: "gpt-image-1",
  },
};

async function getSlotSettings() {
  const settings = await prisma.apiSettings.findUnique({ where: { id: 1 } });

  function resolveSlot(provider, apiKey, model) {
    const resolvedProvider = provider || "gemini";
    const defaults = PROVIDER_DEFAULTS[resolvedProvider];
    return {
      provider: resolvedProvider,
      apiKey: apiKey || (defaults ? process.env[defaults.apiKeyEnv] : undefined),
      model: model || (defaults ? process.env[defaults.modelEnv] || defaults.defaultModel : undefined),
    };
  }

  return [
    resolveSlot(settings?.slot1Provider || "gemini", settings?.slot1ApiKey, settings?.slot1Model),
    resolveSlot(settings?.slot2Provider || "openai", settings?.slot2ApiKey, settings?.slot2Model),
  ];
}

/**
 * Generate an image by trying slot 1, then slot 2 as a fallback.
 * @param {string} prompt - this template's prompt, sent as-is
 * @param {string} userPhotoUrl - the guest's captured photo (their face/identity)
 * @param {string} referenceImageUrl - the template's style reference image
 * Returns { imageBuffer, usedApi }
 */
export async function generateImage(prompt, userPhotoUrl, referenceImageUrl) {
  const slots = await getSlotSettings();
  const errors = [];

  for (const slot of slots) {
    try {
      console.log(`[AI] Trying ${slot.provider}...`);
      const result = await dispatchGenerate(slot, prompt, userPhotoUrl, referenceImageUrl);
      return { imageBuffer: result, usedApi: slot.provider };
    } catch (err) {
      console.error(`[AI] ${slot.provider} failed:`, err.message);
      errors.push(`${slot.provider}: ${err.message}`);
    }
  }

  throw new Error(`All providers failed. ${errors.join(". ")}`);
}

function dispatchGenerate(slot, prompt, userPhotoUrl, referenceImageUrl) {
  switch (slot.provider) {
    case "gemini":
      return generateWithGemini(prompt, userPhotoUrl, referenceImageUrl, slot);
    case "openai":
      return generateWithOpenAI(prompt, userPhotoUrl, referenceImageUrl, slot);
    default:
      return Promise.reject(new Error(`Unsupported provider: ${slot.provider}`));
  }
}

// =============================================================
// GEMINI IMAGE GENERATION
// =============================================================
async function generateWithGemini(prompt, userPhotoUrl, referenceImageUrl, slot) {
  const gemini = new GoogleGenerativeAI(slot.apiKey);
  const model = gemini.getGenerativeModel({
    model: slot.model,
    generationConfig: {
      responseModalities: ["image", "text"],
    },
  });

  // Build the request parts: guest photo first, then style reference
  const parts = [];

  if (userPhotoUrl) {
    try {
      const photoData = await fetchImageAsBase64(userPhotoUrl);
      parts.push({
        inlineData: {
          mimeType: photoData.mimeType,
          data: photoData.base64,
        },
      });
    } catch (err) {
      console.warn("[AI] Could not load user photo:", err.message);
    }
  }

  if (referenceImageUrl) {
    try {
      const imageData = await fetchImageAsBase64(referenceImageUrl);
      parts.push({
        inlineData: {
          mimeType: imageData.mimeType,
          data: imageData.base64,
        },
      });
    } catch (err) {
      console.warn("[AI] Could not load reference image:", err.message);
    }
  }

  parts.push({
    text: `Generate an image based on this description: ${prompt}. The first image provided is a photo of the real person — preserve their face and identity. The second image (if provided) is a style reference for the suit and pose. Output only the image.`,
  });

  const response = await model.generateContent(parts);
  const result = response.response;

  // Extract image from response
  for (const candidate of result.candidates || []) {
    for (const part of candidate.content?.parts || []) {
      if (part.inlineData) {
        return Buffer.from(part.inlineData.data, "base64");
      }
    }
  }

  throw new Error("Gemini returned no image in response");
}

// =============================================================
// OPENAI IMAGE GENERATION
// =============================================================
async function generateWithOpenAI(prompt, userPhotoUrl, referenceImageUrl, slot) {
  const openai = new OpenAI({ apiKey: slot.apiKey });

  // Build the request
  const requestBody = {
    model: slot.model,
    prompt: prompt,
    n: 1,
    size: "1024x1024",
  };

  // Include the guest's photo and the style reference, if available
  const images = [];

  if (userPhotoUrl) {
    try {
      const photoData = await fetchImageAsBase64(userPhotoUrl);
      images.push({
        type: "base64",
        media_type: photoData.mimeType,
        data: photoData.base64,
      });
    } catch (err) {
      console.warn("[AI] Could not load user photo for OpenAI:", err.message);
    }
  }

  if (referenceImageUrl) {
    try {
      const imageData = await fetchImageAsBase64(referenceImageUrl);
      images.push({
        type: "base64",
        media_type: imageData.mimeType,
        data: imageData.base64,
      });
    } catch (err) {
      console.warn("[AI] Could not load reference image for OpenAI:", err.message);
    }
  }

  if (images.length > 0) {
    requestBody.image = images;
  }

  const response = await openai.images.generate(requestBody);

  // Handle response — could be URL or b64_json
  const imageResult = response.data[0];

  if (imageResult.b64_json) {
    return Buffer.from(imageResult.b64_json, "base64");
  }

  if (imageResult.url) {
    // Download the image from URL
    const imgResponse = await fetch(imageResult.url);
    const arrayBuffer = await imgResponse.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  throw new Error("OpenAI returned no image data");
}

// =============================================================
// HELPER: Fetch any image URL as base64
// =============================================================
async function fetchImageAsBase64(url) {
  // Handle local file paths
  if (url.startsWith("/")) {
    const fullPath = path.join(process.cwd(), "public", url);
    const buffer = readFileSync(fullPath);
    const ext = path.extname(url).toLowerCase();
    const mimeMap = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".webp": "image/webp",
    };
    return {
      base64: buffer.toString("base64"),
      mimeType: mimeMap[ext] || "image/jpeg",
    };
  }

  // Handle remote URLs
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const contentType = response.headers.get("content-type") || "image/jpeg";

  return {
    base64: buffer.toString("base64"),
    mimeType: contentType,
  };
}
