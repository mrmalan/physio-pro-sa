#!/usr/bin/env python3
"""deploy.py — build + push physio-pro-sa to GitHub
Usage: python3 deploy.py "feat: your message"
"""
import subprocess, sys, os, glob, re

def run(cmd):
    r = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if r.returncode != 0:
        print(f"ERROR: {cmd}\n{r.stderr}")
        sys.exit(1)
    return r.stdout.strip()

msg = sys.argv[1] if len(sys.argv) > 1 else "chore: update"
os.chdir(os.path.dirname(os.path.abspath(__file__)))

# AP-6 import check
print("Running AP-6 import check...")
all_files = glob.glob("src/**/*.js", recursive=True) + glob.glob("src/**/*.jsx", recursive=True)
violations = []
for fp in all_files:
    with open(fp) as f: src = f.read()
    for m in re.finditer(r'from\s+"([^"]+)"', src):
        imp = m.group(1)
        if imp.startswith(".") and not imp.startswith("@"):
            resolved = os.path.normpath(os.path.join(os.path.dirname(fp), imp))
            candidates = [resolved, resolved + ".js", resolved + ".jsx",
                          resolved + "/index.js", resolved + "/index.jsx"]
            if not any(os.path.exists(c) for c in candidates):
                violations.append(f"  {fp}: unresolved import '{imp}'")

if violations:
    print("AP-6 FAILED — unresolved imports:")
    for v in violations: print(v)
    sys.exit(1)
print("AP-6 passed.")

print("Building...")
run("npm run build")
print("Build OK.")

print("Pushing to GitHub...")
run("git add -A")
run(f'git commit -m "{msg}"')
run("git push origin main")
print(f"Deployed: {msg}")
