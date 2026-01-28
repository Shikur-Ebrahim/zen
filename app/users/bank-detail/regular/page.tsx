"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { db, auth } from "@/lib/firebase";
import { doc, getDoc, addDoc, collection } from "firebase/firestore";
import { ChevronLeft, Clock, Copy } from "lucide-react";
import { toast } from "sonner";

function RegularBankDetailContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const amount = searchParams.get("amount") || "0";
    const methodId = searchParams.get("methodId");

    const [loading, setLoading] = useState(true);
    const [method, setMethod] = useState<any>(null);
    const [timeLeft, setTimeLeft] = useState(1500);
    const [smsContent, setSmsContent] = useState("");
    const [copiedAccount, setCopiedAccount] = useState(false);
    const [copiedName, setCopiedName] = useState(false);

    useEffect(() => {
        const fetchMethod = async () => {
            if (!methodId) return;
            try {
                const docRef = doc(db, "paymentMethods", methodId);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) setMethod(docSnap.data());
            } catch (error) { toast.error("Error loading payment details"); }
            finally { setLoading(false); }
        };
        fetchMethod();
    }, [methodId]);

    useEffect(() => {
        if (timeLeft <= 0) return;
        const intervalId = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
        return () => clearInterval(intervalId);
    }, [timeLeft]);

    const { m, s } = { m: Math.floor(timeLeft / 60), s: timeLeft % 60 };

    const handleCopy = (text: string, type: 'account' | 'name') => {
        navigator.clipboard.writeText(text);
        if (type === 'account') {
            setCopiedAccount(true);
            setTimeout(() => setCopiedAccount(false), 2000);
        } else {
            setCopiedName(true);
            setTimeout(() => setCopiedName(false), 2000);
        }
        toast.success("Copied to clipboard");
    };

    const handleSubmit = async () => {
        if (!smsContent.trim()) {
            toast.error("Please enter the transaction code");
            return;
        }

        try {
            const user = auth.currentUser;
            if (!user) {
                toast.error("Please login to continue");
                return;
            }

            const userDocRef = doc(db, "users", user.uid);
            const userDocSnap = await getDoc(userDocRef);
            const userPhone = userDocSnap.exists() ? userDocSnap.data()?.phoneNumber : "";

            await addDoc(collection(db, "RechargeReview"), {
                paymentMethod: "regular",
                bankName: method?.bankName || "",
                phoneNumber: userPhone || user.phoneNumber || "",
                amount: Number(amount),
                FTcode: smsContent,
                accountHolderName: method?.holderName || "",
                accountNumber: method?.accountNumber || "",
                status: "Under Review",
                userId: user.uid,
                timestamp: new Date()
            });

            toast.success("Payment submitted successfully");
            router.push("/users/transaction-pending?theme=regular");
        } catch (error) {
            console.error(error);
            toast.error("Failed to submit. Please try again");
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-[#00C9A7] border-t-transparent rounded-full animate-spin"></div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#F5F7FA] font-sans pb-32">
            {/* Header */}
            <header className="bg-gradient-to-br from-[#00C9A7] to-[#00A896] text-white pt-6 pb-24 px-6 rounded-b-[40px] relative shadow-lg">
                <div className="flex items-center justify-between mb-8">
                    <button onClick={() => router.back()} className="p-2 bg-white/10 backdrop-blur-md rounded-xl hover:bg-white/20 transition-colors">
                        <ChevronLeft size={24} />
                    </button>
                    <h1 className="text-xl font-bold tracking-wide">Recharge</h1>
                    <div className="w-10"></div>
                </div>

                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 flex items-center justify-between border border-white/10">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full border border-white/30 flex items-center justify-center">
                            <Clock size={20} />
                        </div>
                        <div>
                            <p className="text-xs font-medium opacity-80 uppercase tracking-wider">Order</p>
                            <p className="font-bold text-sm">Remaining</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <div className="bg-white/20 backdrop-blur-sm px-3 py-2 rounded-xl min-w-[60px] text-center">
                            <span className="font-bold text-lg block leading-none">{String(m).padStart(2, '0')}</span>
                            <span className="text-[10px] uppercase opacity-80">Min</span>
                        </div>
                        <div className="bg-white/20 backdrop-blur-sm px-3 py-2 rounded-xl min-w-[60px] text-center">
                            <span className="font-bold text-lg block leading-none">{String(s).padStart(2, '0')}</span>
                            <span className="text-[10px] uppercase opacity-80">Sec</span>
                        </div>
                    </div>
                </div>
            </header>

            <main className="px-5 -mt-10 relative z-10 space-y-8">
                {/* Step 1 */}
                <section>
                    <h2 className="text-xl font-bold text-white mb-3">Step 1</h2>
                    <div className="bg-black p-4 rounded-2xl mb-6 shadow-lg shadow-black/20">
                        <p className="text-white text-xs font-medium leading-relaxed">
                            Please copy the account number below and transfer the money using this account number. The transfer amount must be the same as the selected deposit amount. After the transfer, please send the FT code or the full transaction message in the FT send section. If the transfer amount does not match, the system will block the deposit.
                        </p>
                    </div>

                    <div className="bg-white rounded-[2rem] p-6 shadow-xl shadow-indigo-100/50 space-y-6">
                        {/* Amount */}
                        <div className="border-b border-gray-100 pb-4">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Order Amount</label>
                            <div className="text-[#00C9A7] text-3xl font-black mt-1">
                                ETB {Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                        </div>

                        {/* Payment Channel */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Payment Channel</label>
                                <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-1 rounded-full font-bold uppercase">switch</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="font-bold text-gray-800 text-lg">{method?.bankName || "Commercial Bank of Ethiopia"}</span>
                                {method?.bankLogoUrl && (
                                    <img src={method.bankLogoUrl} alt="Bank" className="w-8 h-8 object-contain" />
                                )}
                            </div>
                        </div>

                        {/* Account Name */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Account Name</label>
                            <div className="flex items-center justify-between gap-4">
                                <span className="font-bold text-gray-800 text-lg leading-tight">{method?.holderName || "Loading..."}</span>
                                <button
                                    onClick={() => handleCopy(method?.holderName, 'name')}
                                    className="bg-[#00C9A7]/10 text-[#00C9A7] px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wide hover:bg-[#00C9A7]/20 active:scale-95 transition-all shrink-0"
                                >
                                    {copiedName ? "Copied" : "copy"}
                                </button>
                            </div>
                        </div>

                        {/* Account Number */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Account Number</label>
                            <div className="flex items-center justify-between gap-4">
                                <span className="font-bold text-gray-800 text-2xl tracking-wide font-mono">{method?.accountNumber || "Loading..."}</span>
                                <button
                                    onClick={() => handleCopy(method?.accountNumber, 'account')}
                                    className="bg-[#00C9A7]/10 text-[#00C9A7] px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wide hover:bg-[#00C9A7]/20 active:scale-95 transition-all shrink-0"
                                >
                                    {copiedAccount ? "Copied" : "copy"}
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Step 2 */}
                <section>
                    <h2 className="text-xl font-bold text-[#1A1A1A] mb-2">Step 2</h2>
                    <p className="text-[#FF453A] font-bold text-sm mb-4">
                        Paste payment sms Or enter TID: <span className="font-mono">FT*****</span>
                    </p>

                    <div className="relative">
                        <textarea
                            value={smsContent}
                            onChange={(e) => setSmsContent(e.target.value)}
                            className="w-full h-32 bg-white rounded-3xl p-5 text-gray-700 font-medium placeholder:text-gray-300 border-none shadow-xl shadow-indigo-100/50 resize-none focus:ring-2 focus:ring-[#00C9A7]/20 outline-none transition-all"
                            placeholder="Dear Mr your Account 1*********1122 has been debited wth ETB 200.00. Your Current Balance is ETB 44.76 Thank you for Banking with CBE! etc..."
                        />
                    </div>
                </section>
            </main>

            {/* Footer Action */}
            <div className="fixed bottom-0 left-0 right-0 p-6 bg-white border-t border-gray-100/50 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-40 pb-[5.5rem]">
                <button
                    onClick={handleSubmit}
                    disabled={!smsContent.trim()}
                    className={`w-full py-4 rounded-xl font-bold text-sm uppercase tracking-widest transition-all transform active:scale-[0.98] ${smsContent.trim()
                        ? 'bg-[#00C9A7] text-white shadow-lg shadow-[#00C9A7]/30 hover:shadow-xl hover:-translate-y-1'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        }`}
                >
                    I PAID
                </button>
            </div>

            <WelcomeNotification />
        </div>
    );
}

function WelcomeNotification() {
    const [show, setShow] = useState(true);

    if (!show) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-300">
                <div className="text-center space-y-6">
                    <div className="w-16 h-16 bg-[#00C9A7]/10 rounded-full flex items-center justify-center mx-auto text-[#00C9A7]">
                        <Clock size={32} />
                    </div>

                    <div className="space-y-2">
                        <h3 className="text-xl font-bold text-gray-900">Transfer Payment</h3>
                        <p className="text-gray-500 text-sm leading-relaxed">
                            To finish the deposit process, use the provided account number and transfer the same amount as the selected deposit amount. After the transfer, paste the transaction FT code or the full transfer message and send it for verification.
                        </p>
                    </div>

                    <button
                        onClick={() => setShow(false)}
                        className="w-full bg-[#00C9A7] text-white font-bold py-4 rounded-xl uppercase text-xs tracking-widest hover:bg-[#00C9A7] transition-colors"
                    >
                        Start
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function RegularBankDetailPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-white flex items-center justify-center"><div className="w-8 h-8 border-4 border-[#00C9A7] border-t-transparent rounded-full animate-spin"></div></div>}>
            <RegularBankDetailContent />
        </Suspense>
    );
}
