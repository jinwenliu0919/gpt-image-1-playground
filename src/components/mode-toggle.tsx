'use client';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

type ModeToggleProps = {
    currentMode: 'generate' | 'edit';
    onModeChange: (mode: 'generate' | 'edit') => void;
};

export function ModeToggle({ currentMode, onModeChange }: ModeToggleProps) {
    return (
        <Tabs
            value={currentMode}
            onValueChange={(value) => onModeChange(value as 'generate' | 'edit')}
            className='w-auto'>
            <TabsList className='grid h-auto grid-cols-2 gap-1 rounded-md border-none bg-transparent p-0'>
                <TabsTrigger
                    value='generate'
                    className={`rounded-md border px-3 py-1 text-sm transition-colors ${
                        currentMode === 'generate'
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-dashed border-muted-foreground bg-transparent text-muted-foreground hover:border-card-foreground hover:text-card-foreground'
                    } `}>
                    生成
                </TabsTrigger>
                <TabsTrigger
                    value='edit'
                    className={`rounded-md border px-3 py-1 text-sm transition-colors ${
                        currentMode === 'edit'
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-dashed border-muted-foreground bg-transparent text-muted-foreground hover:border-card-foreground hover:text-card-foreground'
                    } `}>
                    编辑
                </TabsTrigger>
            </TabsList>
        </Tabs>
    );
}
