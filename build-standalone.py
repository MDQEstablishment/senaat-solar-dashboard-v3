#!/usr/bin/env python3
"""Bundle src/*.jsx files into the standalone HTML fallback.

Reads /home/claude/repo/project/SENAAT Solar Dashboard.html as the template
(it has `<script type="text/babel" src="src/X.jsx"></script>` entries which
define load order) and inlines each referenced .jsx file, stripping the
`import React from 'react'` line that ESM modules need but in-browser Babel does not.
Writes the result to /tmp/p/r/Standalone.html.
"""
import re
import sys
from pathlib import Path

ROOT = Path("/home/claude/repo/project")
SRC = ROOT / "vite" / "src"
TEMPLATE = ROOT / "SENAAT Solar Dashboard.html"
OUT = Path("/tmp/p/r/Standalone.html")

# Files referenced in the template use the legacy `src/X.jsx` path which maps
# to the Vite project's vite/src/ folder. The tweaks-panel.jsx lives at the
# project root rather than under src/.
def resolve(path: str) -> Path:
    if path == "tweaks-panel.jsx":
        return ROOT / "tweaks-panel.jsx"
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

def main() -> int:
    if not TEMPLATE.exists():
        print(f"template not found: {TEMPLATE}", file=sys.stderr)
        return 1
    tpl = TEMPLATE.read_text(encoding="utf-8")
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
