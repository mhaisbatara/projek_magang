import { Search, Bell, CircleHelp } from 'lucide-react';
import './Topbar.css';

function Topbar() {
  return (
    <header className="topbar">
      <div className="topbar-search">
        <Search size={16} />
        <input type="text" placeholder="Cari Pasien, Rekam Medis, atau Jadwal..." />
      </div>
      <div className="topbar-actions">
        <button type="button" className="topbar-icon-btn" aria-label="Notifikasi">
          <Bell size={18} />
        </button>
        <button type="button" className="topbar-icon-btn" aria-label="Bantuan">
          <CircleHelp size={18} />
        </button>
      </div>
    </header>
  );
}

export default Topbar;
