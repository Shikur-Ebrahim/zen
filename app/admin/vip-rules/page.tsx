"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { collection, addDoc, getDocs, deleteDoc, doc, query, orderBy, onSnapshot, updateDoc } from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
    Loader2,
    Upload,
    Trash2,
    Plus,
    Crown,
    Users,
    Pencil,
    Check,
    CircleDollarSign,
    TrendingUp,
    Calendar,
    Image as ImageIcon,
    Menu
} from "lucide-react";
import AdminSidebar from "@/components/AdminSidebar";

export default function VipRulesPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [status, setStatus] = useState({ type: "", message: "" });
    const [vipRules, setVipRules] = useState<any[]>([]);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        level: "",
        investedTeamSize: "",
        totalTeamAssets: "",
        monthlySalary: "",
        yearlySalary5Year: "",
        imageUrl: "",
        publicId: ""
    });
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState("");
    const [isEditMode, setIsEditMode] = useState(false);
    const [editingRuleId, setEditingRuleId] = useState<string | null>(null);

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            const isMaster = localStorage.getItem("admin_session") === "true";
            if (!user && !isMaster) {
                router.push("/");
            } else {
                setLoading(false);
            }
        });

        // Listen for VIP Rules
        const q = query(collection(db, "VipRules"), orderBy("createdAt", "desc"));
        const unsubscribeRules = onSnapshot(q, (snapshot) => {
            const rules = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setVipRules(rules);
        });

        return () => {
            unsubscribeAuth();
            unsubscribeRules();
        };
    }, [router]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            const reader = new FileReader();
            reader.onloadend = () => setPreviewUrl(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleAddRule = async (e: React.FormEvent) => {
        e.preventDefault();

        // Image is required only for NEW rules
        if (!isEditMode && (!selectedFile || !formData.level)) {
            setStatus({ type: "error", message: "Please fill all fields and select an image." });
            return;
        }

        setUploading(true);
        setStatus({ type: "", message: "" });

        try {
            let imageUrl = formData.imageUrl || "";
            let publicId = formData.publicId || "";

            // 1. Upload new image if selected
            if (selectedFile) {
                const cloudFormData = new FormData();
                cloudFormData.append("file", selectedFile);
                cloudFormData.append("upload_preset", process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "Turner");

                const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "deve0w9bt";
                const response = await fetch(
                    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
                    { method: "POST", body: cloudFormData }
                );

                if (!response.ok) throw new Error("Cloudinary upload failed");

                const data = await response.json();
                imageUrl = data.secure_url;
                publicId = data.public_id;
            }

            // 2. Save or Update in Firestore
            if (isEditMode && editingRuleId) {
                await updateDoc(doc(db, "VipRules", editingRuleId), {
                    ...formData,
                    imageUrl,
                    publicId,
                    updatedAt: new Date().toISOString()
                });
                setStatus({ type: "success", message: "VIP Rule updated successfully!" });
            } else {
                await addDoc(collection(db, "VipRules"), {
                    ...formData,
                    imageUrl,
                    publicId,
                    createdAt: new Date().toISOString()
                });
                setStatus({ type: "success", message: "VIP Rule added successfully!" });
            }

            // Reset form
            resetForm();
        } catch (err: any) {
            console.error(err);
            setStatus({ type: "error", message: err.message || "Failed to process VIP Rule." });
        } finally {
            setUploading(false);
            setTimeout(() => setStatus({ type: "", message: "" }), 3000);
        }
    };

    const handleEditInitiate = (rule: any) => {
        setFormData({
            level: rule.level || "",
            investedTeamSize: rule.investedTeamSize || "",
            totalTeamAssets: rule.totalTeamAssets || "",
            monthlySalary: rule.monthlySalary || "",
            yearlySalary5Year: rule.yearlySalary5Year || "",
            imageUrl: rule.imageUrl || "",
            publicId: rule.publicId || ""
        } as any);
        setPreviewUrl(rule.imageUrl || "");
        setEditingRuleId(rule.id);
        setIsEditMode(true);
        // Scroll to top to see the form
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const resetForm = () => {
        setFormData({
            level: "",
            investedTeamSize: "",
            totalTeamAssets: "",
            monthlySalary: "",
            yearlySalary5Year: "",
            imageUrl: "",
            publicId: ""
        });
        setSelectedFile(null);
        setPreviewUrl("");
        setIsEditMode(false);
        setEditingRuleId(null);
    };

    const handleDeleteRule = async (id: string) => {
        if (!confirm("Are you sure you want to delete this rule?")) return;
        try {
            await deleteDoc(doc(db, "VipRules", id));
            setStatus({ type: "success", message: "Rule deleted." });
        } catch (err) {
            console.error(err);
            setStatus({ type: "error", message: "Failed to delete rule." });
        } finally {
            setTimeout(() => setStatus({ type: "", message: "" }), 3000);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex">
            <AdminSidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

            <main className="flex-1 flex flex-col min-h-screen max-w-full overflow-hidden">
                {/* Mobile Header */}
                <header className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-4 flex items-center justify-between z-30 md:hidden">
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                    >
                        <Menu size={24} className="text-slate-600" />
                    </button>
                    <div className="flex items-center gap-2">
                        <Crown className="text-amber-500" size={20} />
                        <span className="font-black text-slate-800 text-sm tracking-tight">VIP Rules</span>
                    </div>
                    <div className="w-10 h-10 p-1 rounded-full border border-slate-100 overflow-hidden">
                        <img src="/logo.png" alt="Admin" className="w-full h-full object-contain" />
                    </div>
                </header>

                <div className="p-8">
                    <div className="max-w-6xl mx-auto">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                                    <Crown className="text-amber-500" />
                                    VIP Rules Management
                                </h1>
                                <p className="text-slate-500 text-sm">Define criteria and rewards for VIP levels</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Add Rule Form */}
                            <div className="lg:col-span-1">
                                <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 ring-1 ring-slate-200/50">
                                    <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                                        {isEditMode ? <Pencil className="text-indigo-600" size={20} /> : <Plus className="text-indigo-600" size={20} />}
                                        {isEditMode ? "Edit VIP Rule" : "New VIP Rule"}
                                    </h2>

                                    <form onSubmit={handleAddRule} className="space-y-4">
                                        <div>
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">VIP Level</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. VIP 1"
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                                                value={formData.level}
                                                onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                                                required
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Invested Team Size</label>
                                                <div className="relative">
                                                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                                    <input
                                                        type="number"
                                                        placeholder="Size"
                                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                                                        value={formData.investedTeamSize}
                                                        onChange={(e) => setFormData({ ...formData, investedTeamSize: e.target.value })}
                                                        required
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Total Assets</label>
                                                <div className="relative">
                                                    <CircleDollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                                    <input
                                                        type="number"
                                                        placeholder="ETB"
                                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                                                        value={formData.totalTeamAssets}
                                                        onChange={(e) => setFormData({ ...formData, totalTeamAssets: e.target.value })}
                                                        required
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Monthly Salary (ETB)</label>
                                            <div className="relative">
                                                <TrendingUp className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                                <input
                                                    type="number"
                                                    placeholder="Amount"
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                                                    value={formData.monthlySalary}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        const monthly = Number(val) || 0;
                                                        const fiveYear = monthly * 12 * 5;
                                                        setFormData({
                                                            ...formData,
                                                            monthlySalary: val,
                                                            yearlySalary5Year: fiveYear.toString()
                                                        });
                                                    }}
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">5-Year Total Salary</label>
                                            <div className="relative">
                                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                                <input
                                                    type="number"
                                                    placeholder="Calculated Total"
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                                                    value={formData.yearlySalary5Year}
                                                    onChange={(e) => setFormData({ ...formData, yearlySalary5Year: e.target.value })}
                                                    required
                                                />
                                            </div>
                                            <p className="text-[9px] text-slate-400 mt-1 italic">* Estimate based on current monthly salary</p>
                                        </div>

                                        <div>
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">VIP Icon/Image</label>
                                            <div className="relative group cursor-pointer">
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handleFileChange}
                                                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                                />
                                                <div className={`mt-1 flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-6 transition-all ${previewUrl ? "border-indigo-500 bg-indigo-50/30" : "border-slate-200 bg-slate-50 group-hover:bg-slate-100"
                                                    }`}>
                                                    {previewUrl ? (
                                                        <img src={previewUrl} alt="Preview" className="w-20 h-20 object-contain rounded-lg shadow-md" />
                                                    ) : (
                                                        <>
                                                            <ImageIcon size={32} className="text-slate-300 mb-2" />
                                                            <span className="text-xs text-slate-500 font-medium">Click to upload image</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {status.message && (
                                            <div className={`p-4 rounded-xl text-xs font-bold flex items-center gap-2 ${status.type === "success" ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                                                }`}>
                                                {status.message}
                                            </div>
                                        )}

                                        <div className="grid grid-cols-2 gap-4">
                                            {isEditMode && (
                                                <button
                                                    type="button"
                                                    onClick={resetForm}
                                                    className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-black py-4 rounded-xl transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-xs"
                                                >
                                                    Cancel
                                                </button>
                                            )}
                                            <button
                                                type="submit"
                                                disabled={uploading}
                                                className={`w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-black py-4 rounded-xl transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 uppercase tracking-widest text-xs ${isEditMode ? "" : "col-span-2"}`}
                                            >
                                                {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isEditMode ? <Check size={18} /> : <Plus size={18} />)}
                                                {uploading ? (isEditMode ? "Updating..." : "Adding...") : (isEditMode ? "Update Rule" : "Add VIP Rule")}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>

                            {/* Rules List */}
                            <div className="lg:col-span-2 space-y-4">
                                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 px-2">
                                    <Layers className="text-amber-500" size={20} />
                                    Active VIP Tiers
                                </h2>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {vipRules.map((rule) => (
                                        <div key={rule.id} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 group hover:shadow-md transition-all">
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-50 border border-slate-100 flex items-center justify-center p-2">
                                                        <img src={rule.imageUrl} alt={rule.level} className="w-full h-full object-contain" />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-lg font-black text-slate-800">{rule.level}</h3>
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">VIP Tier</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => handleEditInitiate(rule)}
                                                        className="p-2 text-slate-300 hover:text-indigo-500 transition-colors"
                                                    >
                                                        <Pencil size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteRule(rule.id)}
                                                        className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3 mb-4">
                                                <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
                                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Invested Team</p>
                                                    <p className="text-sm font-black text-slate-700">{rule.investedTeamSize} Members</p>
                                                </div>
                                                <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
                                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Min. Assets</p>
                                                    <p className="text-sm font-black text-slate-700">{Number(rule.totalTeamAssets).toLocaleString()} ETB</p>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between px-2">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Monthly Salary</span>
                                                    <span className="text-sm font-black text-emerald-600">{Number(rule.monthlySalary).toLocaleString()} ETB</span>
                                                </div>
                                                <div className="flex items-center justify-between px-2">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">5-Year Total</span>
                                                    <span className="text-sm font-black text-indigo-600">{Number(rule.yearlySalary5Year).toLocaleString()} ETB</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {vipRules.length === 0 && (
                                        <div className="col-span-2 py-20 bg-white rounded-3xl border border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400">
                                            <Plus size={48} className="opacity-10 mb-4" />
                                            <p className="text-sm font-medium">No VIP rules defined yet.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

const Layers = ({ size, className }: { size: number, className?: string }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <path d="M12 2 2 7l10 5 10-5-10-5Z" /><path d="m2 17 10 5 10-5" /><path d="m2 12 10 5 10-5" />
    </svg>
);
