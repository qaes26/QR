"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { usePeer } from "./hooks/usePeer";
import HostView from "./components/HostView";
import ClientView from "./components/ClientView";
import Footer from "./components/Footer";

function generateRoomId(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function FileShareApp() {
  const searchParams = useSearchParams();
  const roomParam = searchParams.get("room");

  // Determine if this is a host (no room param = laptop opens fresh)
  // or client (room param present = phone scanned QR)
  const isHost = !roomParam;

  const [roomId, setRoomId] = useState<string>("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (isHost) {
      setRoomId(generateRoomId());
    } else {
      setRoomId(roomParam!);
    }
  }, [isHost, roomParam]);

  const { isConnected, isPeerReady, error, transfers, sendFile } = usePeer({
    roomId: roomId,
    isHost,
  });

  // Build the shareable URL
  const shareUrl = useMemo(() => {
    if (typeof window === "undefined" || !roomId) return "";
    const origin = window.location.origin;
    return `${origin}?room=${roomId}`;
  }, [roomId]);

  if (!mounted || !roomId) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-zinc-500 text-sm">جارٍ التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Decorative particles */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div
          className="particle"
          style={{
            width: 300,
            height: 300,
            top: "10%",
            left: "5%",
            opacity: 0.08,
          }}
        />
        <div
          className="particle"
          style={{
            width: 200,
            height: 200,
            top: "60%",
            right: "10%",
            opacity: 0.06,
            animationDelay: "5s",
          }}
        />
        <div
          className="particle"
          style={{
            width: 150,
            height: 150,
            bottom: "20%",
            left: "40%",
            opacity: 0.05,
            animationDelay: "10s",
          }}
        />
      </div>

      <main className="relative z-10 flex-1 flex flex-col">
        {error && isHost && (
          <div className="mx-4 mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-center fade-in">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {isHost ? (
          <HostView
            roomId={roomId}
            isConnected={isConnected}
            isPeerReady={isPeerReady}
            transfers={transfers}
            shareUrl={shareUrl}
          />
        ) : (
          <ClientView
            isConnected={isConnected}
            isPeerReady={isPeerReady}
            sendFile={sendFile}
            error={error}
          />
        )}
      </main>

      <Footer />
    </>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-zinc-500 text-sm">جارٍ التحميل...</p>
          </div>
        </div>
      }
    >
      <FileShareApp />
    </Suspense>
  );
}
