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

export function usePeer({ roomId, isHost }: UsePeerOptions) {
  const [peerId, setPeerId] = useState<string>("");
  const [isConnected, setIsConnected] = useState(false);
  const [isPeerReady, setIsPeerReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transfers, setTransfers] = useState<FileTransfer[]>([]);

  const peerRef = useRef<Peer | null>(null);
  const connRef = useRef<DataConnection | null>(null);

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
        setIsConnected(true);
        setError(null);
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
        setIsConnected(false);
      });

      conn.on("error", (err) => {
        setError(`Connection error: ${err.message}`);
      });
    },
    [saveFile]
  );

  // Initialize peer
  useEffect(() => {
    if (peerRef.current || !roomId) return;

    const id = isHost ? `qrshare-${roomId}` : `qrshare-client-${roomId}-${Date.now()}`;

    const peer = new Peer(id, {
      debug: 0,
    });

    peerRef.current = peer;

    peer.on("open", (openedId) => {
      setPeerId(openedId);
      setIsPeerReady(true);

      // If client, connect to host
      if (!isHost) {
        const conn = peer.connect(`qrshare-${roomId}`, {
          reliable: true,
        });
        connRef.current = conn;
        setupConnectionHandlers(conn);
      }
    });

    // If host, listen for connections
    if (isHost) {
      peer.on("connection", (conn) => {
        connRef.current = conn;
        setupConnectionHandlers(conn);
      });
    }

    peer.on("error", (err) => {
      console.error("Peer error:", err);
      if (err.type === "unavailable-id") {
        setError("Session already exists. Please try refreshing.");
      } else if (err.type === "peer-unavailable") {
        setError("Could not find the host. Make sure the QR code is still active.");
      } else {
        setError(`Connection failed: ${err.message}`);
      }
    });

    peer.on("disconnected", () => {
      setIsPeerReady(false);
    });

    return () => {
      connRef.current?.close();
      peer.destroy();
      peerRef.current = null;
    };
  }, [roomId, isHost, setupConnectionHandlers]);

  // Send a file
  const sendFile = useCallback(
    async (file: File) => {
      const conn = connRef.current;
      if (!conn || !conn.open) {
        setError("Not connected. Please scan the QR code again.");
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
  };
}
