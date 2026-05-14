"use client";

import { X, Download } from "lucide-react";

type Props = {
  open: boolean;
  url: string;
  fileName?: string | null;
  isImage: boolean;
  onClose: () => void;
};

export default function ChatAttachmentLightbox({
  open,
  url,
  fileName,
  isImage,
  onClose,
}: Props) {
  if (!open) return null;

  const label = (fileName && fileName.trim()) || "download";

  return (
    <div
      className="fixed inset-0 z-[400] flex flex-col bg-black/90"
      role="dialog"
      aria-modal
      aria-label="Attachment preview"
    >
      <div className="flex items-center justify-end gap-2 p-3 shrink-0">
        <a
          href={url}
          download={label}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-2 text-sm text-white hover:bg-white/25"
        >
          <Download className="w-4 h-4" />
          Download
        </a>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full p-2 text-white hover:bg-white/15"
          aria-label="Close"
        >
          <X className="w-6 h-6" />
        </button>
      </div>
      <div className="flex-1 flex items-center justify-center p-4 min-h-0 overflow-auto">
        {isImage ? (
          // eslint-disable-next-line @next/next/no-img-element -- dynamic Cloudinary URLs from chat
          <img
            src={url}
            alt={label}
            className="max-w-full max-h-[calc(100vh-8rem)] object-contain rounded-lg shadow-xl"
          />
        ) : (
          <div className="max-w-md rounded-2xl bg-white/10 p-6 text-center text-white space-y-4">
            <p className="text-sm break-all opacity-90">{fileName || "File"}</p>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-rose px-5 py-2.5 text-sm font-medium text-white hover:opacity-95"
            >
              Open file
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
