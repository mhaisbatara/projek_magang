import "./PoliDistribution.css";

function PoliDistribution({ data = [], loading = false }) {
  const maxValue = data.length > 0 ? Math.max(...data.map((d) => d.value)) : 1;

  return (
    <div className="poli-card">
      <h3>Pasien per Poli</h3>

      {loading ? (
        <p className="poli-loading">Memuat data...</p>
      ) : data.length === 0 ? (
        <p className="poli-loading">Belum ada kunjungan pada periode ini.</p>
      ) : (
        <div className="poli-list">
          {data.map((item) => (
            <div className="poli-row" key={item.label}>
              <span className="poli-label" style={{ color: item.color }}>
                {item.label}
              </span>
              <div className="poli-bar-track">
                <div
                  className="poli-bar-fill"
                  style={{ width: `${(item.value / maxValue) * 100}%`, background: item.color }}
                />
              </div>
              <span className="poli-value">{item.value}</span>
            </div>
          ))}
        </div>
      )}

      <button type="button" className="poli-detail-btn">
        Lihat Detail Poli
      </button>
    </div>
  );
}

export default PoliDistribution;
