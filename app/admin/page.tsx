import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArchiveBoxIcon } from "@phosphor-icons/react/dist/ssr";
import { AUTH_COOKIE, validSession } from "@/lib/crypto";
import { listTransfers } from "@/lib/metadata";
import { TransferList } from "@/components/transfer-list";

export default async function AdminPage() {
  const cookieStore = await cookies();
  if (!validSession(cookieStore.get(AUTH_COOKIE)?.value)) redirect("/");
  const transfers = await listTransfers();

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <Link className="admin-brand" href="/">Files</Link>
        <Link className="back-link" href="/">Volver a subir</Link>
      </header>
      <section className="admin-intro" aria-labelledby="admin-title">
          <ArchiveBoxIcon size={32} weight="regular" aria-hidden="true" />
        <div>
          <p className="eyebrow">Administración</p>
          <h1 id="admin-title">Archivos compartidos</h1>
          <p>Revisa las transferencias activas o elimínalas antes de su fecha de caducidad.</p>
        </div>
      </section>
      <TransferList initialTransfers={transfers} />
    </main>
  );
}
