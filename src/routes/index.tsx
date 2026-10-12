                  <ul className="grid gap-3 md:grid-cols-2">
                    {g.items.map((item) => (
                      <li key={item.key} className={`lubrano-dish-card ${item.available ? "" : "is-unavailable"} ${item.key.endsWith(":aggiunta_fonduta_di_cheddar_formaggio_e_provola") ? "lubrano-potato-supplement-card" : ""}`}>
                        <div className="flex items-start gap-3">
                          <div className="lubrano-dish-icon lubrano-category-dish-icon" aria-hidden="true">{categoryIcons[item.key.split(":")[0] ?? active?.id ?? ""] ?? "🍽️"}</div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3"><h3 className="lubrano-dish-name">{item.name}</h3><span className="lubrano-price">{formatPrice(item.price_eur)}</span></div>