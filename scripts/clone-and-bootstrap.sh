#!/usr/bin/env bash
#
# Universal Git clone + bootstrap script
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/<you>/llamacoder/main/scripts/clone-and-bootstrap.sh | bash -s -- https://github.com/owner/repo
#
# Or save locally:
#   ./clone-and-bootstrap.sh https://github.com/vercel/next.js
#
# It tries to auto-detect the stack and run the right commands.
# Safe for public repos. Review before running on untrusted code.

set -euo pipefail

REPO_URL="${1:-}"
if [[ -z "$REPO_URL" ]]; then
  echo "Usage: $0 <github-repo-url>"
  echo "Example: $0 https://github.com/owner/repo"
  exit 1
fi

REPO_NAME=$(basename "$REPO_URL" .git)
echo "==> Cloning $REPO_URL into ./$REPO_NAME"
git clone --depth 1 "$REPO_URL" "$REPO_NAME" 2>/dev/null || true
cd "$REPO_NAME" || exit 1

echo ""
echo "==> Detecting stack..."

# Simple heuristics (mirrors lib/stack-detector.ts logic)
if [[ -f package.json ]]; then
  if grep -q '"next"' package.json 2>/dev/null || [[ -f next.config.* ]]; then
    echo "Detected: Next.js"
    npm install || pnpm install || yarn
    npm run dev || pnpm dev
    exit 0
  elif [[ -f vite.config.* ]] || grep -q '"vite"' package.json; then
    echo "Detected: Vite project"
    npm install
    npm run dev
    exit 0
  else
    echo "Detected: Generic JS/TS project"
    npm install || yarn || pnpm install
    npm run dev || npm start || echo "Try: npm run dev"
    exit 0
  fi
fi

if [[ -f requirements.txt ]] || [[ -f pyproject.toml ]] || ls *.py >/dev/null 2>&1; then
  echo "Detected: Python project"
  python3 -m venv .venv || true
  source .venv/bin/activate 2>/dev/null || true
  pip install -r requirements.txt 2>/dev/null || pip install -e . 2>/dev/null || true

  if grep -qi streamlit requirements.txt 2>/dev/null || grep -qi streamlit *.py 2>/dev/null; then
    echo "Streamlit app"
    streamlit run app.py || streamlit run main.py || python -m streamlit run app.py
  elif [[ -f main.py ]] || [[ -f app.py ]]; then
    python main.py || python app.py || uvicorn main:app --reload
  else
    python -c "import app; print('Python ready. Inspect main entrypoint.')" 2>/dev/null || echo "Python env ready."
  fi
  exit 0
fi

if [[ -f pubspec.yaml ]]; then
  echo "Detected: Flutter / Dart"
  flutter pub get
  flutter run -d chrome || flutter run
  exit 0
fi

if [[ -f go.mod ]]; then
  echo "Detected: Go"
  go mod download
  go run main.go || go run .
  exit 0
fi

if [[ -f pom.xml ]]; then
  echo "Detected: Java (Maven)"
  mvn install -DskipTests || ./mvnw install -DskipTests
  mvn spring-boot:run || ./mvnw spring-boot:run
  exit 0
fi

if [[ -f Cargo.toml ]]; then
  echo "Detected: Rust"
  cargo build
  cargo run
  exit 0
fi

echo "==> Generic / unknown stack. Inspect the files yourself."
echo "Common commands you may need:"
echo "  ls -la"
echo "  cat README.md || cat package.json || cat requirements.txt"
echo ""
echo "Bootstrap complete (no auto-run for this stack)."
ls -1 | head -20
