"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Peer, { DataConnection } from "peerjs";

export interface FileTransfer {
  id: string;
  name: string;
  size: number;
  type: string;
  progress: number;
  status: "receiving" | "complete" | "error";
  url?: string;
  receivedSize: number;
  chunks: ArrayBuffer[];
}

interface UsePeerOptions {
  roomId: string;
  isHost: boolean;
}

// Google's public STUN servers + free TURN servers for reliability
const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
  { urls: "stun:stun3.l.google.com:19302" },
  { urls: "stun:stun4.l.google.com:19302" },
  { urls: "stun:global.stun.twilio.com:3478" },
  {
    urls: "turn:openrelay.metered.ca:80",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
  {
    urls: "turn:openrelay.metered.ca:443",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
];

export function usePeer({ roomId, isHost }: UsePeerOptions) {
  const [peerId, setPeerId] = useState<string>("");
  const [isConnected, setIsConnected] = useState(false);
  const [isPeerReady, setIsPeerReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transfers, setTransfers] = useState<FileTransfer[]>([]);
  const [connectionAttempt, setConnectionAttempt] = useState(0);

  const peerRef = useRef<Peer | null>(null);
  const connRef = useRef<DataConnection | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Save file to disk
  const saveFile = useCallback((name: string, type: string, chunks: ArrayBuffer[]) => {
    const blob = new Blob(chunks, { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return url;
  }, []);

  // Handle incoming data on a connection
  const setupConnectionHandlers = useCallback(
    (conn: DataConnection) => {
      conn.on("open", () => {
        console.log("[QRShare] Connection opened!");
        setIsConnected(true);
        setError(null);
        // Clear any retry timer
        if (retryTimerRef.current) {
          clearTimeout(retryTimerRef.current);
          retryTimerRef.current = null;
        }
      });

      conn.on("data", (data: unknown) => {
        const msg = data as {
          type: string;
          fileId?: string;
          name?: string;
          size?: number;
          fileType?: string;
          chunk?: ArrayBuffer;
          offset?: number;
        };

        if (msg.type === "file-start") {
          const newTransfer: FileTransfer = {
            id: msg.fileId!,
            name: msg.name!,
            size: msg.size!,
            type: msg.fileType!,
            progress: 0,
            status: "receiving",
            receivedSize: 0,
            chunks: [],
          };
          setTransfers((prev) => [newTransfer, ...prev]);
        }

        if (msg.type === "file-chunk") {
          setTransfers((prev) =>
            prev.map((t) => {
              if (t.id === msg.fileId) {
                const newChunks = [...t.chunks, msg.chunk!];
                const newReceived = t.receivedSize + (msg.chunk as ArrayBuffer).byteLength;
                const progress = Math.round((newReceived / t.size) * 100);
                return {
                  ...t,
                  chunks: newChunks,
                  receivedSize: newReceived,
                  progress,
                };
              }
              return t;
            })
          );
        }

        if (msg.type === "file-end") {
          setTransfers((prev) =>
            prev.map((t) => {
              if (t.id === msg.fileId) {
                const url = saveFile(t.name, t.type, t.chunks);
                return { ...t, status: "complete", progress: 100, url };
              }
              return t;
            })
          );
        }
      });

      conn.on("close", () => {
        console.log("[QRShare] Connection closed");
        setIsConnected(false);
      });

      conn.on("error", (err) => {
        console.error("[QRShare] Connection error:", err);
        setError(`خطأ في الاتصال: ${err.message}`);
      });
    },
    [saveFile]
  );

  // Connect client to host with retry
  const connectToHost = useCallback(
    (peer: Peer, attempt: number = 0) => {
      const hostId = `qrshare-${roomId}`;
      console.log(`[QRShare] Attempting to connect to host: ${hostId} (attempt ${attempt + 1})`);
      setConnectionAttempt(attempt + 1);

      const conn = peer.connect(hostId, {
        reliable: true,
        serialization: "binary",
      });

      connRef.current = conn;
      setupConnectionHandlers(conn);

      // Set a timeout: if not connected in 5 seconds, retry
      const timeout = setTimeout(() => {
        if (!conn.open) {
          console.log(`[QRShare] Connection attempt ${attempt + 1} timed out, retrying...`);
          conn.close();
          if (attempt < 5) {
            retryTimerRef.current = setTimeout(() => {
              if (peer && !peer.destroyed) {
                connectToHost(peer, attempt + 1);
              }
            }, 2000); // Wait 2 seconds before retry
          } else {
            setError("تعذر الاتصال بعد عدة محاولات. تأكد أن اللابتوب مفتوح على نفس الصفحة.");
          }
        }
      }, 5000);

      conn.on("open", () => {
        clearTimeout(timeout);
      });
    },
    [roomId, setupConnectionHandlers]
  );

  // Initialize peer
  useEffect(() => {
    if (peerRef.current || !roomId) return;

    const id = isHost
      ? `qrshare-${roomId}`
      : `qrshare-client-${roomId}-${Date.now()}`;

    console.log(`[QRShare] Creating peer with ID: ${id}, isHost: ${isHost}`);

    const peer = new Peer(id, {
      debug: 2, // Show warnings and errors
      config: {
        iceServers: ICE_SERVERS,
      },
    });

    peerRef.current = peer;

    peer.on("open", (openedId) => {
      console.log(`[QRShare] Peer opened with ID: ${openedId}`);
      setPeerId(openedId);
      setIsPeerReady(true);

      // If client, connect to host with retry logic
      if (!isHost) {
        connectToHost(peer);
      }
    });

    // If host, listen for connections
    if (isHost) {
      peer.on("connection", (conn) => {
        console.log("[QRShare] Incoming connection from:", conn.peer);
        connRef.current = conn;
        setupConnectionHandlers(conn);
      });
    }

    peer.on("error", (err) => {
      console.error("[QRShare] Peer error:", err.type, err.message);
      if (err.type === "unavailable-id") {
        setError("الجلسة موجودة مسبقاً. جرّب تحديث الصفحة.");
      } else if (err.type === "peer-unavailable") {
        setError("لم يتم العثور على الجهاز المضيف. تأكد أن اللابتوب مفتوح على التطبيق.");
      } else if (err.type === "network") {
        setError("خطأ في الشبكة. تأكد من اتصالك بالإنترنت.");
      } else if (err.type === "server-error") {
        setError("خطأ في سيرفر الإشارات. جرّب مرة أخرى بعد قليل.");
      } else {
        setError(`فشل الاتصال: ${err.message}`);
      }
    });

    peer.on("disconnected", () => {
      console.log("[QRShare] Peer disconnected from signaling server");
      setIsPeerReady(false);
      // Try to reconnect
      if (!peer.destroyed) {
        console.log("[QRShare] Attempting to reconnect...");
        peer.reconnect();
      }
    });

    return () => {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
      }
      connRef.current?.close();
      peer.destroy();
      peerRef.current = null;
    };
  }, [roomId, isHost, setupConnectionHandlers, connectToHost]);

  // Send a file
  const sendFile = useCallback(
    async (file: File) => {
      const conn = connRef.current;
      if (!conn || !conn.open) {
        setError("غير متصل. جرّب مسح رمز QR مرة أخرى.");
        return;
      }

      const fileId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const CHUNK_SIZE = 16 * 1024; // 16KB chunks

      // Send metadata
      conn.send({
        type: "file-start",
        fileId,
        name: file.name,
        size: file.size,
        fileType: file.type || "application/octet-stream",
      });

      // Read and send chunks
      const buffer = await file.arrayBuffer();
      let offset = 0;

      while (offset < buffer.byteLength) {
        const chunk = buffer.slice(offset, offset + CHUNK_SIZE);
        conn.send({
          type: "file-chunk",
          fileId,
          chunk,
          offset,
        });
        offset += CHUNK_SIZE;

        // Small delay to prevent overwhelming the connection
        await new Promise((r) => setTimeout(r, 10));
      }

      // Signal file complete
      conn.send({
        type: "file-end",
        fileId,
      });
    },
    []
  );

  return {
    peerId,
    isConnected,
    isPeerReady,
    error,
    transfers,
    sendFile,
    connectionAttempt,
  };
}
