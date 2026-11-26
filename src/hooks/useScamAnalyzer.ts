import { useState, useCallback, useRef } from 'react';
import {
  analyzeScamMessage,
  ThreatAnalysisResult,
  AnalyzeScamOptions,
} from '../services/ai/scamAnalyzerService';
import { HybridAIError, HybridAIErrorCode } from '../services/ai/firebaseAILogic';

export type AnalyzerStatus = 'idle' | 'downloading' | 'analyzing' | 'success' | 'error';

export interface UseScamAnalyzerReturn {
  status: AnalyzerStatus;
  downloadProgress: number | null;
  result: ThreatAnalysisResult | null;
  error: string | null;
  errorCode: HybridAIErrorCode | null;
  analyze: (options: Omit<AnalyzeScamOptions, 'onDownloadProgress' | 'signal'>) => Promise<ThreatAnalysisResult | null>;
  cancel: () => void;
  reset: () => void;
}

export function useScamAnalyzer(): UseScamAnalyzerReturn {
  const [status, setStatus] = useState<AnalyzerStatus>('idle');
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [result, setResult] = useState<ThreatAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<HybridAIErrorCode | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const analyze = useCallback(
    async (options: Omit<AnalyzeScamOptions, 'onDownloadProgress' | 'signal'>) => {
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setStatus('analyzing');
      setDownloadProgress(null);
      setError(null);
      setErrorCode(null);

      try {
        const analysisResult = await analyzeScamMessage({
          ...options,
          signal: controller.signal,
          onDownloadProgress: (ratio) => {
            setStatus('downloading');
            setDownloadProgress(Math.round(ratio * 100));
          },
        });
        setResult(analysisResult);
        setDownloadProgress(null);
        setStatus('success');
        return analysisResult;
      } catch (err: unknown) {
        if (err instanceof HybridAIError) {
          setErrorCode(err.code);
          setError(err.message);
        } else {
          setErrorCode('UNKNOWN');
          setError(
            err instanceof Error ? err.message : 'Scam analysis failed unexpectedly.'
          );
        }
        setDownloadProgress(null);
        setStatus('error');
        return null;
      }
    },
    []
  );

  const cancel = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
  }, []);

  const reset = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setStatus('idle');
    setDownloadProgress(null);
    setResult(null);
    setError(null);
    setErrorCode(null);
  }, []);

  return {
    status,
    downloadProgress,
    result,
    error,
    errorCode,
    analyze,
    cancel,
    reset,
  };
}
