import React, { useState } from 'react';
import { Upload, FileText, Settings, Search, CheckCircle, AlertCircle, Loader2, Play, ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';

const API_URL = 'http://localhost:8000';

function App() {
  const [ file, setFile ] = useState(null);
  const [ rulesSource, setRulesSource ] = useState('');
  const [ rulesYaml, setRulesYaml ] = useState('');
  const [ criteria, setCriteria ] = useState([]); // List of criteria from YAML
  const [ selectedCriterion, setSelectedCriterion ] = useState('Összes szempont');
  const [ loading, setLoading ] = useState(false);
  const [ extractingRules, setExtractingRules ] = useState(false);
  const [ report, setReport ] = useState('');
  const [ step, setStep ] = useState(1); // 1: Setup Rules, 2: Upload Paper, 3: Review

  const handleFileChange = (e) => {
    setFile(e.target.files[ 0 ]);
  };

  const parseCriteriaFromYaml = (yamlText) => {
    // Nagyon egyszerű regex-alapú kinyerés a listákhoz (structural_requirements, content_evaluation_criteria stb.)
    const matches = yamlText.match(/-\s"([^"]+)"/g) || [];
    const uniqueCriteria = [ ...new Set(matches.map(m => m.replace(/-\s"|"/g, ''))) ];

    // Alapértelmezett kategóriák ha nincsenek listák
    const categories = [ 'Idézés módja', 'Terjedelem és struktúra', 'Tudományos újdonság' ];
    const finalCriteria = uniqueCriteria.length > 0 ? uniqueCriteria : categories;
    setCriteria([ 'Összes szempont', ...finalCriteria ]);
  };

  const extractRules = async () => {
    if (!rulesSource) return;
    setExtractingRules(true);
    try {
      const formData = new FormData();
      formData.append('source', rulesSource);
      formData.append('type', 'text');
      const response = await axios.post(`${API_URL}/extract-rules`, formData);
      const yaml = response.data.rules;
      setRulesYaml(yaml);
      parseCriteriaFromYaml(yaml);
      setStep(2);
    } catch (error) {
      console.error('Error extracting rules:', error);
      const msg = error.response?.data?.detail || 'Hiba történt a szabályok kinyerésekor.';
      alert(msg);
    } finally {
      setExtractingRules(false);
    }
  };

  const analyzePaper = async () => {
    if (!file || !rulesYaml) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('rules', rulesYaml);
      if (selectedCriterion !== 'Összes szempont') {
        formData.append('criterion', selectedCriterion);
      }
      const response = await axios.post(`${API_URL}/analyze`, formData);
      setReport(response.data.report);
      setStep(3);
    } catch (error) {
      console.error('Error analyzing paper:', error);
      const msg = error.response?.data?.detail || 'Hiba történt az elemzés során.';
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <header className="mb-12 text-center" style={{ marginTop: '40px' }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-5xl font-bold mb-4 tracking-tight">
            Lektor<span className="accent-blue">.</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Agentic Academic Peer Review Assistant – Tudományos igényű elemzés és formai ellenőrzés másodpercek alatt.
          </p>
        </motion.div>
      </header>

      <main>
        {/* Status Stepper */}
        <div className="stepper-container">
          {[ 1, 2, 3 ].map((s) => (
            <div
              key={s}
              className={`step-indicator ${step >= s ? 'active' : ''}`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              className="glass-card"
            >
              <div className="flex items-center gap-6 mb-8">
                <div className="p-4 bg-blue-500/10 rounded-2xl">
                  <Settings className="text-blue-500 w-10 h-10" />
                </div>
                <h2 className="text-3xl font-bold">1. Követelmények megadása</h2>
              </div>

              <p className="text-gray-400 text-lg mb-8">
                Illeszd be a folyóirat elvárásait vagy adj meg egy URL-t (pl: Arboni, Elsevier).
                Az ágens kinyeri a számunkra fontos paramétereket.
              </p>

              <textarea
                placeholder="Pl: 'Manuscripts should be between 4000-6000 words. APA style is required...'"
                value={rulesSource}
                onChange={(e) => setRulesSource(e.target.value)}
              />

              <button
                onClick={extractRules}
                disabled={extractingRules || !rulesSource}
                className="btn-primary"
              >
                {extractingRules ? <Loader2 className="animate-spin" /> : <Play size={20} />}
                Követelmények elemzése
              </button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              className="glass-card"
            >
              <div className="flex items-center gap-6 mb-10 text-center justify-center">
                <div className="p-4 bg-blue-500/10 rounded-2xl">
                  <FileText className="text-blue-500 w-10 h-10" />
                </div>
                <h2 className="text-3xl font-bold">2. Elemzési beállítások</h2>
              </div>

              <div className="grid md:grid-cols-2 gap-12 mb-12">
                <div className="flex flex-col">
                  <h3 className="text-xl font-semibold mb-6">Milyen szempontot vizsgáljunk?</h3>
                  <div className="grid grid-cols-1 gap-3">
                    {criteria.map((c) => (
                      <button
                        key={c}
                        onClick={() => setSelectedCriterion(c)}
                        className={`text-left p-4 rounded-xl border transition-all ${selectedCriterion === c
                            ? 'bg-blue-500/20 border-blue-500 text-blue-100'
                            : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10'
                          }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col">
                  <h3 className="text-xl font-semibold mb-6">Tanulmány feltöltése (PDF)</h3>
                  <div className="flex-grow flex flex-col justify-center items-center border-2 border-dashed border-white/10 rounded-3xl p-10 hover:border-blue-500/50 transition-all group bg-white/2 cursor-pointer">
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={handleFileChange}
                      className="hidden"
                      id="pdf-upload"
                    />
                    <label htmlFor="pdf-upload" className="cursor-pointer text-center w-full h-full flex flex-col items-center justify-center">
                      <div className="p-6 bg-white/5 rounded-full mb-6 group-hover:scale-110 transition-transform">
                        <Upload className="text-gray-400 w-10 h-10" />
                      </div>
                      <span className="text-blue-400 text-lg font-bold block mb-2">Kattints a kiválasztáshoz</span>
                      <span className="text-gray-500 text-sm">A tanulmány szövegét elemezzük.</span>
                    </label>
                    {file && (
                      <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="mt-6 flex items-center gap-3 text-green-400 bg-green-400/10 px-4 py-2 rounded-xl text-sm font-medium"
                      >
                        <CheckCircle size={18} /> {file.name}
                      </motion.div>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-black/20 rounded-2xl p-6 border border-white/5 mb-12">
                <details className="cursor-pointer">
                  <summary className="text-gray-500 text-sm font-medium hover:text-gray-400">Kinyert YAML szabályok megtekintése</summary>
                  <pre className="text-blue-300 font-mono text-xs mt-4 overflow-x-auto whitespace-pre-wrap">{rulesYaml}</pre>
                </details>
              </div>

              <div className="flex justify-between items-center pt-8 border-t border-white/5">
                <button
                  onClick={() => setStep(1)}
                  className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-lg"
                >
                  <ChevronLeft size={20} /> Vissza
                </button>
                <button
                  onClick={analyzePaper}
                  disabled={loading || !file}
                  className="btn-primary"
                >
                  {loading ? <Loader2 className="animate-spin" /> : <Play size={20} />}
                  {selectedCriterion === 'Összes szempont' ? 'Teljes lektorálás indítása' : `Elemzés: ${selectedCriterion}`}
                </button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card"
            >
              <div className="flex items-center justify-between mb-10 pb-8 border-b border-white/5">
                <div className="flex items-center gap-6">
                  <div className="p-4 bg-blue-500/10 rounded-2xl">
                    <Search className="text-blue-500 w-10 h-10" />
                  </div>
                  <h2 className="text-3xl font-bold">3. Lektori Riport</h2>
                </div>
                <button
                  onClick={() => { setStep(1); setReport(''); setFile(null); }}
                  className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all font-semibold"
                >
                  Új elemzés indítása
                </button>
              </div>

              <div className="prose prose-invert max-w-none bg-black/30 rounded-3xl p-10 border border-white/5 shadow-inner">
                <ReactMarkdown>{report}</ReactMarkdown>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="mt-20 mb-12 text-center text-gray-500 text-sm">
        <div className="w-24 h-1 bg-white/5 mx-auto mb-8 rounded-full" />
        <p>&copy; 2026 Lektor AI Asszisztens – Fejlesztve az Agentic Discovery Platform keretében</p>
      </footer>
    </div>
  );
}

export default App;
