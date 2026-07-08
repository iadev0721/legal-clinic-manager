"use client";

import Link from "next/link";
import NextImage from "next/image";
import { usePathname } from "next/navigation";
import { logout } from "@/actions/auth";
import { useState, useEffect } from "react";
import { getNotificacionesByUsuario } from "@/actions/notificaciones";

interface SidebarProps {
    user: {
        nombre: string;
        rol: string;
        cedula?: string;
    } | null;
}

export default function Sidebar({ user }: SidebarProps) {
    const pathname = usePathname();
    const [hasUnread, setHasUnread] = useState(false);

    useEffect(() => {
        const checkNotifications = async () => {
            if (user?.cedula) {
                try {
                    const res = await getNotificacionesByUsuario(user.cedula);
                    if (res.success && res.data) {
                        setHasUnread(res.data.some(n => !n.revisado));
                    }
                } catch (error) {
                    console.error("Error checking notifications sidebar:", error);
                }
            }
        };

        checkNotifications();
        // Check every minute
        const interval = setInterval(checkNotifications, 60000);
        return () => clearInterval(interval);
    }, [user]);

    const sidebarItems = [
        { label: "Inicio/Dashboard", href: "/dashboard", icon: "icon-[material-symbols--dashboard-outline-rounded]", activeIcon: "icon-[material-symbols--dashboard-rounded]" },
        { label: "Gestión de\nSolicitantes", href: "/applicants", icon: "icon-[flowbite--users-outline]", activeIcon: "icon-[flowbite--users-solid]" },
        { label: "Gestión de Casos", href: "/cases", icon: "icon-[icon-park-outline--gavel]", activeIcon: "icon-[icon-park-solid--gavel]" },
        { label: "Gestión de Citas", href: "/citations", icon: "icon-[mdi--calendar-outline]", activeIcon: "icon-[mdi--calendar]" },
        { label: "Reportes y\nEstadísticas", href: "/statistics", icon: "icon-[material-symbols--pie-chart-outline]", activeIcon: "icon-[material-symbols--pie-chart]" },
        { label: "Administración", href: "/administration", icon: "icon-[mdi--shield-account-outline]", activeIcon: "icon-[mdi--shield-account]", restricted: true },
        {
            label: "Notificaciones",
            href: "/notifications",
            icon: hasUnread ? "icon-[mdi--bell-badge-outline]" : "icon-[mdi--bell-outline]",
            activeIcon: hasUnread ? "icon-[mdi--bell-badge]" : "icon-[mdi--bell]"
        },
    ].filter(item => {
        if (item.restricted) {
            const adminRoles = ['Profesor', 'Coordinador', 'Administrador'];
            return user && adminRoles.includes(user.rol);
        }
        return true;
    });

    const safeUser = user || { nombre: "Usuario", rol: "Invitado" };
    const initials = safeUser.nombre.charAt(0).toUpperCase();
    const displayName = `${safeUser.nombre} (${safeUser.rol})`;

    return (
        <div className="w-fit self-stretch px-8 py-4 shadow-[2px_0px_37px_0px_rgba(0,0,0,0.25)] inline-flex flex-col justify-between items-center" style={{ background: "linear-gradient(131deg, #036 26.14%, #3E7DBB 239.06%)" }}>
            <div className="self-stretch inline-flex flex-col justify-start items-start gap-2">
                {/* Logo */}
                <div className="self-stretch pb-2 flex flex-col justify-start items-start gap-3">
                    <NextImage
                        src="/logoH.svg"
                        alt="Logo Horizontal"
                        width={300}
                        height={100}
                        className="w-75 h-auto"
                        priority
                    />
                    <div className="self-stretch h-[4px] bg-white rounded-full"></div>
                </div>

                {/* Navigation Items */}
                <div className="flex flex-col gap-1 w-full">
                    {sidebarItems.map((item, index) => {
                        const isActive =
                            pathname === item.href ||
                            (item.href !== "/dashboard" && pathname.startsWith(item.href));
                        return (
                            <Link key={index} href={item.href} className={`group inline-flex justify-start items-center gap-2 p-1 rounded-xl transition-all duration-300 hover:bg-white/10 hover:scale-105 hover:shadow-md cursor-pointer ${isActive ? "bg-white/10" : ""}`}>
                                <div className="relative w-11 h-11 flex justify-center items-center">
                                    <span className={`${item.icon} text-4xl text-white absolute transition-all duration-300 ${isActive ? "opacity-0 scale-75" : "group-hover:opacity-0 group-hover:scale-75"}`}></span>
                                    <span className={`${item.activeIcon} text-4xl text-white absolute transition-all duration-300 ${isActive ? "opacity-100 scale-100" : "opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100"}`}></span>
                                </div>
                                <h1 className={`justify-start text-white text-base font-semibold leading-tight group-hover:text-neutral-100 transition-colors whitespace-pre-line ${isActive ? "text-neutral-100" : ""}`}>{item.label}</h1>
                            </Link>
                        );
                    })}
                </div>
            </div>
            <div className="self-stretch inline-flex flex-col justify-center items-start gap-6">
                <div className="self-stretch px-4 py-3 rounded-2xl inline-flex justify-start items-center gap-3 bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 shadow-sm cursor-default">
                    <div className="p-2 bg-white rounded-xl flex justify-center items-center shadow-sm">
                        <span className="icon-[mdi--peace] text-3xl text-[#3E7DBB]"></span>
                    </div>
                    <div className="flex-1 inline-flex flex-col justify-start items-start gap-0.5">
                        <h1 className="self-stretch text-[#3E7DBB] text-xs font-bold tracking-wide uppercase">ODS 16</h1>
                        <h1 className="self-stretch text-sky-950 text-sm font-bold leading-tight">Paz, Justicia e Instituciones</h1>
                    </div>
                </div>
                <div className="self-stretch bg-white/10 p-4 rounded-3xl border border-white/10 flex flex-col gap-4 shadow-inner">
                    <div className="flex items-center gap-3">
                        {/* Avatar */}
                        <div className="w-12 h-12 bg-gradient-to-br from-[#EEF5FB] to-[#D0E3F3] rounded-2xl flex items-center justify-center shadow-md border border-white/20 shrink-0">
                            <h1 className="text-[#3E7DBB] text-xl font-black">{initials}</h1>
                        </div>

                        {/* User Info */}
                        <div className="flex-1 min-w-0 flex flex-col gap-1">
                            <div className="flex items-start justify-between gap-2">
                                <h1 className="text-white text-[14px] font-bold leading-tight tracking-normal uppercase break-words line-clamp-2">
                                    {safeUser.nombre}
                                </h1>
                                <Link
                                    href="/profile"
                                    className="text-blue-300 hover:text-white transition-all transform hover:rotate-12 shrink-0 mt-0.5"
                                    title="Editar Perfil"
                                >
                                    <span className="icon-[mdi--account-edit-outline] text-2xl"></span>
                                </Link>
                            </div>
                            <div className="bg-white/10 self-start px-2 py-0.5 rounded-lg border border-white/5">
                                <p className="text-blue-100/90 text-[9px] font-bold uppercase tracking-[0.15em] leading-none">
                                    {safeUser.rol}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Logout Button */}
                    <button
                        data-testid="sidebar-logout"
                        onClick={async () => {
                            await logout();
                        }}
                        className="group flex justify-center items-center gap-2 w-full py-2 bg-gradient-to-r from-red-500/80 to-red-600/80 hover:from-red-500 hover:to-red-600 text-white text-[11px] font-black rounded-2xl shadow-[0_4px_12px_rgba(239,68,68,0.2)] transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer border border-white/10 uppercase tracking-widest"
                    >
                        <span className="icon-[mdi--logout] text-lg transition-transform group-hover:translate-x-1"></span>
                        CERRAR SESIÓN
                    </button>
                </div>
            </div>
        </div>
    );
}

