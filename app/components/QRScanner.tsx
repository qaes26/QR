"use client";

import { useEffect, useRef, useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";

interface QRScannerProps {
  onScan: (url: string) => void;
  onClose: () => void;
}

export default function QRScanner({ onScan, onClose }: QRScannerProps) {
  const scannerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (!scannerRef.current) return;

    const scanner = new Html5QrcodeScanner(
      "qr-reader",
      { fps: 10, qrbox: { width: 250, height: 250 } },
      /* verbose= */ false
    );

    scanner.render(
      (decodedText) => {
        scanner.clear();
        onScan(decodedText);
      },
      (err) => {
        // Only log significant errors, ignore expected scanning noise
      }
    );

    return () => {
      scanner.clear().catch(console.error);
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl flex flex-col fade-in">
        <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
          <h3 className="text-zinc-200 font-semibold">امسح رمز QR</h3>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-zinc-800"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-4 flex flex-col items-center">
          <div id="qr-reader" className="w-full max-w-sm rounded-lg overflow-hidden bg-black" />
          
          <p className="text-zinc-400 text-sm mt-4 text-center">
            قم بتوجيه الكاميرا نحو رمز QR المعروض على شاشة اللابتوب
          </p>
          
          {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
        </div>
      </div>
    </div>
  );
}
