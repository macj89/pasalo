import { cookies } from "next/headers";
import Link from "next/link";
import { AUTH_COOKIE, validSession } from "@/lib/crypto";
import { Login } from "@/components/login";
import { Uploader } from "@/components/uploader";

export default async function Home() {
  const cookieStore = await cookies();
  const authenticated = validSession(cookieStore.get(AUTH_COOKIE)?.value);

  return (
    <main className="shell">
      <section className="intro" aria-labelledby="page-title">
        <div className="brand-mark" aria-hidden="true">F</div>
        <div>
          <p className="eyebrow">Files</p>
          <h1 id="page-title">Archivos grandes.<br />Un enlace y listo.</h1>
          <p className="lede">Sube lo que quieras compartir y copia el enlace. Tú eliges cuándo se elimina automáticamente.</p>
        </div>
        <p className="privacy-note">Solo quien tenga el enlace podrá descargar el archivo.</p>
      </section>
      <section className="workspace" aria-label={authenticated ? "Subir archivos" : "Acceso privado"}>
        {authenticated ? <><Link className="admin-link" href="/admin">Ver archivos compartidos</Link><Uploader /></> : <Login />}
      </section>
    </main>
  );
}
