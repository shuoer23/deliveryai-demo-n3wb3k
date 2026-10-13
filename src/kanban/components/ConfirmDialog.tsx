import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description?: string
  confirmText?: string
  cancelText?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open, title, description, confirmText = '确认', cancelText = '取消', danger, onConfirm, onCancel,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onCancel() }}>
      <DialogContent title={title} className="max-w-sm">
        {description && <p className="mt-2 text-sm leading-6 text-charcoal-500">{description}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onCancel}>{cancelText}</Button>
          <Button type="button" variant={danger ? 'default' : 'default'} onClick={onConfirm} className={danger ? '' : ''}>{confirmText}</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
