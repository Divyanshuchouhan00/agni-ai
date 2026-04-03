import "./globals.css";
import { Inter } from 'next/font/google';
import { McpProvider } from '@/context/McpContext';
import { ToastProvider } from '@/context/ToastContext';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: "AGNI MCP Inspector V2",
  description: "Advanced Developer Tool for Model Context Protocol",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} h-screen flex flex-col overflow-hidden bg-background text-foreground antialiased selection:bg-accent/30 selection:text-white relative`}>
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
           <div className="absolute -top-40 -right-40 w-96 h-96 bg-accent/20 rounded-full blur-3xl opacity-50 mix-blend-screen" />
           <div className="absolute top-[20%] -left-20 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl opacity-40 mix-blend-screen" />
        </div>
        
        <div className="relative z-10 flex flex-col h-full w-full bg-background/50 backdrop-blur-[2px]">
            <ToastProvider>
                <McpProvider>
                    {children}
                </McpProvider>
            </ToastProvider>
        </div>
      </body>
    </html>
  );
}
