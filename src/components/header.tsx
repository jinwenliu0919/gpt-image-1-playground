'use client';

import Link from 'next/link';
import { ThemeToggle } from '@/components/theme-toggle';

export function Header() {
    return (
        <header className='sticky top-0 z-50 w-full border-b shadow-md bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60'>
            <div className='container flex h-16 w-full items-center justify-between px-4'>
                <div className='flex items-center gap-2'>
                    <Link href='/' className='mr-10 flex items-center space-x-3'>
                        <span className='text-lg font-bold sm:inline-block'>GPT-图像生成</span>
                    </Link>
                    <nav className='flex items-center bg-muted/40 rounded-lg overflow-hidden'>
                        <Link
                            href='/'
                            className='px-6 py-2.5 transition-colors hover:bg-primary/10 hover:text-primary text-foreground font-medium'
                        >
                            生成
                        </Link>
                        <Link
                            href='/history'
                            className='px-6 py-2.5 transition-colors hover:bg-primary/10 hover:text-primary text-foreground/60 font-medium'
                        >
                            历史
                        </Link>
                    </nav>
                </div>
                <div className='flex items-center bg-muted/30 p-2 rounded-full'>
                    <ThemeToggle />
                </div>
            </div>
        </header>
    );
} 