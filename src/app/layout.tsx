import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Header } from '@/components/header';
import { HistoryProvider } from '@/contexts/HistoryContext';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
    title: 'GPT Image Generation Playground',
    description: 'A playground for generating images with DALL-E 3'
};

export default function RootLayout({
    children
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang='en' suppressHydrationWarning className='h-full'>
            <body className={`${inter.className} h-full overflow-hidden`}>
                <ThemeProvider defaultTheme='dark'>
                    <HistoryProvider>
                        <div className='flex flex-col h-full'>
                            <Header />
                            <div className='flex-1'>
                                {children}
                            </div>
                        </div>
                    </HistoryProvider>
                </ThemeProvider>
            </body>
        </html>
    );
}
