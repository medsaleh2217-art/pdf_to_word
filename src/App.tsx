/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { ConversionCard } from './components/ConversionCard';
import { VisualComparison } from './components/VisualComparison';
import { Features } from './components/Features';
import { Faq } from './components/Faq';
import { Footer } from './components/Footer';
import { getSamplePdfFile } from './utils/sampleDocument';

export default function App() {
  const [limits, setLimits] = useState({ maxMb: 25, maxPages: 60, rateLimit: 30 });
  const [sampleFile, setSampleFile] = useState<File | null>(null);
  const [isProcessingSample, setIsProcessingSample] = useState(false);

  useEffect(() => {
    fetch('/api/limits')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.max_mb) {
          setLimits({
            maxMb: data.max_mb,
            maxPages: data.max_pages,
            rateLimit: data.rate_limit,
          });
        }
      })
      .catch(() => {
        // Fallback default
      });
  }, []);

  const handleTrySample = () => {
    try {
      setIsProcessingSample(true);
      const file = getSamplePdfFile();
      setSampleFile(file);
    } catch (e) {
      console.error('Failed to load sample document', e);
    } finally {
      setIsProcessingSample(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800 antialiased selection:bg-blue-600 selection:text-white">
      {/* Background radial gradient accent */}
      <div className="absolute top-0 inset-x-0 h-96 bg-gradient-to-b from-blue-100/50 via-slate-50/20 to-transparent pointer-events-none -z-10" />

      {/* Main layout */}
      <div className="flex-1">
        <Header
          maxMb={limits.maxMb}
          maxPages={limits.maxPages}
          onTrySample={handleTrySample}
          isProcessingSample={isProcessingSample}
        />

        <main>
          <ConversionCard
            maxMb={limits.maxMb}
            maxPages={limits.maxPages}
            externalFile={sampleFile}
            onClearExternalFile={() => setSampleFile(null)}
          />

          <VisualComparison />

          <Features />

          <Faq maxMb={limits.maxMb} maxPages={limits.maxPages} />
        </main>
      </div>

      <Footer />
    </div>
  );
}
