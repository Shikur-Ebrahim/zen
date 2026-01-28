"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, onSnapshot, collection, query, where, getDocs, limit } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import {
    ChevronLeft,
    Wallet,
    CreditCard,
    AlertCircle,
    ChevronRight,
    Loader2,
    Lock,
    XCircle,
    CheckCircle2,
    Clock,
    Info,
    ArrowRight
} from "lucide-react";

const DAYS_MAP: Record<number, string> = {
    1: "Mon",
    2: "Tue",
    3: "Wed",
    4: "Thu",
    5: "Fri",
    6: "Sat",
    0: "Sun"
};

export default function WithdrawalPage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [userData, setUserData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [amount, setAmount] = useState("");
    const [linkedBank, setLinkedBank] = useState<any>(null);
    const [withdrawalSettings, setWithdrawalSettings] = useState<any>({
        minAmount: 300,
        maxAmount: 40000,
        activeDays: [1, 2, 3, 4, 5, 6],
        startTime: "08:00",
        endTime: "17:00",
        frequency: 1,
    });

    // Error Modal State
    const [errorModal, setErrorModal] = useState<{ show: boolean, message: string } | null>(null);

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
            if (!currentUser) {
                router.push("/");
                return;
            }
            setUser(currentUser);

            // Fetch User Data for Balance
            const userRef = doc(db, "users", currentUser.uid);
            const unsubscribeUser = onSnapshot(userRef, (doc) => {
                if (doc.exists()) {
                    setUserData(doc.data());
                }
            });

            // Fetch Linked Bank
            const bankRef = doc(db, "Bank", currentUser.uid);
            const unsubscribeBank = onSnapshot(bankRef, (doc) => {
                setLinkedBank(doc.exists() ? doc.data() : null);
            });

            // Fetch Global Withdrawal Settings
            const settingsRef = doc(db, "GlobalSettings", "withdrawal");
            const unsubscribeSettings = onSnapshot(settingsRef, (doc) => {
                if (doc.exists()) {
                    setWithdrawalSettings(doc.data());
                }
                setLoading(false);
            });

            // Fetch Withdrawal Rules for this user
            const qRules = query(
                collection(db, "withdrawal_rules"),
                where("active", "==", true)
            );
            const unsubscribeRules = onSnapshot(qRules, (snapshot) => {
                if (!snapshot.empty) {
                    // Check if any rule targets this user or is a global rule
                    const applicableRule = snapshot.docs.find(doc => {
                        const data = doc.data();
                        return data.targetAll === true || (data.targetUsers && data.targetUsers.includes(currentUser.uid));
                    });

                    if (applicableRule) {
                        const ruleData = applicableRule.data();
                        setErrorModal({
                            show: true,
                            message: ruleData.message || "Please read the withdrawal rules before proceeding."
                        });
                    }
                }
            });

            return () => {
                unsubscribeUser();
                unsubscribeBank();
                unsubscribeRules();
                unsubscribeSettings();
            };
        });

        return () => unsubscribeAuth();
    }, [router]);

    const handleWithdrawClick = () => {
        const numAmount = Number(amount);
        const balance = userData?.balance || 0;

        if (!linkedBank) {
            setErrorModal({ show: true, message: "Please connect a bank account first." });
            return;
        }

        if (!amount || isNaN(numAmount)) {
            setErrorModal({ show: true, message: "Please enter a valid amount." });
            return;
        }

        if (numAmount < withdrawalSettings.minAmount) {
            setErrorModal({ show: true, message: `Minimum withdrawal amount is ${withdrawalSettings.minAmount} ETB.` });
            return;
        }

        if (numAmount > withdrawalSettings.maxAmount) {
            setErrorModal({ show: true, message: `Maximum single withdrawal is ${withdrawalSettings.maxAmount.toLocaleString()} ETB.` });
            return;
        }

        // Check Schedule
        const now = new Date();
        const currentDay = now.getDay();
        const currentTime = now.getHours() * 60 + now.getMinutes();

        const [startH, startM] = withdrawalSettings.startTime.split(":").map(Number);
        const [endH, endM] = withdrawalSettings.endTime.split(":").map(Number);
        const startTotal = startH * 60 + startM;
        const endTotal = endH * 60 + endM;

        if (!withdrawalSettings.activeDays.includes(currentDay)) {
            setErrorModal({ show: true, message: "Withdrawals are not available today." });
            return;
        }

        if (currentTime < startTotal || currentTime > endTotal) {
            setErrorModal({ show: true, message: `Withdrawals are only available between ${withdrawalSettings.startTime} and ${withdrawalSettings.endTime}.` });
            return;
        }

        if (numAmount > balance) {
            setErrorModal({ show: true, message: "Insufficient balance to process request." });
            return;
        }

        // Redirect to Security Page with amount as query param
        router.push(`/users/withdraw/security?amount=${amount}`);
    };

    const feePercent = 0.05; // 5% fee
    const withdrawAmount = Number(amount) || 0;
    const fee = withdrawAmount * feePercent;
    const actualReceipt = withdrawAmount - fee;

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-[#D4AF37] animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0A0A0A] text-white font-sans pb-32 relative selection:bg-[#D4AF37]/30">
            {/* Background Decorative Elements */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#D4AF37]/5 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#9A7B4F]/5 blur-[100px] rounded-full" />
            </div>

            {/* Advanced Error Modal */}
            {errorModal?.show && (
                <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in duration-500">
                    <div className="bg-[#1A1A1A] w-full max-w-xs rounded-[3rem] p-10 shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-red-500/20 relative overflow-hidden animate-in zoom-in-95 duration-500">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>

                        <div className="relative z-10 flex flex-col items-center text-center gap-8">
                            <div className="w-24 h-24 rounded-[2rem] bg-red-500/10 flex items-center justify-center animate-pulse">
                                <XCircle size={48} strokeWidth={1.5} className="text-red-500" />
                            </div>

                            <div className="space-y-3">
                                <h3 className="text-2xl font-bold text-white tracking-tight">Attention</h3>
                                <p className="text-sm font-medium text-white/40 leading-relaxed px-2">
                                    {errorModal.message}
                                </p>
                            </div>

                            <button
                                onClick={() => setErrorModal(null)}
                                className="w-full py-5 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-[1.5rem] text-sm font-bold tracking-widest transition-all active:scale-95 shadow-lg"
                            >
                                Continue
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <header className="fixed top-0 left-0 right-0 bg-[#0A0A0A]/60 backdrop-blur-2xl z-50 px-6 py-6 flex items-center justify-between border-b border-[#D4AF37]/10">
                <button
                    onClick={() => router.back()}
                    className="w-12 h-12 flex items-center justify-center rounded-2xl bg-[#1A1A1A] border border-[#D4AF37]/20 text-[#D4AF37] active:scale-90 transition-all shadow-lg shadow-black/50"
                >
                    <ChevronLeft size={24} />
                </button>
                <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-[#BF953F] via-[#FCF6BA] to-[#B38728] bg-clip-text text-transparent">
                    Withdrawal
                </h1>
                <div className="w-12" /> {/* Spacer */}
            </header>

            <main className="pt-32 p-6 space-y-10 max-w-lg mx-auto relative z-10">
                {/* Withdrawal Schedule Status */}
                <div className="animate-in fade-in slide-in-from-top-4 duration-700">
                    {(() => {
                        const now = new Date();
                        const currentDay = now.getDay();
                        const currentTime = now.getHours() * 60 + now.getMinutes();
                        const [startH, startM] = withdrawalSettings.startTime.split(":").map(Number);
                        const [endH, endM] = withdrawalSettings.endTime.split(":").map(Number);
                        const startTotal = startH * 60 + startM;
                        const endTotal = endH * 60 + endM;

                        const isOpenToday = withdrawalSettings.activeDays.includes(currentDay);
                        const isWithinHours = currentTime >= startTotal && currentTime <= endTotal;

                        if (!isOpenToday || !isWithinHours) {
                            return (
                                <div className="bg-[#1A1A1A] border border-red-500/20 rounded-[2.5rem] p-6 flex items-center gap-5 shadow-xl">
                                    <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500 animate-pulse">
                                        <Clock size={28} />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-[10px] font-bold text-red-500 tracking-wider opacity-80">Withdrawals Closed</p>
                                        <p className="text-sm font-bold text-white/90">
                                            Opens at {withdrawalSettings.startTime} tomorrow
                                        </p>
                                    </div>
                                </div>
                            );
                        }
                        return (
                            <div className="bg-[#1A1A1A] border border-emerald-500/20 rounded-[2.5rem] p-6 flex items-center gap-5 shadow-xl">
                                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                                    <CheckCircle2 size={28} />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[10px] font-bold text-emerald-500 tracking-wider opacity-80">Withdrawals Available</p>
                                    <p className="text-sm font-bold text-white">
                                        Available until {withdrawalSettings.endTime}
                                    </p>
                                </div>
                                <div className="w-3 h-3 bg-emerald-500 rounded-full animate-ping opacity-30"></div>
                            </div>
                        );
                    })()}
                </div>

                {/* Amount Input Card */}
                <section className="relative group animate-in fade-in slide-in-from-top-6 duration-700 delay-100">
                    <div className="bg-gradient-to-br from-[#BF953F] via-[#FCF6BA] to-[#B38728] rounded-[2.5rem] p-1 shadow-[0_20px_50px_rgba(212,175,55,0.25)]">
                        <div className="bg-[#0A0A0A] rounded-[2.3rem] p-10 relative overflow-hidden h-full flex flex-col justify-center">
                            {/* Metallic Shine Effect */}
                            <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent pointer-events-none"></div>

                            <p className="text-[#D4AF37] text-[10px] font-bold tracking-wider mb-4 opacity-70">Enter Amount</p>
                            <div className="flex items-baseline gap-4">
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="0"
                                    className="w-full bg-transparent text-6xl font-bold text-white placeholder:text-white/5 outline-none border-none p-0 z-10 relative tabular-nums"
                                />
                                <span className="bg-gradient-to-b from-[#FCF6BA] to-[#B38728] bg-clip-text text-transparent font-bold tracking-tight text-base shrink-0">ETB</span>
                            </div>

                            <div className="mt-8 flex gap-1">
                                {[...Array(12)].map((_, i) => (
                                    <div
                                        key={i}
                                        className={`h-0.5 flex-1 rounded-full transition-all duration-700 ${amount && i < Math.min(amount.length * 2, 12) ? "bg-[#D4AF37]" : "bg-white/5"
                                            }`}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* Info Card */}
                <section className="bg-[#1A1A1A] rounded-[2.5rem] p-8 border border-[#D4AF37]/10 space-y-6 shadow-xl relative overflow-hidden group/info">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4AF37]/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover/info:bg-[#D4AF37]/10 transition-all duration-500"></div>

                    <div className="flex justify-between items-center p-5 rounded-[1.5rem] bg-[#0A0A0A] border border-[#D4AF37]/5 group-hover/info:border-[#D4AF37]/20 transition-all">
                        <span className="text-[10px] font-bold text-white/40 tracking-wider">Your Balance</span>
                        <span className="text-lg font-bold text-[#D4AF37] tabular-nums">
                            {Number(userData?.balance || 0).toLocaleString()}
                        </span>
                    </div>

                    <div className="flex justify-between items-center px-4">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-white/40 tracking-wider">Service Fee</span>
                            <div className="px-2 py-0.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-[10px] font-bold text-blue-400">5%</div>
                        </div>
                        <span className="text-xs font-bold text-white/40 tabular-nums">-{fee.toLocaleString()}</span>
                    </div>

                    <div className="pt-6 border-t border-[#D4AF37]/10 flex justify-between items-end">
                        <span className="text-[10px] font-bold text-white tracking-widest mb-1.5">Total you get</span>
                        <div className="flex flex-col items-end">
                            <div className="flex items-center gap-2">
                                <span className="text-4xl font-bold text-white tabular-nums tracking-tight drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
                                    {actualReceipt.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                </span>
                                <span className="bg-gradient-to-b from-[#FCF6BA] to-[#B38728] bg-clip-text text-transparent font-bold text-xs">ETB</span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Bank Selection */}
                <section className="space-y-5 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-200">
                    <div className="flex items-center gap-2 px-1">
                        <div className="w-1.5 h-3 bg-gradient-to-b from-[#FCF6BA] to-[#B38728] rounded-full"></div>
                        <h2 className="text-[10px] font-bold text-[#D4AF37]/60 tracking-wider">Withdraw to</h2>
                    </div>

                    {linkedBank ? (
                        <div className="bg-[#1A1A1A] rounded-[2.5rem] p-1 border border-[#D4AF37]/10 hover:border-[#D4AF37]/40 transition-all group/bank shadow-xl">
                            <div className="p-8 relative overflow-hidden flex flex-col gap-8">
                                <div className="absolute top-0 right-0 w-40 h-40 bg-[#D4AF37]/5 rounded-full blur-3xl -mr-20 -mt-20 group-hover/bank:bg-[#D4AF37]/10 transition-all"></div>

                                <div className="flex items-center gap-6 relative z-10">
                                    <div className="w-16 h-16 rounded-2xl bg-[#0A0A0A] border border-[#D4AF37]/20 flex items-center justify-center p-2 shadow-inner group-hover/bank:scale-105 transition-all">
                                        {linkedBank.bankLogoUrl ? (
                                            <img src={linkedBank.bankLogoUrl} alt={linkedBank.bankName} className="w-full h-full object-contain filter drop-shadow-[0_0_8px_rgba(212,175,55,0.2)]" />
                                        ) : (
                                            <Wallet className="text-[#D4AF37]" size={32} />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-xl font-bold text-white truncate tracking-tight">{linkedBank.bankName}</h4>
                                        <p className="text-[10px] font-bold text-[#D4AF37] tracking-wider truncate mt-1">{linkedBank.holderName}</p>
                                    </div>
                                    <div className="text-[#D4AF37]/20 group-hover/bank:text-[#D4AF37] transition-all">
                                        <ChevronRight size={24} />
                                    </div>
                                </div>

                                <div className="pt-8 border-t border-[#D4AF37]/10 grid grid-cols-2 gap-6 relative z-10">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-bold text-white/30 tracking-wider">Account Number</p>
                                        <p className="text-sm font-bold text-white tracking-widest font-mono truncate">{linkedBank.accountNumber}</p>
                                    </div>
                                    <div className="space-y-1 text-right">
                                        <p className="text-[10px] font-bold text-white/30 tracking-wider">Account Status</p>
                                        <div className="flex items-center justify-end gap-1.5">
                                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                                            <p className="text-xs font-bold text-emerald-500 tracking-tight">Verified</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div
                            onClick={() => router.push('/users/bank')}
                            className="bg-[#1A1A1A] rounded-[2.5rem] p-10 text-center border-2 border-dashed border-[#D4AF37]/10 hover:border-[#D4AF37]/40 hover:bg-[#D4AF37]/5 transition-all cursor-pointer group/add shadow-xl"
                        >
                            <div className="w-16 h-16 rounded-full bg-[#D4AF37]/10 flex items-center justify-center mx-auto mb-6 group-hover/add:scale-110 transition-all">
                                <CreditCard className="text-[#D4AF37]" size={32} />
                            </div>
                            <p className="text-[10px] font-bold text-[#D4AF37] tracking-widest mb-2">No bank account added</p>
                            <p className="text-sm text-white/50 font-medium tracking-tight">Tap to add your receiving bank details</p>
                        </div>
                    )}
                </section>

                {/* Usage Tips */}
                <section className="bg-[#1A1A1A] rounded-[2.5rem] p-8 border border-[#D4AF37]/10 space-y-8 shadow-xl relative overflow-hidden group/rules">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4AF37]/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-[#D4AF37]/10 rounded-xl flex items-center justify-center text-[#D4AF37]">
                            <AlertCircle size={22} />
                        </div>
                        <h3 className="text-xs font-bold text-[#D4AF37] tracking-wider">Important Rules</h3>
                    </div>

                    <ul className="space-y-5">
                        {[
                            `Available Hours: ${withdrawalSettings.startTime} - ${withdrawalSettings.endTime} (${withdrawalSettings.activeDays.map((d: number) => DAYS_MAP[d]).join(", ")})`,
                            `Limits: ${withdrawalSettings.minAmount} - ${withdrawalSettings.maxAmount.toLocaleString()} ETB per request`,
                            `Frequency: Once every ${withdrawalSettings.frequency} day(s) (Reset at Midnight)`,
                            "Processing: Funds usually arrive within 2-72 hours",
                            "Security: Account name must match your profile name"
                        ].map((rule, i) => {
                            const [label, ...val] = rule.split(": ");
                            return (
                                <li key={i} className="flex gap-4 items-start group/tip">
                                    <div className="w-6 h-6 rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center shrink-0 mt-0.5 group-hover/tip:bg-[#D4AF37]/20 transition-all">
                                        <span className="text-[10px] font-bold text-[#D4AF37]">{i + 1}</span>
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-[11px] font-bold text-white/80 leading-relaxed group-hover/tip:text-white transition-all tracking-tight">
                                            <span className="text-white/30 mr-1">{label}:</span> {val.join(": ")}
                                        </p>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </section>
            </main>

            {/* Bottom Action Bar */}
            <div className="fixed bottom-0 left-0 right-0 bg-[#0A0A0A]/80 backdrop-blur-2xl p-6 pb-10 border-t border-[#D4AF37]/10 shadow-[0_-20px_40px_rgba(0,0,0,0.5)] relative z-[60]">
                <button
                    onClick={handleWithdrawClick}
                    className="w-full bg-gradient-to-br from-[#BF953F] via-[#FCF6BA] to-[#B38728] text-[#0A0A0A] py-7 rounded-[2rem] font-bold tracking-widest text-xs shadow-[0_15px_40px_rgba(212,175,55,0.25)] hover:shadow-[0_20px_50px_rgba(212,175,55,0.4)] hover:-translate-y-1 active:scale-[0.97] transition-all duration-300 flex items-center justify-center gap-4 group"
                >
                    <Lock size={18} className="opacity-70 group-hover:scale-110 transition-transform" />
                    <span>Withdraw Now</span>
                </button>
            </div>
        </div>
    );
}
