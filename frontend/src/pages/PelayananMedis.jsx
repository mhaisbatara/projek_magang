import { Stethoscope } from "lucide-react";
import Topbar from "../components/Topbar";
import "./PelayananMedis.css";

export default function PelayananMedis() {
  return (
    <div className="flex flex-col h-full bg-surface-0 text-text-primary overflow-hidden">
      <Topbar />

      <main className="flex-1 px-6 py-6 w-full overflow-y-auto">
        <h1 className="text-2xl font-bold tracking-tight">Pelayanan Medis</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Pemeriksaan dan tindakan medis pasien poliklinik.
        </p>

        <div className="mt-20 flex flex-col items-center justify-center text-center">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-accent-blue-soft text-accent-blue mb-4">
            <Stethoscope size={28} />
          </div>
          <p className="text-sm font-medium text-text-primary">
            Modul Pelayanan Medis
          </p>
          <p className="text-xs text-text-secondary mt-1">
            Fitur ini akan dikembangkan lebih lanjut.
          </p>
        </div>
      </main>
    </div>
  );
}
