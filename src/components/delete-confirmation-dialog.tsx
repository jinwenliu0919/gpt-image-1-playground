'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import type { HistoryMetadata } from '@/lib/types';

interface DeleteConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  item: HistoryMetadata | null;
  skipConfirmation: boolean;
  setSkipConfirmation: (value: boolean) => void;
}

export function DeleteConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  item,
  skipConfirmation,
  setSkipConfirmation,
}: DeleteConfirmationDialogProps) {
  if (!item) return null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>确认删除</DialogTitle>
          <DialogDescription>
            您确定要删除此历史记录吗？此操作无法撤销。
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-muted-foreground mb-4">
            提示词: {item.prompt}
          </p>
          <p className="text-sm text-muted-foreground">
            生成于: {new Date(item.timestamp).toLocaleString()}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="skip-confirmation"
            checked={skipConfirmation}
            onCheckedChange={(checked) => setSkipConfirmation(checked as boolean)}
          />
          <Label htmlFor="skip-confirmation">不再显示此确认对话框</Label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button variant="destructive" onClick={handleConfirm}>
            删除
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 