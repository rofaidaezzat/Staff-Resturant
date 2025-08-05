import axios from "axios";
export const axiosInstance = axios.create({
    baseURL: "https://primary-production-d29f0.up.railway.app/", 
    timeout: 20000, 
});