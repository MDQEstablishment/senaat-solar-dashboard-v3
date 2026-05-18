#!/usr/bin/env python3
"""Bundle src/*.jsx files into the standalone HTML fallback.

Reads ./SENAAT Solar Dashboard.html as the template (it has
`<script type="text/babel" src="src/X.jsx"></script>` entries which define
load order) and inlines each referenced .jsx file, stripping the
`import React from 'react'` line that ESM modules need but in-browser Babel does not.
Writes the result to ./Standalone.html.

R30.1 additions:
  - Inject @supabase/supabase-js v2 UMD CDN script before the first text/babel.
  - Inject an inline init block that creates window.supabase + window.USE_SUPABASE
    and provides the bg/bgInsert/bgUpdate/bgDelete/bgDeleteWhere/bgUpsert helpers
    + USER_UUID + ROLE_TO_ENUM + userUuid/legacyUserId + all toDb* translators.
    This mirrors vite/src/lib/supabase.js + vite/src/lib/db.js so the standalone
    HTML behaves identically to the Vite build (writes round-trip to Supabase
    when ?dev=1 is not in the URL).
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SRC = ROOT / "vite" / "src"
TEMPLATE = ROOT / "SENAAT Solar Dashboard.html"
OUT = ROOT / "Standalone.html"

SUPABASE_URL = "https://bhesznqfrcyikfupdgkx.supabase.co"
SUPABASE_PUBLISHABLE = "sb_publishable_KUh3cPKxVNV7KrwC8QBHsA_dp3Ah-9U"
SUPABASE_UMD_CDN = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"

def resolve(path: str) -> Path:
    if path == "tweaks-panel.jsx":
        # tweaks-panel.jsx may live at repo root (legacy) or under vite/src (new).
        # Prefer root if present.
        root_path = ROOT / "tweaks-panel.jsx"
        if root_path.exists():
            return root_path
        return SRC / "tweaks-panel.jsx"
    if path.startswith("src/"):
        return SRC / path[len("src/"):]
    return ROOT / path

def strip_react_imports(text: str) -> str:
    out = []
    for line in text.splitlines(keepends=True):
        if re.match(r"\s*import React from 'react';\s*$", line.rstrip()):
            continue
        out.append(line)
    return "".join(out)

def supabase_init_block() -> str:
    """Inline JS that replicates vite/src/lib/supabase.js + lib/db.js for the
    standalone build. Runs as a plain <script> (not text/babel) so it executes
    before Babel processes the JSX modules."""
    # Inline the lib/db.js content (minus its ESM import) so window.bg* and
    # the translation helpers are available before the JSX modules run.
    db_js = (SRC / "lib" / "db.js").read_text(encoding="utf-8")
    # Strip the ESM import + the module-scoped supabase ref — we'll wire it
    # through window.supabase in the patched body.
    db_js = re.sub(r"^\s*import\s.*?supabase\.js[^\n]*\n", "", db_js, flags=re.MULTILINE)
    db_js = re.sub(r"^\s*export\s+", "", db_js, flags=re.MULTILINE)
    # The bg* helpers reference the imported `supabase`/`USE_SUPABASE` directly.
    # Rewrite to use window.* so they work in the standalone (no ESM) context.
    db_js = db_js.replace("supabase.from(", "window.supabase.from(")
    db_js = db_js.replace("if (!USE_SUPABASE) return;", "if (!window.USE_SUPABASE) return;")

    return f"""<script>
// R30.1 — Supabase client init for standalone HTML build.
// Mirrors vite/src/lib/supabase.js: creates the client from the UMD global,
// stores it under the SAME `window.supabase` slot (replacing the UMD
// namespace, which we don't need beyond createClient).
(function() {{
  if (!window.supabase || typeof window.supabase.createClient !== 'function') {{
    console.error('[R30.1] supabase-js UMD failed to load — Supabase writes disabled.');
    window.USE_SUPABASE = false;
    return;
  }}
  var devOverride = /[?&]dev=1\\b/.test(window.location.search);
  var preExisting = ('USE_SUPABASE' in window) && (window.USE_SUPABASE === false);
  window.USE_SUPABASE = !devOverride && !preExisting;
  window.supabase = window.supabase.createClient(
    {SUPABASE_URL!r},
    {SUPABASE_PUBLISHABLE!r},
    {{
      auth: {{
        persistSession: true,
        autoRefreshToken: true,
        storage: window.localStorage,
        storageKey: 'zamil-auth',
      }},
    }}
  );
  window.SUPABASE_URL = {SUPABASE_URL!r};
}})();
</script>
<script>
// R30.1 — lib/db.js (inlined for standalone; ESM imports stripped; supabase
// + USE_SUPABASE rewritten to read from window.* set by the block above).
{db_js}
</script>
"""

def main() -> int:
    if not TEMPLATE.exists():
        print(f"template not found: {TEMPLATE}", file=sys.stderr)
        return 1
    tpl = TEMPLATE.read_text(encoding="utf-8")

    # Inject Supabase UMD CDN + init block before the FIRST text/babel script.
    first_babel = re.search(r'<script type="text/babel"', tpl)
    if first_babel:
        umd_tag = f'<script src="{SUPABASE_UMD_CDN}"></script>\n'
        init_block = supabase_init_block()
        insertion = umd_tag + init_block + "\n"
        tpl = tpl[:first_babel.start()] + insertion + tpl[first_babel.start():]

    # Inline each text/babel script body.
    pattern = re.compile(r'<script type="text/babel" src="([^"]+)"></script>')
    def replace(match: re.Match) -> str:
        src = match.group(1)
        path = resolve(src)
        if not path.exists():
            print(f"warning: {src} -> {path} missing", file=sys.stderr)
            return match.group(0)
        body = strip_react_imports(path.read_text(encoding="utf-8"))
        return f'<script type="text/babel">\n// {src}\n{body}\n</script>'
    bundled = pattern.sub(replace, tpl)

    OUT.write_text(bundled, encoding="utf-8")
    print(f"wrote {OUT} ({len(bundled):,} bytes)")
    return 0

if __name__ == "__main__":
    sys.exit(main())
