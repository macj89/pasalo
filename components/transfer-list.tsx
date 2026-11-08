"use client";

import { useState } from "react";
import { CalendarBlank, DownloadSimple, Trash } from "@phosphor-icons/react";

type Transfer = {
  id: string;
  name: string;
  createdAt: string;
  expiresAt: string;
  downloadCount: number;
  firstDownloadedAt?: string;
  ready: boolean;
  metadataKey: string;
};

function date(value: string) {
  return new Intl.DateTimeFormat("es-ES", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function TransferList({ initialTransfers }: { initialTransfers: Transfer[] }) {
  const [transfers, setTransfers] = useState(initialTransfers);
  const [removing, setRemoving] = useState<string>();
  const [error, setError] = useState("");

  async function remove(transfer: Transfer) {
    if (!window.confirm(`¿Eliminar “${transfer.name}”? El enlace dejará de funcionar inmediatamente.`)) return;
    setRemoving(transfer.id);
    setError("");
    const response = await fetch(`/api/admin/transfers/${transfer.id}`, {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ metadataKey: transfer.metadataKey }),
    });
    if (response.ok) setTransfers((current) => current.filter((item) => item.id !== transfer.id));
    else setError("No se ha podido eliminar el archivo. Inténtalo otra vez.");
    setRemoving(undefined);
  }

  if (transfers.length === 0) {
    return <section className="transfer-empty"><h2>No hay archivos activos</h2><p>Cuando subas algo, aparecerá aquí.</p></section>;
  }

  return (
    <section className="transfer-list" aria-label="Transferencias activas">
      {error && <p className="error" role="alert">{error}</p>}
      <p className="transfer-count">{transfers.length === 1 ? "1 transferencia activa" : `${transfers.length} transferencias activas`}</p>
      <ul>
        {transfers.map((transfer) => (
          <li key={transfer.id} className="transfer-row">
            <div className="transfer-name">
              <strong>{transfer.name}</strong>
              <span>{transfer.ready ? "Enlace activo" : "Subida incompleta"}</span>
            </div>
            <dl className="transfer-meta">
              <div><dt><CalendarBlank size={16} aria-hidden="true" /> Caduca</dt><dd>{date(transfer.expiresAt)}</dd></div>
              <div><dt><DownloadSimple size={16} aria-hidden="true" /> Descargas</dt><dd>{transfer.downloadCount}{transfer.firstDownloadedAt ? ` · primera: ${date(transfer.firstDownloadedAt)}` : ""}</dd></div>
            </dl>
            <button className="delete-button" onClick={() => remove(transfer)} disabled={removing === transfer.id}>
              <Trash size={19} weight="bold" aria-hidden="true" />
              {removing === transfer.id ? "Eliminando…" : "Eliminar"}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
