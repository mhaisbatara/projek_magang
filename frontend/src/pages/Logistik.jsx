import { useState, useEffect } from "react";
import {
  Package, Warehouse, Truck, ShoppingCart, Wallet,
  Plus, Pencil, Trash2, Check, X, AlertTriangle,
  Boxes, TrendingDown, ClipboardList, Search,
} from "lucide-react";
import Topbar from "../components/Topbar";
import {
  fetchLogistikSummary, fetchObat, createObat, updateObat, deleteObat,
  fetchSupplier, createSupplier, updateSupplier, deleteSupplier,
  fetchPurchaseOrders, fetchPurchaseOrderById, createPurchaseOrder,
  updateStatusPO, terimaPO, fetchBukuKas,
} from "../services/logistikService";
import "./Logistik.css";

const TABS = [
  { key: "ringkasan", label: "Ringkasan", icon: ClipboardList },
  { key: "obat", label: "Obat & Stok", icon: Package },
  { key: "supplier", label: "Supplier", icon: Truck },
  { key: "po", label: "Purchase Order", icon: ShoppingCart },
  { key: "kas", label: "Kas", icon: Wallet },
];

function formatRupiah(value) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);
}

function formatDate(dateStr) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function statusBadge(status) {
  const map = {
    aman: "badge-green",
    menipis: "badge-orange",
    habis: "badge-red",
    diajukan: "badge-blue",
    diproses: "badge-orange",
    diterima: "badge-green",
    batal: "badge-red",
    lunas: "badge-green",
    belum_bayar: "badge-orange",
    menunggu: "badge-orange",
    diracik: "badge-blue",
    selesai: "badge-green",
    dipanggil: "badge-blue",
  };
  return map[status] || "badge-gray";
}

export default function Logistik() {
  const [activeTab, setActiveTab] = useState("ringkasan");

  return (
    <div className="logistik">
      <Topbar />
      <div className="logistik-body">
        <div className="logistik-heading">
          <div>
            <h1>Logistik &amp; Operasional</h1>
            <p>Kelola obat, stok, supplier, dan pembelian klinik.</p>
          </div>
        </div>

        <div className="logistik-tabs">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              className={`logistik-tab ${activeTab === key ? "is-active" : ""}`}
              onClick={() => setActiveTab(key)}
            >
              <Icon size={16} />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {activeTab === "ringkasan" && <TabRingkasan />}
        {activeTab === "obat" && <TabObat />}
        {activeTab === "supplier" && <TabSupplier />}
        {activeTab === "po" && <TabPO />}
        {activeTab === "kas" && <TabKas />}
      </div>
    </div>
  );
}

