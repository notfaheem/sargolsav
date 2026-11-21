import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { toPng } from 'html-to-image';
import { comparePublishedResults } from '../lib/tabulationEngine';
import { trackPageView, logAnalyticsEvent } from '../lib/analytics';
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

  // Ref to the 1080x1080 square poster DOM element for html-to-image
  const posterRef = useRef(null);

  // Track Poster Maker Page View (once per session)
  useEffect(() => {
    trackPageView('poster');
  }, []);

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
        // Query participations including total_score for accurate ranking
        const { data: partData, error: partErr } = await supabase
          .from('participations')
          .select('reg_no, rank, grade, points, total_score')
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
            total_score: pt.total_score !== null && pt.total_score !== undefined ? Number(pt.total_score) : null,
            name: profile.name || `Participant #${pt.reg_no}`,
            madrasa: profile.unit || '—', // Mapped to clean unit short-name
          };
        });

        // Check for admin custom order for this item
        const savedOrderJson = typeof window !== 'undefined' ? localStorage.getItem(`sargolsav_order_${selectedItemCode}`) : null;
        let orderMap = null;
        if (savedOrderJson) {
          try {
            const parsedOrder = JSON.parse(savedOrderJson);
            orderMap = new Map();
            parsedOrder.forEach((reg, idx) => orderMap.set(String(reg), idx));
          } catch (e) {}
        }

        // Sort: Admin custom order -> Rank (1, 2, 3) -> Total Score descending -> Points descending -> Grade -> Reg No
        merged.sort((a, b) => {
          if (orderMap) {
            const hasA = orderMap.has(String(a.reg_no));
            const hasB = orderMap.has(String(b.reg_no));
            if (hasA && hasB && orderMap.get(String(a.reg_no)) !== orderMap.get(String(b.reg_no))) {
              return orderMap.get(String(a.reg_no)) - orderMap.get(String(b.reg_no));
            }
          }
          return comparePublishedResults(a, b);
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
    if (!posterRef.current || isGenerating) return;
    setIsGenerating(true);
    setDownloadSuccess(false);

    try {
      const element = posterRef.current;

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

      // Render 1080x1080 poster via html-to-image (SVG foreignObject)
      const dataUrl = await toPng(element, {
        pixelRatio: 2,
        cacheBust: true,
      });

      const link = document.createElement('a');
      const cleanWinnerName = (posterData.winnerName || 'Winner')
        .trim()
        .replace(/[^a-zA-Z0-9_\u0D00-\u0D7F-]/g, '_');
      link.download = `${cleanWinnerName}_Congrats_Poster.png`;
      link.href = dataUrl;
      link.click();

      // Silently log celebratory poster download
      logAnalyticsEvent({
        event_type: 'poster_download',
        item_code: currentItem?.code,
        item_name: currentItem?.name_en || currentItem?.name_ml || posterData.itemNameEn,
        category: currentItem?.category || posterData.category,
        madrasa: posterData.madrasa,
        metadata: posterData.winnerName,
      });

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 4000);
    } catch (err) {
      console.error('Error generating poster:', err);
      alert('Failed to generate poster. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Helper for dynamic Ribbon Banner Text
  const getRibbonText = (rank, grade) => {
    const r = rank ? parseInt(rank, 10) : null;
    const g = grade ? String(grade).trim().toUpperCase() : null;

    const rankWords = {
      1: 'FIRST',
      2: 'SECOND',
      3: 'THIRD',
    };

    const rankText = r ? rankWords[r] : null;

    if (rankText && g) {
      return `${rankText} WITH ${g} GRADE`;
    }
    if (rankText && !g) {
      return `${rankText} PLACE`;
    }
    if (!rankText && g) {
      return `GRADE ${g}`;
    }
    return 'CONGRATULATIONS';
  };

  const ribbonText = getRibbonText(posterData.rank, posterData.grade);
  const nameLength = (posterData.winnerName || '').trim().length;
  const nameFontSize = nameLength > 24 ? '52px' : nameLength > 18 ? '62px' : nameLength > 13 ? '72px' : '80px';

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

              {/* Scaled Responsive 1:1 Square Preview Canvas (Light Festive Watercolor Theme) */}
              <div
                style={{
                  backgroundColor: '#FDFBF7',
                }}
                className="w-full aspect-square rounded-3xl overflow-hidden shadow-2xl border-4 border-amber-200/80 relative flex flex-col justify-between p-3.5 sm:p-4 text-slate-900 select-none box-border"
              >
                {/* Watercolor Glows */}
                <div className="absolute -top-10 -left-10 w-44 h-44 bg-cyan-200/50 rounded-full blur-2xl pointer-events-none" />
                <div className="absolute top-0 -right-10 w-40 h-40 bg-yellow-200/50 rounded-full blur-2xl pointer-events-none" />
                <div className="absolute -bottom-10 -right-10 w-44 h-44 bg-blue-200/40 rounded-full blur-2xl pointer-events-none" />
                <div className="absolute -bottom-6 -left-6 w-40 h-40 bg-green-100/50 rounded-full blur-2xl pointer-events-none" />

                {/* Confetti Emojis */}
                <span className="absolute top-2 left-2.5 text-xs opacity-75 pointer-events-none">✨</span>
                <span className="absolute top-2 right-2.5 text-xs opacity-75 pointer-events-none">🎉</span>
                <span className="absolute top-1/2 left-1.5 -translate-y-1/2 text-xs opacity-70 pointer-events-none">⭐</span>
                <span className="absolute top-1/2 right-1.5 -translate-y-1/2 text-xs opacity-70 pointer-events-none">💖</span>
                <span className="absolute bottom-2 left-2.5 text-xs opacity-75 pointer-events-none">🎊</span>
                <span className="absolute bottom-2 right-2.5 text-xs opacity-75 pointer-events-none">⭐</span>

                {/* 1. Top Header */}
                <div className="relative z-10 flex flex-col items-center text-center">
                  <span className="text-[7px] sm:text-[8px] font-black tracking-[0.2em] text-[#1E3A8A] uppercase leading-none">
                    MSM-CIER KERALA
                  </span>
                  <span className="text-[11px] sm:text-xs font-black tracking-widest text-[#0F172A] uppercase leading-tight mt-0.5">
                    NILAMBUR ZONE
                  </span>
                  <img src="/logo.png" alt="Sargolsav Logo" className="h-6 sm:h-7 w-auto object-contain mt-0.5" />
                </div>

                {/* 2. Centerpiece Circular Photo Frame */}
                <div className="relative z-10 flex justify-center my-0.5">
                  <div
                    style={{
                      width: '120px',
                      height: '120px',
                      borderRadius: '9999px',
                      border: '4px solid #FBBF24',
                      boxShadow: '0 10px 25px -5px rgba(251, 191, 36, 0.45)',
                    }}
                    className="w-[120px] h-[120px] rounded-full overflow-hidden bg-amber-100/70 border-[4px] border-amber-400 relative flex items-center justify-center shrink-0"
                  >
                    {userPhoto ? (
                      <img
                        src={userPhoto}
                        alt="Winner"
                        className="w-full h-full object-cover object-center absolute inset-0"
                        style={{ transform: photoScale !== 1 ? `scale(${photoScale})` : undefined }}
                      />
                    ) : (
                      <div className="text-center p-2 text-amber-700/60 space-y-0.5">
                        <Camera className="w-6 h-6 mx-auto text-amber-600" />
                        <span className="text-[8px] font-bold block leading-tight text-amber-800">
                          Upload Photo
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. Typography & Badges */}
                <div className="relative z-10 text-center flex flex-col items-center">
                  {/* Congratulations Text */}
                  <h3
                    className="font-['Dancing_Script'] text-2xl sm:text-3xl text-pink-600 -rotate-3 drop-shadow-sm -mt-3 sm:-mt-3.5 leading-none"
                    style={{ fontFamily: "'Dancing Script', cursive" }}
                  >
                    Congratulations!
                  </h3>

                  {/* Winner Name */}
                  <h4
                    className="font-['Playfair_Display'] text-lg sm:text-xl font-black text-amber-950 uppercase mt-0.5 leading-none px-2 max-w-full truncate"
                    style={{ fontFamily: "'Playfair Display', serif" }}
                  >
                    {posterData.winnerName || 'Winner Name'}
                  </h4>

                  {/* Madrasa */}
                  {posterData.madrasa && (
                    <p className="text-[8px] sm:text-[9px] font-bold text-slate-600 uppercase tracking-wider mt-0.5 truncate max-w-full px-2">
                      🕌 {posterData.madrasa}
                    </p>
                  )}

                  {/* Category */}
                  <p className="text-[10px] sm:text-xs font-black text-amber-900 uppercase tracking-[0.2em] mt-0.5">
                    {posterData.category || 'CATEGORY'}
                  </p>

                  {/* Ribbon Banner */}
                  <div
                    style={{
                      clipPath: 'polygon(0% 0%, 100% 0%, calc(100% - 10px) 50%, 100% 100%, 0% 100%, 10px 50%)',
                    }}
                    className="bg-slate-900 px-5 py-1 mt-1 flex items-center justify-center shadow-md"
                  >
                    <p className="text-[10px] sm:text-xs font-black text-amber-400 uppercase tracking-wider leading-none">
                      {ribbonText}
                    </p>
                  </div>
                </div>

                {/* 4. Footer Item Name */}
                <div className="relative z-10 text-center flex flex-col items-center justify-center">
                  {posterData.itemNameMl && (
                    <p className="font-ml text-[9px] sm:text-[10px] font-bold text-slate-600 truncate max-w-full">
                      {posterData.itemNameMl}
                    </p>
                  )}
                  <p className="text-xs sm:text-sm font-black text-slate-900 uppercase leading-tight truncate max-w-full">
                    {posterData.itemNameEn || posterData.itemNameMl || 'Competition Item'}
                  </p>
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

      {/* 4. Strict 1080px × 1080px 1:1 Square Hidden Poster Canvas for html-to-image */}
      <div
        style={{
          position: 'fixed',
          left: '-9999px',
          top: '0',
          overflow: 'hidden',
          zIndex: -9999,
          pointerEvents: 'none',
        }}
      >
        <div
          ref={posterRef}
          style={{
            width: '1080px',
            height: '1080px',
            backgroundColor: '#FDFBF7',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '40px 48px',
            boxSizing: 'border-box',
            position: 'relative',
            overflow: 'hidden',
          }}
          className="font-sans select-none text-slate-900"
        >
          {/* Watercolor Glows */}
          <div
            className="absolute -top-20 -left-20 w-96 h-96 bg-cyan-200/50 rounded-full blur-3xl pointer-events-none"
            style={{
              position: 'absolute',
              top: '-80px',
              left: '-80px',
              width: '384px',
              height: '384px',
              backgroundColor: 'rgba(165, 243, 252, 0.5)',
              borderRadius: '9999px',
              filter: 'blur(48px)',
              pointerEvents: 'none',
            }}
          />
          <div
            className="absolute top-0 -right-20 w-80 h-80 bg-yellow-200/50 rounded-full blur-3xl pointer-events-none"
            style={{
              position: 'absolute',
              top: '0',
              right: '-80px',
              width: '320px',
              height: '320px',
              backgroundColor: 'rgba(254, 240, 138, 0.5)',
              borderRadius: '9999px',
              filter: 'blur(48px)',
              pointerEvents: 'none',
            }}
          />
          <div
            className="absolute -bottom-20 -right-20 w-96 h-96 bg-blue-200/40 rounded-full blur-3xl pointer-events-none"
            style={{
              position: 'absolute',
              bottom: '-80px',
              right: '-80px',
              width: '384px',
              height: '384px',
              backgroundColor: 'rgba(191, 219, 254, 0.4)',
              borderRadius: '9999px',
              filter: 'blur(48px)',
              pointerEvents: 'none',
            }}
          />
          <div
            className="absolute -bottom-10 -left-10 w-80 h-80 bg-green-100/50 rounded-full blur-3xl pointer-events-none"
            style={{
              position: 'absolute',
              bottom: '-40px',
              left: '-40px',
              width: '320px',
              height: '320px',
              backgroundColor: 'rgba(220, 252, 231, 0.5)',
              borderRadius: '9999px',
              filter: 'blur(48px)',
              pointerEvents: 'none',
            }}
          />

          {/* Decorative Confetti & Star Emojis */}
          <span style={{ position: 'absolute', top: '35px', left: '44px', fontSize: '32px', pointerEvents: 'none', zIndex: 5 }}>✨</span>
          <span style={{ position: 'absolute', top: '35px', right: '44px', fontSize: '32px', pointerEvents: 'none', zIndex: 5 }}>🎉</span>
          <span style={{ position: 'absolute', top: '330px', left: '32px', fontSize: '28px', pointerEvents: 'none', zIndex: 5 }}>⭐</span>
          <span style={{ position: 'absolute', top: '310px', right: '32px', fontSize: '28px', pointerEvents: 'none', zIndex: 5 }}>💖</span>
          <span style={{ position: 'absolute', bottom: '110px', left: '40px', fontSize: '28px', pointerEvents: 'none', zIndex: 5 }}>🎊</span>
          <span style={{ position: 'absolute', bottom: '110px', right: '40px', fontSize: '28px', pointerEvents: 'none', zIndex: 5 }}>⭐</span>

          {/* 1. Header Area */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              width: '100%',
              zIndex: 10,
            }}
          >
            {/* Small CIER header */}
            <p
              style={{
                fontSize: '15px',
                fontWeight: 900,
                letterSpacing: '0.25em',
                color: '#1E3A8A',
                textTransform: 'uppercase',
                margin: '0',
                lineHeight: '1',
              }}
            >
              MSM-CIER KERALA
            </p>

            {/* Title: NILAMBUR ZONE in dark blue */}
            <h2
              className="text-blue-950"
              style={{
                fontSize: '28px',
                fontWeight: 900,
                letterSpacing: '0.2em',
                color: '#0F172A',
                textTransform: 'uppercase',
                margin: '6px 0 0 0',
                lineHeight: '1',
              }}
            >
              NILAMBUR ZONE
            </h2>

            {/* Sargolsav 2026 Logo */}
            <div style={{ marginTop: '8px' }}>
              <img
                src="/logo.png"
                alt="Sargolsav 2026 Logo"
                style={{
                  height: '68px',
                  width: 'auto',
                  objectFit: 'contain',
                }}
              />
            </div>
          </div>

          {/* 2. Centerpiece: Photo Frame */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              margin: '4px 0 0 0',
              zIndex: 10,
            }}
          >
            <div
              className="w-[360px] h-[360px] rounded-full overflow-hidden border-[10px] border-amber-400 relative z-10 flex-shrink-0 shadow-2xl"
              style={{
                width: '360px',
                height: '360px',
                borderRadius: '9999px',
                border: '10px solid #FBBF24',
                boxShadow: '0 25px 50px -12px rgba(251, 191, 36, 0.45), 0 10px 25px rgba(0, 0, 0, 0.1)',
                overflow: 'hidden',
                position: 'relative',
                flexShrink: 0,
                backgroundColor: '#FEF3C7',
              }}
            >
              {userPhoto ? (
                <img
                  src={userPhoto}
                  alt="Winner"
                  className="w-full h-full object-cover object-center absolute inset-0"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    objectPosition: 'center',
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    bottom: 0,
                    left: 0,
                    transform: photoScale !== 1 ? `scale(${photoScale})` : undefined,
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    color: '#B45309',
                  }}
                >
                  <Camera style={{ width: '72px', height: '72px', color: '#D97706' }} />
                  <span
                    style={{
                      fontSize: '18px',
                      fontWeight: 700,
                      color: '#B45309',
                    }}
                  >
                    Upload Winner Photo
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* 3. Typography & Badges */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              width: '100%',
              zIndex: 20,
              marginTop: '-32px',
            }}
          >
            {/* Congratulations Text */}
            <h2
              className="font-['Dancing_Script'] text-7xl text-pink-600 -rotate-3 drop-shadow-md"
              style={{
                fontFamily: "'Dancing Script', cursive",
                fontSize: '76px',
                color: '#DB2777',
                transform: 'rotate(-3deg)',
                lineHeight: '1',
                margin: '0',
                textShadow: '0 2px 10px rgba(219, 39, 119, 0.25)',
              }}
            >
              Congratulations!
            </h2>

            {/* Winner Name */}
            <h1
              className="font-['Playfair_Display'] font-black text-amber-950 uppercase mt-2 leading-none"
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: nameFontSize,
                color: '#451A03',
                fontWeight: 900,
                lineHeight: '1.05',
                letterSpacing: '0.01em',
                maxWidth: '980px',
                padding: '0 20px',
                margin: '6px 0 0 0',
              }}
            >
              {posterData.winnerName || 'Winner Name'}
            </h1>

            {/* Madrasa */}
            {posterData.madrasa && (
              <p
                style={{
                  fontSize: '20px',
                  fontWeight: 700,
                  color: '#475569',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  margin: '4px 0 0 0',
                  lineHeight: '1.2',
                }}
              >
                🕌 MADRASA: {posterData.madrasa}
              </p>
            )}

            {/* Category */}
            <p
              className="text-3xl font-bold text-amber-900 uppercase tracking-widest mt-2"
              style={{
                fontSize: '28px',
                fontWeight: 800,
                color: '#78350F',
                textTransform: 'uppercase',
                letterSpacing: '0.22em',
                margin: '6px 0 0 0',
                lineHeight: '1.2',
              }}
            >
              {posterData.category || 'CATEGORY'}
            </p>

            {/* Rank & Grade Ribbon Banner */}
            <div
              className="bg-slate-900 px-10 py-3 mt-4 flex items-center justify-center relative shadow-lg"
              style={{
                backgroundColor: '#0F172A',
                clipPath: 'polygon(0% 0%, 100% 0%, calc(100% - 22px) 50%, 100% 100%, 0% 100%, 22px 50%)',
                padding: '12px 48px',
                marginTop: '10px',
                minWidth: '420px',
                boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.35)',
              }}
            >
              <p
                className="text-3xl font-black text-amber-400 uppercase tracking-wider"
                style={{
                  fontSize: '28px',
                  fontWeight: 900,
                  color: '#FBBF24',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  lineHeight: '1',
                  margin: '0',
                }}
              >
                {ribbonText}
              </p>
            </div>
          </div>

          {/* 4. Footer (Item Name) */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              width: '100%',
              zIndex: 10,
              margin: '8px 0 0 0',
            }}
          >
            {posterData.itemNameMl && (
              <p
                className="font-ml text-2xl font-bold text-slate-600 leading-normal"
                style={{
                  fontSize: '24px',
                  fontWeight: 700,
                  color: '#475569',
                  margin: '0',
                  lineHeight: '1.3',
                }}
              >
                {posterData.itemNameMl}
              </p>
            )}

            <p
              className="text-5xl font-black text-slate-800 mt-6 uppercase"
              style={{
                fontSize: '44px',
                fontWeight: 900,
                color: '#1E293B',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                margin: '2px 0 0 0',
                lineHeight: '1.15',
                maxWidth: '960px',
              }}
            >
              {posterData.itemNameEn || posterData.itemNameMl || 'Competition Item'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
