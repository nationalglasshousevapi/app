"use client";

import Modal from "@/components/Modal";

export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Delete",
  busyLabel = "Deleting…",
  busy,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  busyLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      role="alertdialog"
      maxWidth="sm"
      busy={busy}
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="btn-danger"
          >
            {busy ? busyLabel : confirmLabel}
          </button>
        </div>
      }
    >
      <p className="text-sm text-slate-600 font-body">{message}</p>
    </Modal>
  );
}
