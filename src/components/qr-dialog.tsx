import { useEffect, useRef, useState } from "react";
import { X, Download, QrCode } from "lucide-react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";

type QrDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string;
  restaurantName: string;
};

export function QrDialog({ open, onOpenChange, url, restaurantName }: QrDialogProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [svgString, setSvgString] = useState("");

  useEffect(() => {
    if (!open) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    QRCode.toCanvas(canvas, url, {
      width: 256,
      margin: 2,
      color: { dark: "#1a1a1a", light: "#ffffff" },
      errorCorrectionLevel: "H",
    }).catch(() => {});

    QRCode.toString(url, {
      type: "svg",
      margin: 2,
      color: { dark: "#1a1a1a", light: "#ffffff" },
      errorCorrectionLevel: "H",
    })
      .then(setSvgString)
      .catch(() => {});
  }, [open, url]);

  if (!open) return null;

  function downloadPng() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `${restaurantName.toLowerCase().replace(/\s+/g, "-")}-qr.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  function downloadSvg() {
    if (!svgString) return;
    const blob = new Blob([svgString], { type: "image/svg+xml" });
    const link = document.createElement("a");
    link.download = `${restaurantName.toLowerCase().replace(/\s+/g, "-")}-qr.svg`;
    link.href = URL.createObjectURL(blob);
    link.click();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="mx-4 w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="display-caps text-lg text-brand">QR Code Menù</h2>
          <Button
            type="button"
            onClick={() => onOpenChange(false)}
            variant="ghost"
            size="icon"
            className="menu-control min-h-11 min-w-11 text-muted-foreground"
            aria-label="Chiudi"
          >
            <X className="size-4" />
          </Button>
        </div>

        <p className="mt-1 text-sm text-muted-foreground">
          Stampa o mostra questo QR ai tavoli per far accedere gli osposti al menù digitale.
        </p>

        <div className="mt-5 flex justify-center">
          <div className="rounded-xl bg-white p-4 shadow-lg">
            <canvas ref={canvasRef} className="h-64 w-64" />
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <Button
            type="button"
            onClick={downloadPng}
            className="menu-control h-11 flex-1"
          >
            <Download className="size-4" />
            PNG
          </Button>
          <Button
            type="button"
            onClick={downloadSvg}
            variant="outline"
            className="menu-control h-11 flex-1"
          >
            <Download className="size-4" />
            SVG
          </Button>
        </div>

        <p className="mt-4 break-all text-center text-xs text-muted-foreground">{url}</p>
      </div>
    </div>
  );
}

export function QrButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      type="button"
      onClick={onClick}
      aria-label="QR Code"
      variant="outline"
      size="icon"
      className="menu-control min-h-11 min-w-11 bg-background/60"
    >
      <QrCode className="size-4" />
    </Button>
  );
}
