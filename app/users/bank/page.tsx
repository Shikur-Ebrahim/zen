"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import {
    collection,
    query,
    onSnapshot,
    doc,
    setDoc,
    deleteDoc,
    orderBy
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import {
    ChevronLeft,
    Plus,
    Building2,
    User,
    Hash,
    ShieldCheck,
    Loader2,
    ChevronDown,
    Lock,
    History,
    X,
    CreditCard
} from "lucide-react";
import { toast } from "sonner";

export default function UserBankPage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<"list" | "connect" | "notification">("list");
    const [linkedBank, setLinkedBank] = useState<any>(null);
    const [availableBanks, setAvailableBanks] = useState<any[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [showBankDropdown, setShowBankDropdown] = useState(false);
    const [userData, setUserData] = useState<any>(null);

    // Form State
    const [formData, setFormData] = useState({
        bankName: "",
        holderName: "",
        accountNumber: "",
        bankLogoUrl: ""
    });

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            if (!currentUser) {
                router.push("/");
                return;
            }
            setUser(currentUser);

            // Fetch linked bank
            const bankRef = doc(db, "Bank", currentUser.uid);
            const unsubscribeBank = onSnapshot(bankRef, (doc) => {
                setLinkedBank(doc.exists() ? doc.data() : null);
                setLoading(false);
            });

            // Fetch available withdrawal banks
            const banksQuery = query(collection(db, "withdrawalBanks"), orderBy("createdAt", "desc"));
            const unsubscribeAvailable = onSnapshot(banksQuery, (snapshot) => {
                const banks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setAvailableBanks(banks);
            });

            // Fetch user data for phone number
            const userRef = doc(db, "users", currentUser.uid);
            const unsubscribeUser = onSnapshot(userRef, (doc) => {
                if (doc.exists()) {
                    setUserData(doc.data());
                }
            });

            return () => {
                unsubscribeBank();
                unsubscribeAvailable();
                unsubscribeUser();
            };
        });

        return () => unsubscribeAuth();
    }, [router]);

    const handleConnect = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.bankName || !formData.holderName || !formData.accountNumber) {
            toast.error("Please fill all fields");
            return;
        }

        // Check if bank is already linked logic
        if (linkedBank) {
            setView("notification");
            return;
        }

        setSubmitting(true);
        try {
            await setDoc(doc(db, "Bank", user.uid), {
                ...formData,
                uid: user.uid,
                phoneNumber: userData?.phoneNumber || "",
                status: "verified",
                linkedAt: new Date().toISOString()
            });
            toast.success("Bank account linked successfully!");
            setView("list");
        } catch (error) {
            console.error(error);
            toast.error("Failed to link bank account");
        } finally {
            setSubmitting(false);
        }
    };


    if (loading) {
        return (
            <div className="min-h-screen bg-[#7B3F00] flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-[#F5E6D3] animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#7B3F00] text-[#F5E6D3] font-sans selection:bg-[#D4AF37]/30">
            {/* Dynamic Background Effects */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] bg-[#F5E6D3]/5 blur-[100px] rounded-full"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[35%] h-[35%] bg-[#1A0F00]/40 blur-[80px] rounded-full"></div>
            </div>

            <div className="relative z-10 max-w-lg mx-auto min-h-screen flex flex-col">
                {/* Header */}
                <header className="px-6 pt-12 pb-6 flex items-center gap-4 sticky top-0 bg-[#7B3F00]/80 backdrop-blur-xl z-50 transition-colors">
                    <button
                        onClick={() => view === "connect" ? setView("list") : router.back()}
                        className="w-11 h-11 rounded-2xl bg-[#1A0F00]/40 border border-[#F5E6D3]/10 shadow-sm flex items-center justify-center hover:bg-[#1A0F00]/60 transition-all text-[#F5E6D3] active:scale-90"
                    >
                        <ChevronLeft size={22} />
                    </button>
                    <h1 className="text-xl font-bold tracking-tight text-[#F5E6D3]">
                        {view === "list" ? "My Bank Accounts" : "Connect Account"}
                    </h1>
                </header>

                <main className="flex-1 px-6 py-4 pb-44">
                    {view === "list" ? (
                        linkedBank ? (
                            /* Linked State */
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                                <div className="flex items-center justify-between px-1">
                                    <h3 className="text-xs font-bold text-[#F5E6D3]/30 tracking-wider">Verified Accounts (1)</h3>
                                    <button
                                        onClick={() => setView("connect")}
                                        className="text-xs font-bold text-[#D4AF37] hover:text-[#F5E6D3] flex items-center gap-2 transition-all bg-[#1A0F00]/40 px-4 py-2 rounded-2xl border border-[#D4AF37]/20"
                                    >
                                        <Plus size={14} /> Add Bank
                                    </button>
                                </div>

                                {/* Premium Bank Card */}
                                <div className="relative group">
                                    <div className="absolute -inset-1 bg-gradient-to-br from-[#D4AF37]/20 to-transparent rounded-[2.5rem] blur opacity-40 group-hover:opacity-100 transition-opacity"></div>
                                    <div className="relative bg-[#1A0F00]/60 border border-[#F5E6D3]/10 rounded-[2.5rem] p-8 shadow-2xl overflow-hidden backdrop-blur-3xl">
                                        <div className="absolute top-0 right-0 w-40 h-40 bg-[#D4AF37]/5 rounded-full blur-3xl -mr-16 -mt-16 opacity-50"></div>

                                        <div className="flex items-start gap-6 mb-8">
                                            <div className="w-16 h-16 rounded-2xl bg-[#000000] border border-[#F5E6D3]/10 flex items-center justify-center p-3 shadow-xl">
                                                {linkedBank.bankLogoUrl ? (
                                                    <img src={linkedBank.bankLogoUrl} className="w-full h-full object-contain brightness-110" alt="Bank" />
                                                ) : (
                                                    <Building2 className="text-[#F5E6D3]/20" size={30} />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-2xl font-bold tracking-tight text-[#F5E6D3] mb-2 truncate">{linkedBank.bankName}</h4>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] animate-pulse"></div>
                                                    <span className="text-xs font-medium text-emerald-400 tracking-wide">Active Connection</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-y-10 bg-[#000000]/40 rounded-3xl p-6 border border-white/5">
                                            <div className="space-y-1.5">
                                                <p className="text-[10px] font-bold text-[#F5E6D3]/20 uppercase tracking-widest">Account Number</p>
                                                <p className="text-xl font-bold tracking-wider text-[#F5E6D3] font-mono">
                                                    {linkedBank.accountNumber}
                                                </p>
                                            </div>
                                            <div className="space-y-1.5 text-right">
                                                <p className="text-[10px] font-bold text-[#F5E6D3]/20 uppercase tracking-widest">Type</p>
                                                <p className="text-sm font-bold text-[#F5E6D3]/80">Personal Account</p>
                                            </div>
                                            <div className="space-y-1.5">
                                                <p className="text-[10px] font-bold text-[#F5E6D3]/20 uppercase tracking-widest">Holder Name</p>
                                                <p className="text-sm font-bold text-[#F5E6D3] truncate">{linkedBank.holderName}</p>
                                            </div>
                                            <div className="space-y-1.5 text-right">
                                                <p className="text-[10px] font-bold text-[#F5E6D3]/20 uppercase tracking-widest">Status</p>
                                                <div className="flex items-center justify-end gap-2">
                                                    <ShieldCheck size={14} className="text-emerald-500" />
                                                    <p className="text-xs font-bold text-emerald-400">Verified</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            /* Empty State */
                            <div className="h-full flex flex-col items-center justify-center py-16 text-center space-y-10 animate-in zoom-in-95 duration-1000">
                                <div className="relative group p-10">
                                    <div className="absolute inset-0 bg-indigo-500 rounded-[3rem] blur-[60px] opacity-10 group-hover:opacity-20 transition-opacity"></div>
                                    <div className="relative w-52 h-52 bg-[#1A0F00]/40 rounded-[3.5rem] border border-[#F5E6D3]/10 flex items-center justify-center p-10 shadow-2xl backdrop-blur-xl group-hover:scale-105 transition-transform duration-500">
                                        <div className="relative">
                                            <CreditCard size={80} className="text-[#D4AF37] relative z-10 stroke-[1.2]" />
                                            <div className="absolute -bottom-6 -right-6 bg-[#D4AF37] p-4 rounded-3xl border-4 border-[#7B3F00] shadow-2xl">
                                                <Plus size={24} className="text-black" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4 max-w-xs mx-auto">
                                    <h2 className="text-4xl font-bold tracking-tight text-[#F5E6D3]">Link Bank</h2>
                                    <p className="text-sm font-medium text-[#F5E6D3]/40 leading-relaxed">Connect your bank account securely to enable instant withdrawals.</p>
                                </div>

                                <button
                                    onClick={() => setView("connect")}
                                    className="w-full max-w-xs py-6 bg-[#D4AF37] hover:bg-[#F5E6D3] text-black rounded-3xl text-sm font-bold tracking-widest shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3"
                                >
                                    <ShieldCheck size={20} />
                                    <span>Connect Now</span>
                                </button>
                            </div>
                        )
                    ) : view === "notification" ? (
                        /* Already Connected Warning */
                        <div className="h-full flex flex-col items-center justify-center py-16 text-center space-y-10 animate-in zoom-in-95 duration-700">
                            <div className="p-10 rounded-full bg-red-500/10 border border-red-500/20 shadow-2xl">
                                <ShieldCheck size={56} className="text-red-500" />
                            </div>

                            <div className="space-y-6 max-w-xs mx-auto px-4">
                                <h3 className="text-3xl font-bold text-white tracking-tight">Already Connected</h3>
                                <p className="text-sm font-medium text-gray-400 leading-relaxed">
                                    This bank account is already linked. To connect a different account, please contact our support team on Telegram.
                                </p>
                            </div>

                            <button
                                onClick={() => router.push("/users/service")}
                                className="w-full max-w-xs py-6 bg-red-500 text-white rounded-3xl text-sm font-bold uppercase tracking-widest shadow-xl shadow-red-500/20 active:scale-95 transition-all hover:bg-red-600"
                            >
                                Contact Support
                            </button>
                        </div>
                    ) : (
                        /* Connect Form State */
                        <div className="space-y-12 animate-in fade-in slide-in-from-top-4 duration-700 max-w-sm mx-auto w-full pt-4">
                            <div className="text-center space-y-4">
                                <div className="inline-flex items-center justify-center w-16 h-16 rounded-[2rem] bg-[#1A0F00]/60 text-[#D4AF37] border border-[#F5E6D3]/10 shadow-2xl backdrop-blur-xl">
                                    <Lock size={28} />
                                </div>
                                <div className="space-y-1">
                                    <h2 className="text-4xl font-bold tracking-tight">Secure Link</h2>
                                    <p className="text-[11px] font-bold text-[#F5E6D3]/20 uppercase tracking-[0.4em]">Encrypted Banking Gateway</p>
                                </div>
                            </div>

                            <form onSubmit={handleConnect} className="space-y-8">
                                <div className="space-y-6">
                                    {/* Bank Selector */}
                                    <div className="space-y-3 relative">
                                        <label className="text-xs font-bold text-[#F5E6D3]/30 tracking-wide ml-2">Select Partner Bank</label>
                                        <div
                                            onClick={() => setShowBankDropdown(!showBankDropdown)}
                                            className="relative w-full h-[5rem] rounded-3xl bg-[#1A0F00]/60 border border-white/5 hover:border-[#F5E6D3]/20 transition-all shadow-2xl cursor-pointer flex items-center px-6 gap-5 group backdrop-blur-xl"
                                        >
                                            <div className="w-12 h-12 rounded-2xl bg-black flex items-center justify-center text-[#F5E6D3]/20 group-hover:text-[#F5E6D3] transition-all border border-white/5">
                                                {formData.bankLogoUrl ? (
                                                    <img src={formData.bankLogoUrl} className="w-full h-full object-contain p-2 brightness-110" alt="Selected" />
                                                ) : (
                                                    <Building2 size={24} />
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                {formData.bankName ? (
                                                    <p className="font-bold text-base text-white">{formData.bankName}</p>
                                                ) : (
                                                    <p className="font-medium text-base text-[#F5E6D3]/20">Choose Supported Bank</p>
                                                )}
                                            </div>
                                            <ChevronDown className={`text-[#F5E6D3]/40 transition-transform duration-500 ${showBankDropdown ? "rotate-180" : ""}`} size={20} />
                                        </div>

                                        {showBankDropdown && (
                                            <div className="absolute top-full left-0 right-0 mt-4 p-3 bg-[#1A0F00] rounded-[2.5rem] border border-[#F5E6D3]/10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] z-50 max-h-72 overflow-y-auto animate-in slide-in-from-top-4 fade-in duration-300 backdrop-blur-3xl scrollbar-hide">
                                                {availableBanks.map((bank) => (
                                                    <button
                                                        key={bank.id}
                                                        type="button"
                                                        onClick={() => {
                                                            setFormData({
                                                                ...formData,
                                                                bankName: bank.name,
                                                                bankLogoUrl: bank.logoUrl || ""
                                                            });
                                                            setShowBankDropdown(false);
                                                        }}
                                                        className="w-full flex items-center gap-5 p-4 rounded-2xl hover:bg-white/5 transition-all group mb-1 last:mb-0"
                                                    >
                                                        <div className="w-12 h-12 rounded-xl bg-black border border-white/5 flex items-center justify-center p-2 group-hover:border-[#D4AF37]/40 transition-all">
                                                            {bank.logoUrl ? (
                                                                <img src={bank.logoUrl} className="w-full h-full object-contain brightness-110" alt={bank.name} />
                                                            ) : (
                                                                <Building2 size={20} className="text-[#F5E6D3]/20" />
                                                            )}
                                                        </div>
                                                        <span className={`text-sm font-bold text-left flex-1 ${formData.bankName === bank.name ? "text-[#D4AF37]" : "text-[#F5E6D3]/80"}`}>
                                                            {bank.name}
                                                        </span>
                                                        {formData.bankName === bank.name && (
                                                            <div className="w-2.5 h-2.5 rounded-full bg-[#D4AF37] shadow-[0_0_10px_rgba(212,175,55,0.4)]"></div>
                                                        )}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Holder Name */}
                                    <div className="space-y-3">
                                        <label className="text-xs font-bold text-[#F5E6D3]/30 tracking-wide ml-2">Holder Name</label>
                                        <div className="relative group">
                                            <div className="absolute left-6 top-1/2 -translate-y-1/2 p-2.5 bg-black/40 rounded-2xl text-[#F5E6D3]/40 group-focus-within:text-[#D4AF37] group-focus-within:bg-black transition-all border border-white/5">
                                                <User size={20} />
                                            </div>
                                            <input
                                                type="text"
                                                required
                                                placeholder="Enter full name"
                                                value={formData.holderName}
                                                onChange={(e) => setFormData({ ...formData, holderName: e.target.value })}
                                                className="w-full h-[5rem] pl-[5rem] pr-6 rounded-3xl bg-[#1A0F00]/60 border border-white/5 focus:border-[#D4AF37]/30 focus:ring-4 focus:ring-[#D4AF37]/5 outline-none font-bold text-base text-white placeholder:text-[#F5E6D3]/10 transition-all backdrop-blur-xl"
                                            />
                                        </div>
                                    </div>

                                    {/* Account Number */}
                                    <div className="space-y-3">
                                        <label className="text-xs font-bold text-[#F5E6D3]/30 tracking-wide ml-2">Account Number</label>
                                        <div className="relative group">
                                            <div className="absolute left-6 top-1/2 -translate-y-1/2 p-2.5 bg-black/40 rounded-2xl text-[#F5E6D3]/40 group-focus-within:text-[#D4AF37] group-focus-within:bg-black transition-all border border-white/5">
                                                <Hash size={20} />
                                            </div>
                                            <input
                                                type="text"
                                                required
                                                placeholder="0000 0000 0000"
                                                value={formData.accountNumber}
                                                onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                                                className="w-full h-[5rem] pl-[5rem] pr-6 rounded-3xl bg-[#1A0F00]/60 border border-white/5 focus:border-[#D4AF37]/30 focus:ring-4 focus:ring-[#D4AF37]/5 outline-none font-bold text-base text-white placeholder:text-[#F5E6D3]/10 transition-all backdrop-blur-xl"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="w-full h-[5.5rem] bg-[#D4AF37] text-black rounded-3xl text-sm font-bold tracking-widest flex items-center justify-center gap-4 shadow-2xl transition-all hover:bg-white active:scale-95 disabled:opacity-50 mt-10"
                                >
                                    {submitting ? (
                                        <Loader2 className="animate-spin" size={28} />
                                    ) : (
                                        <>
                                            <span>Verify & Link</span>
                                            <ShieldCheck size={22} className="opacity-80" />
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>
                    )}
                </main>

                {/* Footer Component */}
                <footer className="p-10 text-center relative z-10 mt-auto">
                    <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-black/40 border border-white/5 backdrop-blur-xl">
                        <Lock size={12} className="text-[#D4AF37]" />
                        <span className="text-[10px] font-bold text-[#F5E6D3]/30 tracking-widest uppercase">Secured Banking Network</span>
                    </div>
                </footer>
            </div>
        </div>
    );
}
