              <div className="relative">
                <button
                  type="button"
                  onClick={() => setLangOpen((v) => !v)}
                  className="lubrano-lang-button"
                  aria-label={`Lingua: ${LANGUAGES.find((l) => l.code === lang)?.label ?? lang}`}
                  aria-expanded={langOpen}
                >
                  <span className="lubrano-language-flag" aria-hidden="true">{LANGUAGES.find((l) => l.code === lang)?.flag ?? "🌐"}</span>
                </button>
                {langOpen && (
                  <ul className="anim-scale absolute right-0 z-40 mt-2 w-44 overflow-hidden rounded-2xl border border-white/10 bg-[#160d10]/95 p-1 shadow-2xl backdrop-blur-xl">
                    {LANGUAGES.map((l) => (
                      <li key={l.code}>
                        <button type="button" onClick={() => { setLang(l.code); setLangOpen(false); }} className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm transition-colors hover:bg-white/5 ${l.code === lang ? "bg-white/5 text-[#ff315b]" : "text-white/75"}`}>
                          <span className="lubrano-language-flag" aria-hidden="true">{l.flag}</span>
                          <span className="flex-1">{l.label}</span>
                          {l.code === lang && <span aria-hidden="true">✓</span>}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}