import Link from "next/link";

export function RichFooter() {
  return (
    <footer className="border-t border-white/10 bg-black/40 py-12 text-sm text-white/70">
      <div className="mx-auto max-w-6xl px-4 grid grid-cols-2 md:grid-cols-5 gap-y-10">
        <div>
          <div className="font-semibold text-white mb-3">Chinna-Coder</div>
          <div className="text-xs">Build. Preview. Ship.</div>
        </div>
        <div>
          <div className="font-medium text-white/80 mb-2">Product</div>
          <div className="space-y-1">
            <Link href="/features" className="block hover:text-white">Features</Link>
            <Link href="/docs" className="block hover:text-white">Docs</Link>
            <Link href="/gallery" className="block hover:text-white">Gallery</Link>
          </div>
        </div>
        <div>
          <div className="font-medium text-white/80 mb-2">Company</div>
          <div className="space-y-1">
            <Link href="/about" className="block hover:text-white">About</Link>
            <Link href="/pricing" className="block hover:text-white">Pricing</Link>
            <Link href="/privacy" className="block hover:text-white">Privacy</Link>
            <Link href="/terms" className="block hover:text-white">Terms</Link>
          </div>
        </div>
        <div>
          <div className="font-medium text-white/80 mb-2">Resources</div>
          <div className="space-y-1">
            <a href="https://github.com" className="block hover:text-white">GitHub</a>
            <Link href="/docs" className="block hover:text-white">Documentation</Link>
            <Link href="/about" className="block hover:text-white">Security</Link>
          </div>
        </div>
        <div className="col-span-2 md:col-span-1 text-xs">
          © {new Date().getFullYear()} Chinna-Coder. All rights reserved.<br />
          Built with love and lots of AI.
        </div>
      </div>
    </footer>
  );
}