// =======================
// TAB: RINGKASAN
// =======================
function TabRingkasan() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    fetchLogistikSummary()
      .then((res) => { if (mounted) setData(res); })
      .catch(() => { if (mounted) setError("Gagal memuat data ringkasan."); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  if (loading) return <p className="logistik-loading">Memuat data...</p>;
  if (error) return <p className="logistik-error">{error}</p>;
  if (!data) return null;

  const kpi = data.kpi;

  const kpiCards = [
    { label: "Total Jenis Obat", value: kpi.totalObat, icon: Boxes, color: "blue" },
    { label: "Total Stok", value: kpi.totalStok, icon: Package, color: "teal" },
    { label: "Stok Menipis", value: kpi.stokMenipis, icon: AlertTriangle, color: "red" },
    { label: "PO Diajukan", value: kpi.poDiajukan, icon: ShoppingCart, color: "orange" },
    { label: "PO Diproses", value: kpi.poDiproses, icon: TrendingDown, color: "orange" },
    { label: "Pembelian Bulan Ini", value: formatRupiah(kpi.nilaiPembelianBulanIni), icon: Wallet, color: "teal" },
  ];

  return (
    <div className="logistik-section">
      <div className="kpi-grid">
        {kpiCards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className={`logistik-kpi-card kpi-${color}`}>
            <div className="kpi-card-top">
              <Icon size={18} />
            </div>
            <p className="kpi-label">{label}</p>
            <p className="kpi-value">{value}</p>
          </div>
        ))}
      </div>

      <div className="logistik-panels">
        <div className="logistik-panel">
          <h3>Obat Stok Menipis</h3>
          {data.obatMenipis.length === 0 ? (
            <p className="logistik-empty">Semua stok obat dalam batas aman.</p>
          ) : (
            <table className="logistik-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nama Obat</th>
                  <th>Satuan</th>
                  <th>Stok</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.obatMenipis.map((o) => (
                  <tr key={o.id_obat}>
                    <td>{o.id_obat}</td>
                    <td>{o.nama_obat}</td>
                    <td>{o.satuan || "-"}</td>
                    <td>{o.stok}</td>
                    <td><span className={`badge ${statusBadge(statusStok(o.stok))}`}>{statusStok(o.stok)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="logistik-panel">
          <h3>PO Terbaru</h3>
          {data.poTerbaru.length === 0 ? (
            <p className="logistik-empty">Belum ada purchase order.</p>
          ) : (
            <table className="logistik-table">
              <thead>
                <tr>
                  <th>ID PO</th>
                  <th>Supplier</th>
                  <th>Tanggal</th>
                  <th>Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.poTerbaru.map((po) => (
                  <tr key={po.id_po}>
                    <td>{po.id_po}</td>
                    <td>{po.nama_supplier || "-"}</td>
                    <td>{formatDate(po.tanggal_po)}</td>
                    <td>{formatRupiah(Number(po.total))}</td>
                    <td><span className={`badge ${statusBadge(po.status)}`}>{po.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function statusStok(stok) {
  if (stok <= 0) return "habis";
  if (stok <= 20) return "menipis";
  return "aman";
}

// =======================
// TAB: OBAT & STOK
// =======================
function TabObat() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [search, setSearch] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const reload = () => { setLoading(true); setReloadKey((k) => k + 1); };

  useEffect(() => {
    let mounted = true;
    fetchObat()
      .then((data) => { if (mounted) setList(data); })
      .catch(() => { if (mounted) setError("Gagal memuat daftar obat."); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [reloadKey]);

  const filtered = search
    ? list.filter((o) =>
        o.nama_obat.toLowerCase().includes(search.toLowerCase()) ||
        o.id_obat.toLowerCase().includes(search.toLowerCase())
      )
    : list;

  const handleDelete = async (id) => {
    if (!confirm(`Hapus obat ini?`)) return;
    try {
      await deleteObat(id);
      reload();
    } catch {
      alert("Gagal menghapus obat.");
    }
  };

  return (
    <div className="logistik-section">
      <div className="logistik-toolbar">
        <div className="logistik-search">
          <Search size={16} />
          <input
            type="text"
            placeholder="Cari obat..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button type="button" className="btn btn-primary" onClick={() => { setEditItem(null); setShowForm(true); }}>
          <Plus size={16} /> Tambah Obat
        </button>
      </div>

      {error && <p className="logistik-error">{error}</p>}
      {loading ? (
        <p className="logistik-loading">Memuat data...</p>
      ) : (
        <table className="logistik-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nama Obat</th>
              <th>Satuan</th>
              <th>Harga</th>
              <th>Stok</th>
              <th>Status</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((o) => (
              <tr key={o.id_obat}>
                <td>{o.id_obat}</td>
                <td>{o.nama_obat}</td>
                <td>{o.satuan || "-"}</td>
                <td>{formatRupiah(o.harga)}</td>
                <td>{o.stok}</td>
                <td><span className={`badge ${statusBadge(o.status_stok)}`}>{o.status_stok}</span></td>
                <td>
                  <div className="logistik-actions">
                    <button type="button" className="btn-icon" title="Edit" onClick={() => { setEditItem(o); setShowForm(true); }}>
                      <Pencil size={15} />
                    </button>
                    <button type="button" className="btn-icon btn-icon-danger" title="Hapus" onClick={() => handleDelete(o.id_obat)}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showForm && (
        <ObatForm
          item={editItem}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); reload(); }}
        />
      )}
    </div>
  );
}

function ObatForm({ item, onClose, onSaved }) {
  const [form, setForm] = useState({
    nama_obat: item?.nama_obat || "",
    satuan: item?.satuan || "",
    harga: item?.harga || "",
    stok: item?.stok ?? "",
    jenis_alkes: item?.jenis_alkes || "",
  });
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = {
        nama_obat: form.nama_obat,
        satuan: form.satuan || null,
        harga: Number(form.harga),
        stok: form.stok !== "" ? Number(form.stok) : 0,
        jenis_alkes: form.jenis_alkes || null,
      };
      if (item) {
        await updateObat(item.id_obat, data);
      } else {
        await createObat(data);
      }
      onSaved();
    } catch {
      alert("Gagal menyimpan obat.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{item ? "Edit Obat" : "Tambah Obat"}</h3>
          <button type="button" className="btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={submit} className="modal-form">
          <label>
            Nama Obat *
            <input type="text" required value={form.nama_obat} onChange={(e) => setForm({ ...form, nama_obat: e.target.value })} />
          </label>
          <label>
            Satuan
            <input type="text" placeholder="tablet, kapsul, botol..." value={form.satuan} onChange={(e) => setForm({ ...form, satuan: e.target.value })} />
          </label>
          <label>
            Harga (Rp) *
            <input type="number" required min="0" value={form.harga} onChange={(e) => setForm({ ...form, harga: e.target.value })} />
          </label>
          <label>
            Stok
            <input type="number" min="0" value={form.stok} onChange={(e) => setForm({ ...form, stok: e.target.value })} />
          </label>
          <label>
            Jenis Alkes (opsional)
            <input type="text" placeholder="Jika alat kesehatan..." value={form.jenis_alkes} onChange={(e) => setForm({ ...form, jenis_alkes: e.target.value })} />
          </label>
          <div className="modal-actions">
            <button type="button" className="btn btn-outline" onClick={onClose}>Batal</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Menyimpan..." : "Simpan"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// =======================
// TAB: SUPPLIER
// =======================
function TabSupplier() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const reload = () => { setLoading(true); setReloadKey((k) => k + 1); };

  useEffect(() => {
    let mounted = true;
    fetchSupplier()
      .then((data) => { if (mounted) setList(data); })
      .catch(() => { if (mounted) setError("Gagal memuat daftar supplier."); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [reloadKey]);

  const handleDelete = async (id) => {
    if (!confirm("Hapus supplier ini?")) return;
    try {
      await deleteSupplier(id);
      reload();
    } catch (err) {
      alert(err.response?.data?.message || "Gagal menghapus supplier.");
    }
  };

  return (
    <div className="logistik-section">
      <div className="logistik-toolbar">
        <h3>Daftar Supplier</h3>
        <button type="button" className="btn btn-primary" onClick={() => { setEditItem(null); setShowForm(true); }}>
          <Plus size={16} /> Tambah Supplier
        </button>
      </div>

      {error && <p className="logistik-error">{error}</p>}
      {loading ? (
        <p className="logistik-loading">Memuat data...</p>
      ) : (
        <table className="logistik-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nama Supplier</th>
              <th>Kontak</th>
              <th>Jumlah PO</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {list.map((s) => (
              <tr key={s.id_supplier}>
                <td>{s.id_supplier}</td>
                <td>{s.nama_supplier}</td>
                <td>{s.kontak || "-"}</td>
                <td>{s.jumlah_po}</td>
                <td>
                  <div className="logistik-actions">
                    <button type="button" className="btn-icon" title="Edit" onClick={() => { setEditItem(s); setShowForm(true); }}>
                      <Pencil size={15} />
                    </button>
                    <button type="button" className="btn-icon btn-icon-danger" title="Hapus" onClick={() => handleDelete(s.id_supplier)}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showForm && (
        <SupplierForm
          item={editItem}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); reload(); }}
        />
      )}
    </div>
  );
}

function SupplierForm({ item, onClose, onSaved }) {
  const [form, setForm] = useState({
    nama_supplier: item?.nama_supplier || "",
    kontak: item?.kontak || "",
  });
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = {
        nama_supplier: form.nama_supplier,
        kontak: form.kontak || null,
      };
      if (item) {
        await updateSupplier(item.id_supplier, data);
      } else {
        await createSupplier(data);
      }
      onSaved();
    } catch {
      alert("Gagal menyimpan supplier.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{item ? "Edit Supplier" : "Tambah Supplier"}</h3>
          <button type="button" className="btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={submit} className="modal-form">
          <label>
            Nama Supplier *
            <input type="text" required value={form.nama_supplier} onChange={(e) => setForm({ ...form, nama_supplier: e.target.value })} />
          </label>
          <label>
            Kontak
            <input type="text" placeholder="Telepon / email..." value={form.kontak} onChange={(e) => setForm({ ...form, kontak: e.target.value })} />
          </label>
          <div className="modal-actions">
            <button type="button" className="btn btn-outline" onClick={onClose}>Batal</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Menyimpan..." : "Simpan"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// =======================
// TAB: PURCHASE ORDER
// =======================
function TabPO() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [detail, setDetail] = useState(null);
  const [filterStatus, setFilterStatus] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const reload = () => { setLoading(true); setReloadKey((k) => k + 1); };

  useEffect(() => {
    let mounted = true;
    fetchPurchaseOrders(filterStatus)
      .then((data) => { if (mounted) setList(data); })
      .catch(() => { if (mounted) setError("Gagal memuat daftar PO."); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [reloadKey, filterStatus]);

  const handleStatusChange = async (id_po, status) => {
    try {
      await updateStatusPO(id_po, status);
      reload();
    } catch {
      alert("Gagal mengubah status PO.");
    }
  };

  const handleTerima = async (id_po) => {
    if (!confirm("Terima PO ini? Stok obat akan bertambah dan kas akan tercatat.")) return;
    try {
      await terimaPO(id_po);
      alert("PO berhasil diterima.");
      reload();
    } catch {
      alert("Gagal menerima PO.");
    }
  };

  const handleDetail = async (id_po) => {
    try {
      const data = await fetchPurchaseOrderById(id_po);
      setDetail(data);
    } catch {
      alert("Gagal memuat detail PO.");
    }
  };

  return (
    <div className="logistik-section">
      <div className="logistik-toolbar">
        <div className="logistik-filter">
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">Semua Status</option>
            <option value="diajukan">Diajukan</option>
            <option value="diproses">Diproses</option>
            <option value="diterima">Diterima</option>
            <option value="batal">Batal</option>
          </select>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setShowForm(true)}>
          <Plus size={16} /> Buat Purchase Order
        </button>
      </div>

      {error && <p className="logistik-error">{error}</p>}
      {loading ? (
        <p className="logistik-loading">Memuat data...</p>
      ) : (
        <table className="logistik-table">
          <thead>
            <tr>
              <th>ID PO</th>
              <th>Supplier</th>
              <th>Tanggal</th>
              <th>Item</th>
              <th>Total Nilai</th>
              <th>Status</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {list.map((po) => (
              <tr key={po.id_po}>
                <td>{po.id_po}</td>
                <td>{po.nama_supplier || "-"}</td>
                <td>{formatDate(po.tanggal_po)}</td>
                <td>{po.jumlah_item}</td>
                <td>{formatRupiah(po.total_nilai)}</td>
                <td><span className={`badge ${statusBadge(po.status)}`}>{po.status}</span></td>
                <td>
                  <div className="logistik-actions">
                    <button type="button" className="btn-icon" title="Detail" onClick={() => handleDetail(po.id_po)}>
                      <Search size={15} />
                    </button>
                    {po.status === "diajukan" && (
                      <button type="button" className="btn-icon" title="Proses" onClick={() => handleStatusChange(po.id_po, "diproses")}>
                        <Check size={15} />
                      </button>
                    )}
                    {po.status === "diproses" && (
                      <button type="button" className="btn-icon btn-icon-success" title="Terima Barang" onClick={() => handleTerima(po.id_po)}>
                        <Warehouse size={15} />
                      </button>
                    )}
                    {(po.status === "diajukan" || po.status === "diproses") && (
                      <button type="button" className="btn-icon btn-icon-danger" title="Batalkan" onClick={() => handleStatusChange(po.id_po, "batal")}>
                        <X size={15} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showForm && (
        <POForm           onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); reload(); }} />
      )}

      {detail && (
        <PODetail data={detail} onClose={() => setDetail(null)} />
      )}
    </div>
  );
}

function POForm({ onClose, onSaved }) {
  const [suppliers, setSuppliers] = useState([]);
  const [obatList, setObatList] = useState([]);
  const [id_supplier, setIdSupplier] = useState("");
  const [items, setItems] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([fetchSupplier(), fetchObat()])
      .then(([sups, obat]) => {
        setSuppliers(sups);
        setObatList(obat);
        if (sups.length > 0) setIdSupplier(sups[0].id_supplier);
      })
      .catch(() => alert("Gagal memuat data supplier/obat."));
  }, []);

  const addItem = () => {
    if (obatList.length === 0) return;
    setItems([...items, { id_obat: obatList[0].id_obat, jumlah: 1, harga_satuan: Number(obatList[0].harga) }]);
  };

  const updateItem = (idx, field, value) => {
    const next = [...items];
    if (field === "id_obat") {
      const obat = obatList.find((o) => o.id_obat === value);
      next[idx] = { ...next[idx], id_obat: value, harga_satuan: Number(obat?.harga || 0) };
    } else if (field === "jumlah") {
      next[idx] = { ...next[idx], jumlah: Number(value) };
    } else {
      next[idx] = { ...next[idx], [field]: Number(value) };
    }
    setItems(next);
  };

  const removeItem = (idx) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const total = items.reduce((sum, it) => sum + it.jumlah * it.harga_satuan, 0);

  const submit = async (e) => {
    e.preventDefault();
    if (!id_supplier || items.length === 0) {
      alert("Pilih supplier dan tambahkan minimal 1 item.");
      return;
    }
    setSaving(true);
    try {
      await createPurchaseOrder({ id_supplier, items });
      onSaved();
    } catch {
      alert("Gagal membuat PO.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-box-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Buat Purchase Order</h3>
          <button type="button" className="btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={submit} className="modal-form">
          <label>
            Supplier *
            <select value={id_supplier} onChange={(e) => setIdSupplier(e.target.value)}>
              {suppliers.map((s) => (
                <option key={s.id_supplier} value={s.id_supplier}>{s.nama_supplier}</option>
              ))}
            </select>
          </label>

          <div className="po-items-header">
            <h4>Item Obat</h4>
            <button type="button" className="btn btn-outline" onClick={addItem}><Plus size={14} /> Tambah Item</button>
          </div>

          {items.length === 0 ? (
            <p className="logistik-empty">Belum ada item. Klik "Tambah Item".</p>
          ) : (
            <table className="logistik-table po-items-table">
              <thead>
                <tr>
                  <th>Obat</th>
                  <th>Jumlah</th>
                  <th>Harga Satuan</th>
                  <th>Subtotal</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => (
                  <tr key={idx}>
                    <td>
                      <select value={it.id_obat} onChange={(e) => updateItem(idx, "id_obat", e.target.value)}>
                        {obatList.map((o) => (
                          <option key={o.id_obat} value={o.id_obat}>{o.nama_obat}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input type="number" min="1" value={it.jumlah} onChange={(e) => updateItem(idx, "jumlah", e.target.value)} />
                    </td>
                    <td>
                      <input type="number" min="0" value={it.harga_satuan} onChange={(e) => updateItem(idx, "harga_satuan", e.target.value)} />
                    </td>
                    <td>{formatRupiah(it.jumlah * it.harga_satuan)}</td>
                    <td>
                      <button type="button" className="btn-icon btn-icon-danger" onClick={() => removeItem(idx)}>
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan="3" style={{ textAlign: "right", fontWeight: 700 }}>Total:</td>
                  <td style={{ fontWeight: 700 }}>{formatRupiah(total)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          )}

          <div className="modal-actions">
            <button type="button" className="btn btn-outline" onClick={onClose}>Batal</button>
            <button type="submit" className="btn btn-primary" disabled={saving || items.length === 0}>
              {saving ? "Menyimpan..." : "Simpan PO"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PODetail({ data, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-box-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Detail PO {data.id_po}</h3>
          <button type="button" className="btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-form">
          <div className="po-detail-info">
            <p><strong>Supplier:</strong> {data.nama_supplier}</p>
            <p><strong>Tanggal:</strong> {formatDate(data.tanggal_po)}</p>
            <p><strong>Status:</strong> <span className={`badge ${statusBadge(data.status)}`}>{data.status}</span></p>
          </div>
          <table className="logistik-table">
            <thead>
              <tr>
                <th>Obat</th>
                <th>Satuan</th>
                <th>Jumlah</th>
                <th>Harga Satuan</th>
                <th>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((it) => (
                <tr key={it.id_po_detail}>
                  <td>{it.nama_obat}</td>
                  <td>{it.satuan || "-"}</td>
                  <td>{it.jumlah}</td>
                  <td>{formatRupiah(it.harga_satuan)}</td>
                  <td>{formatRupiah(it.jumlah * it.harga_satuan)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan="4" style={{ textAlign: "right", fontWeight: 700 }}>Total:</td>
                <td style={{ fontWeight: 700 }}>{formatRupiah(data.total_nilai)}</td>
              </tr>
            </tfoot>
          </table>
          <div className="modal-actions">
            <button type="button" className="btn btn-outline" onClick={onClose}>Tutup</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// =======================
// TAB: KAS
// =======================
function TabKas() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    let mounted = true;
    fetchBukuKas(filter ? { jenis_transaksi: filter } : {})
      .then((data) => { if (mounted) setData(data); })
      .catch(() => { if (mounted) setError("Gagal memuat buku kas."); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [filter]);

  if (loading) return <p className="logistik-loading">Memuat data...</p>;
  if (error) return <p className="logistik-error">{error}</p>;
  if (!data) return null;

  const { transaksi, ringkasan } = data;

  return (
    <div className="logistik-section">
      <div className="kpi-grid">
        <div className="logistik-kpi-card kpi-green">
          <div className="kpi-card-top"><Wallet size={18} /></div>
          <p className="kpi-label">Total Kas Masuk</p>
          <p className="kpi-value">{formatRupiah(ringkasan.total_masuk)}</p>
        </div>
        <div className="logistik-kpi-card kpi-red">
          <div className="kpi-card-top"><TrendingDown size={18} /></div>
          <p className="kpi-label">Total Kas Keluar</p>
          <p className="kpi-value">{formatRupiah(ringkasan.total_keluar)}</p>
        </div>
        <div className={`logistik-kpi-card ${ringkasan.saldo >= 0 ? "kpi-blue" : "kpi-red"}`}>
          <div className="kpi-card-top"><ClipboardList size={18} /></div>
          <p className="kpi-label">Saldo</p>
          <p className="kpi-value">{formatRupiah(ringkasan.saldo)}</p>
        </div>
      </div>

      <div className="logistik-toolbar">
        <div className="logistik-filter">
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="">Semua Transaksi</option>
            <option value="masuk">Kas Masuk</option>
            <option value="keluar">Kas Keluar</option>
          </select>
        </div>
      </div>

      <table className="logistik-table">
        <thead>
          <tr>
            <th>ID Kas</th>
            <th>Tanggal</th>
            <th>Jenis</th>
            <th>Kategori</th>
            <th>Jumlah</th>
            <th>Keterangan</th>
          </tr>
        </thead>
        <tbody>
          {transaksi.map((t) => (
            <tr key={t.id_kas}>
              <td>{t.id_kas}</td>
              <td>{formatDate(t.tanggal)}</td>
              <td>
                <span className={`badge ${t.jenis_transaksi === "masuk" ? "badge-green" : "badge-red"}`}>
                  {t.jenis_transaksi}
                </span>
              </td>
              <td>{t.kategori || "-"}</td>
              <td style={{ color: t.jenis_transaksi === "masuk" ? "#16794f" : "#ef4444", fontWeight: 600 }}>
                {t.jenis_transaksi === "masuk" ? "+" : "-"} {formatRupiah(t.jumlah)}
              </td>
              <td>{t.keterangan || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
