import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { PageHeader } from "@/components/ui/page-header";
import { getMyProfile, updateMyProfile } from "@/modules/account/services/accountApi";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import { httpClient } from "@/services/api/httpClient";
export function PaginaPerfil() {
    const queryClient = useQueryClient();
    const { updateUser } = useAuth();
    const [feedback, setFeedback] = useState(null);
    const [fullName, setFullName] = useState("");
    const [editing, setEditing] = useState(false);
    const [oldPassword, setOldPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const profileQuery = useQuery({ queryKey: ["my-profile"], queryFn: getMyProfile });
    useEffect(() => {
        if (profileQuery.data && !editing)
            setFullName(profileQuery.data.fullName);
    }, [profileQuery.data, editing]);
    const ok = (msg) => setFeedback({ type: "success", message: msg });
    const fail = (msg) => setFeedback({ type: "error", message: msg });
    const updateMutation = useMutation({
        mutationFn: () => updateMyProfile({ fullName }),
        onSuccess: async (data) => {
            await queryClient.invalidateQueries({ queryKey: ["my-profile"] });
            updateUser({ fullName: data.fullName });
            ok("Perfil actualizado.");
            setEditing(false);
        },
        onError: () => fail("No se pudo actualizar el perfil."),
    });
    const passwordMutation = useMutation({
        mutationFn: () => httpClient.post("/api/v1/auth/change-password", { currentPassword: oldPassword, newPassword }),
        onSuccess: () => { ok("Contraseña actualizada."); setOldPassword(""); setNewPassword(""); setConfirmPassword(""); },
        onError: () => fail("No se pudo cambiar la contraseña."),
    });
    const profile = profileQuery.data;
    function handlePasswordSubmit(e) {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            fail("Las contraseñas no coinciden.");
            return;
        }
        passwordMutation.mutate();
    }
    return (_jsxs("section", { className: "space-y-6 max-w-xl", children: [_jsx(PageHeader, { title: "Mi perfil", description: "Informaci\u00F3n de tu cuenta" }), feedback && _jsx(Alert, { variant: feedback.type, message: feedback.message, onClose: () => setFeedback(null) }), _jsxs("div", { className: "rounded-lg border bg-white p-6 space-y-4", children: [_jsx("h2", { className: "font-semibold text-slate-700", children: "Datos de la cuenta" }), _jsxs("div", { className: "space-y-1", children: [_jsx("label", { className: "text-xs text-slate-500", children: "Usuario" }), _jsx("p", { className: "text-sm text-slate-700", children: profile?.userName ?? "—" })] }), _jsxs("div", { className: "space-y-1", children: [_jsx("label", { className: "text-xs text-slate-500", children: "Correo" }), _jsx("p", { className: "text-sm text-slate-700", children: profile?.email ?? "—" })] }), _jsxs("div", { className: "space-y-1", children: [_jsx("label", { className: "text-xs text-slate-500", children: "Nombre completo" }), editing ? (_jsx(Input, { value: fullName, onChange: (e) => setFullName(e.target.value) })) : (_jsx("p", { className: "text-sm text-slate-700", children: profile?.fullName ?? "—" }))] }), profile?.employeeName && (_jsxs("div", { className: "space-y-1", children: [_jsx("label", { className: "text-xs text-slate-500", children: "Empleado vinculado" }), _jsxs("p", { className: "text-sm text-slate-700", children: [profile.employeeName, " (", profile.employeeCode, ")"] })] })), _jsxs("div", { className: "space-y-1", children: [_jsx("label", { className: "text-xs text-slate-500", children: "Roles" }), _jsx("p", { className: "text-sm text-slate-700", children: profile?.roles?.join(", ") ?? "—" })] }), _jsx("div", { className: "flex gap-2", children: editing ? (_jsxs(_Fragment, { children: [_jsx(Button, { disabled: updateMutation.isPending, onClick: () => updateMutation.mutate(), children: "Guardar" }), _jsx(Button, { variant: "secondary", onClick: () => { setEditing(false); setFullName(profile?.fullName ?? ""); }, children: "Cancelar" })] })) : (_jsx(Button, { variant: "secondary", onClick: () => setEditing(true), children: "Editar nombre" })) })] }), _jsxs("div", { className: "rounded-lg border bg-white p-6 space-y-4", children: [_jsx("h2", { className: "font-semibold text-slate-700", children: "Cambiar contrase\u00F1a" }), _jsxs("form", { onSubmit: handlePasswordSubmit, className: "space-y-3", children: [_jsxs("div", { children: [_jsx("label", { className: "text-xs text-slate-500", children: "Contrase\u00F1a actual" }), _jsx(Input, { type: "password", value: oldPassword, onChange: (e) => setOldPassword(e.target.value), autoComplete: "current-password", required: true })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs text-slate-500", children: "Nueva contrase\u00F1a" }), _jsx(Input, { type: "password", value: newPassword, onChange: (e) => setNewPassword(e.target.value), autoComplete: "new-password", required: true })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs text-slate-500", children: "Confirmar contrase\u00F1a" }), _jsx(Input, { type: "password", value: confirmPassword, onChange: (e) => setConfirmPassword(e.target.value), autoComplete: "new-password", required: true })] }), _jsx(Button, { type: "submit", disabled: passwordMutation.isPending, children: "Cambiar contrase\u00F1a" })] })] })] }));
}
