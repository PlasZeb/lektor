import React, { useState, useEffect } from 'react';
import { Upload, FileText, Settings, Search, CheckCircle, AlertCircle, Loader2, Play, ChevronLeft, Save, Calendar, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';

const API_URL = 'http://localhost:8000';

function App() {
  const [ file, setFile ] = useState(null);
  const [ rulesSource, setRulesSource ] = useState('');
  const [ guidelineFile, setGuidelineFile ] = useState(null);
  const [ rulesYaml, setRulesYaml ] = useState('');
  const [ journalName, setJournalName ] = useState('');
  const [ criteria, setCriteria ] = useState([]);
  const [ selectedCriterion, setSelectedCriterion ] = useState('Összes szempont');
  const [ loading, setLoading ] = useState(false);
  const [ extractingRules, setExtractingRules ] = useState(false);
  const [ savingRule, setSavingRule ] = useState(false);
  const [ report, setReport ] = useState('');
  const [ step, setStep ] = useState(1);
  const [ savedGuidelines, setSavedGuidelines ] = useState([]);
  const [ showYamlEditor, setShowYamlEditor ] = useState(false);
  const [ reportLanguage, setReportLanguage ] = useState('magyar');

  const SYSTEM_CRITERIA = [
    { name: 'Általános tudományos stílus', isSystem: true },
    { name: 'Logikai felépítés és koherencia', isSystem: true },
    { name: 'Helyesírás és nyelvhelyesség', isSystem: true },
    { name: 'Szakirodalmi alapozottság', isSystem: true }
  ];

  useEffect(() => {
    fetchSavedGuidelines();
    setCriteria([ { name: 'Összes szempont', isSystem: false }, ...SYSTEM_CRITERIA ]);
  }, []);

  const handleFileChange = (e) => {
    if (e.target.files[ 0 ]) {
      setFile(e.target.files[ 0 ]);
    }
  };

  const handleGuidelineFileChange = (e) => {
    if (e.target.files[ 0 ]) {
      setGuidelineFile(e.target.files[ 0 ]);
      setRulesSource(''); // Clear text if file is uploaded
    }
  };

  const skipToStep2 = () => {
    setRulesYaml('# Alapértelmezett tudományos elemzés\npublisher_info:\n  name: "Általános rendszer"\n');
    setJournalName('Általános elemzés');
    setStep(2);
  };

  const fetchSavedGuidelines = async () => {
    try {
      const response = await axios.get(`${API_URL}/guidelines`);
      setSavedGuidelines(response.data);
    } catch (error) {
      console.error('Error fetching guidelines:', error);
    }
  };

  const parseCriteriaFromYaml = (yamlText) => {
    const matches = yamlText.match(/-\s"([^"]+)"/g) || [];
    const uniqueNames = [ ...new Set(matches.map(m => m.replace(/-\s"|"/g, ''))) ];

    // Kinyert szempontok (kékek)
    const extracted = uniqueNames.map(name => ({ name, isSystem: false }));

    // Csak azokat a rendszerszempontokat tartsuk meg, amiknek nem ugyanaz a neve, mint egy kinyertnek
    const systemToInclude = SYSTEM_CRITERIA.filter(sc => !uniqueNames.includes(sc.name));

    setCriteria([
      { name: 'Összes szempont', isSystem: false },
      ...extracted,
      ...systemToInclude
    ]);
  };

  const extractRules = async () => {
    if (!rulesSource && !guidelineFile) return;
    setExtractingRules(true);
    try {
      const formData = new FormData();
      if (guidelineFile) {
        formData.append('file', guidelineFile);
      } else {
        formData.append('source', rulesSource);
      }
      const response = await axios.post(`${API_URL}/extract-rules`, formData);
      const { rules, journal_name } = response.data;
      setRulesYaml(rules);
      setJournalName(journal_name);
      parseCriteriaFromYaml(rules);
      fetchSavedGuidelines(); // Refresh list to show the auto-saved file
      setStep(2);
    } catch (error) {
      console.error('Extraction error:', error);
      alert(error.response?.data?.detail || 'Hiba a szabályok kinyerésekor.');
    } finally {
      setExtractingRules(false);
    }
  };

  const saveGuideline = async () => {
    if (!journalName || !rulesYaml) return;
    setSavingRule(true);
    try {
      const formData = new FormData();
      formData.append('name', journalName);
      formData.append('content', rulesYaml);
      await axios.post(`${API_URL}/save-guideline`, formData);
      fetchSavedGuidelines();
      alert('Irányelv elmentve!');
    } catch (error) {
      console.error('Save error:', error);
      alert('Hiba a mentés során.');
    } finally {
      setSavingRule(false);
    }
  };

  const loadGuideline = async (guideline) => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/guideline/${guideline.filename}`);
      setRulesYaml(response.data.content);
      parseCriteriaFromYaml(response.data.content);
      setJournalName(guideline.name);
      setStep(2);
    } catch (error) {
      alert('Hiba a betöltéskor.');
    } finally {
      setLoading(false);
    }
  };

  const analyzePaper = async () => {
    if (!file || !rulesYaml) return;
    setLoading(true);
    setReport('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('rules_yaml', rulesYaml);
      formData.append('criterion', selectedCriterion);
      formData.append('language', reportLanguage); // Új paraméter

      const response = await axios.post(`${API_URL}/analyze`, formData);
      setReport(response.data.report);
      setStep(3);
    } catch (error) {
      console.error('Analysis error:', error);
      alert(error.response?.data?.detail || 'Hiba az elemzés során.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ position: 'relative', minHeight: '90vh' }}>
      <header className="mb-12 text-center" style={{ marginTop: '20px' }}>
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-6xl font-black mb-4">
            Lektor<span className="accent-blue">.</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto font-medium">
            Szakmai társ a tudományos publikálásban. Formai és tartalmi elemzés percek alatt.
          </p>
        </motion.div>
      </header>

      <main>
        <div className="stepper-container">
          {[ 1, 2, 3 ].map((s) => (
            <div key={s} className={`step-indicator ${step >= s ? 'active' : ''}`} />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 glass-card">
                <div className="flex items-center gap-4 mb-6">
                  <div className="p-3 bg-blue-500/10 rounded-xl"><Settings className="text-blue-500" /></div>
                  <h2 className="text-2xl font-bold">Új irányelv megadása</h2>
                </div>

                <div className="flex flex-col gap-6">
                  <div className="relative">
                    <textarea
                      placeholder="Illeszd be a folyóirat elvárásait vagy egy URL-t..."
                      value={rulesSource}
                      onChange={(e) => { setRulesSource(e.target.value); setGuidelineFile(null); }}
                      style={{ minHeight: '200px' }}
                    />
                    <div className="absolute inset-x-0 -bottom-4 flex justify-center">
                      <span className="bg-[#0f172a] px-4 text-gray-500 text-sm font-bold">VAGY</span>
                    </div>
                  </div>

                  <label
                    htmlFor="guideline-upload"
                    className={`mt-4 border-2 border-dashed rounded-2xl p-6 transition-all flex flex-col items-center justify-center cursor-pointer ${guidelineFile ? 'border-blue-500 bg-blue-500/5' : 'border-white/10 hover:border-white/20'}`}
                  >
                    <input type="file" accept=".pdf,.docx,.doc" onChange={handleGuidelineFileChange} className="hidden" id="guideline-upload" />
                    <Upload className={guidelineFile ? 'text-blue-400' : 'text-gray-500'} size={24} />
                    <p className={`mt-2 text-sm font-medium ${guidelineFile ? 'text-blue-400' : 'text-gray-400'}`}>
                      {guidelineFile ? guidelineFile.name : 'Irányelv feltöltése (PDF / DOCX)'}
                    </p>
                  </label>
                </div>

                <div className="mt-8 flex items-center gap-4">
                  <button onClick={extractRules} disabled={extractingRules || (!rulesSource && !guidelineFile)} className="btn-primary">
                    {extractingRules ? <Loader2 className="animate-spin" /> : <Play size={20} />}
                    Irányelvek kinyerése
                  </button>
                  <button onClick={skipToStep2} className="px-6 py-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 transition-all font-medium">
                    Gyorsindítás rendszer szempontokkal
                  </button>
                </div>
              </div>

              <div className="glass-card" style={{ padding: '32px' }}>
                <div className="flex items-center gap-4 mb-6">
                  <div className="p-3 bg-blue-500/10 rounded-xl"><BookOpen className="text-blue-500" /></div>
                  <h2 className="text-2xl font-bold">Mentett minták</h2>
                </div>
                <div className="flex flex-col gap-3 max-h-[400px] overflow-y-auto pr-2">
                  {savedGuidelines.length === 0 ? (
                    <p className="text-gray-500 text-sm italic text-center py-8">Nincsenek még mentett irányelvek.</p>
                  ) : (
                    savedGuidelines.map((g) => (
                      <div key={g.id} onClick={() => loadGuideline(g)} className="guideline-item">
                        <div>
                          <div className="font-bold text-gray-200">{g.name}</div>
                          <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                            <Calendar size={12} /> {g.date}
                          </div>
                        </div>
                        <ChevronLeft size={16} className="rotate-180 text-gray-600" />
                      </div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="glass-card relative">
              {loading && (
                <div className="loading-overlay">
                  <motion.div animate={{ scale: [ 1, 1.2, 1 ] }} transition={{ repeat: Infinity, duration: 2 }} className="mb-6">
                    <Loader2 size={64} className="text-blue-500 animate-spin" />
                  </motion.div>
                  <h3 className="text-2xl font-bold mb-2 pulse-animation">Lektorálás folyamatban...</h3>
                  <p className="text-gray-400">Ez 30-60 másodpercet is igénybe vehet a szöveg hosszától függően.</p>
                </div>
              )}

              <div className="flex items-center justify-between mb-8 pb-6 border-b border-white/5">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-500/10 rounded-xl"><FileText className="text-blue-500" /></div>
                  <h2 className="text-2xl font-bold">Elemzési beállítások</h2>
                </div>
                <div className="flex gap-4">
                  <input
                    type="text"
                    placeholder="Folyóirat magnevezése..."
                    value={journalName}
                    onChange={(e) => setJournalName(e.target.value)}
                    className="max-w-[250px]"
                  />
                  <button onClick={saveGuideline} disabled={!journalName || savingRule} className="p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all text-blue-400">
                    {savingRule ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                  </button>
                </div>
              </div>

              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-gray-400">Elemzési fázis</h3>
                <button
                  onClick={() => setShowYamlEditor(!showYamlEditor)}
                  className={`text-xs px-4 py-2 rounded-lg border transition-all ${showYamlEditor ? 'bg-blue-500/20 border-blue-500 text-blue-300' : 'bg-white/5 border-white/10 text-gray-500 hover:text-gray-300'}`}
                >
                  {showYamlEditor ? 'Szerkesztő bezárása' : 'Irányelvek kézi szerkesztése (YAML)'}
                </button>
              </div>

              {showYamlEditor && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
                  <div className="p-1 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-2xl">
                    <textarea
                      value={rulesYaml}
                      onChange={(e) => {
                        setRulesYaml(e.target.value);
                        parseCriteriaFromYaml(e.target.value);
                      }}
                      className="w-full bg-[#0c0e14] border-none rounded-xl font-mono text-sm text-blue-300 p-6 min-h-[300px]"
                      placeholder="YAML szabályok..."
                    />
                  </div>
                  <p className="text-[10px] text-gray-600 mt-2 ml-2 italic">A módosítások azonnal frissítik a szempontrendszert.</p>
                </motion.div>
              )}

              <div className="grid md:grid-cols-2 gap-12 mb-8">
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-gray-300">Ellenőrzési szempont</h3>
                  <div className="flex flex-col gap-6 max-h-[500px] overflow-y-auto pr-2">
                    {/* ÖSSZES SZEMPONT KIEMELVE */}
                    {criteria.filter(c => c.name === 'Összes szempont').map(c => {
                      const isActive = selectedCriterion === c.name;
                      return (
                        <button
                          key={c.name}
                          onClick={() => setSelectedCriterion(c.name)}
                          className={`criterion-btn all ${isActive ? 'active' : ''}`}
                        >
                          <span className="font-bold">{c.name}</span>
                          {isActive && <CheckCircle size={18} className="text-emerald-400" />}
                        </button>
                      );
                    })}

                    {/* EGYEDI SZEMOPONTOK SZEKCIÓ */}
                    {criteria.filter(c => !c.isSystem && c.name !== 'Összes szempont').length > 0 && (
                      <div className="mt-2">
                        <h4 className="text-[10px] uppercase tracking-widest text-blue-500/60 font-bold mb-3 ml-2">Egyedi irányelvek</h4>
                        <div className="flex flex-col gap-2">
                          {criteria.filter(c => !c.isSystem && c.name !== 'Összes szempont').map((c) => (
                            <button
                              key={c.name}
                              onClick={() => setSelectedCriterion(c.name)}
                              className={`criterion-btn extracted ${selectedCriterion === c.name ? 'active' : ''}`}
                            >
                              <span>{c.name}</span>
                              {selectedCriterion === c.name && <CheckCircle size={18} className="text-blue-400" />}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* RENDSZER SZEMPONTOK SZEKCIÓ */}
                    <div className="mt-2">
                      <h4 className="text-[10px] uppercase tracking-widest text-amber-600/60 font-bold mb-3 ml-2">Lektor alap szempontok</h4>
                      <div className="flex flex-col gap-2">
                        {criteria.filter(c => c.isSystem).map((c) => (
                          <button
                            key={c.name}
                            onClick={() => setSelectedCriterion(c.name)}
                            className={`criterion-btn system ${selectedCriterion === c.name ? 'active' : ''}`}
                          >
                            <span>{c.name}</span>
                            {selectedCriterion === c.name && <CheckCircle size={18} className="text-amber-500" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4 text-gray-300">Forrásdokumentum (PDF)</h3>
                  <label
                    htmlFor="pdf-upload"
                    className="border-2 border-dashed border-white/5 rounded-2xl p-8 flex flex-col items-center justify-center hover:border-blue-500/30 transition-all bg-white/1 cursor-pointer min-h-[200px] mb-8"
                  >
                    <input type="file" accept=".pdf" onChange={handleFileChange} className="hidden" id="pdf-upload" />
                    <div className="p-5 bg-white/5 rounded-full mb-4">
                      <Upload className="text-gray-400" size={32} />
                    </div>
                    <p className="text-blue-400 font-bold">Kattints a feltöltéshez</p>
                    {file && <div className="mt-4 flex items-center gap-2 text-green-400 bg-green-400/10 px-4 py-2 rounded-lg text-xs"><CheckCircle size={14} /> {file.name}</div>}
                  </label>

                  <h3 className="text-lg font-semibold mb-4 text-gray-300">Elemzés nyelve</h3>
                  <div className="flex gap-3">
                    {[ 'magyar', 'angol', 'német' ].map((lang) => (
                      <button
                        key={lang}
                        onClick={() => setReportLanguage(lang)}
                        className={`lang-btn ${reportLanguage === lang ? 'active' : ''}`}
                      >
                        {lang}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center mt-10 pt-8 border-t border-white/5">
                <button onClick={() => setStep(1)} className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors">
                  <ChevronLeft size={18} /> Vissza
                </button>
                <button onClick={analyzePaper} disabled={loading || !file} className="btn-primary">
                  {loading ? <Loader2 className="animate-spin" /> : <Play size={18} />}
                  {selectedCriterion === 'Összes szempont' ? 'Teljes lektorálás' : `Elemzés: ${selectedCriterion}`}
                </button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="glass-card">
              <div className="flex items-center justify-between mb-8 pb-6 border-b border-white/5">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-500/10 rounded-xl"><Search className="text-blue-500" /></div>
                  <h2 className="text-2xl font-bold">Lektori Vélemény</h2>
                </div>
                <button onClick={() => { setStep(1); setReport(''); setFile(null); }} className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all font-medium text-sm">
                  Új elemzés
                </button>
              </div>
              <div className="prose prose-invert max-w-none bg-black/20 rounded-2xl p-8 border border-white/5">
                <ReactMarkdown>{report}</ReactMarkdown>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="mt-16 mb-8 text-center text-gray-600 text-xs">
        <p>&copy; 2026 Lektor AI – Agentic Academic Peer Review • ADP</p>
      </footer>
    </div>
  );
}

export default App;
