import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, FileText, X, Check, Loader2, AlertCircle } from 'lucide-react';
import { extractTransactionsFromPDF, ExtractedTransaction } from '../services/geminiService';

interface PDFUploadProps {
  onTransactionsExtracted: (transactions: ExtractedTransaction[]) => void;
}

export const PDFUpload: React.FC<PDFUploadProps> = ({ onTransactionsExtracted }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = reader.result as string;
        // Remove data:application/pdf;base64, prefix
        resolve(base64String.split(',')[1]);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleFiles = async (files: FileList) => {
    const validFiles = Array.from(files).filter(f => f.type === 'application/pdf');
    
    if (validFiles.length === 0) {
      setError('Please upload PDF files only.');
      return;
    }

    setError(null);
    setIsProcessing(true);
    setSuccess(false);

    try {
      const allExtracted: ExtractedTransaction[] = [];
      
      for (const file of validFiles) {
        const base64 = await fileToBase64(file);
        const extracted = await extractTransactionsFromPDF(base64);
        allExtracted.push(...extracted);
      }
      
      onTransactionsExtracted(allExtracted);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      setError('Failed to extract transactions. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFiles(files);
    }
  }, []);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFiles(files);
    }
  };

  return (
    <div className="w-full">
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          relative group cursor-pointer
          border-2 border-dashed rounded-2xl p-8
          transition-all duration-300 ease-in-out
          flex flex-col items-center justify-center gap-4
          ${isDragging 
            ? 'border-emerald-500 bg-emerald-500/5 scale-[1.02]' 
            : 'border-[#2D2F36] hover:border-[#42454E] bg-[#1A1C23]'
          }
          ${isProcessing ? 'pointer-events-none opacity-80' : ''}
        `}
      >
        <input
          type="file"
          multiple
          ref={fileInputRef}
          onChange={onFileChange}
          accept=".pdf"
          className="hidden"
        />

        <AnimatePresence mode="wait">
          {isProcessing ? (
            <motion.div
              key="processing"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex flex-col items-center gap-3"
            >
              <div className="relative">
                <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-emerald-200" />
                </div>
              </div>
              <p className="text-sm font-medium text-white">Gemini is extracting transactions...</p>
              <p className="text-xs text-[#8E9299]">This usually takes a few seconds</p>
            </motion.div>
          ) : success ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex flex-col items-center gap-2 text-emerald-500"
            >
              <div className="w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center">
                <Check className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold uppercase tracking-widest">Extraction Complete!</p>
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center gap-4 text-center"
            >
              <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center group-hover:bg-white/10 transition-colors">
                <Upload className="w-6 h-6 text-[#8E9299] group-hover:text-white transition-colors" />
              </div>
              <div>
                <p className="text-sm font-medium text-white mb-1">
                  Click to upload or drag & drop bank statement
                </p>
                <p className="text-xs text-[#8E9299]">
                  PDF format only. Powered by Gemini AI.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute -bottom-10 left-0 right-0 flex items-center justify-center gap-2 text-rose-500 text-xs font-medium bg-rose-500/10 py-2 rounded-lg border border-rose-500/20"
          >
            <AlertCircle className="w-3 h-3" />
            {error}
          </motion.div>
        )}
      </div>
    </div>
  );
};
