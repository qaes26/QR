"use client";

import { useRef, useState, useCallback } from "react";

interface ClientViewProps {
  isConnected: boolean;
  isPeerReady: boolean;
  sendFile: (file: File) => Promise<void>;
  error: string | null;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

interface SentFile {
  id: string;
  name: string;
  size: number;
  status: "sending" | "sent" | "error";
}

export default function ClientView({
  isConnected,
  isPeerReady,
  sendFile,
  error,
}: ClientViewProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sentFiles, setSentFiles] = useState<SentFile[]>([]);
  const [isSending, setIsSending] = useState(false);

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      setIsSending(true);

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileId = `${Date.now()}-${i}`;

        const sentItem: SentFile = {
          id: fileId,
          name: file.name,
          size: file.size,
          status: "sending",
        };

        setSentFiles((prev) => [sentItem, ...prev]);

        try {
          await sendFile(file);
          setSentFiles((prev) =>
            prev.map((f) =>
              f.id === fileId ? { ...f, status: "sent" as const } : f
            )
          );
        } catch {
          setSentFiles((prev) =>
            prev.map((f) =>
              f.id === fileId ? { ...f, status: "error" as const } : f
            )
          );
        }
      }

      setIsSending(false);
      // Reset the input so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [sendFile]
  );

  return (
    <div className="flex-1 flex flex-col items-center px-4 py-8 fade-in">
      {/* Header */}
      <div className="text-center mb-8 mt-4">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-300 bg-clip-text text-transparent mb-2">
          QR File Share
        </h1>
        <p className="text-zinc-500 text-sm">إرسال الملفات إلى اللابتوب</p>
      </div>

      {/* Connection Status Card */}
      <div className="glass-card p-6 w-full max-w-sm mb-6 slide-up">
        <div className="flex items-center gap-3">
          <div
            className={`w-3 h-3 rounded-full flex-shrink-0 ${
              isConnected
                ? "bg-emerald-400 pulse-connected"
                : isPeerReady
                ? "bg-amber-400 pulse-disconnected"
                : "bg-zinc-600"
            }`}
          />
          <div>
            <p
              className={`text-sm font-medium ${
                isConnected
                  ? "text-emerald-400"
                  : isPeerReady
                  ? "text-amber-400"
                  : "text-zinc-500"
              }`}
            >
              {isConnected
                ? "متصل باللابتوب"
                : isPeerReady
                ? "جارٍ الاتصال..."
                : "جارٍ التهيئة..."}
            </p>
            <p className="text-xs text-zinc-600 mt-0.5">
              {isConnected
                ? "يمكنك إرسال الملفات الآن"
                : "يرجى الانتظار حتى يتم الاتصال"}
            </p>
          </div>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="w-full max-w-sm mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 fade-in">
          <p className="text-red-400 text-sm text-center">{error}</p>
        </div>
      )}

      {/* Send Button */}
      <div
        className="glass-card p-8 w-full max-w-sm flex flex-col items-center slide-up"
        style={{ animationDelay: "0.1s" }}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileSelect}
          id="file-input"
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={!isConnected || isSending}
          className="btn-primary w-full flex items-center justify-center gap-3 text-lg py-5"
          id="send-files-btn"
        >
          {isSending ? (
            <>
              <svg
                className="w-6 h-6 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              جارٍ الإرسال...
            </>
          ) : (
            <>
              <svg
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              اختر الملفات للإرسال
            </>
          )}
        </button>

        <p className="text-zinc-600 text-xs mt-4 text-center">
          صور · مستندات · فيديو · أي نوع ملفات
        </p>
      </div>

      {/* Sent Files List */}
      {sentFiles.length > 0 && (
        <div
          className="glass-card p-6 w-full max-w-sm mt-6 slide-up"
          style={{ animationDelay: "0.2s" }}
        >
          <h3 className="text-sm font-semibold text-zinc-300 mb-4 flex items-center gap-2">
            <svg
              className="w-4 h-4 text-indigo-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            الملفات المرسلة
          </h3>
          <div className="space-y-2 max-h-[250px] overflow-y-auto">
            {sentFiles.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-zinc-900/30 file-item"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-zinc-300 truncate">{file.name}</p>
                  <p className="text-xs text-zinc-600">{formatBytes(file.size)}</p>
                </div>
                {file.status === "sending" && (
                  <svg
                    className="w-5 h-5 text-indigo-400 animate-spin flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                )}
                {file.status === "sent" && (
                  <svg
                    className="w-5 h-5 text-emerald-400 flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
                {file.status === "error" && (
                  <svg
                    className="w-5 h-5 text-red-400 flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
