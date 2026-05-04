import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/modules/auth/hooks/useAuth";
export function PaginaLogin() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [userNameOrEmail, setUserNameOrEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    async function handleSubmit(e) {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            await login({ userNameOrEmail, password });
            navigate("/app/dashboard", { replace: true });
        }
        catch {
            setError("Usuario o contraseña incorrectos.");
        }
        finally {
            setLoading(false);
        }
    }
    return (_jsx("div", { className: "min-h-screen flex items-center justify-center bg-slate-50", children: _jsxs("div", { className: "w-full max-w-sm bg-white rounded-xl shadow-sm border p-8 space-y-6", children: [_jsxs("div", { className: "text-center space-y-1", children: [_jsx("h1", { className: "text-2xl font-bold text-slate-800", children: "RRHH" }), _jsx("p", { className: "text-sm text-slate-500", children: "Ingresa a tu cuenta" })] }), error && (_jsx("div", { className: "rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700", children: error })), _jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [_jsxs("div", { className: "space-y-1", children: [_jsx("label", { className: "text-sm font-medium text-slate-700", children: "Usuario o correo" }), _jsx("input", { className: "w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500", type: "text", value: userNameOrEmail, onChange: (e) => setUserNameOrEmail(e.target.value), autoComplete: "username", required: true })] }), _jsxs("div", { className: "space-y-1", children: [_jsx("label", { className: "text-sm font-medium text-slate-700", children: "Contrase\u00F1a" }), _jsx("input", { className: "w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500", type: "password", value: password, onChange: (e) => setPassword(e.target.value), autoComplete: "current-password", required: true })] }), _jsx("button", { type: "submit", disabled: loading, className: "w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50", children: loading ? "Ingresando..." : "Ingresar" })] })] }) }));
}
