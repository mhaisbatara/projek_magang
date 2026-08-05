import './KpiCard.css';

function KpiCard({ icon: Icon, iconColor = 'blue', badgeText, badgeTone = 'positive', label, value }) {
  return (
    <div className="kpi-card">
      <div className="kpi-card-top">
        <div className={`kpi-icon kpi-icon-${iconColor}`}>
          <Icon size={18} />
        </div>
        {badgeText && <span className={`kpi-badge kpi-badge-${badgeTone}`}>{badgeText}</span>}
      </div>
      <p className="kpi-label">{label}</p>
      <p className="kpi-value">{value}</p>
    </div>
  );
}

export default KpiCard;
