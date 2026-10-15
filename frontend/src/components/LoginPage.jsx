import {
  Navigate,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { useAuth } from "../lib/auth-context";
import { apiPost } from "../lib/api";
import AuthPage from "./AuthPage";
import "../styles/authpage.css";

function homeFor(role) {
  if (role === "student") return "/student";
  if (role === "supervisor") return "/supervisor";
  return "/registrar";
}

export function LoginPage() {
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();

  if (loading) return null;

  if (user) {
    const from = location.state?.from?.pathname;
    const target =
      from && from !== "/login" && from !== "/" ? from : homeFor(user.role);
    return <Navigate to={target} replace />;
  }

  return (
    <AuthPage
      initialMode={params.get("mode") === "register" ? "register" : "login"}
      onBack={() => navigate("/")}
      onSubmit={async ({ mode, name, email, password, remember }) => {
        if (mode === "register")
          await apiPost("/auth/register", { name, email, password });
        await login(email, password, remember);
      }}
    />
  );
}
