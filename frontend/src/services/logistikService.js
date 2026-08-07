import api from "./api";

export const fetchLogistikSummary = () =>
  api.get("/logistik/summary").then((r) => r.data);

export const fetchObat = () =>
  api.get("/logistik/obat").then((r) => r.data);

export const createObat = (data) =>
  api.post("/logistik/obat", data).then((r) => r.data);

export const updateObat = (id_obat, data) =>
  api.put(`/logistik/obat/${id_obat}`, data).then((r) => r.data);

export const deleteObat = (id_obat) =>
  api.delete(`/logistik/obat/${id_obat}`).then((r) => r.data);

export const fetchSupplier = () =>
  api.get("/logistik/supplier").then((r) => r.data);

export const createSupplier = (data) =>
  api.post("/logistik/supplier", data).then((r) => r.data);

export const updateSupplier = (id_supplier, data) =>
  api.put(`/logistik/supplier/${id_supplier}`, data).then((r) => r.data);

export const deleteSupplier = (id_supplier) =>
  api.delete(`/logistik/supplier/${id_supplier}`).then((r) => r.data);

export const fetchPurchaseOrders = (status) =>
  api.get("/logistik/purchase-order", { params: status ? { status } : {} }).then((r) => r.data);

export const fetchPurchaseOrderById = (id_po) =>
  api.get(`/logistik/purchase-order/${id_po}`).then((r) => r.data);

export const createPurchaseOrder = (data) =>
  api.post("/logistik/purchase-order", data).then((r) => r.data);

export const updateStatusPO = (id_po, status) =>
  api.put(`/logistik/purchase-order/${id_po}/status`, { status }).then((r) => r.data);

export const terimaPO = (id_po) =>
  api.post(`/logistik/purchase-order/${id_po}/terima`).then((r) => r.data);

export const fetchBukuKas = (params) =>
  api.get("/logistik/buku-kas", { params }).then((r) => r.data);
