<<<<<<< HEAD
import { createContext, useContext, useState } from "react";
import api from "../services/api";
=======
import { createContext, useContext } from "react";
>>>>>>> ceb9a49f36330b1ea45d65cb371a81754ba8e27d

export const AuthContext = createContext(null);

export const useAuth = () => {
  return useContext(AuthContext);
};