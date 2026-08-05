import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

export default function Dashboard() {
  const { user, logout } = useAuth();
  
  // --- STATE UTAMA ---
  const [barangList, setBarangList] = useState([]); // Menyimpan daftar barang
  const [loading, setLoading] = useState(true);      // Indikator memuat data
  const [error, setError] = useState("");          // Pesan error jika ada
  const [showModal, setShowModal] = useState(false); // Mengontrol buka/tutup modal form
  const [editingBarang, setEditingBarang] = useState(null); // Barang yang sedang diedit (null jika mode tambah)

  // --- STATE FORM MODAL ---
  const [form, setForm] = useState({ nama: "", kategori: "" });

  // 1. Ambil data barang dari backend saat halaman dimuat
  const fetchBarang = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/barang");
      setBarangList(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Gagal memuat data barang");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBarang();
  }, []);

  // 2. Aksi Klik Tambah Barang
  const handleAddClick = () => {
    setEditingBarang(null);
    setForm({ nama: "", kategori: "" }); // Reset form kosong
    setShowModal(true);
  };

  // 3. Aksi Klik Edit Barang
  const handleEditClick = (barang) => {
    setEditingBarang(barang);
    setForm({ nama: barang.nama, kategori: barang.kategori }); // Isi form dengan data lama
    setShowModal(true);
  };

  // 4. Aksi Simpan Barang (Tambah Baru ATAU Edit Lama)
  const handleSave = async (e) => {
    e.preventDefault();
    setError("");
    try {
      if (editingBarang) {
        // Mode Edit: Kirim request PUT
        const res = await api.put(`/barang/${editingBarang.id}`, form);
        // Update item di dalam state list
        setBarangList((prev) =>
          prev.map((b) => (b.id === editingBarang.id ? res.data : b))
        );
      } else {
        // Mode Tambah: Kirim request POST
        const res = await api.post("/barang", form);
        // Taruh barang baru di baris teratas list
        setBarangList((prev) => [res.data, ...prev]);
      }
      setShowModal(false);
      setEditingBarang(null);
    } catch (err) {
      setError(err.response?.data?.message || "Gagal menyimpan barang");
    }
  };

  // 5. Aksi Hapus Barang
  const handleDelete = async (id) => {
    if (!window.confirm("Yakin ingin menghapus barang ini?")) return;
    setError("");
    try {
      await api.delete(`/barang/${id}`);
      // Buang barang dengan ID terkait dari list di UI
      setBarangList((prev) => prev.filter((b) => b.id !== id));
    } catch (err) {
      setError(err.response?.data?.message || "Gagal menghapus barang");
    }
  };

  return (
    <div className="dashboard-container">
      {/* HEADER */}
      <header className="dashboard-header">
        <div>
          <p className="dashboard-header-eyebrow">Inventaris · Magang</p>
          <h2>Dashboard Barang</h2>
          <p>Masuk sebagai: <strong>{user?.username}</strong></p>
        </div>
        <button className="btn-secondary" onClick={logout}>Logout</button>
      </header>

      {/* BODY */}
      <div className="dashboard-body">
        {error && <p className="error-text">{error}</p>}

        <div className="dashboard-actions">
          <button className="btn-primary" onClick={handleAddClick}>+ Tambah Barang</button>
        </div>

        {loading ? (
          <p>Memuat data...</p>
        ) : barangList.length === 0 ? (
          <div className="empty-state">Belum ada barang. Klik "+ Tambah Barang" untuk mulai mencatat.</div>
        ) : (
          <table className="product-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nama Barang</th>
                <th>Kategori</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {barangList.map((barang) => (
                <tr key={barang.id}>
                  <td className="item-id">#{barang.id}</td>
                  <td>{barang.nama}</td>
                  <td><span className="category-tag">{barang.kategori}</span></td>
                  <td className="action-cell">
                    <button className="btn-small btn-edit" onClick={() => handleEditClick(barang)}>Edit</button>
                    <button className="btn-small btn-delete" onClick={() => handleDelete(barang.id)}>Hapus</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* FORM MODAL (INLINE) */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3>{editingBarang ? "Edit Barang" : "Tambah Barang"}</h3>
            <form onSubmit={handleSave}>
              <div className="form-field">
                <label>Nama Barang</label>
                <input
                  type="text"
                  value={form.nama}
                  onChange={(e) => setForm({ ...form, nama: e.target.value })}
                  required
                />
              </div>
              <div className="form-field">
                <label>Kategori</label>
                <input
                  type="text"
                  value={form.kategori}
                  onChange={(e) => setForm({ ...form, kategori: e.target.value })}
                  required
                />
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setShowModal(false);
                    setEditingBarang(null);
                  }}
                >
                  Batal
                </button>
                <button type="submit" className="btn-primary">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}