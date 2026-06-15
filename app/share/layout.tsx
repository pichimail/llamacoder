export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full min-h-full flex-col items-center justify-center">
      {children}
    </div>
  );
}
