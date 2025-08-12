import axios from "axios";
export const axiosInstance = axios.create({
    baseURL: "https://primary-production-c413.up.railway.app/", 
    timeout: 20000, 
});