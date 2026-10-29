"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/Modal";
import { toast } from "@/lib/toast";

type Worker = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  opening_balance: number;
};

export default function WorkerEditButton({ worker }: { worker: Worker }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(worker.name);
  const [phone, setPhone] = useState(worker.phone ?? "");
  const [email, setEmail] = useState(worker.email ?? "");
  const [opening, setOpening] = useState(String(worker.opening_balance));
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/workers/${worker.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          email,
          opening_balance: parseFloat(opening) || 0,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json.error || "Could not save worker.");
        return;
      }
      toast.success("Worker updated.");
      setOpen(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className="btn-secondary text-sm"
        onClick={() => setOpen(true)}
      >
        Edit
      </button>
      {open && (
        <Modal
          onClose={() => setOpen(false)}
          onSubmit={submit}
          title="Edit Worker"
          description="Update worker details and opening balance."
          maxWidth="lg"
          closeOnBackdrop={false}
          busy={saving}
          footer={
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="btn-primary disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          }
        >
          <div className="grid md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="label">Name *</label>
              <input
                className="input"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Phone</label>
              <input
                className="input"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Email</label>
              <input
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Opening Balance</label>
              <input
                className="input"
                type="number"
                step="0.01"
                value={opening}
                onChange={(e) => setOpening(e.target.value)}
              />
              <p className="text-xs text-slate-400 mt-1">
                Use a negative amount for an advance.
              </p>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
