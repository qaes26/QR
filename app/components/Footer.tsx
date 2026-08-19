"use client";

export default function Footer() {
  return (
    <footer className="w-full py-6 px-4 text-center border-t border-zinc-800/50 mt-auto">
      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          <svg
            className="w-4 h-4 text-indigo-400/60"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
            />
          </svg>
          <span>
            من إعداد{" "}
            <span className="text-indigo-400 font-semibold">قيس جازي</span>
          </span>
        </div>
        <p className="text-xs text-zinc-700">
          نقل مباشر · مشفّر · بدون سيرفر وسيط
        </p>
      </div>
    </footer>
  );
}
