
import React, { useState, useEffect, useMemo } from 'react';
import { generateRecipe, generateRecipeImage } from './services/gemini';
import { Recipe, UserPreferences } from './types';
import NutritionChart from './components/NutritionChart';

// --- Shared Components ---

const Watermark = () => (
  <div className="fixed inset-0 pointer-events-none z-[100] select-none opacity-20 print:hidden">
    <div className="absolute top-4 left-4 text-[10px] font-black tracking-[0.2em] text-slate-400 uppercase">praj</div>
    <div className="absolute top-4 right-4 text-[10px] font-black tracking-[0.2em] text-slate-400 uppercase">praj</div>
    <div className="absolute bottom-4 left-4 text-[10px] font-black tracking-[0.2em] text-slate-400 uppercase">praj</div>
    <div className="absolute bottom-4 right-4 text-[10px] font-black tracking-[0.2em] text-slate-400 uppercase">praj</div>
  </div>
);

const Header = ({ savedCount, onOpenCookbook }: { savedCount: number; onOpenCookbook: () => void }) => (
  <header className="bg-white/80 backdrop-blur-md border-b sticky top-0 z-50 print:hidden">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
      <div className="flex items-center gap-2 group cursor-pointer" onClick={() => window.location.reload()}>
        <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-emerald-200 group-hover:scale-105 transition-transform">
          F
        </div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">FlavorGenie <span className="text-emerald-600">AI</span></h1>
      </div>
      <nav className="flex items-center gap-4 md:gap-8">
        <button 
          onClick={onOpenCookbook}
          className="relative group flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-emerald-600 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <span className="hidden sm:inline">My Cookbook</span>
          {savedCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-rose-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full shadow-sm ring-2 ring-white animate-bounce">
              {savedCount}
            </span>
          )}
        </button>
      </nav>
    </div>
  </header>
);

const IngredientChip: React.FC<{ name: string; onRemove: () => void }> = ({ name, onRemove }) => (
  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-emerald-50 text-emerald-700 border border-emerald-100 group">
    {name}
    <button
      onClick={onRemove}
      className="ml-2 text-emerald-400 hover:text-emerald-600 focus:outline-none transition-colors"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  </span>
);

