export type PoliCount = { nama_poli: string; total: number };

export default function PasienPerPoliCard({ data }: { data: PoliCount[] }) {
  const max = Math.max(1, ...data.map((d) => d.total));

  return (
    <div className="flex h-full flex-col rounded border border-[#E5E1D8] bg-white p-5 shadow-sm">
      <h3 className="font-[Space_Grotesk,sans-serif] text-sm font-bold text-[#101826]">
        Pasien per Poli
      </h3>

      <div className="mt-4 flex-1 space-y-3">
        {data.length === 0 && (
          <p className="text-sm text-[#9CA3AF]">Belum ada kunjungan hari ini.</p>
        )}
        {data.map((d) => (
          <div key={d.nama_poli}>
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-[#101826]">{d.nama_poli}</span>
              <span className="font-mono text-[#6B7280]">{d.total}</span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[#FAF9F6]">
              <div
                className="h-full rounded-full bg-[#101826]"
                style={{ width: `${(d.total / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <a
        href="/dashboard/master-data"
        className="mt-4 block rounded border border-[#E5E1D8] bg-[#FAF9F6] py-2 text-center text-xs font-semibold text-[#101826] transition-colors hover:border-[#E8A33D]"
      >
        Lihat Detail Poli
      </a>
    </div>
  );
}
