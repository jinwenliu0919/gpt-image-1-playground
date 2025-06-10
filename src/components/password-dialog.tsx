'use client';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import * as React from 'react';

interface PasswordDialogProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    onSave: (password: string) => void;
    title?: string;
    description?: string;
}

export function PasswordDialog({
    isOpen,
    onOpenChange,
    onSave,
    title = '配置密码',
    description
}: PasswordDialogProps) {
    const [currentPassword, setCurrentPassword] = React.useState('');
    const inputRef = React.useRef<HTMLInputElement>(null);

    const handleSave = () => {
        inputRef.current?.blur();
        onSave(currentPassword);
        setCurrentPassword('');
        onOpenChange(false);
    };

    const handleDialogClose = (open: boolean) => {
        if (!open) {
            setCurrentPassword('');
        }
        onOpenChange(open);
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleDialogClose}>
            <DialogContent className='border-border bg-card text-card-foreground sm:max-w-[425px]'>
                <DialogHeader>
                    <DialogTitle className='text-card-foreground'>{title}</DialogTitle>
                    {description && <DialogDescription className='text-muted-foreground'>{description}</DialogDescription>}
                </DialogHeader>
                <div className='grid gap-4 py-4'>
                    <div className='grid grid-cols-1 items-center gap-4'>
                        <Input
                            ref={inputRef}
                            id='password-input'
                            type='password'
                            placeholder='请输入您的密码'
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            className='col-span-1 border-border bg-card text-card-foreground placeholder:text-muted-foreground focus:border-ring focus:ring-ring'
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && currentPassword.trim()) {
                                    e.preventDefault();
                                    handleSave();
                                }
                            }}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button
                        type='button'
                        onClick={handleSave}
                        disabled={!currentPassword.trim()}
                        className='bg-primary px-6 text-primary-foreground hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground'>
                        保存
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
