import axios from "axios";

/** API sans session RH : pas de redirection 401 vers /login. */
export const publicApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api",
});
