import axios from "axios";

const API_BASE_URL = "http://localhost:5000/api";

export async function fetchDashboardSummary() {
  const response = await axios.get(`${API_BASE_URL}/dashboard/summary`);
  return response.data;
}
