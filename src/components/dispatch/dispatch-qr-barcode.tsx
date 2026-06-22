"use client";

type DispatchQrBarcodeProps = {
  dispatchId: string;
  trackUrl: string;
  vehicleAssigned: boolean;
};

function barcodeWidths(seed: string): number[] {
  const widths: number[] = [];
  for (let i = 0; i < 36; i++) {
    const code = seed.charCodeAt(i % seed.length) + i;
    widths.push(code % 5 === 0 ? 3 : code % 3 === 0 ? 2 : 1);
  }
  return widths;
}

export function DispatchQrBarcode({
  dispatchId,
  trackUrl,
  vehicleAssigned,
}: DispatchQrBarcodeProps) {
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(trackUrl)}`;
  const widths = barcodeWidths(trackUrl);

  return (
    <div className="dispatch-detail-qr">
      <div className="dispatch-detail-qr__image-wrap">
        <img
          src={qrSrc}
          alt={`Tracking link QR for ${dispatchId}`}
          width={200}
          height={200}
          className="dispatch-detail-qr__image"
        />
      </div>
      <p className="dispatch-detail-qr__hint">
        {vehicleAssigned
          ? "Scan to open the live tracking page with route and GPS details."
          : "Assign a vehicle first. The QR opens the public tracking link."}
      </p>
      <a href={trackUrl} className="dispatch-detail-qr__link mono" target="_blank" rel="noreferrer">
        {trackUrl}
      </a>
      <div className="dispatch-detail-qr__barcode" aria-hidden="true">
        <div className="dispatch-detail-qr__barcode-lines">
          {widths.map((width, i) => (
            <span key={i} style={{ width }} />
          ))}
        </div>
        <div className="dispatch-detail-qr__barcode-label mono">{dispatchId}</div>
      </div>
    </div>
  );
}
