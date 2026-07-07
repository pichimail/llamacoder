/**
 * Stack Detector — dynamic tech stack identification from a Git repo snapshot.
 * Used for auto-generating bootstrap.sh, RUN.md, and choosing preview runtime.
 *
 * Supports: JS/TS (Next, Vite, CRA, Nuxt, Svelte, etc.), Python (FastAPI, Flask, Django, Streamlit),
 * Flutter, React Native, Java (Maven/Gradle/Spring), Go, Rust, Ruby, PHP, and generic.
 */

export type DetectedStack =
  | 'nextjs'
  | 'vite-react'
  | 'vite-vue'
  | 'vite-svelte'
  | 'create-react-app'
  | 'nuxt'
  | 'sveltekit'
  | 'remix'
  | 'astro'
  | 'python-fastapi'
  | 'python-flask'
  | 'python-django'
  | 'python-streamlit'
  | 'python-generic'
  | 'flutter'
  | 'react-native'
  | 'java-spring'
  | 'java-maven'
  | 'java-gradle'
  | 'go'
  | 'rust'
  | 'ruby-rails'
  | 'php-laravel'
  | 'docker'
  | 'generic';

export interface StackInfo {
  stack: DetectedStack;
  language: string;
  framework?: string;
  packageManager: 'npm' | 'pnpm' | 'yarn' | 'pip' | 'poetry' | 'bun' | 'maven' | 'gradle' | 'go' | 'cargo' | 'bundler' | 'composer' | 'flutter' | 'docker' | 'unknown';
  installCommand: string;
  devCommand: string;
  buildCommand?: string;
  startCommand?: string;
  previewableInBrowser: boolean; // can we show a live preview inside the app?
  notes: string[];
  entryFile?: string;
  confidence: number; // 0-1
}

export interface RepoSnapshot {
  files: Array<{ path: string; content?: string }>;
  packageJson?: any;
  readme?: string;
}

const WEB_STACKS: DetectedStack[] = [
  'nextjs', 'vite-react', 'vite-vue', 'vite-svelte', 'create-react-app',
  'nuxt', 'sveltekit', 'remix', 'astro'
];

