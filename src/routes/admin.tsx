import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import {
  Check,
  ChevronRight,
  Clock3,
  History,
  LogOut,
  Menu as MenuIcon,
  RotateCcw,
  Send,
  Upload,
  ShieldCheck,
  Sparkles,
  Wifi,
  X,
} from "lucide-react";

import {
  adminChatData,
  adminLogin,
  adminLogout,
  executeAdminCommand,
  previewAdminCommand,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
});

const EXAMPLES = [
  "prezzo Perfect Burger 12",
  "esaurito patate porchetta",
  "speciale | Burger del mese | Manzo, cheddar e bacon | 14,50",
  "wifi | nuova-password",
  "storico",
  "annulla ultima azione",
];

function AdminPage() {
  const queryClient = useQueryClient();
  const sessionQuery = useQuery({
    queryKey: ["admin-session"],
    queryFn: () => adminChatData(),
    staleTime: 10_000,
    refetchOnWindowFocus: true,
  });

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [command, setCommand] = useState("");
  const [preview, setPreview] = useState<Awaited<ReturnType<typeof previewAdminCommand>> | null>(
    null,
  );
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");

  const data = sessionQuery.data;
  const authenticated = data?.authenticated === true;

  async function login() {
    setBusy(true);
    setMessage("");
    try {
      const result = await adminLogin({ data: { username, password } });
      if (!result.ok) {
        setMessage(
          result.reason === "rate_limited"
            ? "Troppi tentativi. Riprova tra qualche minuto."
            : "Credenziali non valide.",
        );
        return;
      }
      setPassword("");
      await queryClient.invalidateQueries({ queryKey: ["admin-session"] });
    } catch {
      setMessage("Accesso non disponibile. Verifica la configurazione dell'amministratore.");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    setBusy(true);
    try {
      await adminLogout();
      await queryClient.invalidateQueries({ queryKey: ["admin-session"] });
      setPreview(null);
      setMessage("");
    } finally {
      setBusy(false);
    }
  }

  async function prepareCommand() {
    if (!command.trim()) return;
    setBusy(true);
    setMessage("");
    try {
      const result = await previewAdminCommand({ data: { command } });
      setPreview(result);
      if (result.parsed.action === "unknown") {
        setMessage(result.parsed.reason);
      } else if (result.parsed.action === "ambiguous") {
        setMessage(result.parsed.reason);
      }
    } catch {
      setMessage("La sessione non è più valida oppure il comando non è disponibile.");
      await queryClient.invalidateQueries({ queryKey: ["admin-session"] });
    } finally {
      setBusy(false);
    }
  }

  async function confirmCommand() {
    if (!preview) return;
    setBusy(true);
    setMessage("");
    try {
      const result = await executeAdminCommand({
        data: { command, confirm: true },
      });
      setMessage(result.message);
      setPreview(null);
      setCommand("");
      await queryClient.invalidateQueries({ queryKey: ["admin-session"] });
    } catch {
      setMessage("La modifica non è stata applicata.");
    } finally {
      setBusy(false);
    }
  }

  if (sessionQuery.isLoading) {
    return <LoadingScreen />;
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-[#160f0c] px-4 py-10 text-white">
        <div className="mx-auto max-w-md">
          <div className="rounded-[2rem] border border-white/10 bg-black/35 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
            <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-accent/10 text-accent">
              <ShieldCheck className="size-8" />
            </div>
            <p className="mt-6 text-center text-[0.66rem] font-bold uppercase tracking-[0.3em] text-accent">
              Lubrano Admin
            </p>
            <h1 className="display-caps mt-2 text-center text-3xl text-white">Console del menù</h1>
            <p className="mt-3 text-center text-sm leading-relaxed text-white/55">
              Accesso riservato. Le modifiche vengono confermate e registrate nello storico.
            </p>

            <div className="mt-8 space-y-3">
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.14em] text-white/45">
                  Username
                </span>
                <input
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  className="mt-2 min-h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-white outline-none focus-visible:ring-2 focus-visible:ring-accent/70"
                  autoComplete="username"
                />
              </label>
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.14em] text-white/45">
                  Password
                </span>
                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") void login();
                  }}
                  type="password"
                  className="mt-2 min-h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-white outline-none focus-visible:ring-2 focus-visible:ring-accent/70"
                  autoComplete="current-password"
                />
              </label>
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-xl bg-accent/10 text-accent">
                  <Upload className="size-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/45">
                    Foto speciale
                  </p>
                  <p className="mt-1 text-xs text-white/40">JPG, PNG o WebP · massimo 2 MB</p>
                </div>
              </div>
              <label className="mt-4 flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-semibold text-white/75 hover:bg-white/10">
                Seleziona immagine
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    if (!file) return;
                    setBusy(true);
                    setUploadMessage("");
                    try {
                      const form = new FormData();
                      form.append("image", file);
                      const response = await fetch("/api/admin/upload", {
                        method: "POST",
                        body: form,
                      });
                      const payload = (await response.json()) as {
                        ok?: boolean;
                        url?: string;
                        message?: string;
                      };
                      if (!response.ok || !payload.ok || !payload.url) {
                        setUploadMessage(payload.message ?? "Upload non riuscito.");
                        return;
                      }
                      setCommand((current) => {
                        if (/^speciale\s*\|/i.test(current)) {
                          const parts = current.split("|").map((value) => value.trim());
                          parts[3] = parts[3] || "0";
                          parts[4] = payload.url ?? "";
                          return parts.join(" | ");
                        }
                        return "speciale | Titolo | Descrizione | 0 | " + payload.url;
                      });
                      setUploadMessage("✅ Foto caricata. Ora completa il comando speciale.");
                    } catch {
                      setUploadMessage("Upload non riuscito.");
                    } finally {
                      setBusy(false);
                    }
                  }}
                />
              </label>
              {uploadMessage && (
                <p className="mt-2 text-xs text-white/45" aria-live="polite">
                  {uploadMessage}
                </p>
              )}
            </div>

            {message && (
              <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {message}
              </div>
            )}

            <button
              type="button"
              onClick={() => void login()}
              disabled={busy || !username || !password}
              className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 font-bold text-primary-foreground disabled:opacity-50"
            >
              <ShieldCheck className="size-4" />
              Accedi
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#160f0c] text-white">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#160f0c]/92 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div>
            <p className="text-[0.62rem] font-bold uppercase tracking-[0.25em] text-accent">
              Lubrano Admin
            </p>
            <h1 className="display-caps mt-0.5 text-xl">Console del menù</h1>
          </div>
          <button
            type="button"
            onClick={() => void logout()}
            disabled={busy}
            className="menu-control flex min-h-10 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 text-sm font-semibold text-white/75"
          >
            <LogOut className="size-4" />
            Esci
          </button>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[1.65fr_0.9fr]">
        <section className="min-w-0">
          <div className="rounded-[1.75rem] border border-white/10 bg-black/25 p-4 shadow-2xl backdrop-blur-md sm:p-6">
            <div className="flex items-center gap-3">
              <div className="grid size-11 place-items-center rounded-full bg-accent/10 text-accent">
                <Sparkles className="size-5" />
              </div>
              <div>
                <p className="text-[0.62rem] font-bold uppercase tracking-[0.25em] text-accent">
                  Chat guidata
                </p>
                <h2 className="display-caps text-2xl">Cosa vuoi cambiare?</h2>
              </div>
            </div>

            <div className="mt-5 max-h-72 space-y-3 overflow-y-auto rounded-2xl border border-white/10 bg-black/20 p-3">
              {(!data.messages || data.messages.length === 0) && (
                <div className="rounded-xl bg-accent/5 p-4 text-sm leading-relaxed text-white/60">
                  <p className="font-semibold text-white/80">Ciao 👋</p>
                  <p className="mt-1">
                    Scrivimi cosa vuoi cambiare. Prima ti mostro l'anteprima, poi devi confermare.
                  </p>
                </div>
              )}
              {(data.messages ?? []).map((entry) => (
                <div
                  key={entry.id}
                  className={
                    entry.role === "user"
                      ? "ml-6 rounded-xl bg-primary/10 p-3"
                      : "mr-6 rounded-xl bg-white/[0.04] p-3"
                  }
                >
                  <p className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-white/35">
                    {entry.role === "user" ? "Tu" : "Lubrano Admin"}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-white/75">
                    {entry.message}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {EXAMPLES.map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => setCommand(example)}
                  className="menu-control rounded-full border border-white/10 bg-white/5 px-3 py-2 text-left text-xs text-white/70 hover:bg-white/10 hover:text-white"
                >
                  {example}
                </button>
              ))}
            </div>

            <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-3">
              <div className="flex gap-3">
                <textarea
                  value={command}
                  onChange={(event) => setCommand(event.target.value)}
                  placeholder="Es. prezzo Perfect Burger 12"
                  rows={4}
                  className="min-h-28 flex-1 resize-none bg-transparent p-2 text-base text-white outline-none placeholder:text-white/35 focus-visible:ring-2 focus-visible:ring-accent/60"
                />
                <button
                  type="button"
                  onClick={() => void prepareCommand()}
                  disabled={busy || !command.trim()}
                  className="grid min-h-11 min-w-11 self-end place-items-center rounded-xl bg-primary text-primary-foreground disabled:opacity-50"
                  aria-label="Analizza comando"
                >
                  <Send className="size-4" />
                </button>
              </div>
            </div>

            {preview && (
              <div className="anim-scale mt-4 rounded-2xl border border-accent/25 bg-accent/5 p-4">
                <div className="flex items-start gap-3">
                  <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent">
                    <ShieldCheck className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[0.62rem] font-bold uppercase tracking-[0.22em] text-accent">
                      Anteprima modifica
                    </p>
                    <p className="mt-2 break-words text-sm leading-relaxed text-white/80">
                      {preview.safeCommand}
                    </p>

                    {preview.parsed.action === "ambiguous" && (
                      <div className="mt-3 space-y-2">
                        {preview.parsed.candidates.map((candidate) => (
                          <button
                            type="button"
                            key={candidate.key}
                            onClick={() => {
                              setCommand("prezzo " + candidate.name + " 0");
                            }}
                            className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-left"
                          >
                            <MenuIcon className="size-4 text-accent" />
                            <span className="flex-1 text-sm text-white">{candidate.name}</span>
                            <span className="text-xs text-white/40">{candidate.category}</span>
                            <ChevronRight className="size-4 text-white/25" />
                          </button>
                        ))}
                      </div>
                    )}

                    {preview.parsed.action !== "ambiguous" && (
                      <div className="mt-4 flex gap-2">
                        <button
                          type="button"
                          onClick={() => void confirmCommand()}
                          disabled={busy}
                          className="flex min-h-11 items-center gap-2 rounded-xl bg-accent px-4 font-bold text-accent-foreground"
                        >
                          <Check className="size-4" />
                          {preview.requiresConfirmation ? "Conferma" : "Esegui"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setPreview(null)}
                          className="flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 font-semibold text-white/70"
                        >
                          <X className="size-4" />
                          Annulla
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {message && (
              <div className="mt-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80">
                {message}
              </div>
            )}
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <InfoCard
              icon={<Wifi className="size-5" />}
              title="Wi-Fi"
              body="Cambia la password con il comando wifi | password. Il valore non entra nello storico."
            />
            <InfoCard
              icon={<History className="size-5" />}
              title="Storico"
              body="Ogni modifica confermata viene registrata in audit_log e resta visibile in questa console."
            />
          </div>
        </section>

        <aside className="space-y-5">
          <div className="rounded-[1.75rem] border border-white/10 bg-black/25 p-5 shadow-2xl backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-xl bg-accent/10 text-accent">
                <History className="size-5" />
              </div>
              <div>
                <p className="text-[0.62rem] font-bold uppercase tracking-[0.22em] text-accent">
                  Attività recente
                </p>
                <h2 className="display-caps text-xl">Storico</h2>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {(data.history ?? []).slice(0, 8).map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-xl border border-white/8 bg-white/[0.03] p-3"
                >
                  <div className="flex items-center gap-2 text-xs text-white/35">
                    <Clock3 className="size-3.5" />
                    {new Date(entry.createdAt).toLocaleString("it-IT")}
                  </div>
                  <p className="mt-1 text-sm font-semibold text-white/80">{entry.action}</p>
                  {entry.itemKey && (
                    <p className="mt-1 truncate text-xs text-white/40">{entry.itemKey}</p>
                  )}
                </div>
              ))}
              {(data.history ?? []).length === 0 && (
                <p className="rounded-xl border border-white/8 bg-white/[0.03] p-4 text-sm text-white/45">
                  Nessuna modifica registrata.
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setCommand("annulla ultima azione");
              setPreview(null);
            }}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 font-semibold text-white/80"
          >
            <RotateCcw className="size-4" />
            Prepara annulla ultima azione
          </button>
        </aside>
      </main>
    </div>
  );
}

function InfoCard({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 p-4 backdrop-blur-md">
      <div className="text-accent">{icon}</div>
      <h3 className="display-caps mt-3 text-lg">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-white/50">{body}</p>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="grid min-h-screen place-items-center bg-[#160f0c] text-white">
      <div className="text-center">
        <div className="mx-auto size-10 animate-spin rounded-full border-2 border-white/15 border-t-accent" />
        <p className="mt-4 text-sm text-white/50">Caricamento console…</p>
      </div>
    </div>
  );
}
