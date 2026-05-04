import { type ReactNode } from "react";
import type { AuthUser, LoginPayload } from "@/modules/auth/types/auth.types";
type AuthContextValue = {
    user: AuthUser | null;
    isAuthenticated: boolean;
    isBootstrapping: boolean;
    login: (payload: LoginPayload) => Promise<void>;
    logout: () => Promise<void>;
    updateUser: (partial: Partial<AuthUser>) => void;
};
export declare const AuthContext: import("react").Context<AuthContextValue>;
type AuthProviderProps = {
    children: ReactNode;
};
export declare function AuthProvider({ children }: AuthProviderProps): JSX.Element;
export {};
