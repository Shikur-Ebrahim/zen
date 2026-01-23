"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, collection, addDoc, serverTimestamp, increment, query, where, getDocs, limit } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import {
    Lock,
    Loader2,
    ShieldCheck,
    AlertCircle,
    CheckCircle2,
    Delete,
    Clock,
    Rocket,
    ChevronLeft,
    Check
} from "lucide-react";
import { toast } from "sonner";

function SecurityContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const amountParam = searchParams.get('amount');

    const [user, setUser] = useState<any>(null);
    const [userData, setUserData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [verifying, setVerifying] = useState(false);
    const [hasPassword, setHasPassword] = useState(false);
    const [input, setInput] = useState("");
    const [confirmInput, setConfirmInput] = useState(""); // For setting password logic
    const [step, setStep] = useState<"check" | "set" | "confirm" | "enter">("check");
    const [shake, setShake] = useState(false);

    // Restriction States
    const [isRestricted, setIsRestricted] = useState(false); // 24h Cap
    const [isPartnerRestricted, setIsPartnerRestricted] = useState(false); // Verified Recharge
    const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
    const [minRecharge, setMinRecharge] = useState<number>(4500);
    const [withdrawalSettings, setWithdrawalSettings] = useState<any>({
        frequency: 1,
    });

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
            if (!currentUser) {
                router.push("/");
                return;
            }
            setUser(currentUser);

            // Fetch User Data for Password Check
            const userRef = doc(db, "users", currentUser.uid);
            const docSnap = await getDoc(userRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                setUserData(data);
                const hasPass = !!data.withdrawalPassword;
                setHasPassword(hasPass);
                setStep(hasPass ? "enter" : "set");
            }
            setLoading(false);
        });

        const fetchSettings = async () => {
            try {
                const docRef = doc(db, "GlobalSettings", "recharge");
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const settings = docSnap.data();
                    if (settings.minAmount) {
                        setMinRecharge(Number(settings.minAmount));
                    }
                }

                // Fetch Withdrawal Settings
                const withdrawRef = doc(db, "GlobalSettings", "withdrawal");
                const withdrawSnap = await getDoc(withdrawRef);
                if (withdrawSnap.exists()) {
                    setWithdrawalSettings(withdrawSnap.data());
                }
            } catch (error) {
                console.error("Error fetching settings:", error);
            }
        };

        fetchSettings();
        return () => unsubscribeAuth();
    }, [router]);

    // Handle Numpad Input
    const handleNumClick = (num: string) => {
        if (input.length < 4) {
            setInput(prev => prev + num);
        }
    };

    const handleDelete = () => {
        setInput(prev => prev.slice(0, -1));
    };

    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [customError, setCustomError] = useState("");

    useEffect(() => {
        if (customError) {
            const timer = setTimeout(() => {
                setCustomError("");
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [customError]);

    const handleAction = async () => {
        if (input.length !== 4) return;
        setVerifying(true);

        try {
            if (step === "set") {
                // Determine next step
                setConfirmInput(input);
                setInput("");
                setStep("confirm");
                setVerifying(false);
            } else if (step === "confirm") {
                if (input === confirmInput) {
                    // Save Password
                    await updateDoc(doc(db, "users", user.uid), {
                        withdrawalPassword: input
                    });
                    toast.success("Security PIN Set Successfully");
                    setUserData({ ...userData, withdrawalPassword: input });

                    // AUTO EXECUTE WITHDRAWAL after setting password
                    const isRecruited = await checkPartnerStatus();
                    if (!isRecruited) {
                        setIsPartnerRestricted(true);
                        setVerifying(false);
                        return;
                    }

                    const dailyRestricted = await checkRestriction();
                    if (dailyRestricted) {
                        setIsRestricted(true);
                        setStep("enter");
                        setInput("");
                        setVerifying(false);
                        return;
                    }
                    await executeWithdrawal();
                } else {
                    toast.error("PINs do not match. Try again.");
                    setInput("");
                    setConfirmInput("");
                    setStep("set");
                    setVerifying(false);
                }
            } else if (step === "enter") {
                // Check Password
                if (input === userData.withdrawalPassword) {
                    // 1. CHECK PARTNER STATUS FIRST
                    const isRecruited = await checkPartnerStatus();
                    if (!isRecruited) {
                        setIsPartnerRestricted(true);
                        setVerifying(false);
                        return;
                    }

                    // 2. CHECK 24H RESTRICTION 
                    const dailyRestricted = await checkRestriction();
                    if (dailyRestricted) {
                        setIsRestricted(true);
                        setVerifying(false);
                        return;
                    }
                    await executeWithdrawal();
                } else {
                    // Wrong Password
                    setShake(true);
                    setTimeout(() => setShake(false), 500);
                    setCustomError("Incorrect PIN. Please re-enter.");
                    setInput("");
                    setVerifying(false);
                }
            }
        } catch (error) {
            console.error(error);
            toast.error("An error occurred");
            setVerifying(false);
        }
    };

    const checkRestriction = async () => {
        if (!user) return false;

        const now = new Date();
        const f = withdrawalSettings.frequency || 1;
        // Start date for checking previous withdrawals: today - (f-1) days at 0:00
        const checkStartDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (f - 1));

        // Fetch all withdrawals for this user (avoids composite index requirement)
        const q = query(
            collection(db, "Withdrawals"),
            where("userId", "==", user.uid)
        );

        const snapshot = await getDocs(q);

        // Filter by date on the client side to avoid index issues
        const hasRestrictedWithdrawal = snapshot.docs.some(doc => {
            const data = doc.data();
            const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
            return createdAt >= checkStartDate;
        });

        return hasRestrictedWithdrawal;
    };

    const checkPartnerStatus = async () => {
        if (!user) return false;
        try {
            const q = query(
                collection(db, "RechargeReview"),
                where("userId", "==", user.uid),
                where("status", "==", "verified"),
                limit(1)
            );
            const snap = await getDocs(q);
            return !snap.empty;
        } catch (error) {
            console.error("Error checking partner status:", error);
            return false;
        }
    };

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (isRestricted) {
            timer = setInterval(() => {
                const now = new Date();

                // Reset always happens at midnight 0:00
                const targetReset = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
                targetReset.setHours(0, 0, 0, 0);

                const diff = targetReset.getTime() - now.getTime();

                if (diff <= 0) {
                    setIsRestricted(false);
                    return;
                }

                setTimeLeft({
                    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
                    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
                    minutes: Math.floor((diff / (1000 * 60)) % 60),
                    seconds: Math.floor((diff / 1000) % 60)
                });
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [isRestricted]);

    const executeWithdrawal = async () => {
        try {
            const amount = Number(amountParam);
            const fee = amount * 0.05;
            const actualReceipt = amount - fee;

            // Fetch Linked Bank Snapshot
            const bankSnap = await getDoc(doc(db, "Bank", user.uid));
            const rawBankData = bankSnap.data() as any;

            // Filter Bank Details (Remove status, uid, createdAt etc)
            const bankDetails = {
                accountNumber: rawBankData?.accountNumber,
                bankLogoUrl: rawBankData?.bankLogoUrl,
                bankName: rawBankData?.bankName,
                holderName: rawBankData?.holderName,
            };

            await addDoc(collection(db, "Withdrawals"), {
                userId: user.uid,
                amount: amount,
                fee: fee,
                actualReceipt: actualReceipt,
                bankDetails: bankDetails,
                status: "pending",
                createdAt: serverTimestamp(),
                userEmail: user.email,
                userPhone: userData.phoneNumber || ""
            });

            // ADD NOTIFICATION
            await addDoc(collection(db, "UserNotifications"), {
                userId: user.uid,
                type: "withdrawal",
                amount: amount,
                status: "pending",
                read: false,
                createdAt: serverTimestamp()
            });

            await updateDoc(doc(db, "users", user.uid), {
                balance: increment(-amount)
            });

            // SHOW SUCCESS MODAL INSTEAD OF REDIRECT
            setShowSuccessModal(true);
            setVerifying(false);
        } catch (error) {
            console.error(error);
            toast.error("Withdrawal Failed");
            setVerifying(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-[#D4AF37] animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col items-center justify-center p-6 text-center relative overflow-hidden selection:bg-[#D4AF37]/30">
            {/* Background Decorative Elements */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#D4AF37]/5 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#9A7B4F]/5 blur-[100px] rounded-full" />
            </div>

            {/* 🚀 Partner Recruitment Modal */}
            {isPartnerRestricted && (
                <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-2xl flex items-center justify-center p-6 animate-in fade-in duration-700">
                    <div className="bg-[#111111] w-full max-w-sm rounded-[3.5rem] p-10 border border-[#D4AF37]/20 shadow-[0_0_80px_rgba(212,175,55,0.1)] relative overflow-hidden animate-in zoom-in-90 duration-500">
                        <div className="absolute -top-32 -right-32 w-80 h-80 bg-[#D4AF37]/5 rounded-full blur-[120px] pointer-events-none"></div>

                        <div className="relative z-10 flex flex-col items-center text-center gap-10">
                            <div className="relative">
                                <div className="absolute inset-0 bg-[#D4AF37]/20 rounded-[2.5rem] blur-2xl animate-pulse"></div>
                                <div className="w-28 h-28 rounded-[2.5rem] bg-gradient-to-br from-[#BF953F] via-[#FCF6BA] to-[#B38728] p-[1px] shadow-2xl relative">
                                    <div className="w-full h-full rounded-[2.45rem] bg-[#0a0a0a] flex items-center justify-center text-[#D4AF37]">
                                        <Rocket size={54} strokeWidth={1.2} className="relative z-10 animate-bounce" />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-br from-[#FCF6BA] via-[#D4AF37] to-[#B38728] uppercase tracking-tighter leading-none italic">
                                    Unlock<br />Withdrawals
                                </h3>
                                <p className="text-white/40 text-xs font-bold leading-relaxed px-2 uppercase tracking-wider">
                                    Withdrawals are available only for <span className="text-[#D4AF37] font-black">Turner Partners</span>.
                                    Recharge your wallet and join to start withdrawing.
                                </p>
                            </div>

                            <button
                                onClick={() => router.push(`/users/recharge?amount=${minRecharge}`)}
                                className="w-full py-6 bg-gradient-to-r from-[#BF953F] via-[#FCF6BA] to-[#B38728] text-black rounded-[2.2rem] text-[11px] font-black uppercase tracking-[0.3em] shadow-xl active:scale-95 transition-all"
                            >
                                Recharge & Join Now
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 24-Hour Restriction Overlay */}
            {isRestricted && (
                <div className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-2xl flex items-center justify-center p-6 animate-in fade-in duration-500">
                    <div className="bg-[#1A1A1A] rounded-[3.5rem] p-10 w-full max-w-sm border border-amber-500/20 shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-500">
                        <div className="absolute -top-24 -right-24 w-48 h-48 bg-amber-500/5 rounded-full blur-3xl opacity-50"></div>

                        <div className="relative z-10 flex flex-col items-center text-center gap-8">
                            <div className="w-24 h-24 rounded-[2rem] bg-amber-500/10 flex items-center justify-center relative shadow-inner">
                                <Clock size={48} className="text-amber-500" />
                            </div>

                            <div className="space-y-3">
                                <h3 className="text-2xl font-black text-white tracking-tighter uppercase">Limit Reached</h3>
                                <p className="text-[10px] font-black text-amber-500 uppercase tracking-[0.3em]">Next window starts in:</p>
                            </div>

                            <div className="flex gap-4 justify-center w-full bg-[#0A0A0A] py-8 rounded-[2.5rem] border border-white/5">
                                {[
                                    { val: timeLeft.hours, label: 'Hrs' },
                                    { val: timeLeft.minutes, label: 'Min' },
                                    { val: timeLeft.seconds, label: 'Sec', color: 'text-amber-500' }
                                ].map((t, i) => (
                                    <div key={i} className="flex flex-col items-center min-w-[60px]">
                                        <span className={`text-3xl font-black ${t.color || 'text-white'} tabular-nums`}>{t.val.toString().padStart(2, '0')}</span>
                                        <span className="text-[8px] font-black text-white/30 uppercase tracking-widest mt-1">{t.label}</span>
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={() => router.push('/users/welcome')}
                                className="w-full py-5 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.3em] transition-all"
                            >
                                Acknowleged
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Success Modal Overlay */}
            {showSuccessModal && (
                <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-2xl flex items-center justify-center p-6 animate-in fade-in duration-700">
                    <div className="bg-[#1a1a1a] w-full max-w-sm rounded-[3.5rem] p-10 border border-[#D4AF37]/30 shadow-[0_0_80px_rgba(212,175,55,0.1)] relative overflow-hidden animate-in zoom-in-95 duration-500">
                        <div className="absolute -top-24 -right-24 w-64 h-64 bg-[#D4AF37]/10 rounded-full blur-[100px] pointer-events-none"></div>

                        <div className="relative z-10 flex flex-col items-center text-center gap-8">
                            <div className="w-24 h-24 rounded-[2rem] bg-gradient-to-br from-[#BF953F] via-[#FCF6BA] to-[#B38728] p-[1px] shadow-2xl">
                                <div className="w-full h-full rounded-[1.95rem] bg-[#1a1a1a] flex items-center justify-center text-[#D4AF37]">
                                    <CheckCircle2 size={48} strokeWidth={1.5} className="animate-in zoom-in duration-500" />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-br from-[#FCF6BA] via-[#D4AF37] to-[#B38728] uppercase tracking-tight">Withdrawal Placed</h3>
                                <p className="text-white/40 text-[11px] font-bold leading-relaxed px-4 uppercase tracking-tighter">
                                    Your request is being processed. Expected arrival:<br />
                                    <span className="text-[#D4AF37] font-black">2 - 72 Business Hours</span>
                                </p>
                            </div>

                            <button
                                onClick={() => router.push('/users/welcome')}
                                className="w-full py-6 bg-gradient-to-r from-[#BF953F] via-[#FCF6BA] to-[#B38728] text-black rounded-[2.2rem] text-[11px] font-black uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all"
                            >
                                Return to Home
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header/Icon */}
            <div className="mb-10 relative">
                <div className="w-24 h-24 bg-[#1A1A1A] border border-[#D4AF37]/20 rounded-[2.5rem] shadow-2xl flex items-center justify-center relative z-10 text-[#D4AF37]">
                    {step === "enter" ? <Lock size={36} strokeWidth={1.5} /> : <ShieldCheck size={36} strokeWidth={1.5} />}
                </div>
                <div className="absolute inset-0 bg-[#D4AF37]/10 rounded-[2.5rem] blur-2xl animate-pulse"></div>
            </div>

            {/* Title & Instructions */}
            <div className="space-y-4 mb-14 max-w-xs mx-auto relative z-10">
                <h2 className="text-3xl font-black uppercase text-white tracking-tighter leading-none italic">
                    {step === "set" ? "Create Security PIN" : step === "confirm" ? "Confirm PIN" : "Security Check"}
                </h2>
                <div className="h-1 w-10 bg-[#D4AF37]/30 mx-auto rounded-full"></div>
                <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] leading-relaxed">
                    {step === "set"
                        ? "Secure your funds with a 4-digit code."
                        : step === "confirm"
                            ? "Verify your new security code."
                            : "Unlock authorization to proceed."}
                </p>
            </div>

            {/* PIN Display */}
            <div className={`flex gap-8 mb-16 relative z-10 ${shake ? "animate-shake" : ""}`}>
                {[...Array(4)].map((_, i) => (
                    <div
                        key={i}
                        className={`w-4 h-4 rounded-full transition-all duration-500 border-2 ${i < input.length
                            ? "bg-[#D4AF37] border-[#FCF6BA] scale-125 shadow-[0_0_15px_rgba(212,175,55,0.5)]"
                            : "bg-transparent border-white/10"
                            }`}
                    ></div>
                ))}
            </div>

            {/* Inline Error Message */}
            <div className="h-12 mb-6 w-full flex items-center justify-center relative z-10">
                {customError && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-5 py-2.5 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                        <AlertCircle size={18} />
                        <span className="text-[10px] font-black uppercase tracking-widest">{customError}</span>
                    </div>
                )}
            </div>

            {/* Numpad */}
            <div className="grid grid-cols-3 gap-x-12 gap-y-8 mb-12 w-full max-w-[320px] relative z-10">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                    <button
                        key={num}
                        onClick={() => handleNumClick(num.toString())}
                        className="w-16 h-16 rounded-full text-2xl font-black text-white hover:bg-white/5 active:bg-white/10 transition-all flex items-center justify-center"
                    >
                        {num}
                    </button>
                ))}
                <div className="w-16 h-16"></div>
                <button
                    onClick={() => handleNumClick("0")}
                    className="w-16 h-16 rounded-full text-2xl font-black text-white hover:bg-white/5 active:bg-white/10 transition-all flex items-center justify-center"
                >
                    0
                </button>
                <button
                    onClick={handleDelete}
                    className="w-16 h-16 rounded-full flex items-center justify-center text-white/20 hover:text-white/40 transition-all"
                >
                    <Delete size={28} />
                </button>
            </div>

            {/* Action Button */}
            <div className="w-full max-w-[320px] relative z-10">
                <button
                    onClick={handleAction}
                    disabled={input.length !== 4 || verifying}
                    className="w-full py-6 bg-gradient-to-r from-[#BF953F] via-[#FCF6BA] to-[#B38728] disabled:opacity-30 disabled:grayscale text-black rounded-[2.2rem] text-[11px] font-black uppercase tracking-[0.3em] shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3"
                >
                    {verifying ? (
                        <Loader2 className="animate-spin" size={20} />
                    ) : (
                        <>
                            {step === "enter" && <Check size={18} />}
                            <span>{step === "enter" ? "Authorize Payout" : "Continue"}</span>
                        </>
                    )}
                </button>

                <button
                    onClick={() => router.back()}
                    className="mt-8 text-[9px] font-black text-white/20 uppercase tracking-[0.4em] hover:text-white transition-all"
                >
                    Cancel transaction
                </button>
            </div>
        </div>
    );
}

export default function SecurityPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A]">
                <Loader2 className="w-10 h-10 animate-spin text-[#D4AF37]" />
            </div>
        }>
            <SecurityContent />
        </Suspense>
    );
}
