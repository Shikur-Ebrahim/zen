"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Home, Ship, Users, Wallet, Shield } from "lucide-react";
import { useEffect, useState, Suspense } from "react";
import { syncDailyIncome } from "@/lib/sync";
import { auth } from "@/lib/firebase";

function BottomNavContent() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState("home");
    const [mounted, setMounted] = useState(false);
    const isChat = pathname === "/users/chat";

    const [userId, setUserId] = useState<string | null>(null);

    useEffect(() => {
        setMounted(true);
        // Clean up any potential auth listeners
        const unsubscribe = auth.onAuthStateChanged((user) => {
            if (user) {
                setUserId(user.uid);
                // Trigger sync when we have a user
                syncDailyIncome(user.uid);
            }
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!mounted) return;
        const tab = searchParams.get("tab");
        if (pathname === "/users/welcome") {
            setActiveTab(tab || "home");
        } else if (pathname === "/users/product") {
            setActiveTab("product");
        } else if (pathname === "/users/profile") {
            setActiveTab("me");
        } else if (pathname.includes("/users/team")) {
            setActiveTab("team");
        } else if (pathname === "/users/wallet") {
            setActiveTab("wallet");
        }
    }, [pathname, searchParams, mounted]);

    const hideNav = pathname === "/users/chat" || pathname === "/users/tasks" || pathname.startsWith("/users/withdraw") || pathname === "/users/change-withdrawal-password" || pathname.includes("-record") || pathname === "/users/funding-details" || (pathname.startsWith("/users/product/") && pathname !== "/users/product");

    if (!mounted || hideNav) return null;

    const navItems = [
        { id: "home", icon: Home, label: "HOME", path: "/users/welcome?tab=home" },
        { id: "wallet", icon: Wallet, label: "WALLETS", path: "/users/wallet" },
        { id: "product", icon: Ship, label: "PRODUCTS", path: "/users/product" },
        { id: "team", icon: Users, label: "TEAMS", path: "/users/team" },
        { id: "me", icon: Shield, label: "PROFILE", path: "/users/profile" },
    ];

    return (
        <div className="fixed bottom-0 left-0 right-0 z-[100] px-4 pb-8 bg-gradient-to-t from-white via-white/80 to-transparent pt-12 pointer-events-none">
            <div className="max-w-md mx-auto flex items-center justify-between gap-2 pointer-events-auto">
                {navItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => router.push(item.path)}
                        className="flex-1 flex flex-col items-center gap-1.5 group relative"
                    >
                        <div
                            className={`relative w-full h-14 flex items-center justify-center rounded-[2rem] transition-all duration-500 ${activeTab === item.id
                                ? "bg-[#3E2723] text-white shadow-[0_12px_24px_rgba(62,39,35,0.3)] scale-110"
                                : "bg-[#F5E6D3] text-[#3E2723]/40 border border-[#3E2723]/5 active:scale-95 shadow-sm"
                                }`}
                        >
                            <item.icon size={22} className="relative z-10" />
                            {activeTab === item.id && (
                                <div className="absolute inset-0 bg-white/5 rounded-[2rem] blur-md opacity-20"></div>
                            )}
                        </div>
                        <span
                            className={`text-[8.5px] font-black uppercase tracking-tighter transition-colors leading-none truncate ${activeTab === item.id ? "text-[#3E2723]" : "text-[#3E2723]/30"
                                }`}
                        >
                            {item.label}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
}

export default function BottomNav() {
    return (
        <Suspense fallback={null}>
            <BottomNavContent />
        </Suspense>
    );
}
