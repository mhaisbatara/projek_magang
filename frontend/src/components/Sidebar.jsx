import {
  LayoutGrid,
  Users,
  Stethoscope,
  FlaskConical,
  Wallet,
  Warehouse,
  FileBarChart2,
  Settings,
  CircleHelp,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './Sidebar.css';

const menuItems = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
  { key: 'pelayanan', label: 'Pelayanan & Antrean', icon: Users },
  { key: 'medis', label: 'Pelayanan Medis', icon: Stethoscope },
  { key: 'penunjang', label: 'Penunjang Medis', icon: FlaskConical },
  { key: 'kasir', label: 'Kasir & Keuangan', icon: Wallet },
  { key: 'logistik', label: 'Logistik & Operasional', icon: Warehouse },
  { key: 'sistem', label: 'Sistem & Pelaporan', icon: FileBarChart2 },
];

function Sidebar({
  activeKey = 'dashboard',
  onNavigate,
  user = { name: 'Dr. Budi Santoso', role: 'Administrator' },
}) {
  const navigate = useNavigate();

  const handleNavigate = (key) => {
    if (onNavigate) {
      onNavigate(key);
    } else {
      if (key === 'dashboard') {
        navigate('/dashboard');
      } else if (key === 'pelayanan') {
        navigate('/pendaftaran');
      } else if (key === 'medis') {
        navigate('/medis');

      }else if (key === 'sistem') {
        navigate('/administration');
      } else if (key === 'kasir') {
        navigate('/kasir');
      } else if (key === 'penunjang') {
        navigate('/penunjang');

      } else if (key === 'logistik') {
        navigate('/logistik');

      }
      
    }
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="sidebar-brand-icon">+</span>
        <div>
          <p className="sidebar-brand-name">SAKK Clinical</p>
          <p className="sidebar-brand-sub">Management System</p>
        </div>
      </div>

      <nav className="sidebar-nav">
        {menuItems.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            className={`sidebar-item ${activeKey === key ? 'is-active' : ''}`}
            onClick={() => handleNavigate(key)}
          >
            <Icon size={18} strokeWidth={2} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button type="button" className="sidebar-item sidebar-item-muted">
          <Settings size={18} />
          <span>Pengaturan</span>
        </button>
        <button type="button" className="sidebar-item sidebar-item-muted">
          <CircleHelp size={18} />
          <span>Bantuan</span>
        </button>
        <div className="sidebar-user">
          <div className="sidebar-user-avatar">{user.name.charAt(0)}</div>
          <div>
            <p className="sidebar-user-name">{user.name}</p>
            <p className="sidebar-user-role">{user.role}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
