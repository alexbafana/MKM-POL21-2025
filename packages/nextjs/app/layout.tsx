// packages/nextjs/app/layout.tsx
import "@rainbow-me/rainbowkit/styles.css";
import Link from "next/link";
import { ScaffoldEthAppWithProviders } from "~~/components/ScaffoldEthAppWithProviders";
import { ThemeProvider } from "~~/components/ThemeProvider";
import "~~/styles/globals.css";
import { getMetadata } from "~~/utils/scaffold-eth/getMetadata";

export const metadata = getMetadata({
  title: "MKMPOL21 • DAO",
  description: "Public data governance, transparently coordinated",
});

const ScaffoldEthApp = ({ children }: { children: React.ReactNode }) => {
  return (
    <html suppressHydrationWarning>
      <body>
        <ThemeProvider enableSystem>
          <ScaffoldEthAppWithProviders>
            {/* Header removed intentionally to avoid duplication */}
            {children}
            <footer className="px-6 py-10 border-t border-base-300 text-sm opacity-70 mt-16">
              <div className="max-w-6xl mx-auto flex items-center justify-between">
                <div>© {new Date().getFullYear()} MKMPOL21 DAO</div>
                <div className="flex gap-4">
                  <Link href="/committees" className="link">Committees</Link>
                  <Link href="/roles-permissions" className="link">Roles &amp; Permissions</Link>
                  <Link href="/debug" className="link">Debug</Link>
                </div>
              </div>
            </footer>
          </ScaffoldEthAppWithProviders>
        </ThemeProvider>
      </body>
    </html>
  );
};

export default ScaffoldEthApp;
