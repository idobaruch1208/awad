'use client';

import { useState, useEffect } from 'react';

export default function LanguageSelector() {
    const [language, setLanguage] = useState<'en' | 'he'>('en');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const lang = document.cookie.split('; ').find(c => c.startsWith('post_language='))?.split('=')[1];
        if (lang === 'he') setLanguage('he');
    }, []);

    const switchLanguage = async (lang: 'en' | 'he') => {
        setSaving(true);
        setLanguage(lang);
        await fetch('/api/set-language', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ language: lang }),
        });
        setSaving(false);
    };

    return (
        <div className="glass rounded-2xl p-6 mb-4">
            <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-900/60 border border-emerald-700 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                    </svg>
                </div>
                <div>
                    <h2 className="text-sm font-semibold text-white">Post Language</h2>
                    <p className="text-xs text-gray-400 mt-0.5">
                        All generated posts will be in the selected language
                    </p>
                </div>
            </div>

            <div className="flex gap-3">
                <button
                    onClick={() => switchLanguage('en')}
                    disabled={saving}
                    className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer ${language === 'en'
                            ? 'bg-violet-600/20 text-violet-300 border-2 border-violet-500/50 shadow-md shadow-violet-900/20'
                            : 'bg-gray-800/60 text-gray-400 border border-gray-700/50 hover:bg-gray-700/60 hover:text-gray-300'
                        }`}
                >
                    🇺🇸 English
                </button>
                <button
                    onClick={() => switchLanguage('he')}
                    disabled={saving}
                    className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer ${language === 'he'
                            ? 'bg-violet-600/20 text-violet-300 border-2 border-violet-500/50 shadow-md shadow-violet-900/20'
                            : 'bg-gray-800/60 text-gray-400 border border-gray-700/50 hover:bg-gray-700/60 hover:text-gray-300'
                        }`}
                >
                    🇮🇱 עברית
                </button>
            </div>
            {saving && <p className="text-xs text-violet-400 mt-2 animate-pulse">Saving...</p>}
        </div>
    );
}
