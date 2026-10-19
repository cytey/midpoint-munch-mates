import { QRCodeSVG } from "qrcode.react";

interface QrCodeProps {
  value: string;
  size?: number;
}

export function QrCode({ value, size = 160 }: QrCodeProps) {
  return (
    <div className="inline-block p-3 rounded-2xl bg-card border shadow-card">
      <QRCodeSVG value={value} size={size} bgColor="#ffffff" fgColor="#2b2118" level="M" />
      <p className="text-xs text-muted-foreground text-center mt-2 font-body">
        Scan to join
      </p>
    </div>
  );
}
