"use client";

import { useState, useEffect } from "react";
import {
    Plus,
    Search,
    Package,
    Edit2,
    Trash2,
    X,
    UploadCloud,
    Loader2,
    CheckCircle2,
    AlertCircle,
    TrendingUp,
    Clock,
    DollarSign,
    ShieldCheck,
    Menu
} from "lucide-react";
import { db } from "@/lib/firebase";
import {
    collection,
    onSnapshot,
    query,
    orderBy,
    doc,
    setDoc,
    deleteDoc,
    serverTimestamp,
    addDoc
} from "firebase/firestore";
import AdminSidebar from "@/components/AdminSidebar";

const CATEGORIES = ["Level 1", "Level 2", "Level 3", "VIP"];

export default function AdminProductsPage() {
    // --- State ---
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [activeFilter, setActiveFilter] = useState("Level 1");
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<"create" | "edit">("create");
    const [editingProduct, setEditingProduct] = useState<any>(null);

    // Form State
    const [formData, setFormData] = useState({
        name: "",
        price: 0,
        dailyIncome: 0,
        contractPeriod: 0,
        category: "Level 1",
        description: "",
        purchaseLimit: 1,
        imageUrl: "",
        salesTracked: 0
    });

    // Calculated Fields (displayed in UI)
    const dailyRate = formData.price > 0 ? (formData.dailyIncome / formData.price) * 100 : 0;
    const totalProfit = formData.dailyIncome * formData.contractPeriod;
    const principalIncome = totalProfit + Number(formData.price);

    // Upload State
    const [isUploading, setIsUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState<string | null>(null);

    // Message State
    const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // --- Effects ---
    useEffect(() => {
        const q = query(collection(db, "Products"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setProducts(data);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    // --- Handlers ---
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === "name" || name === "category" || name === "description" || name === "imageUrl"
                ? value
                : Number(value)
        }));
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        setUploadStatus("Uploading...");

        const uploadData = new FormData();
        uploadData.append("file", file);
        uploadData.append("upload_preset", process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "ml_default");

        try {
            const response = await fetch(
                `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
                { method: "POST", body: uploadData }
            );
            const data = await response.json();
            if (data.secure_url) {
                setFormData(prev => ({ ...prev, imageUrl: data.secure_url }));
                setUploadStatus("Success!");
            } else {
                setUploadStatus("Failed. Check Config.");
            }
        } catch (error) {
            console.error("Upload error:", error);
            setUploadStatus("Error occurred.");
        } finally {
            setIsUploading(false);
            setTimeout(() => setUploadStatus(null), 3000);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setStatusMsg(null);

        try {
            const productData = {
                ...formData,
                dailyRate: Number(dailyRate.toFixed(2)),
                totalProfit: Number(totalProfit.toFixed(2)),
                principalIncome: Number(principalIncome.toFixed(2)),
                updatedAt: serverTimestamp(),
                createdAt: modalMode === "create" ? serverTimestamp() : editingProduct.createdAt
            };

            if (modalMode === "create") {
                await addDoc(collection(db, "Products"), productData);
                setStatusMsg({ type: "success", text: "Product created successfully!" });
            } else {
                await setDoc(doc(db, "Products", editingProduct.id), productData);
                setStatusMsg({ type: "success", text: "Product updated successfully!" });
            }

            setTimeout(() => {
                setIsModalOpen(false);
                resetForm();
            }, 1500);
        } catch (error: any) {
            console.error("Submit error:", error);
            setStatusMsg({ type: "error", text: error.message || "Failed to save product" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("Are you sure you want to delete this product?")) return;
        try {
            await deleteDoc(doc(db, "Products", id));
        } catch (error) {
            console.error("Delete error:", error);
        }
    };

    const openEditModal = (product: any) => {
        setEditingProduct(product);
        setFormData({
            name: product.name,
            price: product.price,
            dailyIncome: product.dailyIncome,
            contractPeriod: product.contractPeriod,
            category: product.category,
            description: product.description || "",
            purchaseLimit: product.purchaseLimit || 1,
            imageUrl: product.imageUrl || "",
            salesTracked: product.salesTracked || 0
        });
        setModalMode("edit");
        setIsModalOpen(true);
    };

    const resetForm = () => {
        setFormData({
            name: "",
            price: 0,
            dailyIncome: 0,
            contractPeriod: 0,
            category: "Level 1",
            description: "",
            purchaseLimit: 1,
            imageUrl: "",
            salesTracked: 0
        });
        setEditingProduct(null);
        setModalMode("create");
        setStatusMsg(null);
    };

    const filteredProducts = products.filter(p => {
        const matchesCat = (p.category || "Level 1") === activeFilter;
        const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesCat && matchesSearch;
    });

    return (
        <div className="flex min-h-screen bg-[#F8FAFC]">
            <AdminSidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

            <main className="flex-1 flex flex-col min-h-screen max-w-full overflow-hidden">
                {/* Navbar */}
                <header className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-gray-100 px-6 py-4 flex items-center justify-between z-30">
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="md:hidden p-2 hover:bg-gray-100 rounded-xl transition-colors"
                    >
                        <Menu size={24} className="text-gray-600" />
                    </button>
                    <div className="hidden md:block">
                        <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest">
                            Manager / <span className="text-indigo-600">Products</span>
                        </h2>
                    </div>
                    <div className="w-10 h-10 p-1 rounded-full border-2 border-indigo-100 overflow-hidden">
                        <img src="/logo.png" alt="Admin" className="w-full h-full object-contain" />
                    </div>
                </header>

                <div className="p-8 overflow-y-auto">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                        <div>
                            <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-widest mb-1">
                                <span>Manager</span>
                                <span className="text-gray-300">/</span>
                                <span>Products</span>
                            </div>
                            <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                                Inventory System <Package className="text-indigo-600 w-8 h-8" />
                            </h1>
                            <p className="text-slate-500 font-medium mt-1">Manage all available investment plans for users.</p>
                        </div>

                        <button
                            onClick={() => { resetForm(); setModalMode("create"); setIsModalOpen(true); }}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-4 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/20 active:scale-95 transition-all w-fit"
                        >
                            <Plus size={20} strokeWidth={3} />
                            Create New Product
                        </button>
                    </div>

                    {/* Sub-Header / Filters */}
                    <div className="bg-white rounded-[2rem] p-4 shadow-sm border border-slate-100 mb-8 flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-2 p-1 bg-slate-50 rounded-2xl w-full md:w-auto overflow-x-auto no-scrollbar">
                            {CATEGORIES.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setActiveFilter(cat)}
                                    className={`px-6 py-2.5 rounded-xl text-sm font-bold uppercase tracking-wider transition-all whitespace-nowrap ${activeFilter === cat
                                        ? "bg-white text-indigo-600 shadow-md ring-1 ring-slate-100"
                                        : "text-slate-400 hover:text-slate-600"
                                        }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>

                        <div className="relative w-full md:w-80 group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={18} />
                            <input
                                type="text"
                                placeholder="Search by product name..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-slate-50 border-0 outline-none focus:ring-2 focus:ring-indigo-600/10 placeholder:text-slate-400 font-medium"
                            />
                        </div>
                    </div>

                    {/* Grid */}
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <Loader2 className="animate-spin text-indigo-600 w-10 h-10" />
                            <p className="text-slate-400 font-bold tracking-widest uppercase text-xs">Syncing Database...</p>
                        </div>
                    ) : filteredProducts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200">
                            <Package className="text-slate-200 w-20 h-20 mb-4" />
                            <p className="text-slate-400 font-black uppercase tracking-[0.2em]">No products found in {activeFilter}</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {filteredProducts.map(product => (
                                <div key={product.id} className="group bg-white rounded-[2.5rem] p-6 shadow-sm border border-slate-100 hover:shadow-xl hover:shadow-indigo-600/5 transition-all duration-300 relative overflow-hidden flex flex-col">
                                    {/* Badge */}
                                    <div className="absolute top-6 left-6 z-10">
                                        <div className="bg-indigo-600/90 text-white px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest backdrop-blur-md shadow-lg">
                                            {product.category || activeFilter}
                                        </div>
                                    </div>

                                    {/* Image Section */}
                                    <div className="aspect-[16/10] bg-slate-50 rounded-[2rem] overflow-hidden mb-6 relative">
                                        {product.imageUrl ? (
                                            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-slate-200">
                                                <Package size={48} />
                                            </div>
                                        )}
                                        {/* Action Overlays */}
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 backdrop-blur-[2px]">
                                            <button
                                                onClick={() => openEditModal(product)}
                                                className="w-12 h-12 bg-white text-indigo-600 rounded-2xl flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all transform hover:-translate-y-1 shadow-2xl"
                                            >
                                                <Edit2 size={20} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(product.id)}
                                                className="w-12 h-12 bg-white text-rose-600 rounded-2xl flex items-center justify-center hover:bg-rose-600 hover:text-white transition-all transform hover:-translate-y-1 shadow-2xl"
                                            >
                                                <Trash2 size={20} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1">
                                        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-4">{product.name}</h3>

                                        <div className="grid grid-cols-2 gap-4 mb-6">
                                            <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100/50">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Price</p>
                                                <p className="text-lg font-black text-slate-900">{product.price?.toLocaleString()} ETB</p>
                                            </div>
                                            <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100/50">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Daily Income</p>
                                                <p className="text-lg font-black text-indigo-600">{product.dailyIncome?.toLocaleString()} ETB</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between pt-6 border-t border-slate-100">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center">
                                                    <Clock size={16} className="text-indigo-600" />
                                                </div>
                                                <div>
                                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Cycle</p>
                                                    <p className="text-sm font-black text-slate-700">{product.contractPeriod} Days</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center">
                                                    <TrendingUp size={16} className="text-emerald-600" />
                                                </div>
                                                <div>
                                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Daily Rate</p>
                                                    <p className="text-sm font-black text-emerald-600">{product.dailyRate}%</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {/* Modal - Create/Edit */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[3rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
                        {/* Modal Header */}
                        <div className="px-10 py-8 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
                            <div>
                                <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-4">
                                    {modalMode === "create" ? "Add New Plan" : "Edit Investment Plan"}
                                    <div className="w-2.5 h-2.5 bg-indigo-600 rounded-full animate-pulse"></div>
                                </h2>
                                <p className="text-slate-500 font-medium text-sm mt-1">
                                    {modalMode === "create" ? "Configure the new financial instrument." : "Update existing plan parameters."}
                                </p>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="w-12 h-12 rounded-2xl bg-white border border-slate-200 text-slate-400 hover:text-slate-900 hover:bg-slate-50 transition-all flex items-center justify-center active:scale-95 shadow-sm"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto p-10 space-y-10 no-scrollbar">
                            <form onSubmit={handleSubmit} className="space-y-10">
                                {/* Basic Info Section */}
                                <div className="space-y-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-1 h-6 bg-indigo-600 rounded-full"></div>
                                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">Fundamental Data</h3>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-700 uppercase tracking-widest px-1">Product Name</label>
                                            <input
                                                type="text"
                                                name="name"
                                                required
                                                value={formData.name}
                                                onChange={handleInputChange}
                                                placeholder="e.g. SILVER VENTURE"
                                                className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-600/20 focus:bg-white outline-none transition-all font-bold text-lg placeholder:text-slate-300"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-700 uppercase tracking-widest px-1">Category Level</label>
                                            <select
                                                name="category"
                                                value={formData.category}
                                                onChange={handleInputChange}
                                                className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-600/20 focus:bg-white outline-none transition-all font-bold text-lg appearance-none cursor-pointer"
                                            >
                                                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* Financial Controls */}
                                <div className="space-y-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-1 h-6 bg-emerald-500 rounded-full"></div>
                                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">Financial Engineering</h3>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-700 uppercase tracking-widest px-1">Entry Price (ETB)</label>
                                            <input
                                                type="number"
                                                name="price"
                                                required
                                                value={formData.price}
                                                onChange={handleInputChange}
                                                className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-600/20 focus:bg-white outline-none transition-all font-black text-xl text-indigo-600"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-700 uppercase tracking-widest px-1">Daily Income (ETB)</label>
                                            <input
                                                type="number"
                                                name="dailyIncome"
                                                required
                                                value={formData.dailyIncome}
                                                onChange={handleInputChange}
                                                className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-600/20 focus:bg-white outline-none transition-all font-black text-xl text-emerald-600"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-700 uppercase tracking-widest px-1">Cycle (Days)</label>
                                            <input
                                                type="number"
                                                name="contractPeriod"
                                                required
                                                value={formData.contractPeriod}
                                                onChange={handleInputChange}
                                                className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-600/20 focus:bg-white outline-none transition-all font-black text-xl text-slate-900"
                                            />
                                        </div>
                                    </div>

                                    {/* Real-time Calculations Box */}
                                    <div className="bg-indigo-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden group">
                                        {/* Background pattern */}
                                        <div className="absolute inset-0 opacity-10 group-hover:opacity-15 transition-opacity">
                                            <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -mr-32 -mt-32 blur-3xl"></div>
                                            <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-400 rounded-full -ml-32 -mb-32 blur-3xl"></div>
                                        </div>

                                        <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-8">
                                            <div className="flex flex-col items-center border-r border-white/10 last:border-0 pr-4">
                                                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center mb-3">
                                                    <TrendingUp size={20} className="text-indigo-300" />
                                                </div>
                                                <p className="text-[10px] font-black text-indigo-300 uppercase tracking-[0.2em] mb-1">Daily Rate</p>
                                                <p className="text-2xl font-black">{dailyRate.toFixed(2)}%</p>
                                            </div>
                                            <div className="flex flex-col items-center border-r border-white/10 last:border-0 pr-4">
                                                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center mb-3">
                                                    <DollarSign size={20} className="text-indigo-300" />
                                                </div>
                                                <p className="text-[10px] font-black text-indigo-300 uppercase tracking-[0.2em] mb-1">Total Profit</p>
                                                <p className="text-2xl font-black text-emerald-400">{totalProfit.toLocaleString()} <span className="text-xs opacity-60">ETB</span></p>
                                            </div>
                                            <div className="flex flex-col items-center last:border-0">
                                                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center mb-3">
                                                    <ShieldCheck size={20} className="text-indigo-300" />
                                                </div>
                                                <p className="text-[10px] font-black text-indigo-300 uppercase tracking-[0.2em] mb-1">Prinicpal+Income</p>
                                                <p className="text-2xl font-black">{principalIncome.toLocaleString()} <span className="text-xs opacity-60">ETB</span></p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Limits & Description */}
                                <div className="space-y-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-1 h-6 bg-amber-500 rounded-full"></div>
                                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">Operational Bounds</h3>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-700 uppercase tracking-widest px-1">Purchase Quantity Limit</label>
                                            <input
                                                type="number"
                                                name="purchaseLimit"
                                                required
                                                min={1}
                                                value={formData.purchaseLimit}
                                                onChange={handleInputChange}
                                                className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-600/20 focus:bg-white outline-none transition-all font-bold text-lg"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-700 uppercase tracking-widest px-1">Sales Tracked (%)</label>
                                            <input
                                                type="number"
                                                name="salesTracked"
                                                required
                                                min={0}
                                                max={100}
                                                value={formData.salesTracked}
                                                onChange={handleInputChange}
                                                placeholder="0-100"
                                                className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-600/20 focus:bg-white outline-none transition-all font-bold text-lg"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-8">
                                        <div className="space-y-4">
                                            <label className="text-xs font-bold text-slate-700 uppercase tracking-widest px-1">Visual Representation</label>
                                            <div className="flex items-center gap-4">
                                                <div className="relative group/upload w-full">
                                                    <input
                                                        type="file"
                                                        onChange={handleImageUpload}
                                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                        accept="image/*"
                                                    />
                                                    <div className={`w-full px-6 py-4 rounded-2xl border-2 border-dashed flex items-center justify-center gap-3 transition-all ${isUploading
                                                        ? "bg-slate-50 border-slate-200"
                                                        : "bg-white border-slate-200 group-hover/upload:border-indigo-600 group-hover/upload:bg-indigo-50/50"
                                                        }`}>
                                                        {isUploading ? (
                                                            <Loader2 size={24} className="animate-spin text-indigo-600" />
                                                        ) : (
                                                            <UploadCloud size={24} className="text-slate-400 group-hover/upload:text-indigo-600" />
                                                        )}
                                                        <span className={`text-sm font-bold ${isUploading ? "text-indigo-600" : "text-slate-500"}`}>
                                                            {uploadStatus || "Select Product Image"}
                                                        </span>
                                                    </div>
                                                </div>
                                                {formData.imageUrl && (
                                                    <div className="w-16 h-16 rounded-2xl overflow-hidden border border-slate-200 bg-white shrink-0 shadow-sm p-1">
                                                        <img src={formData.imageUrl} className="w-full h-full object-cover rounded-xl" />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>


                                </div>
                                <button type="submit" className="hidden">Submit</button>
                            </form>
                        </div>

                        {/* Modal Footer */}
                        <div className="px-10 py-8 border-t border-slate-100 bg-white shrink-0 flex items-center justify-between">
                            <div className="hidden md:block">
                                {statusMsg && (
                                    <div className={`flex items-center gap-2 font-bold text-sm ${statusMsg.type === 'success' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                        {statusMsg.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                                        {statusMsg.text}
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center gap-4 w-full md:w-auto">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 md:flex-none px-8 py-4 rounded-2xl font-bold text-slate-500 hover:text-slate-900 transition-colors"
                                >
                                    Discard Changes
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={isSubmitting || isUploading}
                                    className={`flex-1 md:flex-none px-12 py-4 rounded-2xl font-black text-white shadow-xl flex items-center justify-center gap-3 transition-all active:scale-95 ${isSubmitting || isUploading
                                        ? "bg-slate-400 shadow-none cursor-not-allowed"
                                        : "bg-indigo-600 shadow-indigo-600/20 hover:bg-indigo-700"
                                        }`}
                                >
                                    {isSubmitting ? (
                                        <Loader2 size={24} className="animate-spin" />
                                    ) : (
                                        <>
                                            <CheckCircle2 size={20} />
                                            {modalMode === "create" ? "COMMIT PRODUCT" : "CONFIRM UPDATE"}
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
