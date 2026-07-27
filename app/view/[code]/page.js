"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

// =============================================================
// PUBLIC VIEWER PAGE — /view/[code]
// =============================================================
// This is where QR codes point to.
// Shows the generated Spiderman photo with a download button.
// =============================================================

export default function ViewPage() {
  const { code } = useParams();
  const [photo, setPhoto] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPhoto() {
      try {
        const res = await fetch(`/api/images/${code}`);
        if (!res.ok) {
          setError("Photo not found");
          return;
        }
        const data = await res.json();
        setPhoto(data);
      } catch {
        setError("Failed to load photo");
      } finally {
        setLoading(false);
      }
    }
    fetchPhoto();
  }, [code]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl animate-pulse">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-red-500 text-2xl font-bold">Photo Not Found</h1>
          <p className="text-gray-400 mt-2">
            Code: {code} — This photo may not exist or is still processing.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
      <div className="max-w-lg w-full">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-white text-2xl font-bold">
            🕷️ Spiderman Photobooth
          </h1>
          <p className="text-gray-400 mt-1">Code: {photo.code}</p>
          <p className="text-gray-500 text-sm">Photo by: {photo.name}</p>
        </div>

        {/* Image */}
        <div className="rounded-lg overflow-hidden shadow-2xl border border-gray-800">
          <img
            src={photo.imageUrl}
            alt={`Spiderman photo for ${photo.name}`}
            className="w-full h-auto"
          />
        </div>

        {/* Download Button */}
        <div className="mt-6 text-center">
          <a
            href={photo.imageUrl}
            download={`spiderman-${photo.code}.png`}
            className="inline-block bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-lg transition-colors"
          >
            Download Photo
          </a>
        </div>

        {/* Footer */}
        <p className="text-gray-600 text-xs text-center mt-8">
          Powered by XR Interactive
        </p>
      </div>
    </div>
  );
}
