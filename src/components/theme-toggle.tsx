'use client';

import { Button } from '@/components/ui/button';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/components/theme-provider';

export function ThemeToggle() {
    const { theme, setTheme } = useTheme();

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            className="h-8 w-8 rounded-md border border-border bg-card/50 text-muted-foreground hover:bg-card hover:text-card-foreground"
            aria-label="切换主题"
        >
            {theme === 'light' ? (
                <Moon className="h-4 w-4" />
            ) : (
                <Sun className="h-4 w-4" />
            )}
        </Button>
    );
} 