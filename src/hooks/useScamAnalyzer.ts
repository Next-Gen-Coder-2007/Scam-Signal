import { useState, useCallback } from 'react';
import {
  analyzeScamMessage,
  ThreatAnalysisResult,
  AnalyzeScamOptions,
} from '../services/ai/scamAnalyzerService';

export interface UseScamAnalyzerReturn {
  status: 'idle' | 'analyzing' | 'success' | 'error';
  result: ThreatAnalysisResult | null;
  error: string | null;
  analyze: (options: AnalyzeScamOptions) => Promise<ThreatAnalysisResult | null>;
  reset: () => void;
}

export function useScamAnalyzer(): UseScamAnalyzerReturn {
  const [status, setStatus] = useState<'idle' | 'analyzing' | 'success' | 'error'>('idle');
  const [result, setResult] = useState<ThreatAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyze = useCallback(async (options: AnalyzeScamOptions) => {
    setStatus('analyzing');
    setError(null);

    try {
      const analysisResult = await analyzeScamMessage(options);
      setResult(analysisResult);
      setStatus('success');
      return analysisResult;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Scam analysis failed unexpectedly.';
      setError(message);
      setStatus('error');
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    setStatus('idle');
    setResult(null);
    setError(null);
  }, []);

  return {
    status,
    result,
    error,
    analyze,
    reset,
  };
}