const App: React.FC = () => {
  const [preferences, setPreferences] = useState<UserPreferences>({
    ingredients: [],
    diet: 'None',
    cuisine: 'Any',
    complexity: 'Intermediate'
  });
  const [currentIngredient, setCurrentIngredient] = useState('');
  const [loading, setLoading] = useState(false);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loadingStep, setLoadingStep] = useState('');
  const [savedRecipes, setSavedRecipes] = useState<Recipe[]>([]);
  const [showCookbook, setShowCookbook] = useState(false);

  // Cookbook Filter/Sort State
  const [cookbookSearch, setCookbookSearch] = useState('');
  const [cookbookCuisine, setCookbookCuisine] = useState('All');
  const [cookbookSort, setCookbookSort] = useState<'newest' | 'name'>('newest');

  useEffect(() => {
    const stored = localStorage.getItem('flavor_genie_cookbook');
    if (stored) {
      try {
        setSavedRecipes(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to load cookbook", e);
      }
    }
  }, []);

  const saveRecipe = (r: Recipe) => {
    if (savedRecipes.find(sr => sr.id === r.id)) return;
    const updated = [r, ...savedRecipes];
    setSavedRecipes(updated);
    localStorage.setItem('flavor_genie_cookbook', JSON.stringify(updated));
  };

  const deleteFromCookbook = (id: string) => {
    const updated = savedRecipes.filter(r => r.id !== id);
    setSavedRecipes(updated);
    localStorage.setItem('flavor_genie_cookbook', JSON.stringify(updated));
  };

  const handleShare = async (r: Recipe) => {
    const shareData = {
      title: `Recipe: ${r.name}`,
      text: `Try this ${r.cuisine} dish: ${r.name}! Crafted with AI.`,
      url: window.location.href,
    };
    if (navigator.share) {
      try { await navigator.share(shareData); } catch (e) {}
    } else {
      navigator.clipboard.writeText(`${r.name}\n\n${r.description}`);
      alert("Recipe link copied!");
    }
  };

  const removeIngredient = (name: string) => {
    setPreferences(prev => ({
      ...prev,
      ingredients: prev.ingredients.filter(ing => ing !== name)
    }));
  };

  const handleGenerate = async () => {
    if (preferences.ingredients.length === 0) {
      alert("Please add at least one ingredient!");
      return;
    }
    setLoading(true);
    setRecipe(null);
    try {
      setLoadingStep('Crafting your unique culinary experience...');
      const generatedRecipe = await generateRecipe(preferences);
      setLoadingStep('Capturing the perfect plating photo...');
      const imageUrl = await generateRecipeImage(generatedRecipe.name, generatedRecipe.cuisine);
      setRecipe({ ...generatedRecipe, image: imageUrl });
    } catch (error) {
      alert("The AI chef is taking a break. Please try again!");
    } finally {
      setLoading(false);
      setLoadingStep('');
    }
  };

  // Filter and Sort Cookbook logic
  const filteredCookbook = useMemo(() => {
    let list = [...savedRecipes];

    if (cookbookSearch) {
      list = list.filter(r => r.name.toLowerCase().includes(cookbookSearch.toLowerCase()));
    }

    if (cookbookCuisine !== 'All') {
      list = list.filter(r => r.cuisine === cookbookCuisine);
    }

    if (cookbookSort === 'name') {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      // Assuming original order is newest first based on how they are saved
      // But if we want actual newest first, it's just the default savedRecipes order
    }

    return list;
  }, [savedRecipes, cookbookSearch, cookbookCuisine, cookbookSort]);

  // Derive unique cuisines from saved recipes
  const uniqueCuisines = useMemo(() => {
    const cuisines = savedRecipes.map(r => r.cuisine);
    return ['All', ...new Set(cuisines)];
  }, [savedRecipes]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 relative">
      <Watermark />
      <Header 
        savedCount={savedRecipes.length} 
        onOpenCookbook={() => setShowCookbook(true)} 
      />
      
      <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 md:py-12 print:p-0">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* Controls */}
          <div className="lg:col-span-4 space-y-8 print:hidden">
            <section className="bg-white p-6 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100">
              <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                <span className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                </span>
                Ingredients
              </h2>
              <form onSubmit={(e) => { e.preventDefault(); if(currentIngredient) { setPreferences(p => ({...p, ingredients: [...new Set([...p.ingredients, currentIngredient.trim()])]})); setCurrentIngredient(''); } }} className="space-y-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={currentIngredient}
                    onChange={(e) => setCurrentIngredient(e.target.value)}
                    placeholder="e.g. Avocado, Salmon"
                    className="flex-grow px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  />
                  <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-bold transition-colors">Add</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {preferences.ingredients.map(ing => (
                    <IngredientChip key={ing} name={ing} onRemove={() => removeIngredient(ing)} />
                  ))}
                </div>
              </form>
            </section>

            <section className="bg-white p-6 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 space-y-6">
              <h2 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
                <span className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                </span>
                Preferences
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Diet</label>
                  <select value={preferences.diet} onChange={(e) => setPreferences(prev => ({ ...prev, diet: e.target.value }))} className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none">
                    <option>None</option><option>Vegan</option><option>Keto</option><option>Gluten-Free</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Cuisine</label>
                  <select value={preferences.cuisine} onChange={(e) => setPreferences(prev => ({ ...prev, cuisine: e.target.value }))} className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none">
                    <option>Any</option><option>Italian</option><option>Japanese</option><option>Mexican</option><option>Thai</option>
                  </select>
                </div>
              </div>

              <button
                onClick={handleGenerate}
                disabled={loading || preferences.ingredients.length === 0}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold rounded-xl shadow-lg shadow-emerald-100 transition-all flex items-center justify-center gap-2"
              >
                {loading ? <span className="animate-pulse">Chef is busy...</span> : "Generate Masterpiece"}
              </button>
            </section>
          </div>

          {/* Main Display */}
          <div className="lg:col-span-8">
            {loading && (
              <div className="flex flex-col items-center justify-center py-20 text-center animate-pulse">
                <div className="text-6xl mb-6 animate-bounce">🍳</div>
                <h3 className="text-2xl font-bold text-slate-800">{loadingStep}</h3>
              </div>
            )}

            {!loading && !recipe && (
              <div className="space-y-12">
                {/* Hero Feature */}
                <div className="bg-emerald-600 rounded-[2.5rem] p-12 text-white relative overflow-hidden shadow-2xl shadow-emerald-200">
                  <div className="relative z-10 max-w-lg">
                    <h2 className="text-4xl md:text-5xl font-serif mb-6 leading-tight">Elevate Your Everyday <br/>Cooking with AI.</h2>
                    <p className="text-emerald-50 text-lg mb-8 opacity-90">Unlock thousands of unique recipes based on what's already in your fridge. No waste, just great taste.</p>
                    <div className="flex gap-4">
                      <div className="flex -space-x-3">
                        {[1,2,3].map(i => <div key={i} className="w-10 h-10 rounded-full border-2 border-emerald-600 bg-slate-200 overflow-hidden"><img src={`https://i.pravatar.cc/100?u=${i}`} /></div>)}
                      </div>
                      <p className="text-sm font-medium self-center text-emerald-100">Joined by 2,000+ home chefs</p>
                    </div>
                  </div>
                  <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-emerald-500 rounded-full blur-3xl opacity-50"></div>
                </div>

                {/* Features Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                    { title: "AI Precision", icon: "🧠", desc: "Recipes tailored to your specific pantry items." },
                    { title: "Macro Ready", icon: "📊", desc: "Full nutritional breakdown with every dish." },
                    { title: "Cookbook", icon: "📖", desc: "Save and share your favorite AI creations." }
                  ].map((f, i) => (
                    <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                      <div className="text-3xl mb-4">{f.icon}</div>
                      <h4 className="font-bold text-slate-900 mb-2">{f.title}</h4>
                      <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {recipe && (
              <div className="bg-white rounded-3xl shadow-2xl shadow-slate-200 border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-700">
                <div className="relative h-[300px] md:h-[450px]">
                  <img src={recipe.image} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                  <div className="absolute bottom-0 left-0 p-8 md:p-12">
                    <div className="flex gap-2 mb-4">
                      <span className="px-4 py-1.5 bg-emerald-600 text-white text-[10px] font-bold rounded-full uppercase tracking-tighter">{recipe.cuisine}</span>
                      <span className="px-4 py-1.5 bg-white/20 backdrop-blur-md text-white text-[10px] font-bold rounded-full uppercase tracking-tighter">{recipe.difficulty}</span>
                    </div>
                    <h2 className="text-4xl md:text-6xl font-serif text-white">{recipe.name}</h2>
                  </div>
                </div>

                <div className="p-8 md:p-12 space-y-12">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { l: "Prep", v: recipe.prepTime }, { l: "Cook", v: recipe.cookTime }, 
                      { l: "Serves", v: `${recipe.servings} ppl` }, { l: "Cals", v: `${recipe.nutrition.calories} kcal`, highlight: true }
                    ].map((stat, i) => (
                      <div key={i} className={`p-5 rounded-2xl text-center border ${stat.highlight ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-transparent'}`}>
                        <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1">{stat.l}</span>
                        <span className={`text-xl font-bold ${stat.highlight ? 'text-emerald-700' : 'text-slate-700'}`}>{stat.v}</span>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    <div className="space-y-6">
                      <h3 className="text-2xl font-bold text-slate-900 border-b-2 border-emerald-100 pb-4">The Pantry</h3>
                      <ul className="space-y-4">
                        {recipe.ingredients.map((ing, i) => (
                          <li key={i} className="flex justify-between items-center group bg-slate-50/50 p-3 rounded-xl hover:bg-emerald-50 transition-colors">
                            <span className="text-slate-700 font-medium">{ing.item}</span>
                            <span className="font-bold text-emerald-600 text-sm">{ing.amount}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="space-y-6">
                      <h3 className="text-2xl font-bold text-slate-900 border-b-2 border-emerald-100 pb-4">Nutrition</h3>
                      <NutritionChart nutrition={recipe.nutrition} />
                    </div>
                  </div>

                  <div className="space-y-8">
                    <h3 className="text-2xl font-bold text-slate-900 border-b-2 border-emerald-100 pb-4">Steps to perfection</h3>
                    <div className="space-y-10">
                      {recipe.instructions.map((step, i) => (
                        <div key={i} className="flex gap-8 items-start relative group">
                          <span className="flex-shrink-0 w-12 h-12 bg-emerald-600 text-white rounded-2xl flex items-center justify-center font-bold text-xl shadow-lg shadow-emerald-100 group-hover:scale-110 transition-transform">
                            {i + 1}
                          </span>
                          <p className="text-lg text-slate-700 leading-relaxed pt-2">
                            {step}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900 p-8 flex flex-col md:flex-row gap-6 items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center text-white text-2xl">🪄</div>
                    <div>
                      <h4 className="text-white font-bold">Chef's Magic Complete</h4>
                      <p className="text-slate-400 text-xs">Always verify cooking temperatures for poultry and meat.</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => saveRecipe(recipe)} className="px-8 py-3 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl font-bold transition-all flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                      {savedRecipes.find(sr => sr.id === recipe.id) ? 'Saved' : 'Save'}
                    </button>
                    <button onClick={() => handleShare(recipe)} className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-emerald-900/40">
                      Share Dish
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Cookbook Side Overlay */}
      {showCookbook && (
        <div className="fixed inset-0 z-[110] overflow-hidden">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity" onClick={() => setShowCookbook(false)}></div>
          <div className="absolute inset-y-0 right-0 max-w-full flex">
            <div className="relative w-screen max-w-md">
              <div className="h-full flex flex-col bg-white shadow-2xl animate-in slide-in-from-right duration-500">
                <div className="px-8 py-6 border-b-2 border-slate-50 flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-slate-900">The Vault</h2>
                  <button onClick={() => setShowCookbook(false)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
                
                {/* Cookbook Controls (Filter/Sort) */}
                {savedRecipes.length > 0 && (
                  <div className="p-6 bg-slate-50/50 border-b border-slate-100 space-y-4">
                    <div className="relative">
                      <input 
                        type="text" 
                        placeholder="Search your recipes..." 
                        value={cookbookSearch}
                        onChange={(e) => setCookbookSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                      <svg className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Cuisine</label>
                        <select 
                          value={cookbookCuisine} 
                          onChange={(e) => setCookbookCuisine(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                        >
                          {uniqueCuisines.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Sort By</label>
                        <select 
                          value={cookbookSort} 
                          onChange={(e) => setCookbookSort(e.target.value as 'newest' | 'name')}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                        >
                          <option value="newest">Newest First</option>
                          <option value="name">Name (A-Z)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex-grow overflow-y-auto p-6 space-y-6">
                  {filteredCookbook.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-12 space-y-4">
                      <div className="text-6xl grayscale">🥘</div>
                      <h4 className="font-bold text-slate-800">
                        {savedRecipes.length === 0 ? "Your vault is empty" : "No matches found"}
                      </h4>
                      <p className="text-slate-500 text-sm">
                        {savedRecipes.length === 0 
                          ? "Save your first recipe to see it here." 
                          : "Try adjusting your search or filters."}
                      </p>
                    </div>
                  ) : (
                    filteredCookbook.map(r => (
                      <div key={r.id} className="group bg-slate-50/50 rounded-2xl overflow-hidden border border-slate-100 hover:border-emerald-200 hover:bg-white transition-all">
                        <div className="flex gap-4 p-4">
                          <img src={r.image} className="w-24 h-24 object-cover rounded-xl shadow-sm" alt={r.name} />
                          <div className="flex-grow">
                            <h4 className="font-bold text-slate-800 line-clamp-1 cursor-pointer hover:text-emerald-600 transition-colors" onClick={() => { setRecipe(r); setShowCookbook(false); }}>{r.name}</h4>
                            <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mt-1">{r.cuisine} • {r.difficulty}</p>
                            <div className="flex gap-3 mt-3">
                              <button onClick={() => deleteFromCookbook(r.id)} className="text-[10px] font-bold text-rose-500 hover:text-rose-700 transition-colors uppercase">Remove</button>
                              <button onClick={() => { setRecipe(r); setShowCookbook(false); }} className="text-[10px] font-bold text-emerald-600 hover:text-emerald-800 transition-colors uppercase">View</button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <footer className="bg-white border-t py-12 text-center text-slate-500 text-sm print:hidden">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
             <div className="w-6 h-6 bg-slate-200 rounded flex items-center justify-center text-[10px] font-bold text-slate-500">F</div>
             <span className="font-bold text-slate-800">FlavorGenie AI</span>
          </div>
          <p className="text-slate-400">© {new Date().getFullYear()} FlavorGenie. All rights reserved.</p>
          <p className="font-medium text-slate-600 italic">
            Crafted with ❤️ by <span className="text-emerald-600 font-bold not-italic">praj (Pratyush Raj)</span>
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;
