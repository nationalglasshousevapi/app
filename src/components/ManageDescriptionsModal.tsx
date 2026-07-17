"use client";

import { useEffect, useState } from "react";

type DescriptionItem = {
  id: string;
  description: string;
};

export default function ManageDescriptionsModal({
  onClose,
}: {
  onClose: () => void;
}) {
  const [items, setItems] = useState<DescriptionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newDesc, setNewDesc] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  function fetchDescriptions() {
    fetch("/api/descriptions")
      .then((r) => r.json())
      .then((json) => {
        setItems(json.descriptions ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }

  useEffect(() => {
    fetchDescriptions();
  }, []);

  async function addDescription() {
    const desc = newDesc.trim();
    if (!desc) return;
    setAdding(true);
    setError("");
    try {
      const res = await fetch("/api/descriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: desc }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Failed to add description.");
      } else {
        setNewDesc("");
        fetchDescriptions();
      }
    } catch {
      setError("Failed to save. Check connection.");
    } finally {
      setAdding(false);
    }
  }

  async function deleteDescription(id: string) {
    try {
      const res = await fetch(`/api/descriptions/${id}`, { method: "DELETE" });
      if (res.ok) {
        setItems((prev) => prev.filter((d) => d.id !== id));
      }
    } catch {}
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">Manage Descriptions</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
          {loading ? (
            <p className="text-sm text-slate-400">Loading...</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-slate-400">No descriptions saved yet.</p>
          ) : (
            items.map((d) => (
              <div key={d.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 border border-slate-100">
                <span className="text-sm text-slate-800">{d.description}</span>
                <button
                  type="button"
                  onClick={() => deleteDescription(d.id)}
                  className="text-xs text-red-500 hover:text-red-600 hover:bg-red-50 rounded px-2 py-1 transition"
                >
                  Delete
                </button>
              </div>
            ))
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 space-y-2">
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-2">
            <input
              className="input flex-1"
              placeholder="Add new description..."
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") addDescription(); }}
            />
            <button
              type="button"
              onClick={addDescription}
              disabled={adding || !newDesc.trim()}
              className="btn-primary text-sm px-4"
            >
              {adding ? "Adding..." : "Add"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
