"use client";

// Optimized build fix for service grid types

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import {
    collection,
    doc,
    getDoc,
    onSnapshot,
    query,
    orderBy,
    limit
} from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";
import {
    ChevronLeft,
    TrendingUp,
    ArrowUpRight,
    ArrowDownLeft,
    Users,
    Wallet,
    Loader2,
    Shield,
    Home,
    Ship,
    Award,
    DownloadCloud,
    FileText,
    Key,
    History,
    ChevronRight as ChevronRightIcon,
    LogOut,
    Lock,
    Zap,
    Coins,
    ArrowUp,
    TrendingDown,
    Activity,
    CreditCard,
    Building2,
    Headphones
} from "lucide-react";

export default function ProfilePage() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [userData, setUserData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [hasRuleUpdates, setHasRuleUpdates] = useState(false);

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
            if (!currentUser) {
                router.push("/");
                return;
            }
            setUser(currentUser);

            // Real-time subscription to user data
            const userRef = doc(db, "users", currentUser.uid);
            const unsubscribeData = onSnapshot(userRef, (doc) => {
                if (doc.exists()) {
                    setUserData(doc.data());
                }
                setLoading(false);
            });

            return () => unsubscribeData();
        });

        return () => unsubscribeAuth();
    }, [router]);

    useEffect(() => {
        if (!userData) return;

        const q = query(collection(db, "rules"), orderBy("updatedAt", "desc"), limit(1));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (!snapshot.empty) {
                const latestRule = snapshot.docs[0].data();
                const lastUpdate = latestRule.updatedAt?.toMillis() || 0;

                // Track per-category updates if needed, but for profile badge, any update counts
                const lastViewedAt = userData.lastRulesViewedAt?.toMillis() || 0;

                if (lastUpdate > lastViewedAt) {
                    setHasRuleUpdates(true);
                } else {
                    setHasRuleUpdates(false);
                }
            }
        }, (error) => {
            console.error("Error listening to rules updates:", error);
        });

        return () => unsubscribe();
    }, [userData]);


    // Format phone number: 251***44444
    const formatPhone = (phone: string) => {
        if (!phone) return "N/A";
        if (phone.length < 7) return phone;
        return `${phone.substring(0, 3)}***${phone.substring(phone.length - 5)}`;
    };

    const stats = [
        { label: "Total Recharge", value: userData?.totalRecharge || "0.00", icon: CreditCard, image: "/assets/recharge.png", color: "blue", trend: "+2.4%", category: "wallet" },
        { label: "Team Income", value: userData?.teamIncome || "0.00", icon: Users, image: "/assets/invite.png", color: "purple", trend: "+15.8%", filter: "hue-rotate(240deg) saturate(1.5)", category: "team" },
        { label: "Total Income", value: userData?.totalIncome || "0.00", icon: TrendingUp, image: "/assets/buy_product.png", color: "emerald", trend: "+8.2%", category: "earnings" },
        { label: "Total Withdrawal", value: userData?.totalWithdrawal || "0.00", icon: ArrowUpRight, image: "/assets/withdrawal.png", color: "orange", trend: "0.0%", category: "wallet" },
        { label: "Team Size", value: userData?.teamSize || "0", icon: Users, color: "indigo", trend: "+1", category: "team" },
        { label: "Today Income", value: userData?.dailyIncome || "0.00", icon: Zap, image: "/assets/recharge.png", color: "amber", filter: "hue-rotate(300deg) saturate(2)", trend: "+24.3%", category: "earnings" },
    ];

    return (
        <div className="min-h-screen bg-black">
            {/* Header */}
            {/* Premium Mobile Header - Immersive Style */}
            <main className="relative z-10 pt-6 bg-gray-200 rounded-t-[3.5rem] min-h-screen p-6 pb-48 overflow-hidden shadow-[0_-20px_40px_rgba(0,0,0,0.05)]">
                {/* Decorative background pulse */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1 bg-gradient-to-r from-transparent via-blue-100 to-transparent"></div>
                {/* Advanced Profile Header & Identity Card */}
                <div className="relative mb-8 group">
                    {/* Background Decorative Element */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl"></div>

                    <div className="relative flex items-center gap-5 p-2">
                        {/* Premium Avatar with Double-Ring Glow */}
                        <div className="relative shrink-0">
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-full blur-md opacity-20"></div>
                            <div className="relative w-24 h-24 rounded-full p-1 bg-gradient-to-br from-blue-500 via-indigo-400 to-blue-600 shadow-2xl group-hover:scale-105 transition-transform duration-500">
                                <div className="w-full h-full rounded-full bg-gray-200 p-1">
                                    <div className="w-full h-full rounded-full overflow-hidden relative border border-gray-100">
                                        <img
                                            src="/avator profile.jpg"
                                            alt="Profile"
                                            className="w-full h-full object-cover"
                                        />
                                        {/* Online Pulse Indicator */}
                                        <div className="absolute bottom-1.5 right-1.5 w-4 h-4 bg-emerald-500 border-[3px] border-gray-200 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Identity Details */}
                        <div className="flex-1 space-y-1.5 overflow-hidden">
                            <div className="space-y-0">
                                <h2 className="text-2xl font-black text-gray-900 leading-tight tracking-tight uppercase truncate">Customer</h2>
                                <div className="flex items-center gap-2">
                                    <div className="px-2 py-0.5 bg-blue-50 rounded-md border border-blue-100/50">
                                        <span className="text-[10px] font-black text-blue-600 tracking-widest uppercase">UID: {userData?.uid?.substring(0, 6).toUpperCase() || "LLBSBV"}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Status Badges - Glassmorphic Style */}
                        <div className="flex flex-col items-end gap-2.5">
                            <div className="flex items-center gap-2 bg-gray-200/60 backdrop-blur-md px-3 py-1.5 rounded-2xl shadow-sm border border-gray-100/50">
                                <img src="/Ethiopia.png" alt="Ethiopia" className="w-5 h-3.5 object-cover rounded-sm" />
                                <span className="text-[9px] font-black text-gray-800 uppercase tracking-widest leading-none">ETH</span>
                            </div>
                            <div className="flex items-center gap-2 bg-gradient-to-br from-amber-500 to-orange-600 px-3 py-1.5 rounded-2xl shadow-lg shadow-orange-500/20 border border-orange-400/30">
                                <Shield size={10} className="text-white fill-current" />
                                <span className="text-[10px] font-black text-white uppercase tracking-tighter leading-none">VIP {userData?.vip || 0}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Elite Balance Card - Advanced Visual Centerpiece */}
                {/* Unified Dashboard Card */}
                <div className="mb-8 p-1">
                    <div className="bg-gray-200 rounded-[2rem] border border-gray-300 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.04)] overflow-hidden p-6">
                        {/* Balance Section */}
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-gray-300 flex items-center justify-center text-gray-700">
                                    <Wallet size={24} />
                                </div>
                                <span className="text-sm font-bold text-gray-400 uppercase tracking-widest">Balance wallet</span>
                            </div>
                            <span className="text-2xl font-black text-gray-900 tracking-tight">
                                {userData?.balance?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0.00"}
                            </span>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-3 gap-y-8 gap-x-4">
                            {stats.map((stat, i) => (
                                <div key={i} className="flex flex-col gap-1.5 group active:scale-95 transition-all">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-1 h-3.5 rounded-full bg-${stat.color}-500`}></div>
                                        <span className="text-[10px] font-medium text-gray-500 truncate">{stat.label}</span>
                                    </div>
                                    <p className="text-lg font-black text-gray-900 tracking-tight pl-3">
                                        {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Advanced Core Services - Interaction Grid */}
                <div className="grid grid-cols-4 gap-4 mb-12">
                    {[
                        { label: "FUND", image: null, color: "blue", iconColor: "text-blue-600", path: "/users/funding-details", dark: false, icon: Wallet },
                        { label: "DOWNLOAD", image: "/zen-3d-logo-v2.png", color: "indigo", iconColor: "text-white", path: "/users/download", dark: false, icon: null },
                        { label: "BANK", image: null, color: "emerald", iconColor: "text-emerald-600", path: "/users/bank", dark: false, icon: Building2 },
                        { label: "SERVICE", image: null, color: "purple", iconColor: "text-purple-600", path: "/users/service", dark: false, icon: Headphones },
                    ].map((item: any, i) => (
                        <button
                            key={i}
                            onClick={() => item.path && router.push(item.path)}
                            className="flex flex-col items-center gap-2.5 group"
                        >
                            <div className={`w-16 h-16 rounded-[1.5rem] bg-gray-200 shadow-[0_8px_20px_-6px_rgba(0,0,0,0.1)] border border-gray-300 flex items-center justify-center relative overflow-hidden group-hover:scale-110 group-active:scale-95 transition-all duration-300`}>
                                {/* Inner Gradient Accent */}
                                <div className={`absolute inset-0 bg-gradient-to-br from-${item.color}-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity`}></div>

                                <div className={`w-full h-full flex items-center justify-center relative z-10 ${item.image ? "" : `w-11 h-11 rounded-2xl ${item.dark ? `bg-gradient-to-br from-blue-600 to-indigo-700 shadow-lg shadow-blue-500/30` : `bg-${item.color}-50`}`}`}>
                                    {item.image ? (
                                        <img src={item.image} alt={item.label} className="w-full h-full object-cover scale-110 group-hover:scale-125 transition-transform duration-500" />
                                    ) : item.icon ? (
                                        <item.icon size={22} className={item.dark ? "text-white" : item.iconColor} />
                                    ) : null}

                                    {/* Red Notification Dot for RULES */}
                                    {item.label === "RULES" && hasRuleUpdates && (
                                        <div className="absolute top-1 right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white shadow-[0_0_8px_rgba(239,68,68,0.5)] animate-pulse z-20"></div>
                                    )}
                                </div>
                            </div>
                            <span className="text-[9px] font-black text-gray-500 tracking-widest uppercase text-center leading-none">{item.label}</span>
                        </button>
                    ))}
                </div>



                {/* Advanced System Actions - Navigtion Tiles */}
                <div className="space-y-5 pb-10">
                    <div className="flex items-center gap-3 mb-8 px-1">
                        <div className="w-1.5 h-4 bg-indigo-600 rounded-full"></div>
                        <h3 className="text-[10px] font-black text-gray-900 uppercase tracking-[0.3em]">System Management</h3>
                    </div>

                    {[
                        { title: "WITHDRAWAL RECORD", sub: "PAYMENT STATUS", icon: ArrowUpRight, color: "emerald", bgColor: "bg-emerald-50", path: "/users/withdrawal-record" },
                        { title: "LOGIN PASSWORD", sub: "SECURITY PROTOCOLS", icon: Key, color: "purple", bgColor: "bg-purple-50", path: "/users/change-password" },
                        { title: "WITHDRAWAL PASSWORD", sub: "ASSET PROTECTION", icon: Lock, color: "indigo", bgColor: "bg-indigo-50", path: "/users/change-withdrawal-password" },
                        { title: "RECHARGE RECORD", sub: "CREDIT ANALYSIS", icon: History, color: "orange", bgColor: "bg-orange-50", path: "/users/recharge-records" },
                    ].map((item, i) => (
                        <button
                            key={i}
                            onClick={() => item.path && router.push(item.path)}
                            className="w-full relative group active:scale-[0.98] transition-all"
                        >
                            <div className="relative flex items-center justify-between p-6 bg-white/60 backdrop-blur-md rounded-[2.8rem] border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.02)] hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-500">
                                <div className="flex items-center gap-6">
                                    <div className={`w-14 h-14 rounded-3xl ${item.bgColor} flex items-center justify-center text-${item.color}-600 shadow-sm relative overflow-hidden`}>
                                        <div className="absolute inset-0 bg-white/30 backdrop-blur-[2px]"></div>
                                        <item.icon size={26} className="relative z-10" />
                                    </div>
                                    <div className="text-left space-y-0.5">
                                        <h3 className="text-base font-black text-slate-800 tracking-tight">{item.title}</h3>
                                        <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">{item.sub}</p>
                                    </div>
                                </div>
                                <div className="w-11 h-11 rounded-full bg-white flex items-center justify-center shadow-lg shadow-gray-200/50 group-hover:bg-indigo-600 transition-all duration-500 group-hover:translate-x-1">
                                    <ChevronRightIcon size={20} className="text-gray-300 group-hover:text-white transition-colors" />
                                </div>
                            </div>
                        </button>
                    ))}

                    {/* Premium Security Exit Button */}
                    <div className="pt-6">
                        <button
                            onClick={async () => {
                                await auth.signOut();
                                router.push("/");
                            }}
                            className="w-full relative group overflow-hidden rounded-full p-6 active:scale-95 transition-all shadow-xl shadow-blue-600/30"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 group-hover:scale-105 transition-transform"></div>
                            {/* Shine effect */}
                            <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>

                            <div className="relative z-10 flex items-center justify-center gap-6">
                                <div className="w-12 h-12 rounded-full border-2 border-white/30 flex items-center justify-center">
                                    <LogOut size={22} className="text-white ml-1" />
                                </div>
                                <span className="text-xl font-black text-white uppercase tracking-[0.2em] text-shadow-sm">Log Out</span>
                            </div>
                        </button>
                    </div>
                </div>
            </main >

        </div >
    );
}
