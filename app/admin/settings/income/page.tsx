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
    Calendar,
    Coins
} from "lucide-react";
import { toast } from "sonner";

const DAYS = [
    { label: "Monday", value: 1 },
    { label: "Tuesday", value: 2 },
    { label: "Wednesday", value: 3 },
    { label: "Thursday", value: 4 },
    { label: "Friday", value: 5 },
    { label: "Saturday", value: 6 },
    { label: "Sunday", value: 0 },
];

export default function IncomeSettingsPage() {
    const router = useRouter();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [settings, setSettings] = useState({
        activeDays: [1, 2, 3, 4, 5, 6], // Monday to Saturday (Excluding Sunday by default)
    });

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
            const docRef = doc(db, "GlobalSettings", "income");
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                setSettings({
                    activeDays: data.activeDays ?? [1, 2, 3, 4, 5, 6],
                });
            }
        } catch (error) {
            console.error("Error fetching settings:", error);
            toast.error("Failed to load settings");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await setDoc(doc(db, "GlobalSettings", "income"), {
                ...settings,
                updatedAt: new Date().toISOString()
            }, { merge: true });
            toast.success("Income settings updated successfully");
        } catch (error) {
            console.error("Error saving settings:", error);
            toast.error("Failed to save settings");
        } finally {
            setSaving(false);
        }
    };

    const toggleDay = (dayValue: number) => {
        setSettings(prev => ({
            ...prev,
            activeDays: prev.activeDays.includes(dayValue)
                ? prev.activeDays.filter(d => d !== dayValue)
                : [...prev.activeDays, dayValue]
        }));
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
                            <h2 className="text-xl font-black text-slate-900 tracking-tight leading-none">Income Config</h2>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Daily Payout Schedule</p>
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
                            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/20">
                                <Calendar size={20} />
                            </div>
                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Active Income Days</h3>
                        </div>

                        <div className="bg-white rounded-[2.5rem] p-8 sm:p-12 border-2 border-slate-100 shadow-2xl shadow-slate-900/5 space-y-10">
                            <p className="text-xs font-bold text-slate-400 leading-relaxed italic border-l-4 border-indigo-500 pl-4 py-2">
                                Configure which days of the week daily income will be automatically generated for users.
                                By default, Sunday is a rest day.
                            </p>

                            <div className="flex flex-wrap gap-3">
                                {DAYS.map((day) => {
                                    const isActive = settings.activeDays.includes(day.value);
                                    return (
                                        <button
                                            key={day.value}
                                            onClick={() => toggleDay(day.value)}
                                            className={`px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${isActive
                                                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                                                : "bg-slate-50 text-slate-400 hover:bg-slate-100"
                                                }`}
                                        >
                                            {day.label}
                                        </button>
                                    );
                                })}
                            </div>

                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="w-full h-20 bg-slate-900 text-white rounded-3xl font-black text-xs uppercase tracking-[0.3em] hover:bg-black active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-4 shadow-2xl shadow-slate-900/10 mt-10"
                            >
                                {saving ? (
                                    <Loader2 className="animate-spin" size={24} />
                                ) : (
                                    <>
                                        <Save size={20} />
                                        <span>Update Schedule</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </section>
                </main>
            </div>
        </div>
    );
}
