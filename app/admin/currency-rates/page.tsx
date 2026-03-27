"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, setDoc, collection, getDocs, addDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ArrowLeft, Save, Loader2, Coins, Gem, DollarSign, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function AdminCurrencyRates() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [previousRates, setPreviousRates] = useState({
        coinRate: 0,
        starRate: 0
    });
    const [rates, setRates] = useState({
        usdRate: 0.017, // 1 ETB = x USD
        coinRate: 0.5,  // 1 Birr = x ETB
        starRate: 2.0   // 1 Star = x ETB
    });
    const [showSuccess, setShowSuccess] = useState(false);

    useEffect(() => {
        const fetchRates = async () => {
            try {
                const docRef = doc(db, "Settings", "currency");
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data() as any;
                    setRates(data);
                    setPreviousRates({
                        coinRate: data.coinRate || 0,
                        starRate: data.starRate || 0
                    });
                }
            } catch (error) {
                console.error("Error fetching rates:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchRates();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            await setDoc(doc(db, "Settings", "currency"), {
                ...rates,
                lastUpdated: Date.now()
            });

            // Create notifications for all users if Birr or Star rates changed
            const coinChanged = rates.coinRate !== previousRates.coinRate;
            const starChanged = rates.starRate !== previousRates.starRate;

            if (coinChanged || starChanged) {
                // Fetch all users
                const usersSnapshot = await getDocs(collection(db, "users"));
                const batch: Promise<any>[] = [];

                usersSnapshot.forEach((userDoc) => {
                    if (coinChanged) {
                        batch.push(
                            addDoc(collection(db, "UserNotifications"), {
                                userId: userDoc.id,
                                type: "rate_update",
                                asset: "coin",
                                message: `Birr rate updated to ${rates.coinRate} ETB`,
                                newRate: rates.coinRate,
                                oldRate: previousRates.coinRate,
                                createdAt: Timestamp.now(),
                                read: false
                            })
                        );
                    }

                    if (starChanged) {
                        batch.push(
                            addDoc(collection(db, "UserNotifications"), {
                                userId: userDoc.id,
                                type: "rate_update",
                                asset: "star",
                                message: `Star rate updated to ${rates.starRate} ETB`,
                                newRate: rates.starRate,
                                oldRate: previousRates.starRate,
                                createdAt: Timestamp.now(),
                                read: false
                            })
                        );
                    }
                });

                // Execute all notification creations
                await Promise.all(batch);
            }

            // Update previous rates
            setPreviousRates({
                coinRate: rates.coinRate,
                starRate: rates.starRate
            });

            setShowSuccess(true);
        } catch (error) {
            console.error("Error saving rates:", error);
            alert("Failed to save rates.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <Loader2 className="w-10 h-10 animate-spin text-purple-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 p-6">
            <div className="max-w-2xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.back()}
                        className="w-10 h-10 rounded-full bg-white shadow-sm border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <h1 className="text-2xl font-bold text-slate-900">Currency Settings</h1>
                </div>

                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-8 space-y-8">

                        {/* ETB -> USD Section */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                                    <DollarSign size={20} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900">ETB Exchange Rate</h3>
                                    <p className="text-sm text-slate-500">Set the value of 1 ETB in USD</p>
                                </div>
                            </div>

                            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <span className="font-bold text-slate-400">1 ETB =</span>
                                    <input
                                        type="number"
                                        step="0.0001"
                                        value={isNaN(rates.usdRate) ? "" : rates.usdRate}
                                        onChange={(e) => {
                                            const val = parseFloat(e.target.value);
                                            setRates({ ...rates, usdRate: isNaN(val) ? 0 : val });
                                        }}
                                        className="w-32 bg-white border border-slate-200 rounded-lg px-3 py-2 text-lg font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    <span className="font-bold text-slate-900">USD</span>
                                </div>
                                <div className="text-xs text-slate-400 font-mono bg-white px-2 py-1 rounded border border-slate-100">
                                    Global Base
                                </div>
                            </div>
                        </div>

                        <hr className="border-slate-100" />

                        {/* Birr -> ETB Section */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                    <Coins size={20} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900">Birr Value</h3>
                                    <p className="text-sm text-slate-500">Set the value of 1 Birr in ETB</p>
                                </div>
                            </div>

                            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <span className="font-bold text-slate-400">1 Birr =</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={isNaN(rates.coinRate) ? "" : rates.coinRate}
                                        onChange={(e) => {
                                            const val = parseFloat(e.target.value);
                                            setRates({ ...rates, coinRate: isNaN(val) ? 0 : val });
                                        }}
                                        className="w-32 bg-white border border-slate-200 rounded-lg px-3 py-2 text-lg font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    />
                                    <span className="font-bold text-slate-900">ETB</span>
                                </div>
                            </div>
                        </div>

                        <hr className="border-slate-100" />

                        {/* Star -> ETB Section */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                                    <Gem size={20} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900">Star Value</h3>
                                    <p className="text-sm text-slate-500">Set the value of 1 Star in ETB</p>
                                </div>
                            </div>

                            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <span className="font-bold text-slate-400">1 Star =</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={isNaN(rates.starRate) ? "" : rates.starRate}
                                        onChange={(e) => {
                                            const val = parseFloat(e.target.value);
                                            setRates({ ...rates, starRate: isNaN(val) ? 0 : val });
                                        }}
                                        className="w-32 bg-white border border-slate-200 rounded-lg px-3 py-2 text-lg font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                    />
                                    <span className="font-bold text-slate-900">ETB</span>
                                </div>
                            </div>
                        </div>

                    </div>

                    <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all disabled:opacity-50 active:scale-95"
                        >
                            {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                            <span>Save Changes</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Success Modal */}
            {showSuccess && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-6 animate-in fade-in duration-200">
                    <div className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="flex flex-col items-center text-center space-y-6">
                            {/* Success Icon */}
                            <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center animate-in zoom-in duration-500">
                                <CheckCircle2 size={40} className="text-emerald-600" />
                            </div>

                            {/* Title & Message */}
                            <div className="space-y-2">
                                <h3 className="text-2xl font-black text-slate-900">Changes Saved!</h3>
                                <p className="text-sm text-slate-500 font-medium">
                                    Currency exchange rates have been updated and users have been notified.
                                </p>
                            </div>

                            {/* OK Button */}
                            <button
                                onClick={() => setShowSuccess(false)}
                                className="w-full bg-slate-900 text-white rounded-2xl py-4 font-black text-sm uppercase tracking-widest shadow-xl shadow-slate-900/20 hover:bg-slate-800 active:scale-95 transition-all"
                            >
                                OK
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
