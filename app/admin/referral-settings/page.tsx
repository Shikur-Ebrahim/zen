"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
    LayoutDashboard,
    Home,
    Image as ImageIcon,
    Banknote,
    ShieldCheck,
    Bell,
    Settings,
    LogOut,
    Menu,
    Save,
    Building2,
    Loader2,
    Percent
} from "lucide-react";
import { toast } from "sonner";
import AdminSidebar from "@/components/AdminSidebar";

export default function ReferralSettingsPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Default Rates (12%, 7%, 4%, 2%)
    const [rates, setRates] = useState({
        levelA: 12,
        levelB: 7,
        levelC: 4,
        levelD: 2
    });

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
            const isMaster = localStorage.getItem("admin_session") === "true";
            if (!user && !isMaster) {
                router.push("/");
                return;
            }

            // Fetch existing settings
            try {
                const docRef = doc(db, "settings", "referral");
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setRates(docSnap.data() as any);
                }
            } catch (error) {
                console.error("Error fetching settings:", error);
            } finally {
                setLoading(false);
            }
        });

        return () => unsubscribeAuth();
    }, [router]);

    const handleSave = async () => {
        setSaving(true);
        try {
            await setDoc(doc(db, "settings", "referral"), rates);
            toast.success("Referral rates updated successfully!");
        } catch (error) {
            console.error("Error saving settings:", error);
            toast.error("Failed to update rates");
        } finally {
            setSaving(false);
        }
    };

    const handleLogout = async () => {
        localStorage.removeItem("admin_session");
        await signOut(auth);
        router.push("/");
    };

    // Navigation handled by AdminSidebar

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white text-purple-600">
                <Loader2 className="w-12 h-12 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8F9FD] flex">
            <AdminSidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-h-screen max-w-full overflow-hidden">
                <header className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-gray-100 px-6 py-4 flex items-center justify-between z-30">
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="md:hidden p-2 hover:bg-gray-100 rounded-xl transition-colors"
                    >
                        <Menu size={24} className="text-gray-600" />
                    </button>
                    <div className="hidden md:block">
                        <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest">
                            Manager / <span className="text-purple-600">Referral Rule</span>
                        </h2>
                    </div>
                </header>

                <main className="p-6 md:p-10 max-w-4xl mx-auto w-full animate-in fade-in duration-500">
                    <div className="mb-8">
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-2">Referral Reward Rules</h1>
                        <p className="text-gray-500 font-medium">Set the percentage of commission for each referral level.</p>
                    </div>

                    <div className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-2xl shadow-purple-900/5 border border-gray-50">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Level A */}
                            <div className="space-y-3">
                                <label className="flex items-center gap-2 text-sm font-black text-gray-700 uppercase tracking-wider">
                                    <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center text-xs">A</div>
                                    Inviter Level A
                                </label>
                                <div className="relative group">
                                    <input
                                        type="number"
                                        value={rates.levelA}
                                        onChange={(e) => setRates({ ...rates, levelA: Number(e.target.value) })}
                                        className="w-full py-4 pl-6 pr-12 bg-gray-50 rounded-2xl font-bold text-gray-800 border-2 border-transparent focus:bg-white focus:border-purple-600 focus:outline-none transition-all"
                                        placeholder="12"
                                    />
                                    <Percent className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-purple-600 transition-colors" size={20} />
                                </div>
                                <p className="text-xs text-gray-400 font-medium pl-2">Direct referrals (Default: 12%)</p>
                            </div>

                            {/* Level B */}
                            <div className="space-y-3">
                                <label className="flex items-center gap-2 text-sm font-black text-gray-700 uppercase tracking-wider">
                                    <div className="w-6 h-6 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center text-xs">B</div>
                                    Inviter Level B
                                </label>
                                <div className="relative group">
                                    <input
                                        type="number"
                                        value={rates.levelB}
                                        onChange={(e) => setRates({ ...rates, levelB: Number(e.target.value) })}
                                        className="w-full py-4 pl-6 pr-12 bg-gray-50 rounded-2xl font-bold text-gray-800 border-2 border-transparent focus:bg-white focus:border-purple-600 focus:outline-none transition-all"
                                        placeholder="7"
                                    />
                                    <Percent className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-purple-600 transition-colors" size={20} />
                                </div>
                                <p className="text-xs text-gray-400 font-medium pl-2">Second level (Default: 7%)</p>
                            </div>

                            {/* Level C */}
                            <div className="space-y-3">
                                <label className="flex items-center gap-2 text-sm font-black text-gray-700 uppercase tracking-wider">
                                    <div className="w-6 h-6 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center text-xs">C</div>
                                    Inviter Level C
                                </label>
                                <div className="relative group">
                                    <input
                                        type="number"
                                        value={rates.levelC}
                                        onChange={(e) => setRates({ ...rates, levelC: Number(e.target.value) })}
                                        className="w-full py-4 pl-6 pr-12 bg-gray-50 rounded-2xl font-bold text-gray-800 border-2 border-transparent focus:bg-white focus:border-purple-600 focus:outline-none transition-all"
                                        placeholder="4"
                                    />
                                    <Percent className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-purple-600 transition-colors" size={20} />
                                </div>
                                <p className="text-xs text-gray-400 font-medium pl-2">Third level (Default: 4%)</p>
                            </div>

                            {/* Level D */}
                            <div className="space-y-3">
                                <label className="flex items-center gap-2 text-sm font-black text-gray-700 uppercase tracking-wider">
                                    <div className="w-6 h-6 bg-pink-100 text-pink-600 rounded-lg flex items-center justify-center text-xs">D</div>
                                    Inviter Level D
                                </label>
                                <div className="relative group">
                                    <input
                                        type="number"
                                        value={rates.levelD}
                                        onChange={(e) => setRates({ ...rates, levelD: Number(e.target.value) })}
                                        className="w-full py-4 pl-6 pr-12 bg-gray-50 rounded-2xl font-bold text-gray-800 border-2 border-transparent focus:bg-white focus:border-purple-600 focus:outline-none transition-all"
                                        placeholder="2"
                                    />
                                    <Percent className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-purple-600 transition-colors" size={20} />
                                </div>
                                <p className="text-xs text-gray-400 font-medium pl-2">Fourth level (Default: 2%)</p>
                            </div>
                        </div>

                        <div className="mt-10 flex justify-end">
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="px-10 py-4 bg-purple-600 hover:bg-purple-700 text-white font-black rounded-2xl shadow-xl shadow-purple-600/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 flex items-center gap-2"
                            >
                                {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                                Save Rules
                            </button>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
