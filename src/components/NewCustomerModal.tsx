"use client";

import { useState, FormEvent } from "react";

type Customer = {
  id: string;
  name: string;
  address: string | null;
  contact_person: string | null;
  contact_number: string | null;
  email: string | null;
  gst: string | null;
  opening_balance: number;
};

export default function NewCustomerModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (customer: Customer) => void;
}) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [email, setEmail] = useState("");
  const [gst, setGst] = useState("");
  const [openingBalance, setOpeningBalance] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          address: address || null,
          contact_person: contactPerson || null,
          contact_number: contactNumber || null,
          email: email || null,
          gst: gst || null,
          opening_balance: openingBalance ? parseFloat(openingBalance) : 0,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to create customer.");
      }
      onCreated(json.customer);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-auto overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 pb-0">
          <h2 className="font-display text-xl font-bold text-ink">Add Customer</h2>
          <p className="text-sm text-slate-500 mt-1">
            Save their details once to fill invoices faster.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
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
            <div className="md:col-span-2">
              <label className="label">Address</label>
              <input
                className="input"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Contact Person</label>
              <input
                className="input"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Contact Number</label>
              <input
                className="input"
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value)}
              />
            </div>
            <div className="md:col-span-2">
              <label className="label">Email</label>
              <input
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="label">GST</label>
              <input
                className="input"
                value={gst}
                onChange={(e) => setGst(e.target.value)}
              />
            </div>
            <div>
              <label className="label">
                Opening Balance{" "}
                <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <input
                className="input"
                type="number"
                step="0.01"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Customer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
