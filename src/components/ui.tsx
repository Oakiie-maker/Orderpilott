import { type ReactNode } from 'react';
import type { OrderStatus, PaymentStatus } from '@/types/database';

export function StatusBadge({ status }: { status: OrderStatus }) {
  const config: Record<OrderStatus, { class: string; label: string }> = {
    pending: { class: 'badge-warning', label: 'Pending' },
    preparing: { class: 'badge-info', label: 'Preparing' },
    ready: { class: 'badge-primary', label: 'Ready' },
    completed: { class: 'badge-success', label: 'Completed' },
    rejected: { class: 'badge-error', label: 'Rejected' },
    cancelled: { class: 'badge-error', label: 'Cancelled' },
  };

  const { class: cls, label } = config[status] || config.pending;
  return <span className={cls}>{label}</span>;
}

export function PaymentBadge({ status }: { status: PaymentStatus }) {
  const config: Record<PaymentStatus, { class: string; label: string }> = {
    pending: { class: 'badge-warning', label: 'Unpaid' },
    paid: { class: 'badge-success', label: 'Paid' },
    failed: { class: 'badge-error', label: 'Failed' },
    refunded: { class: 'badge-info', label: 'Refunded' },
  };

  const { class: cls, label } = config[status] || config.pending;
  return <span className={cls}>{label}</span>;
}

export function Spinner({ className = '' }: { className?: string }) {
  return (
    <div
      className={`inline-block animate-spin rounded-full border-2 border-navy-200 border-t-primary-600 ${className}`}
      style={{ width: '1em', height: '1em', minWidth: '16px', minHeight: '16px' }}
    />
  );
}

export function LoadingState({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <Spinner className="h-8 w-8 mb-3" />
      <p className="text-sm text-navy-500">{message}</p>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-navy-200 py-12 px-4 text-center">
      {icon && <div className="mb-4 text-navy-300">{icon}</div>}
      <h3 className="text-base font-semibold text-navy-700">{title}</h3>
      {description && <p className="mt-1 text-sm text-navy-500 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  danger = false,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-navy-950/40 animate-fade-in" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-md rounded-xl bg-white p-6 shadow-xl animate-slide-up">
        <h3 className="text-lg font-semibold text-navy-900">{title}</h3>
        <p className="mt-2 text-sm text-navy-600">{message}</p>
        <div className="mt-5 flex justify-end gap-3">
          <button className="btn-outline" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            className={danger ? 'btn-danger' : 'btn-primary'}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function Toast({
  message,
  type = 'success',
  onClose,
}: {
  message: string;
  type?: 'success' | 'error' | 'info';
  onClose: () => void;
}) {
  const styles = {
    success: 'bg-success-600',
    error: 'bg-error-600',
    info: 'bg-navy-800',
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-slide-in-right">
      <div
        className={`flex items-center gap-3 rounded-lg ${styles[type]} px-4 py-3 text-white shadow-lg`}
      >
        <span className="text-sm font-medium">{message}</span>
        <button onClick={onClose} className="text-white/80 hover:text-white">
          ✕
        </button>
      </div>
    </div>
  );
}
