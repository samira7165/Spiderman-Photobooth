import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import { readFileSync } from "fs";
import path from "path";

// =============================================================
// AI SERVICE — Gemini Primary, OpenAI Fallback
// =============================================================

const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Generate an image using Gemini (primary) with OpenAI fallback.
 * Returns { imageBuffer, usedApi }
 */
export async function generateImage(prompt, referenceImageUrl) {
  // Try Gemini first
  try {
    console.log("[AI] Trying Gemini...");
    const result = await generateWithGemini(prompt, referenceImageUrl);
    return { imageBuffer: result, usedApi: "gemini" };
  } catch (err) {
    console.error("[AI] Gemini failed:", err.message);
  }

  // Fallback to OpenAI
  try {
    console.log("[AI] Trying OpenAI fallback...");
    const result = await generateWithOpenAI(prompt, referenceImageUrl);
    return { imageBuffer: result, usedApi: "openai" };
  } catch (err) {
    console.error("[AI] OpenAI also failed:", err.message);
    throw new Error(`Both APIs failed. Gemini: ${err.message}`);
  }
}

// =============================================================
// GEMINI IMAGE GENERATION
// =============================================================
async function generateWithGemini(prompt, referenceImageUrl) {
  const modelName = process.env.GEMINI_MODEL || "gemini-2.0-flash-exp";

  const model = gemini.getGenerativeModel({
    model: modelName,
    generationConfig: {
      responseModalities: ["image", "text"],
    },
  });

  // Build the request parts
  const parts = [];

  // If there's a reference image, include it
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
    text: `Generate an image based on this description: ${prompt}. Use the reference image as a style guide if provided. Output only the image.`,
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
async function generateWithOpenAI(prompt, referenceImageUrl) {
  const modelName = process.env.OPENAI_MODEL || "gpt-image-1";

  // Build the request
  const requestBody = {
    model: modelName,
    prompt: prompt,
    n: 1,
    size: "1024x1024",
  };

  // If model supports image input and we have a reference, include it
  // For gpt-image-1/2, we can include reference images
  if (referenceImageUrl) {
    try {
      const imageData = await fetchImageAsBase64(referenceImageUrl);
      requestBody.image = [
        {
          type: "base64",
          media_type: imageData.mimeType,
          data: imageData.base64,
        },
      ];
    } catch (err) {
      console.warn("[AI] Could not load reference image for OpenAI:", err.message);
    }
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
