"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import {
    Lock,
    Loader2,
    CheckCircle2,
    Delete,
    ChevronLeft,
    ShieldCheck,
    Key,
    AlertCircle
} from "lucide-react";
import { toast } from "sonner";

function ChangePasswordContent() {
    const router = useRouter();
    const inputRef = useRef<HTMLInputElement>(null);

    // Keep focus on the hidden input
    useEffect(() => {
        const focusInput = () => inputRef.current?.focus();
        focusInput();
    }, []);

    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // State management for logic flow
    const [step, setStep] = useState<"enter_old" | "create_new" | "confirm_new">("create_new");
    const [input, setInput] = useState("");
    const [tempNew, setTempNew] = useState("");
    const [hasExistingPass, setHasExistingPass] = useState(false);
    const [existingPass, setExistingPass] = useState("");

    const [shake, setShake] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [showSuccess, setShowSuccess] = useState(false);

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
            if (!currentUser) {
                router.push("/");
                return;
            }
            setUser(currentUser);

            // Fetch current setting
            const userRef = doc(db, "users", currentUser.uid);
            const docSnap = await getDoc(userRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.withdrawalPassword) {
                    setHasExistingPass(true);
                    setExistingPass(data.withdrawalPassword);
                    setStep("enter_old");
                }
            }
            setLoading(false);
        });

        return () => unsubscribeAuth();
    }, [router]);


    const handleAction = async () => {
        if (input.length !== 4) return;
        setSubmitting(true);
        setErrorMsg("");

        try {
            if (step === "enter_old") {
                if (input === existingPass) {
                    toast.success("Identity Verified");
                    setStep("create_new");
                    setInput("");
                } else {
                    triggerShake();
                    setErrorMsg("Incorrect Password! Please enter the correct PIN.");
                    toast.error("Incorrect Password! Please enter the correct PIN.");
                    setInput("");
                }
                setSubmitting(false);
            } else if (step === "create_new") {
                if (hasExistingPass && input === existingPass) {
                    setErrorMsg("New PIN cannot be the same as old PIN.");
                    toast.error("New PIN cannot be the same as old PIN");
                    triggerShake();
                    setInput("");
                    setSubmitting(false);
                    return;
                }
                setTempNew(input);
                setStep("confirm_new");
                setInput("");
                setSubmitting(false);
            } else if (step === "confirm_new") {
                if (input === tempNew) {
                    // Update Password in Firestore
                    await updateDoc(doc(db, "users", user.uid), {
                        withdrawalPassword: input
                    });
                    setSubmitting(false);
                    setShowSuccess(true); // Trigger Success View
                }
            }

        } catch (error) {
            console.error(error);
            toast.error("An error occurred");
            setSubmitting(false);
        }
    };

    // Auto-submit when exactly 4 digits are typed
    useEffect(() => {
        if (input.length === 4 && !submitting) {
            handleAction();
        }
    }, [input]);

    const triggerShake = () => {
        setShake(true);
        setTimeout(() => setShake(false), 500);
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
            </div>
        );
    }

    if (showSuccess) {
        return (
            <div className="min-h-screen bg-[#F8F9FB] flex flex-col items-center justify-center p-6 animate-in fade-in fill-mode-forwards duration-500">
                <div className="w-full max-w-sm bg-white rounded-[2.5rem] p-10 shadow-2xl shadow-indigo-100 border border-slate-50 text-center relative overflow-hidden">
                    {/* Background decoration */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full -mr-16 -mt-16 blur-xl"></div>
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-50 rounded-full -ml-16 -mb-16 blur-xl"></div>

                    <div className="relative z-10 flex flex-col items-center gap-6">
                        <div className="w-24 h-24 rounded-full bg-emerald-50 flex items-center justify-center mb-2">
                            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center shadow-inner">
                                <CheckCircle2 size={40} className="text-emerald-500 drop-shadow-sm" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Success!</h2>
                            <p className="text-sm font-bold text-slate-500 leading-relaxed">
                                Your withdrawal password has been changed correctly.
                            </p>
                        </div>

                        <div className="w-full pt-4">
                            <button
                                onClick={() => router.back()}
                                className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-[2rem] text-sm font-black uppercase tracking-[0.2em] shadow-xl shadow-slate-900/10 transition-all active:scale-95"
                            >
                                Back to Profile
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Determine visual steps
    const steps = hasExistingPass
        ? [
            { id: 1, label: "Verify Old" },
            { id: 2, label: "Create New" },
            { id: 3, label: "Confirm" }
        ]
        : [
            { id: 2, label: "Create New" },
            { id: 3, label: "Confirm" }
        ];

    return (
        <div className="min-h-screen bg-[#F8F9FB] flex flex-col items-center p-6 pt-12 relative font-sans">
            {/* Minimal Back Button */}
            <button
                onClick={() => router.back()}
                className="absolute top-8 left-8 w-12 h-12 rounded-full bg-white shadow-sm border border-slate-100 flex items-center justify-center hover:bg-slate-50 transition-all active:scale-95 z-50"
            >
                <ChevronLeft size={24} className="text-slate-400" />
            </button>

            {/* Hidden Input & Dots Display */}
            <div className="flex-1 flex flex-col items-center justify-center -mt-20">
                <div
                    className={`relative flex gap-8 p-8 cursor-text ${shake ? "animate-shake" : ""}`}
                    onClick={() => inputRef.current?.focus()}
                >
                    {/* Native Input - Invisible but functional */}
                    <input
                        ref={inputRef}
                        type="tel"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        autoComplete="one-time-code"
                        value={input}
                        onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9]/g, '');
                            if (val.length <= 4) setInput(val);
                            if (val.length > 0) setErrorMsg("");
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 z-20 cursor-text caret-transparent"
                        autoFocus
                    />

                    {/* Visual Dots */}
                    {[...Array(4)].map((_, i) => (
                        <div
                            key={i}
                            className={`w-5 h-5 rounded-full transition-all duration-300 ${i < input.length
                                ? (shake ? "bg-red-500 scale-125" : "bg-slate-800 scale-125") + " shadow-[0_0_15px_rgba(0,0,0,0.1)]"
                                : "bg-slate-200 scale-100"
                                }`}
                        ></div>
                    ))}
                </div>

                {/* Status Message */}
                <div className="h-6 mt-4 text-center px-4">
                    {errorMsg && (
                        <p className="text-[10px] font-black text-red-500 uppercase tracking-widest animate-in fade-in slide-in-from-top-1">
                            {errorMsg}
                        </p>
                    )}
                </div>
            </div>

            {/* Bottom Action Button - REMOVED for auto-submit */}
        </div>
    );
}

export default function ChangeWithdrawalPasswordPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-white">
                <Loader2 className="w-10 h-10 animate-spin text-purple-600" />
            </div>
        }>
            <ChangePasswordContent />
        </Suspense>
    );
}
