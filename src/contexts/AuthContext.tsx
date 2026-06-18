import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import axios from "../config/axios";
import { DEV_MODE, MOCK_USER, MOCK_TOKEN } from "../config/devConfig";

interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  age?: number;
  created_at: string;
  is_active: boolean;
  profile_url?: string;
  role: string;
  perms: string[];
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (usernameOrEmail: string, password: string) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => void;
  hasPermission: (perm: string) => boolean;
}

interface RegisterData {
  name: string;
  username: string;
  email: string;
  password: string;
  date_of_birth?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // DEV_MODE: Auto-login with mock user
    if (DEV_MODE) {
      console.log("DEV_MODE: Using mock user (bypass authentication)");
      axios.defaults.headers.common["Authorization"] = `Bearer ${MOCK_TOKEN}`;
      setUser(MOCK_USER);
      setIsLoading(false);
      return;
    }

    // Production: Check for stored token and validate
    const token = localStorage.getItem("token");
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      validateToken();
    } else {
      setIsLoading(false);
    }
  }, []);

  const validateToken = async () => {
    try {
      const response = await axios.get("/auth/me");
      setUser(response.data);
    } catch (error) {
      console.error("Token validation failed:", error);
      localStorage.removeItem("token");
      delete axios.defaults.headers.common["Authorization"];
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (usernameOrEmail: string, password: string) => {
    try {
      const response = await axios.post("/auth/login", {
        username_or_email: usernameOrEmail,
        password,
      });

      const { access_token, user: userData } = response.data;

      localStorage.setItem("token", access_token);
      axios.defaults.headers.common["Authorization"] = `Bearer ${access_token}`;
      setUser(userData);
    } catch (error: any) {
      console.error("Login failed:", error);
      throw new Error(error.response?.data?.detail || "เข้าสู่ระบบไม่สำเร็จ");
    }
  };

  const register = async (userData: RegisterData) => {
    try {
      const response = await axios.post("/auth/register", {
        name: userData.name,
        username: userData.username,
        email: userData.email,
        password: userData.password,
        date_of_birth: userData.date_of_birth
          ? new Date(userData.date_of_birth).toISOString()
          : null,
      });

      const { access_token, user: newUser } = response.data;

      localStorage.setItem("token", access_token);
      axios.defaults.headers.common["Authorization"] = `Bearer ${access_token}`;
      setUser(newUser);
    } catch (error: any) {
      console.error("Registration failed:", error);
      throw new Error(error.response?.data?.detail || "ลงทะเบียนไม่สำเร็จ");
    }
  };

  const logout = async () => {
    try {
      await axios.post("/auth/logout");
    } catch (error) {
      console.error("Logout API failed:", error);
    } finally {
      localStorage.removeItem("token");
      delete axios.defaults.headers.common["Authorization"];
      setUser(null);
    }
  };

  const hasPermission = (perm: string) => {
    return user?.perms?.includes(perm) ?? false;
  };

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
    hasPermission,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