export function detectStack(snapshot: RepoSnapshot): StackInfo {
  const paths = snapshot.files.map(f => f.path.toLowerCase());
  const has = (name: string) => paths.some(p => p.endsWith(name) || p.includes(`/${name}`));
  const hasDir = (dir: string) => paths.some(p => p.startsWith(dir + '/') || p === dir);
  const contentOf = (name: string) => snapshot.files.find(f => f.path.toLowerCase().endsWith(name))?.content || '';

  const pkg = snapshot.packageJson || (has('package.json') ? tryParse(contentOf('package.json')) : null);
  const hasPackageJson = !!pkg || has('package.json');

  // === JavaScript / TypeScript Web ===
  if (hasPackageJson) {
    const scripts = pkg?.scripts || {};
    const deps = { ...pkg?.dependencies, ...pkg?.devDependencies };
    const hasDep = (d: string) => !!deps[d];

    if (has('next.config.js') || has('next.config.mjs') || has('next.config.ts') || hasDep('next')) {
      return makeInfo('nextjs', 'TypeScript/JavaScript', 'Next.js', 'npm',
        'npm install', 'npm run dev', 'npm run build', 'npm run start',
        true, ['Full-stack React framework with API routes. Excellent live preview support.'], 'app/page.tsx or pages/index.tsx', 0.95);
    }
    if (has('vite.config.ts') || has('vite.config.js') || hasDep('vite')) {
      if (hasDep('@sveltejs/kit') || has('svelte.config.js')) {
        return makeInfo('sveltekit', 'Svelte', 'SvelteKit', 'npm', 'npm install', 'npm run dev', 'npm run build', 'npm run preview', true, ['SvelteKit app.'], undefined, 0.9);
      }
      if (hasDep('vue') || has('vue.config')) {
        return makeInfo('vite-vue', 'JavaScript', 'Vite + Vue', 'npm', 'npm install', 'npm run dev', 'npm run build', 'npm run preview', true, [], undefined, 0.88);
      }
      return makeInfo('vite-react', 'TypeScript/JavaScript', 'Vite', 'npm', 'npm install', 'npm run dev', 'npm run build', 'npm run preview', true, ['Fast Vite-based dev server.'], 'src/main.tsx', 0.9);
    }
    if (hasDep('react-scripts')) {
      return makeInfo('create-react-app', 'JavaScript', 'Create React App', 'npm', 'npm install', 'npm start', 'npm run build', undefined, true, [], undefined, 0.85);
    }
    if (hasDep('nuxt')) {
      return makeInfo('nuxt', 'JavaScript', 'Nuxt', 'npm', 'npm install', 'npm run dev', 'npm run build', 'npm run start', true, [], undefined, 0.87);
    }
    if (hasDep('@remix-run')) {
      return makeInfo('remix', 'JavaScript', 'Remix', 'npm', 'npm install', 'npm run dev', 'npm run build', 'npm run start', true, [], undefined, 0.85);
    }
    if (hasDep('astro')) {
      return makeInfo('astro', 'JavaScript', 'Astro', 'npm', 'npm install', 'npm run dev', 'npm run build', 'npm run preview', true, [], undefined, 0.82);
    }
    // Generic JS web project
    const devCmd = scripts.dev || scripts.start || 'npm run dev';
    return makeInfo('generic', 'JavaScript', undefined, 'npm', 'npm install', devCmd, scripts.build, scripts.start, true, ['Generic Node web project detected.'], undefined, 0.6);
  }

  // === Python ===
  if (has('requirements.txt') || has('pyproject.toml') || has('Pipfile') || hasDir('app') && has('.py')) {
    const pyContent = snapshot.files.filter(f => f.path.endsWith('.py')).map(f => f.content || '').join('\n');
    const reqs = contentOf('requirements.txt').toLowerCase() + ' ' + contentOf('pyproject.toml').toLowerCase();

    if (/streamlit|st\.|import streamlit/.test(pyContent) || reqs.includes('streamlit')) {
      return makeInfo('python-streamlit', 'Python', 'Streamlit', 'pip', 'pip install -r requirements.txt', 'streamlit run app.py', undefined, undefined, false /* simulated only */, ['Streamlit data apps. Preview is simulated in-browser; run locally for full fidelity.'], 'app.py or main.py', 0.9);
    }
    if (/fastapi|uvicorn/.test(reqs) || /from fastapi import/.test(pyContent)) {
      return makeInfo('python-fastapi', 'Python', 'FastAPI', 'pip', 'pip install -r requirements.txt', 'uvicorn main:app --reload', undefined, 'uvicorn main:app --host 0.0.0.0 --port 8000', false, ['ASGI web API. Run locally and open http://localhost:8000/docs.'], 'main.py', 0.88);
    }
    if (/flask/.test(reqs) || /from flask import/.test(pyContent)) {
      return makeInfo('python-flask', 'Python', 'Flask', 'pip', 'pip install -r requirements.txt', 'flask --app app run --debug', undefined, undefined, false, ['Classic Flask app.'], 'app.py', 0.85);
    }
    if (/django/.test(reqs) || has('manage.py')) {
      return makeInfo('python-django', 'Python', 'Django', 'pip', 'pip install -r requirements.txt', 'python manage.py runserver', undefined, undefined, false, ['Django project. Use python manage.py migrate first.'], 'manage.py', 0.87);
    }
    return makeInfo('python-generic', 'Python', undefined, 'pip', 'pip install -r requirements.txt', 'python app.py || python main.py', undefined, undefined, false, ['Generic Python project. Inspect for the correct entrypoint.'], undefined, 0.65);
  }

  // === Flutter ===
  if (has('pubspec.yaml')) {
    const pub = contentOf('pubspec.yaml');
    const isFlutter = /flutter:/.test(pub) || hasDir('lib') && paths.some(p => p.endsWith('.dart'));
    if (isFlutter) {
      return makeInfo('flutter', 'Dart', 'Flutter', 'flutter', 'flutter pub get', 'flutter run -d chrome', 'flutter build web', undefined, true /* web target */, ['Flutter supports web target for in-browser preview. Use `flutter run -d chrome`. For mobile you need local setup.'], 'lib/main.dart', 0.92);
    }
  }

  // === React Native (heuristic) ===
  if (has('app.json') && hasPackageJson && (pkg?.dependencies?.['react-native'] || has('metro.config.js'))) {
    return makeInfo('react-native', 'JavaScript', 'React Native', 'npm', 'npm install', 'npx expo start || npx react-native start', undefined, undefined, false, ['React Native / Expo. Web preview possible with `expo start --web` if configured. Otherwise run locally.'], 'App.tsx', 0.8);
  }

  // === Java ===
  if (has('pom.xml')) {
    return makeInfo('java-maven', 'Java', 'Maven', 'maven', 'mvn install', 'mvn spring-boot:run', 'mvn package', undefined, false, ['Java/Maven project. Spring Boot detected if spring-boot plugin present.'], 'src/main/java/.../Application.java', 0.8);
  }
  if (has('build.gradle') || has('build.gradle.kts')) {
    return makeInfo('java-gradle', 'Java', 'Gradle', 'gradle', './gradlew build', './gradlew bootRun', './gradlew build', undefined, false, ['Gradle Java project (likely Spring).'], undefined, 0.78);
  }

  // === Go ===
  if (has('go.mod')) {
    return makeInfo('go', 'Go', undefined, 'go', 'go mod download', 'go run main.go', 'go build', undefined, false, ['Go application. Typically exposes a server on :8080.'], 'main.go', 0.9);
  }

  // === Rust ===
  if (has('Cargo.toml')) {
    return makeInfo('rust', 'Rust', undefined, 'cargo', 'cargo build', 'cargo run', 'cargo build --release', undefined, false, [], 'src/main.rs', 0.88);
  }

  // === Ruby on Rails ===
  if (has('Gemfile') && (has('config/application.rb') || has('bin/rails'))) {
    return makeInfo('ruby-rails', 'Ruby', 'Rails', 'bundler', 'bundle install', 'bin/rails server', undefined, undefined, false, ['Rails app. May need `rails db:create db:migrate`.'], 'config/routes.rb', 0.85);
  }

  // === PHP Laravel ===
  if (has('composer.json') && (has('artisan') || paths.some(p => p.includes('laravel')))) {
    return makeInfo('php-laravel', 'PHP', 'Laravel', 'composer', 'composer install', 'php artisan serve', undefined, undefined, false, [], 'public/index.php', 0.82);
  }

  // === Docker only ===
  if (has('Dockerfile') || has('docker-compose.yml')) {
    return makeInfo('docker', 'Multi', undefined, 'docker', 'docker compose build', 'docker compose up', undefined, undefined, false, ['Containerized project. Inspect docker-compose for exposed ports.'], undefined, 0.7);
  }

  // Fallback
  return makeInfo('generic', 'Unknown', undefined, 'unknown', '# inspect the repo', '# see RUN.md', undefined, undefined, false, ['Could not confidently detect stack. Review files manually.'], undefined, 0.3);
}

