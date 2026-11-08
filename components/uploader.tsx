"use client";

import { ChangeEvent, DragEvent, useRef, useState } from "react";
import { Check, Copy, File, UploadSimple, X } from "@phosphor-icons/react";

type UploadItem = {
  id: string;
  file: globalThis.File;
  progress: number;
  state: "ready" | "uploading" | "done" | "error";
  shareUrl?: string;
  error?: string;
  warning?: string;
};

function prettyBytes(bytes: number) {
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value < 10 && unit > 0 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`;
}

function putFile(url: string, file: Blob, type: string, onProgress: (value: number) => void) {
  return new Promise<string>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("PUT", url);
    if (type) request.setRequestHeader("Content-Type", type);
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) resolve(request.getResponseHeader("ETag") || "");
      else reject(new Error("upload"));
    };
    request.onerror = () => reject(new Error("network"));
    request.send(file);
  });
}

export function Uploader() {
  const input = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<UploadItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const [copied, setCopied] = useState<string>();
  const [days, setDays] = useState(7);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [notifyOnDownload, setNotifyOnDownload] = useState(true);

  function addFiles(files: FileList | globalThis.File[]) {
    const next = Array.from(files).map((file) => ({
      id: crypto.randomUUID(), file, progress: 0, state: "ready" as const,
    }));
    setItems((current) => [...current, ...next]);
  }

  function choose(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files) addFiles(event.target.files);
    event.target.value = "";
  }

  function drop(event: DragEvent) {
    event.preventDefault();
    setDragging(false);
    if (event.dataTransfer.files.length) addFiles(event.dataTransfer.files);
  }

  function update(id: string, patch: Partial<UploadItem>) {
    setItems((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));
  }

  async function upload(item: UploadItem) {
    update(item.id, { state: "uploading", progress: 0, error: undefined });
    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: item.file.name,
          size: item.file.size,
          type: item.file.type,
          days,
          recipientEmail: recipientEmail.trim() || undefined,
          notifyOnDownload,
        }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "No se pudo preparar la subida.");
      }
      const { uploadUrl, uploadId, multipart, partSize, shareUrl, completionToken } = await response.json();
      let parts: Array<{ ETag: string; PartNumber: number }> | undefined;
      if (multipart) {
        parts = [];
        const totalParts = Math.ceil(item.file.size / partSize);
        for (let partNumber = 1; partNumber <= totalParts; partNumber += 1) {
          const partResponse = await fetch("/api/upload/part", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ token: completionToken, uploadId, partNumber }),
          });
          const partBody = await partResponse.json().catch(() => ({}));
          if (!partResponse.ok || !partBody.uploadUrl) throw new Error(partBody.error || "No se pudo preparar una parte del archivo.");
          const start = (partNumber - 1) * partSize;
          const blob = item.file.slice(start, Math.min(start + partSize, item.file.size));
          const etag = await putFile(partBody.uploadUrl, blob, "", (partProgress) => {
            update(item.id, { progress: Math.round(((partNumber - 1 + partProgress / 100) / totalParts) * 100) });
          });
          if (!etag) throw new Error("El servidor no confirmó una parte del archivo.");
          parts.push({ ETag: etag, PartNumber: partNumber });
        }
      } else {
        if (!uploadUrl) throw new Error("No se pudo preparar la subida.");
        await putFile(uploadUrl, item.file, item.file.type || "application/octet-stream", (progress) => update(item.id, { progress }));
      }
      const completeResponse = await fetch("/api/upload/complete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: completionToken, shareUrl, uploadId, parts }),
      });
      const completion = await completeResponse.json().catch(() => ({}));
      if (!completeResponse.ok) throw new Error(completion.error || "El archivo subió, pero no se pudo activar el enlace.");
      const warning = completion.emailRequested && !completion.emailSent
        ? "El enlace está listo, pero el email no pudo enviarse. Puedes copiarlo manualmente."
        : undefined;
      update(item.id, { state: "done", progress: 100, shareUrl, warning });
    } catch (cause) {
      update(item.id, { state: "error", error: cause instanceof Error ? cause.message : "La subida ha fallado." });
    }
  }

  async function uploadAll() {
    for (const item of items.filter((candidate) => candidate.state === "ready" || candidate.state === "error")) {
      await upload(item);
    }
  }

  async function copy(id: string, url: string) {
    await navigator.clipboard.writeText(url);
    setCopied(id);
    window.setTimeout(() => setCopied(undefined), 1800);
  }

  const busy = items.some((item) => item.state === "uploading");
  const pending = items.some((item) => item.state === "ready" || item.state === "error");

  return (
    <div className="uploader">
      <div className="delivery-options">
        <div className="option-field">
          <label htmlFor="expiry">Borrar automáticamente</label>
          <select id="expiry" value={days} onChange={(event) => setDays(Number(event.target.value))} disabled={busy}>
            <option value="1">Después de 1 día</option>
            <option value="3">Después de 3 días</option>
            <option value="7">Después de 7 días</option>
            <option value="14">Después de 14 días</option>
            <option value="30">Después de 30 días</option>
          </select>
        </div>
        <div className="option-field email-field">
          <label htmlFor="recipient">Enviar el enlace por email <span>(opcional)</span></label>
          <input
            id="recipient"
            type="email"
            value={recipientEmail}
            onChange={(event) => setRecipientEmail(event.target.value)}
            placeholder="persona@ejemplo.com"
            autoComplete="email"
            disabled={busy}
          />
        </div>
        <label className="check-option">
          <input type="checkbox" checked={notifyOnDownload} onChange={(event) => setNotifyOnDownload(event.target.checked)} disabled={busy} />
          <span>Avísame cuando se descargue por primera vez</span>
        </label>
      </div>
      <div
        className={`drop-zone ${dragging ? "is-dragging" : ""}`}
        onDragEnter={() => setDragging(true)}
        onDragLeave={() => setDragging(false)}
        onDragOver={(event) => event.preventDefault()}
        onDrop={drop}
      >
        <UploadSimple size={38} weight="regular" aria-hidden="true" />
        <h2>Suelta aquí tus archivos</h2>
        <p>También puedes elegirlos desde el ordenador.</p>
        <button className="secondary-button" type="button" onClick={() => input.current?.click()}>
          Elegir archivos
        </button>
        <input ref={input} className="sr-only" type="file" multiple onChange={choose} />
      </div>

      {items.length > 0 && (
        <div className="queue" aria-live="polite">
          <div className="queue-heading">
            <h3>{items.length === 1 ? "1 archivo" : `${items.length} archivos`}</h3>
            {!busy && <button className="text-button" onClick={() => setItems([])}>Quitar todos</button>}
          </div>
          <ul>
            {items.map((item) => (
              <li key={item.id} className={`file-row state-${item.state}`}>
                <File size={24} weight="regular" aria-hidden="true" />
                <div className="file-info">
                  <strong>{item.file.name}</strong>
                  <span>{item.state === "uploading" ? `Subiendo… ${item.progress}%` : item.state === "done" ? item.warning || "Enlace listo" : item.error || prettyBytes(item.file.size)}</span>
                  {item.state === "uploading" && <progress max="100" value={item.progress}>{item.progress}%</progress>}
                </div>
                {item.state === "done" && item.shareUrl ? (
                  <button className="copy-button" onClick={() => copy(item.id, item.shareUrl!)}>
                    {copied === item.id ? <Check size={18} weight="bold" /> : <Copy size={18} weight="bold" />}
                    {copied === item.id ? "Copiado" : "Copiar enlace"}
                  </button>
                ) : !busy && (
                  <button className="icon-button" aria-label={`Quitar ${item.file.name}`} onClick={() => setItems((current) => current.filter((candidate) => candidate.id !== item.id))}>
                    <X size={18} weight="bold" aria-hidden="true" />
                  </button>
                )}
              </li>
            ))}
          </ul>
          {pending && (
            <button className="primary-button upload-all" onClick={uploadAll} disabled={busy}>
              <UploadSimple size={20} weight="bold" aria-hidden="true" />
              {busy ? "Subiendo archivos…" : "Subir y crear enlaces"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
