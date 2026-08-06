
import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { AuthProvider } from "./context/AuthProvider";

ReactDOM.createRoot(document.getElementById("root")).render(
<<<<<<< HEAD
  <StrictMode>
    <App />
  </StrictMode>
=======
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
>>>>>>> ceb9a49f36330b1ea45d65cb371a81754ba8e27d
);