"use client";

import { QRCodeSVG } from "qrcode.react";
import { FileTransfer } from "../hooks/usePeer";

interface HostViewProps {
  roomId: string;
  isConnected: boolean;
  isPeerReady: boolean;
  transfers: FileTransfer[];
  shareUrl: string;
  onOpenScanner?: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function getFileIcon(type: string): string {
  if (type.startsWith("image/")) return "🖼️";
  if (type.startsWith("video/")) return "🎬";
  if (type.startsWith("audio/")) return "🎵";
  if (type.includes("pdf")) return "📄";
  if (type.includes("zip") || type.includes("rar") || type.includes("tar"))
    return "📦";
  if (type.includes("doc") || type.includes("word")) return "📝";
  if (type.includes("sheet") || type.includes("excel") || type.includes("csv"))
    return "📊";
  if (type.includes("presentation") || type.includes("powerpoint")) return "📑";
  return "📎";
}

export default function HostView({
  roomId,
  isConnected,
  isPeerReady,
  transfers,
  shareUrl,
  onOpenScanner,
}: HostViewProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 fade-in">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-300 bg-clip-text text-transparent mb-3">
          QR File Share
        </h1>
        <p className="text-zinc-400 text-lg">
          امسح رمز QR من هاتفك لبدء نقل الملفات
        </p>
      </div>

      {/* Main content grid */}
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: QR Code & Status */}
        <div className="glass-card p-8 flex flex-col items-center slide-up">
          {/* Connection Status */}
          <div className="flex items-center gap-3 mb-6 w-full">
            <div
              className={`w-3 h-3 rounded-full ${
                isConnected
                  ? "bg-emerald-400 pulse-connected"
                  : isPeerReady
                  ? "bg-amber-400 pulse-disconnected"
                  : "bg-zinc-600"
              }`}
            />
            <span
              className={`text-sm font-medium ${
                isConnected
                  ? "text-emerald-400"
                  : isPeerReady
                  ? "text-amber-400"
                  : "text-zinc-500"
              }`}
            >
              {isConnected
                ? "✓ متصل — جاهز لاستقبال الملفات"
                : isPeerReady
                ? "بانتظار الاتصال..."
                : "جارٍ التهيئة..."}
            </span>
          </div>

          {/* QR Code */}
          {!isConnected && isPeerReady && (
            <div className="qr-glow p-1 rounded-2xl mb-6">
              <div className="bg-white rounded-xl p-4">
                <QRCodeSVG
                  value={shareUrl}
                  size={220}
                  level="M"
                  bgColor="#ffffff"
                  fgColor="#18182b"
                  imageSettings={{
                    src: "",
                    height: 0,
                    width: 0,
                    excavate: false,
                  }}
                />
              </div>
            </div>
          )}

          {isConnected && (
            <div className="flex flex-col items-center py-8 mb-4">
              <div className="w-20 h-20 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center mb-4">
                <svg
                  className="w-10 h-10 text-emerald-400"
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
              </div>
              <p className="text-emerald-400 font-semibold text-lg">
                تم الاتصال بنجاح!
              </p>
              <p className="text-zinc-500 text-sm mt-1">
                يمكن إرسال الملفات الآن من الهاتف
              </p>
            </div>
          )}

          {/* Room info */}
          <div className="w-full mt-auto pt-4 border-t border-zinc-800 flex flex-col gap-4">
            <div className="flex items-center justify-between text-xs text-zinc-500">
              <span>معرّف الجلسة</span>
              <code className="bg-zinc-900/80 px-3 py-1 rounded-md font-mono text-indigo-400">
                {roomId}
              </code>
            </div>

            <button
              onClick={() => onOpenScanner && onOpenScanner()}
              className="w-full py-2.5 rounded-lg border border-zinc-700 bg-zinc-800/50 text-zinc-300 text-sm font-medium hover:bg-zinc-700 transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h4a1 1 0 010 2H5v3a1 1 0 01-2 0V4zm14-1a1 1 0 011 1v3a1 1 0 01-2 0V5h-3a1 1 0 010-2h4zM4 17a1 1 0 012 0v3h3a1 1 0 010 2H5a1 1 0 01-1-1v-4zm15 1a1 1 0 01-1 1h-3a1 1 0 010 2h4a1 1 0 011-1v-4a1 1 0 01-2 0v3z" />
              </svg>
              أريد إرسال ملفات (مسح رمز QR)
            </button>
          </div>
        </div>

        {/* Right: Received Files */}
        <div className="glass-card p-8 flex flex-col slide-up" style={{ animationDelay: "0.1s" }}>
          <h2 className="text-xl font-semibold text-zinc-200 mb-1 flex items-center gap-2">
            <svg
              className="w-5 h-5 text-indigo-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"
              />
            </svg>
            الملفات المستلمة
          </h2>
          <p className="text-zinc-500 text-sm mb-5">
            يتم تحميل الملفات تلقائياً عند الاستلام
          </p>

          {transfers.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-zinc-800/50 flex items-center justify-center mb-4">
                <svg
                  className="w-8 h-8 text-zinc-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-2.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                  />
                </svg>
              </div>
              <p className="text-zinc-600 text-sm">لم يتم استلام ملفات بعد</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-3 max-h-[400px] pr-1">
              {transfers.map((transfer) => (
                <div key={transfer.id} className="file-item rounded-xl p-4 bg-zinc-900/30">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl mt-0.5">{getFileIcon(transfer.type)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-200 truncate">
                        {transfer.name}
                      </p>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {formatBytes(transfer.size)}
                      </p>

                      {transfer.status === "receiving" && (
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-xs text-zinc-500 mb-1.5">
                            <span>جارٍ الاستقبال...</span>
                            <span className="font-mono text-indigo-400">
                              {transfer.progress}%
                            </span>
                          </div>
                          <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                            <div
                              className="progress-bar h-full"
                              style={{ width: `${transfer.progress}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {transfer.status === "complete" && (
                        <div className="mt-2 flex items-center gap-1.5">
                          <svg
                            className="w-4 h-4 text-emerald-400"
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
                          <span className="text-xs text-emerald-400 font-medium">
                            تم التحميل بنجاح
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
