// Shared gradients and material classes for every DEEPFLAT SVG (hero, minis, icons).
// Brand rule: in the wordmark the D of DEEP and the F of FLAT are ember #de622e (ef/et/er, fl-ef/fl-eb),
// the other letters bone. Ember is used nowhere else.
// One set of ember values for every logo the build writes (hero letters, header and footer logos, favicon).
export const EMBER = { front: '#de622e', frontHi: '#e36a37', frontLo: '#d95b27', top: '#e8834f', side: '#a9451a', deep: '#7e3313', edge: '#8c3a16' };
export const DEFS = `<svg class="df-defs" width="0" height="0" aria-hidden="true" focusable="false" style="position:absolute;width:0;height:0;overflow:hidden">
<defs>
<linearGradient id="gkl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#32312d"/><stop offset="1" stop-color="#272624"/></linearGradient>
<linearGradient id="gkr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#201f1e"/><stop offset="1" stop-color="#171716"/></linearGradient>
<linearGradient id="gfw" gradientUnits="userSpaceOnUse" x1="0" y1="-1100" x2="0" y2="-150"><stop offset="0" stop-color="#1c1c1b"/><stop offset="1" stop-color="#2b2a27"/></linearGradient>
<radialGradient id="gflo" gradientUnits="userSpaceOnUse" cx="80" cy="-40" r="760"><stop offset="0" stop-color="#2f2e2b"/><stop offset=".55" stop-color="#262523"/><stop offset="1" stop-color="#1c1c1b"/></radialGradient>
<linearGradient id="gcl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d4c7b1"/><stop offset="1" stop-color="#c3b49b"/></linearGradient>
<linearGradient id="gcr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ad9d82"/><stop offset="1" stop-color="#998a70"/></linearGradient>
<linearGradient id="gcs" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#d9cdb8"/><stop offset=".45" stop-color="#cdbfa8"/><stop offset="1" stop-color="#9f8f75"/></linearGradient>
<radialGradient id="gcdome" cx=".36" cy=".3" r=".8"><stop offset="0" stop-color="#efe8dc"/><stop offset=".6" stop-color="#d8ccb7"/><stop offset="1" stop-color="#ad9d83"/></radialGradient>
<linearGradient id="gds" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3a3935"/><stop offset=".5" stop-color="#232321"/><stop offset="1" stop-color="#121211"/></linearGradient>
<radialGradient id="gshd"><stop offset="0" stop-color="#0b0b0a" stop-opacity=".62"/><stop offset=".6" stop-color="#0b0b0a" stop-opacity=".28"/><stop offset="1" stop-color="#0b0b0a" stop-opacity="0"/></radialGradient>
<radialGradient id="ghalo"><stop offset="0" stop-color="#f1c47f" stop-opacity=".55"/><stop offset=".35" stop-color="#f1c47f" stop-opacity=".16"/><stop offset="1" stop-color="#f1c47f" stop-opacity="0"/></radialGradient>
<radialGradient id="glit" cx=".5" cy=".18" r=".95"><stop offset="0" stop-color="#9b8a72"/><stop offset=".55" stop-color="#5a4f42"/><stop offset="1" stop-color="#26231f"/></radialGradient>
<radialGradient id="glit2" cx=".45" cy=".2" r=".9"><stop offset="0" stop-color="#7f6f5b"/><stop offset=".6" stop-color="#3e3830"/><stop offset="1" stop-color="#1f1d1b"/></radialGradient>
<linearGradient id="gfloorlit" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6f6252"/><stop offset="1" stop-color="#3a3530"/></linearGradient>
<linearGradient id="glr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6e6556"/><stop offset="1" stop-color="#4f483e"/></linearGradient>
<linearGradient id="glf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ece5d8"/><stop offset="1" stop-color="#ddd3c1"/></linearGradient>
<linearGradient id="gccap" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ece5d8"/><stop offset=".55" stop-color="#ddd2bf"/><stop offset="1" stop-color="#c6b8a0"/></linearGradient>
<linearGradient id="gef" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${EMBER.frontHi}"/><stop offset="1" stop-color="${EMBER.frontLo}"/></linearGradient>
<linearGradient id="ger" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${EMBER.side}"/><stop offset="1" stop-color="${EMBER.deep}"/></linearGradient>
</defs>
<style>
.df polygon,.df path.f{stroke-width:.7;stroke-linejoin:round}
.flo{fill:url(#gflo);stroke:none}
.fw{fill:url(#gfw);stroke:none}
.kt{fill:#3a3935;stroke:#3a3935}.kt2{fill:#33322f;stroke:#33322f}.kt1{fill:#2b2a28;stroke:#2b2a28}
.kl{fill:url(#gkl);stroke:url(#gkl)}.kr{fill:url(#gkr);stroke:url(#gkr)}
.kin{fill:#141413;stroke:none}.klit{fill:url(#glit);stroke:none}.klit2{fill:url(#glit2);stroke:none}.kfloorlit{fill:url(#gfloorlit);stroke:none}
.ct{fill:#e8e0d1;stroke:#e8e0d1}.cl{fill:url(#gcl);stroke:url(#gcl)}.cr{fill:url(#gcr);stroke:url(#gcr)}
.cs{fill:url(#gcs);stroke:none}.cdome{fill:url(#gcdome);stroke:none}.cmoon{fill:#a8977c;stroke:none}
.cbowl{fill:url(#gcs);stroke:none}.cbrim{fill:#bfb099;stroke:none}
.dt{fill:#2c2b28;stroke:#2c2b28}.dl{fill:#1f1e1d;stroke:#1f1e1d}.dr{fill:#151514;stroke:#151514}
.ds{fill:url(#gds);stroke:none}.dbowl{fill:url(#gds);stroke:none}.dbrim{fill:#0f0f0e;stroke:none}
.mfl{fill:#3f3d39;stroke:#3f3d39}
.cdt{fill:#a8977c;stroke:#a8977c}.cdl{fill:#958670;stroke:#958670}.cdr{fill:#7f725e;stroke:#7f725e}
.ghost{fill:none;stroke:none}
.rt{fill:#b6a891;stroke:#b6a891}.rl{fill:#9a8c76;stroke:#9a8c76}.rr{fill:#837764;stroke:#837764}
.sat{fill:#cfc2ab;stroke:#cfc2ab}.sal{fill:#b9ab93;stroke:#b9ab93}.sar{fill:#968871;stroke:#968871}.mir{fill:#8a857c;stroke:none}
.lf{fill:url(#glf)}.lt{fill:#f1ebdf;stroke:#f1ebdf}.lr{fill:url(#glr);stroke:#5d5549}
.ef{fill:url(#gef)}.et{fill:${EMBER.top};stroke:${EMBER.top}}.er{fill:url(#ger);stroke:${EMBER.edge}}
.flatlogo .fl-eb{fill:${EMBER.side}}.flatlogo .fl-ef{fill:${EMBER.front}}
.ccap{fill:url(#gccap);stroke:none}
.xs{stroke-width:.8;vector-effect:non-scaling-stroke}
.shd{fill:url(#gshd);stroke:none}
.wire{stroke:#0e0e0d;stroke-width:.8}
.halo{fill:url(#ghalo)}.cap{fill:#121211}.glass{fill:#fff0cf}
.twig{fill:#a8977c;stroke:#a8977c;stroke-width:.9;stroke-linecap:round}.twig circle{stroke:none}
</style>
</svg>`;
