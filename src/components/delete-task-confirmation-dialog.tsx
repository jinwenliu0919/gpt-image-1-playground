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
import type { TaskRecord } from '@/lib/types';

interface DeleteTaskConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  task: TaskRecord | null;
  skipConfirmation: boolean;
  setSkipConfirmation: (value: boolean) => void;
}

export function DeleteTaskConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  task,
  skipConfirmation,
  setSkipConfirmation,
}: DeleteTaskConfirmationDialogProps) {
  if (!task) return null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  // 获取任务状态的中文描述
  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return '等待中';
      case 'processing':
        return '处理中';
      case 'completed':
        return '已完成';
      case 'failed':
        return '失败';
      default:
        return status;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>确认删除任务</DialogTitle>
          <DialogDescription>
            您确定要删除此{task.status === 'processing' ? '正在运行的' : ''}任务吗？此操作无法撤销。
            {task.status === 'processing' && '删除后任务将不再继续执行。'}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-muted-foreground mb-2">
            提示词: {task.prompt}
          </p>
          <p className="text-sm text-muted-foreground mb-2">
            状态: {getStatusText(task.status)}
          </p>
          <p className="text-sm text-muted-foreground">
            创建于: {new Date(task.timestamp).toLocaleString()}
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