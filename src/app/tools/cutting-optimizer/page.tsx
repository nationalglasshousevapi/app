import { Suspense } from "react";
import CuttingOptimizer from "@/components/CuttingOptimizer";

export default function CuttingOptimizerPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <p className="text-slate-400">Loading...</p>
        </div>
      }
    >
      <CuttingOptimizer />
    </Suspense>
  );
}
