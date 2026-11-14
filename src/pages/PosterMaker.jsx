import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import html2canvas from 'html2canvas';
import {
  Trophy,
  ArrowLeft,
  Upload,
  Download,
  CheckCircle2,
  ShieldCheck,
  Sliders,
  Building2,
  Loader2,
  Trash2,
  Eye,
  Camera,
} from 'lucide-react';

const CATEGORIES = [
  { id: 'ALL', labelEn: 'All Categories', labelMl: 'എല്ലാം' },
  { id: 'KIDS', labelEn: 'Kids', labelMl: 'കിഡ്സ്' },
  { id: 'CHILDREN', labelEn: 'Children', labelMl: 'ചിൽഡ്രൻ' },
  { id: 'SUB JUNIOR', labelEn: 'Sub Junior', labelMl: 'സബ് ജൂനിയർ' },
  { id: 'JUNIOR', labelEn: 'Junior', labelMl: 'ജൂനിയർ' },
  { id: 'TEENS', labelEn: 'Teens', labelMl: 'ടീൻസ്' },
];

export default function PosterMaker() {
  // 1. Data States
  const [publishedItems, setPublishedItems] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedItemCode, setSelectedItemCode] = useState('');
  const [isLoadingItems, setIsLoadingItems] = useState(true);

  // 2. Winners list for selected item
  const [winners, setWinners] = useState([]);
  const [selectedWinnerRegNo, setSelectedWinnerRegNo] = useState('');
  const [isLoadingWinners, setIsLoadingWinners] = useState(false);

  // 3. Poster Customization Data
  const [posterData, setPosterData] = useState({
    winnerName: '',
    madrasa: '',
    category: '',
    itemNameMl: '',
    itemNameEn: '',
    rank: null,
    grade: '',
  });

  // 4. Local Photo State (Strict Privacy: FileReader local Data URL only)
  const [userPhoto, setUserPhoto] = useState(null);
  const [photoScale, setPhotoScale] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  // Ref to the hidden 1080x1080 square poster DOM element for html2canvas
  const hiddenPosterRef = useRef(null);

  // Fetch Published Items on Mount
  useEffect(() => {
    async function fetchPublishedItems() {
      setIsLoadingItems(true);
      try {
        const { data, error } = await supabase
          .from('items')
          .select('code, name_ml, name_en, category, mode, is_published')
          .eq('is_published', true)
          .order('code', { ascending: true });

        if (error) throw error;
        const items = data || [];
        setPublishedItems(items);

        if (items.length > 0) {
          setSelectedItemCode(String(items[0].code));
        }
      } catch (err) {
        console.error('Error fetching published items for poster:', err);
      } finally {
        setIsLoadingItems(false);
      }
    }

    fetchPublishedItems();
  }, []);

  // Filter items by category
  const filteredItems = useMemo(() => {
    if (selectedCategory === 'ALL') return publishedItems;
    return publishedItems.filter((i) => i.category === selectedCategory);
  }, [publishedItems, selectedCategory]);

  // Selected Item Object
  const currentItem = useMemo(() => {
    return publishedItems.find((i) => String(i.code) === String(selectedItemCode)) || null;
  }, [publishedItems, selectedItemCode]);

  // Fetch Winners when Item changes
  useEffect(() => {
    if (!selectedItemCode) {
      setWinners([]);
      setSelectedWinnerRegNo('');
      return;
    }

    async function fetchItemWinners() {
      setIsLoadingWinners(true);
      try {
        // Query participations strictly respecting public privacy:
        // ONLY rank, grade, points, reg_no
        const { data: partData, error: partErr } = await supabase
          .from('participations')
          .select('reg_no, rank, grade, points')
          .eq('item_code', selectedItemCode);

        if (partErr) throw partErr;

        // Filter only winners (Rank or Grade)
        const qualified = (partData || []).filter((p) => p.rank || p.grade);

        if (qualified.length === 0) {
          setWinners([]);
          setSelectedWinnerRegNo('');
          setIsLoadingWinners(false);
          return;
        }

        // Fetch participant names and Madrasa (stored in 'unit' column)
        const regNos = qualified.map((p) => p.reg_no);
        const { data: pData, error: pErr } = await supabase
          .from('participants')
          .select('reg_no, name, unit')
          .in('reg_no', regNos);

        if (pErr) throw pErr;

        const pMap = new Map();
        (pData || []).forEach((p) => pMap.set(String(p.reg_no), p));

        const merged = qualified.map((pt) => {
          const profile = pMap.get(String(pt.reg_no)) || {};
          return {
            reg_no: pt.reg_no,
            rank: pt.rank ? parseInt(pt.rank, 10) : null,
            grade: pt.grade || null,
            points: pt.points ? parseInt(pt.points, 10) : 0,
            name: profile.name || `Participant #${pt.reg_no}`,
            madrasa: profile.unit || '—', // Mapped to clean unit short-name
          };
        });

        // Sort: Rank 1, 2, 3 first, then Graded (A, B, C)
        merged.sort((a, b) => {
          if (a.rank && b.rank) return a.rank - b.rank;
          if (a.rank && !b.rank) return -1;
          if (!a.rank && b.rank) return 1;
          const gradeOrder = { A: 1, B: 2, C: 3 };
          const gA = gradeOrder[a.grade] || 99;
          const gB = gradeOrder[b.grade] || 99;
          if (gA !== gB) return gA - gB;
          return parseInt(a.reg_no, 10) - parseInt(b.reg_no, 10);
        });

        setWinners(merged);

        if (merged.length > 0) {
          setSelectedWinnerRegNo(String(merged[0].reg_no));
        } else {
          setSelectedWinnerRegNo('');
        }
      } catch (err) {
        console.error('Error fetching winners for poster:', err);
      } finally {
        setIsLoadingWinners(false);
      }
    }

    fetchItemWinners();
  }, [selectedItemCode]);

  // Sync Poster Data whenever selected winner changes
  useEffect(() => {
    if (!selectedWinnerRegNo || winners.length === 0) return;
    const winner = winners.find((w) => String(w.reg_no) === String(selectedWinnerRegNo));
    if (!winner) return;

    setPosterData({
      winnerName: winner.name,
      madrasa: winner.madrasa,
      category: currentItem?.category || '',
      itemNameMl: currentItem?.name_ml || '',
      itemNameEn: currentItem?.name_en || '',
      rank: winner.rank,
      grade: winner.grade,
    });
  }, [selectedWinnerRegNo, winners, currentItem]);

  // Handle Local Photo Upload via FileReader (No database upload)
  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (PNG, JPG, JPEG, WEBP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setUserPhoto(event.target?.result);
    };
    reader.readAsDataURL(file);

    // Reset input value so memory is freed and same file can be re-selected
    e.target.value = '';
  };

  // Download High-Res Congrats Poster (Strict 1080x1080 1:1 Square Canvas)
  const handleDownloadPoster = async () => {
    if (!hiddenPosterRef.current || isGenerating) return;
    setIsGenerating(true);
    setDownloadSuccess(false);

    try {
      const element = hiddenPosterRef.current;

      // Ensure all images inside are loaded
      const images = element.getElementsByTagName('img');
      await Promise.all(
        Array.from(images).map((img) => {
          if (img.complete) return Promise.resolve();
          return new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
          });
        })
      );

      // Render hidden 1080x1080 canvas with scale: 2 for ultra-crisp output
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#0F172A',
        width: 1080,
        height: 1080,
        windowWidth: 1080,
        windowHeight: 1080,
        scrollX: 0,
        scrollY: 0,
      });

      const imgData = canvas.toDataURL('image/png', 1.0);
      const link = document.createElement('a');
      const cleanWinnerName = (posterData.winnerName || 'Winner')
        .trim()
        .replace(/[^a-zA-Z0-9_\u0D00-\u0D7F-]/g, '_');
      link.download = `${cleanWinnerName}_Congrats_Poster.png`;
      link.href = imgData;
      link.click();

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 4000);
    } catch (err) {
      console.error('Error generating poster:', err);
      alert('Failed to generate poster. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Helper for Rank Badge
  const getRankBadge = (rank) => {
    if (rank === 1) return { text: '🥇 FIRST PLACE', bg: '#FBBF24', textColor: '#020617' };
    if (rank === 2) return { text: '🥈 SECOND PLACE', bg: '#E2E8F0', textColor: '#0F172A' };
    if (rank === 3) return { text: '🥉 THIRD PLACE', bg: '#F97316', textColor: '#FFFFFF' };
    return null;
  };

  const rankBadgeInfo = getRankBadge(posterData.rank);
  const nameLength = (posterData.winnerName || '').trim().length;
  const nameFontSize = nameLength > 22 ? '42px' : '54px';

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans">
      {/* 1. Header Bar */}
      <header className="bg-[#1B254B] text-white py-3.5 px-4 shadow-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-all border border-white/10"
              title="Return to Main Results Portal"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Results</span>
            </Link>

            <div className="hidden sm:flex items-center gap-2 border-l border-white/15 pl-3">
              <span className="p-1 rounded-lg bg-amber-400/20 text-amber-300">
                <Trophy className="w-4 h-4" />
              </span>
              <h1 className="text-sm sm:text-base font-bold tracking-tight">
                Winner Poster Toolkit
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden md:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-500/30">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>100% Client-Side Privacy</span>
            </div>

            <img
              src="/logo.png"
              alt="Sargolsav Logo"
              className="h-8 w-auto object-contain bg-white rounded-lg p-0.5"
            />
          </div>
        </div>
      </header>

      {/* 2. Privacy Alert Banner */}
      <div className="bg-emerald-50/90 border-b border-emerald-200 px-4 py-2.5 text-center text-xs text-emerald-900 font-medium flex items-center justify-center gap-2">
        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
        <span>
          <strong>Privacy-First Workflow:</strong> All photo processing and poster generation happen locally in your browser. Your photos are never saved to our database.
        </span>
      </div>

      {/* 3. Main Workspace */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT COLUMN: Controls & Step-by-Step Selection (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Step 1: Select Category & Item */}
            <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <span className="w-6 h-6 rounded-full bg-[#1B254B] text-white flex items-center justify-center text-xs font-bold font-mono">
                  1
                </span>
                <h3 className="font-bold text-base text-[#1B254B]">
                  Choose Competition & Category
                </h3>
              </div>

              {/* Category Pills */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Filter Category
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setSelectedCategory(cat.id);
                        const list =
                          cat.id === 'ALL'
                            ? publishedItems
                            : publishedItems.filter((i) => i.category === cat.id);
                        if (list.length > 0) {
                          setSelectedItemCode(String(list[0].code));
                        }
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        selectedCategory === cat.id
                          ? 'bg-[#F26430] text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {cat.labelEn}
                    </button>
                  ))}
                </div>
              </div>

              {/* Item Dropdown */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Select Published Item ({filteredItems.length})
                </label>
                {isLoadingItems ? (
                  <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl text-xs text-slate-400">
                    <Loader2 className="w-4 h-4 animate-spin text-[#F26430]" />
                    <span>Loading published items...</span>
                  </div>
                ) : filteredItems.length === 0 ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                    No items published for this category yet.
                  </div>
                ) : (
                  <select
                    value={selectedItemCode}
                    onChange={(e) => setSelectedItemCode(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-semibold text-[#1B254B] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#F26430] cursor-pointer"
                  >
                    {filteredItems.map((item) => (
                      <option key={item.code} value={item.code}>
                        #{item.code} - {item.name_ml} ({item.name_en}) [{item.category}]
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* Step 2: Select Published Winner */}
            <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-[#1B254B] text-white flex items-center justify-center text-xs font-bold font-mono">
                    2
                  </span>
                  <h3 className="font-bold text-base text-[#1B254B]">
                    Select Winner
                  </h3>
                </div>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-orange-100 text-[#F26430]">
                  {winners.length} Awardees
                </span>
              </div>

              {isLoadingWinners ? (
                <div className="py-6 text-center text-xs text-slate-400 space-y-2">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto text-[#F26430]" />
                  <p>Fetching official winners...</p>
                </div>
              ) : winners.length === 0 ? (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-500 text-center">
                  No published awardees or graded participants found for this item yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-64 overflow-y-auto pr-1">
                  {winners.map((w) => {
                    const isSelected = String(w.reg_no) === String(selectedWinnerRegNo);
                    return (
                      <button
                        key={w.reg_no}
                        type="button"
                        onClick={() => setSelectedWinnerRegNo(String(w.reg_no))}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 ${
                          isSelected
                            ? 'bg-amber-50/80 border-amber-400 shadow-sm'
                            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            {w.rank === 1 ? (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-black bg-amber-400 text-amber-950">
                                🥇 1st
                              </span>
                            ) : w.rank === 2 ? (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-black bg-slate-300 text-slate-800">
                                🥈 2nd
                              </span>
                            ) : w.rank === 3 ? (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-black bg-orange-500 text-white">
                                🥉 3rd
                              </span>
                            ) : null}

                            {w.grade && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                Grade {w.grade}
                              </span>
                            )}
                          </div>
                          <p className="font-bold text-xs text-[#1B254B] truncate">{w.name}</p>
                          <p className="text-[11px] text-slate-500 truncate">Madrasa: {w.madrasa}</p>
                        </div>

                        {isSelected && <CheckCircle2 className="w-4 h-4 text-[#F26430] shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Step 3: Photo Upload & Poster Details */}
            <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <span className="w-6 h-6 rounded-full bg-[#1B254B] text-white flex items-center justify-center text-xs font-bold font-mono">
                  3
                </span>
                <h3 className="font-bold text-base text-[#1B254B]">
                  Upload Photo & Customize Poster
                </h3>
              </div>

              {/* Photo Input Box */}
              <div className="p-4 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/60 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-xs flex items-center justify-center shrink-0">
                    {userPhoto ? (
                      <img src={userPhoto} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <Camera className="w-6 h-6 text-slate-400" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-[#1B254B]">
                      {userPhoto ? 'Photo Loaded (Kept In Browser Only)' : 'Participant Photo (Optional)'}
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Square or portrait photo recommended. Stays strictly inside your browser.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <label className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#F26430] hover:bg-[#d94e1c] text-white transition-all shadow-xs cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{userPhoto ? 'Change Photo' : '➕ Upload Photo'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>

                  {userPhoto && (
                    <button
                      type="button"
                      onClick={() => setUserPhoto(null)}
                      className="p-2 text-slate-400 hover:text-red-500 rounded-xl hover:bg-red-50 transition-colors"
                      title="Remove Photo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Photo Zoom Slider if photo is present */}
              {userPhoto && (
                <div className="flex items-center gap-3 px-3 py-2 bg-slate-50 rounded-xl text-xs font-semibold text-slate-600">
                  <Sliders className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>Photo Framing Zoom:</span>
                  <input
                    type="range"
                    min="1"
                    max="1.8"
                    step="0.05"
                    value={photoScale}
                    onChange={(e) => setPhotoScale(parseFloat(e.target.value))}
                    className="flex-1 accent-[#F26430] cursor-pointer"
                  />
                  <span className="font-mono text-[11px] text-slate-400">
                    {Math.round(photoScale * 100)}%
                  </span>
                </div>
              )}

              {/* Editable Poster Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase">
                    Winner Name
                  </label>
                  <input
                    type="text"
                    value={posterData.winnerName}
                    onChange={(e) => setPosterData({ ...posterData, winnerName: e.target.value })}
                    className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-[#1B254B] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#F26430]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase">
                    Madrasa (Short Name)
                  </label>
                  <input
                    type="text"
                    value={posterData.madrasa}
                    onChange={(e) => setPosterData({ ...posterData, madrasa: e.target.value })}
                    className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-[#1B254B] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#F26430]"
                  />
                </div>
              </div>
            </div>

            {/* Step 4: Big Action Download Button */}
            <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h4 className="font-bold text-sm text-[#1B254B]">
                  Ready to Celebrate?
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Downloads high-definition 1:1 square poster (1080×1080) for WhatsApp status & Instagram.
                </p>
              </div>

              <button
                type="button"
                onClick={handleDownloadPoster}
                disabled={isGenerating || !posterData.winnerName}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3 rounded-2xl text-sm font-extrabold bg-[#16A34A] hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20 hover:scale-102 active:scale-98 transition-all cursor-pointer disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Rendering 1080×1080 Poster...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>💾 Download Congrats Poster</span>
                  </>
                )}
              </button>
            </div>

            {downloadSuccess && (
              <div className="p-3 bg-emerald-100 border border-emerald-300 text-emerald-900 rounded-2xl text-xs font-bold text-center animate-in fade-in">
                🎉 Poster downloaded successfully! Share it on WhatsApp status!
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Live 1:1 Square Poster Preview (5 cols) */}
          <div className="lg:col-span-5 flex flex-col items-center">
            <div className="w-full max-w-[420px] sticky top-20 space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-[#F26430]" />
                  Live Preview (1:1 Square)
                </span>
                <span className="text-[10px] font-mono text-slate-400">1080 × 1080 px</span>
              </div>

              {/* Scaled Responsive 1:1 Square Preview Canvas */}
              <div
                style={{
                  background: 'radial-gradient(circle at 50% 25%, #1E1B4B 0%, #0F172A 70%, #090D16 100%)',
                }}
                className="w-full aspect-square rounded-3xl overflow-hidden shadow-2xl border-4 border-slate-800 relative flex flex-col justify-between p-4 sm:p-5 text-white select-none box-border"
              >
                {/* Decorative gold corner accents */}
                <div className="absolute top-2.5 left-2.5 w-5 h-5 border-t-2 border-l-2 border-amber-400 rounded-tl-lg pointer-events-none opacity-80" />
                <div className="absolute top-2.5 right-2.5 w-5 h-5 border-t-2 border-r-2 border-amber-400 rounded-tr-lg pointer-events-none opacity-80" />
                <div className="absolute bottom-2.5 left-2.5 w-5 h-5 border-b-2 border-l-2 border-amber-400 rounded-bl-lg pointer-events-none opacity-80" />
                <div className="absolute bottom-2.5 right-2.5 w-5 h-5 border-b-2 border-r-2 border-amber-400 rounded-br-lg pointer-events-none opacity-80" />

                {/* 1. Top Header Card */}
                <div className="relative z-10 flex flex-col items-center text-center">
                  <div className="bg-white px-3.5 py-1.5 rounded-xl shadow-md flex items-center gap-2.5">
                    <img src="/logo.png" alt="Sargolsav Logo" className="h-7 w-auto object-contain" />
                    <div className="text-left">
                      <h2 className="text-xs sm:text-sm font-black tracking-tight text-[#1B254B] leading-none">
                        SARGOLSAV 2026
                      </h2>
                      <span className="text-[8px] sm:text-[9px] font-extrabold text-[#EA580C] uppercase tracking-wider block mt-0.5">
                        NILAMBUR SUB-DISTRICT
                      </span>
                    </div>
                  </div>
                  <p className="text-[8px] sm:text-[9px] font-bold text-[#FDE68A] uppercase tracking-widest mt-1">
                    MSM-CIER KERALA • AMAL COLLEGE, MYLADI
                  </p>
                </div>

                {/* 2. Celebration Heading */}
                <div className="relative z-10 text-center my-0.5">
                  <h3
                    style={{ color: '#FBBF24' }}
                    className="text-base sm:text-lg font-black tracking-wide uppercase leading-tight"
                  >
                    🏆 CONGRATULATIONS!
                  </h3>
                  <p
                    style={{ color: '#FFFFFF' }}
                    className="font-ml text-xs sm:text-sm font-bold leading-normal mt-0.5"
                  >
                    അഭിനന്ദനങ്ങൾ!
                  </p>
                </div>

                {/* 3. Center Photo Frame */}
                <div className="relative z-10 flex justify-center my-1">
                  <div
                    style={{
                      width: '115px',
                      height: '115px',
                      borderRadius: '20px',
                      border: '3px solid #FBBF24',
                      boxShadow: '0 0 20px rgba(251, 191, 36, 0.35)',
                    }}
                    className="overflow-hidden bg-slate-900 flex items-center justify-center shrink-0"
                  >
                    {userPhoto ? (
                      <img
                        src={userPhoto}
                        alt="Winner"
                        className="w-full h-full object-cover object-center"
                        style={{ transform: `scale(${photoScale})` }}
                      />
                    ) : (
                      <div className="text-center p-2 text-slate-500 space-y-1">
                        <Camera className="w-6 h-6 mx-auto text-slate-600" />
                        <span className="text-[8px] font-semibold block leading-tight text-slate-400">
                          Upload Photo
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 4. Winner Name & Madrasa */}
                <div className="relative z-10 text-center space-y-1 my-0.5">
                  <h4
                    style={{ color: '#FFFFFF', lineHeight: 1.15 }}
                    className="font-ml text-sm sm:text-base font-black uppercase px-2"
                  >
                    {posterData.winnerName || 'Winner Name'}
                  </h4>

                  {posterData.madrasa && (
                    <div
                      style={{
                        backgroundColor: 'rgba(30, 41, 59, 0.95)',
                        border: '1.5px solid #475569',
                      }}
                      className="inline-flex items-center justify-center gap-1 px-3.5 py-1 rounded-full"
                    >
                      <Building2 className="w-2.5 h-2.5 text-amber-300" />
                      <span className="text-[9px] sm:text-[10px] font-bold text-[#F8FAFC]">
                        🕌 MADRASA: {posterData.madrasa}
                      </span>
                    </div>
                  )}
                </div>

                {/* 5. Rank & Grade Badges */}
                <div className="relative z-10 flex items-center justify-center gap-2 my-1">
                  {rankBadgeInfo && (
                    <div
                      style={{
                        backgroundColor: rankBadgeInfo.bg,
                        color: rankBadgeInfo.textColor,
                      }}
                      className="px-3 py-1 rounded-xl text-[9px] sm:text-[10px] font-black uppercase flex items-center justify-center shadow-sm"
                    >
                      {rankBadgeInfo.text}
                    </div>
                  )}

                  {posterData.grade && (
                    <div
                      style={{
                        backgroundColor: '#10B981',
                        color: '#FFFFFF',
                      }}
                      className="px-3 py-1 rounded-xl text-[9px] sm:text-[10px] font-black uppercase flex items-center justify-center shadow-sm"
                    >
                      ⭐ GRADE {posterData.grade}
                    </div>
                  )}
                </div>

                {/* 6. Bottom Competition Item Card */}
                <div
                  style={{
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    border: '1px solid #334155',
                  }}
                  className="relative z-10 w-full rounded-xl py-2 px-3 text-center flex flex-col items-center justify-center"
                >
                  <p
                    style={{ color: '#FB923C' }}
                    className="text-[8px] sm:text-[9px] font-black uppercase leading-tight"
                  >
                    {posterData.category || 'CATEGORY'} • ITEM #{selectedItemCode || '—'}
                  </p>
                  <p
                    style={{ color: '#FFFFFF', lineHeight: 1.35 }}
                    className="font-ml text-[10px] sm:text-[11px] font-bold mt-0.5 truncate max-w-full"
                  >
                    {posterData.itemNameMl || 'Competition Item'}
                  </p>
                  {posterData.itemNameEn && (
                    <p
                      style={{ color: '#CBD5E1', lineHeight: 1.25 }}
                      className="text-[8px] sm:text-[9px] font-medium truncate max-w-full"
                    >
                      {posterData.itemNameEn}
                    </p>
                  )}
                </div>
              </div>

              {/* Action Hint */}
              <p className="text-[11px] text-slate-400 text-center">
                Tap <strong>Download Congrats Poster</strong> on the left to export high-definition 1:1 image.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* 4. Strict 1080px × 1080px 1:1 Square Hidden Poster Canvas for html2canvas */}
      <div
        ref={hiddenPosterRef}
        style={{
          position: 'fixed',
          left: '-9999px',
          top: '0',
          width: '1080px',
          height: '1080px',
          zIndex: -9999,
          pointerEvents: 'none',
          background: 'radial-gradient(circle at 50% 25%, #1E1B4B 0%, #0F172A 70%, #090D16 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '44px 48px',
          boxSizing: 'border-box',
          overflow: 'visible',
        }}
        className="font-sans select-none text-white"
      >
        {/* Subtle Decorative Gold Corner Accents */}
        <div
          style={{
            position: 'absolute',
            top: '20px',
            left: '20px',
            width: '40px',
            height: '40px',
            borderTop: '4px solid #FBBF24',
            borderLeft: '4px solid #FBBF24',
            borderTopLeftRadius: '14px',
            pointerEvents: 'none',
            opacity: 0.85,
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            width: '40px',
            height: '40px',
            borderTop: '4px solid #FBBF24',
            borderRight: '4px solid #FBBF24',
            borderTopRightRadius: '14px',
            pointerEvents: 'none',
            opacity: 0.85,
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '20px',
            left: '20px',
            width: '40px',
            height: '40px',
            borderBottom: '4px solid #FBBF24',
            borderLeft: '4px solid #FBBF24',
            borderBottomLeftRadius: '14px',
            pointerEvents: 'none',
            opacity: 0.85,
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '20px',
            right: '20px',
            width: '40px',
            height: '40px',
            borderBottom: '4px solid #FBBF24',
            borderRight: '4px solid #FBBF24',
            borderBottomRightRadius: '14px',
            pointerEvents: 'none',
            opacity: 0.85,
          }}
        />

        {/* SECTION 1: Top Header & Branding (Largest Event Identity) */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            width: '100%',
          }}
        >
          {/* Prominent White Rounded Card */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              padding: '12px 36px',
              borderRadius: '20px',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.4)',
              display: 'flex',
              alignItems: 'center',
              gap: '20px',
            }}
          >
            <img
              src="/logo.png"
              alt="Sargolsav Logo"
              style={{
                height: '75px',
                width: 'auto',
                objectFit: 'contain',
              }}
            />
            <div style={{ textAlign: 'left' }}>
              <div
                style={{
                  fontSize: '44px',
                  fontWeight: 900,
                  color: '#1B254B',
                  lineHeight: '1',
                  letterSpacing: '0.02em',
                }}
              >
                SARGOLSAV 2026
              </div>
              <div
                style={{
                  fontSize: '20px',
                  fontWeight: 800,
                  color: '#EA580C',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  lineHeight: '1.2',
                  marginTop: '4px',
                }}
              >
                NILAMBUR SUB-DISTRICT
              </div>
            </div>
          </div>

          {/* Subtitle text directly below white card */}
          <div
            style={{
              fontSize: '18px',
              fontWeight: 700,
              color: '#FDE68A',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              marginTop: '10px',
              lineHeight: '1.2',
            }}
          >
            MSM-CIER KERALA • AMAL COLLEGE, MYLADI
          </div>
        </div>

        {/* SECTION 2: Celebration Heading */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            width: '100%',
            marginTop: '4px',
          }}
        >
          <div
            style={{
              fontSize: '52px',
              fontWeight: 900,
              color: '#FBBF24', // Solid bright gold, NO bg-clip-text!
              lineHeight: '1.15',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            🏆 CONGRATULATIONS!
          </div>
          <div
            style={{
              fontSize: '36px',
              fontWeight: 700,
              color: '#FFFFFF', // Solid pure white
              lineHeight: '1.3',
              marginTop: '2px',
            }}
            className="font-ml"
          >
            അഭിനന്ദനങ്ങൾ!
          </div>
        </div>

        {/* SECTION 3: Winner Photo Frame (Centerpiece, 310px × 310px) */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            margin: '4px 0',
          }}
        >
          <div
            style={{
              width: '310px',
              height: '310px',
              minWidth: '310px',
              minHeight: '310px',
              borderRadius: '36px',
              border: '6px solid #FBBF24',
              boxShadow: '0 0 35px rgba(251, 191, 36, 0.35)',
              overflow: 'hidden',
              backgroundColor: '#0F172A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
            }}
          >
            {userPhoto ? (
              <img
                src={userPhoto}
                alt="Winner"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: 'center',
                  transform: `scale(${photoScale})`,
                }}
              />
            ) : (
              <div
                style={{
                  textAlign: 'center',
                  color: '#64748B',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <Camera style={{ width: '64px', height: '64px', color: '#475569' }} />
                <span
                  style={{
                    fontSize: '18px',
                    fontWeight: 600,
                    color: '#94A3B8',
                  }}
                >
                  Participant Photo
                </span>
              </div>
            )}
          </div>
        </div>

        {/* SECTION 4: Winner Name & Madrasa */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            width: '100%',
          }}
        >
          {/* Participant Name with auto-shrink if > 22 chars */}
          <div
            style={{
              fontSize: nameFontSize,
              fontWeight: 900,
              color: '#FFFFFF',
              lineHeight: '1.15',
              textTransform: 'uppercase',
              textAlign: 'center',
              maxWidth: '960px',
              padding: '0 16px',
            }}
            className="font-ml"
          >
            {posterData.winnerName || 'Winner Name'}
          </div>

          {/* Madrasa Pill */}
          {posterData.madrasa && (
            <div
              style={{
                backgroundColor: 'rgba(30, 41, 59, 0.95)',
                border: '2px solid #475569',
                borderRadius: '9999px',
                padding: '10px 32px',
                marginTop: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                lineHeight: '1',
              }}
            >
              <span
                style={{
                  fontSize: '24px',
                  fontWeight: 700,
                  color: '#F8FAFC',
                  lineHeight: '1',
                }}
              >
                🕌 MADRASA: {posterData.madrasa}
              </span>
            </div>
          )}
        </div>

        {/* SECTION 5: Rank & Grade Badges (Side-by-Side, Dead-Center Aligned) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '24px',
            margin: '6px 0',
          }}
        >
          {/* If rank is 1, 2, or 3 */}
          {rankBadgeInfo && (
            <div
              style={{
                backgroundColor: rankBadgeInfo.bg,
                color: rankBadgeInfo.textColor,
                borderRadius: '18px',
                padding: '12px 32px',
                fontSize: '30px',
                fontWeight: 900,
                lineHeight: '1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 15px rgba(251, 191, 36, 0.3)',
              }}
            >
              {rankBadgeInfo.text}
            </div>
          )}

          {/* If grade is present */}
          {posterData.grade && (
            <div
              style={{
                backgroundColor: '#10B981',
                color: '#FFFFFF',
                borderRadius: '18px',
                padding: '12px 32px',
                fontSize: '30px',
                fontWeight: 900,
                lineHeight: '1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)',
              }}
            >
              ⭐ GRADE {posterData.grade}
            </div>
          )}
        </div>

        {/* SECTION 6: Bottom Competition Item Banner (Full-Width Highlight Box) */}
        <div
          style={{
            width: '100%',
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid #334155',
            borderRadius: '20px',
            padding: '16px 28px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            boxSizing: 'border-box',
          }}
        >
          {/* Category Badge */}
          <div
            style={{
              fontSize: '22px',
              fontWeight: 900,
              color: '#FB923C',
              textTransform: 'uppercase',
              lineHeight: '1.2',
            }}
          >
            {posterData.category || 'CATEGORY'} • ITEM #{selectedItemCode || '—'}
          </div>

          {/* Malayalam Item Name */}
          <div
            style={{
              fontSize: '36px',
              fontWeight: 700,
              color: '#FFFFFF',
              lineHeight: '1.4',
              marginTop: '4px',
            }}
            className="font-ml"
          >
            {posterData.itemNameMl || 'Competition Item'}
          </div>

          {/* English Item Name */}
          {posterData.itemNameEn && (
            <div
              style={{
                fontSize: '24px',
                fontWeight: 600,
                color: '#CBD5E1',
                lineHeight: '1.3',
                marginTop: '2px',
              }}
            >
              {posterData.itemNameEn}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
