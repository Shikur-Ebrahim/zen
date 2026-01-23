"use client";

import { useState, useEffect } from "react";
import { db, auth } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import AdminSidebar from "@/components/AdminSidebar";
import {
    Settings,
    Loader2,
    Menu,
    RefreshCcw,
    Save,
    Coins
} from "lucide-react";
import { toast } from "sonner";

export default function RechargeSettingsPage() {
    const router = useRouter();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [minAmount, setMinAmount] = useState<number>(4500);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            const isMaster = localStorage.getItem("admin_session") === "true";
            if (!user && !isMaster) {
                router.push("/");
            } else {
                fetchSettings();
            }
        });
        return () => unsubscribe();
    }, []);

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const docRef = doc(db, "GlobalSettings", "recharge");
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                setMinAmount(docSnap.data().minAmount || 4500);
            }
        } catch (error) {
            console.error("Error fetching settings:", error);
            toast.error("Failed to load settings");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (minAmount < 0) {
            toast.error("Minimum amount cannot be negative");
            return;
        }

        setSaving(true);
        try {
            await setDoc(doc(db, "GlobalSettings", "recharge"), {
                minAmount: minAmount,
                updatedAt: new Date().toISOString()
            }, { merge: true });
            toast.success("Recharge settings updated successfully");
        } catch (error) {
            console.error("Error saving settings:", error);
            toast.error("Failed to save settings");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Loader2 className="animate-spin text-indigo-600" size={40} />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex">
            <AdminSidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

            <div className="flex-1 flex flex-col min-h-screen w-full">
                {/* Header */}
                <header className="sticky top-0 bg-white/80 backdrop-blur-xl px-6 py-6 flex items-center justify-between z-40 border-b border-slate-100">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="md:hidden w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600"
                        >
                            <Menu size={24} />
                        </button>
                        <div className="flex flex-col">
                            <h2 className="text-xl font-black text-slate-900 tracking-tight leading-none">Recharge Config</h2>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Global Payment Thresholds</p>
                        </div>
                    </div>

                    <button
                        onClick={fetchSettings}
                        className="w-12 h-12 flex items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
                    >
                        <RefreshCcw size={20} />
                    </button>
                </header>

                <main className="p-4 sm:p-8 max-w-2xl mx-auto w-full space-y-10">
                    <section className="space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-orange-600 text-white flex items-center justify-center shadow-lg shadow-orange-600/20">
                                <Settings size={20} />
                            </div>
                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Threshold Management</h3>
                        </div>

                        <div className="bg-white rounded-[2.5rem] p-8 sm:p-12 border-2 border-slate-100 shadow-2xl shadow-slate-900/5 space-y-10">
                            <div className="space-y-4">
                                <div className="flex items-center gap-3 px-1">
                                    <div className="w-1.5 h-4 bg-orange-600 rounded-full"></div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Minimum Recharge Amount (ETB)</label>
                                </div>

                                <div className="relative group">
                                    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-orange-600 transition-colors">
                                        <Coins size={24} />
                                    </div>
                                    <input
                                        type="number"
                                        value={minAmount}
                                        onChange={(e) => setMinAmount(Number(e.target.value))}
                                        placeholder="Enter amount..."
                                        className="w-full h-20 pl-16 pr-8 bg-slate-50 border-2 border-slate-50 rounded-3xl focus:outline-none focus:border-orange-500/20 focus:bg-white transition-all text-2xl font-black tracking-tighter"
                                    />
                                </div>
                                <p className="text-[10px] font-bold text-slate-400 px-2 leading-relaxed">
                                    This amount will be used as the default minimum for all user recharges. Users attempting to recharge less than this will be blocked.
                                </p>
                            </div>

                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="w-full h-20 bg-slate-900 text-white rounded-3xl font-black text-xs uppercase tracking-[0.3em] hover:bg-black active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-4 shadow-2xl shadow-slate-900/10"
                            >
                                {saving ? (
                                    <Loader2 className="animate-spin" size={24} />
                                ) : (
                                    <>
                                        <Save size={20} />
                                        <span>Apply Changes</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </section>

                    {/* Quick Stats Card */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-orange-50/50 p-6 rounded-[2rem] border border-orange-100 group hover:bg-orange-600 transition-all duration-500">
                            <p className="text-[9px] font-black text-orange-600 uppercase tracking-widest mb-1 group-hover:text-orange-100 transition-colors">Current Minimum</p>
                            <p className="text-2xl font-black text-slate-900 group-hover:text-white transition-colors">{minAmount.toLocaleString()} <span className="text-xs">ETB</span></p>
                        </div>
                        <div className="bg-indigo-50/50 p-6 rounded-[2rem] border border-indigo-100 group hover:bg-indigo-600 transition-all duration-500">
                            <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest mb-1 group-hover:text-indigo-100 transition-colors">Currency</p>
                            <p className="text-2xl font-black text-slate-900 group-hover:text-white transition-colors">ETB <span className="text-xs">Birr</span></p>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
