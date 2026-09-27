#!/usr/bin/env python3
"""VOIDBOOK Python3 build orchestrator (Termux + GitHub Actions)."""
import json, os, shutil, subprocess, sys, datetime

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CFG  = os.path.join(ROOT, "config", "voidbook.json")

def log(m): print(f"[VOIDBOOK] {m}", flush=True)

def run(cmd, cwd=None):
    log(" ".join(cmd) if isinstance(cmd, list) else cmd)
    r = subprocess.run(cmd, cwd=cwd, shell=isinstance(cmd, str),
                       capture_output=True, text=True)
    if r.stdout: print(r.stdout)
    if r.returncode != 0:
        print(r.stderr, file=sys.stderr)
        sys.exit(r.returncode)
    return r

def main():
    log(f"VOIDBOOK build @ {datetime.datetime.utcnow().isoformat()}Z")
    with open(CFG) as f:
        cfg = json.load(f)
    android = os.path.join(ROOT, "mobile", "android")
    if not os.path.isdir(android):
        log("No android/ yet — run `npx expo prebuild -p android` first.")
        sys.exit(1)
    run(["./gradlew", "assembleRelease", "--no-daemon"], cwd=android)
    out = os.path.join(android, "app", "build", "outputs", "apk", "release")
    dest = os.path.join(ROOT, "releases")
    os.makedirs(dest, exist_ok=True)
    version = cfg["app"]["version"]
    for f in os.listdir(out):
        if f.endswith(".apk"):
            shutil.copy2(os.path.join(out, f),
                         os.path.join(dest, f"VOIDBOOK-v{version}.apk"))
            log(f"APK → releases/VOIDBOOK-v{version}.apk")
    log("✅ Build complete.")

if __name__ == "__main__":
    main()
