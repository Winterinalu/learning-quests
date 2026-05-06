import { useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";

export function QRScanner({ onResult, onClose }: { onResult: (text: string) => void; onClose: () => void }) {
  const ref = useRef<Html5Qrcode | null>(null);
  const elId = "qr-reader-region";

  useEffect(() => {
    const inst = new Html5Qrcode(elId);
    ref.current = inst;
    inst
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (text) => {
          inst.stop().then(() => inst.clear()).catch(() => {});
          onResult(text);
        },
        () => {}
      )
      .catch((e) => console.error("Camera error", e));
    return () => {
      inst.stop().then(() => inst.clear()).catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm bg-card rounded-2xl p-4">
        <div className="font-bold text-primary mb-3">Scan compartment QR</div>
        <div id={elId} className="w-full overflow-hidden rounded-xl" />
        <button onClick={onClose} className="btn-outline mt-4">Cancel</button>
      </div>
    </div>
  );
}