function makeInfo(
  stack: DetectedStack,
  language: string,
  framework: string | undefined,
  pm: StackInfo['packageManager'],
  install: string,
  dev: string,
  build?: string,
  start?: string,
  previewable: boolean = false,
  notes: string[] = [],
  entry?: string,
  confidence = 0.75
): StackInfo {
  return {
    stack,
    language,
    framework,
    packageManager: pm,
    installCommand: install,
    devCommand: dev,
    buildCommand: build,
    startCommand: start,
    previewableInBrowser: previewable || WEB_STACKS.includes(stack),
    notes: notes.length ? notes : [`Detected ${framework || language} project.`],
    entryFile: entry,
    confidence,
  };
}

function tryParse(json: string) {
  try { return JSON.parse(json); } catch { return null; }
}

export function getBootstrapScript(info: StackInfo, repoUrl: string): string {
  const lines: string[] = [];
  lines.push('#!/usr/bin/env bash');
  lines.push('# Auto-generated bootstrap script for imported repo');
  lines.push(`# Original: ${repoUrl}`);
  lines.push(`# Stack: ${info.framework || info.stack} (${info.language})`);
  lines.push('');
  lines.push('set -e');
  lines.push('');
  lines.push('echo "Cloning..."');
  lines.push(`git clone --depth 1 "${repoUrl}" . 2>/dev/null || echo "Already in repo or clone manually"`);
  lines.push('');
  lines.push('# Install');
  lines.push(info.installCommand);
  lines.push('');

  if (info.stack.includes('python')) {
    lines.push('# Python specific');
    lines.push('python -m venv .venv || true');
    lines.push('source .venv/bin/activate || true');
    lines.push(info.installCommand);
  }

  lines.push('');
  lines.push('# Run dev server (foreground)');
  lines.push(`echo "Starting: ${info.devCommand}"`);
  lines.push(info.devCommand);
  lines.push('');
  lines.push('# For production build:');
  if (info.buildCommand) lines.push(`# ${info.buildCommand}`);
  if (info.startCommand) lines.push(`# ${info.startCommand}`);
  lines.push('');
  lines.push('# Notes:');
  info.notes.forEach(n => lines.push(`# - ${n}`));

  return lines.join('\n');
}

export function getRunMarkdown(info: StackInfo, repoUrl: string): string {
  return `# Run Instructions for Imported Project

**Source**: ${repoUrl}

**Detected stack**: ${info.framework || info.stack} — ${info.language}

## Quick start

\`\`\`bash
git clone ${repoUrl}
cd $(basename ${repoUrl} .git)
${info.installCommand}
${info.devCommand}
\`\`\`

${info.buildCommand ? `## Production build\n\`\`\`bash\n${info.buildCommand}\n\`\`\`\n` : ''}

${info.startCommand ? `## Start built version\n\`\`\`bash\n${info.startCommand}\n\`\`\`\n` : ''}

## Notes
${info.notes.map(n => `- ${n}`).join('\n')}

${info.previewableInBrowser ? 'This project has good browser preview support inside ChinnaCoder.' : 'Run the commands above locally for the best experience. Browser preview may be limited.'}

---
Generated automatically by ChinnaCoder stack detector.
`;
}
