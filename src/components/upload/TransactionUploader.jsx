import React, { useState, useCallback } from 'react';
import { Upload, FileText, Image, X, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';

export default function TransactionUploader({ onUpload, uploading, setUploading }) {
  const [dragActive, setDragActive] = useState(false);
  const [preview, setPreview] = useState(null);
  
  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);
  
  const handleFile = async (file) => {
    if (!file) return;
    
    const isValid = file.type.startsWith('image/') || file.type === 'application/pdf';
    if (!isValid) {
      alert('Please upload an image or PDF file');
      return;
    }
    
    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview({ type: 'image', url: e.target.result, name: file.name });
      reader.readAsDataURL(file);
    } else {
      setPreview({ type: 'pdf', name: file.name });
    }
    
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    onUpload(file_url);
    setUploading(false);
  };
  
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, []);
  
  const handleChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };
  
  const clearPreview = () => {
    setPreview(null);
    onUpload(null);
  };
  
  return (
    <div className="space-y-4">
      <AnimatePresence mode="wait">
        {preview ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative rounded-xl border-2 border-indigo-200 bg-indigo-50/50 p-4"
          >
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 h-8 w-8 rounded-full bg-white shadow-sm hover:bg-red-50"
              onClick={clearPreview}
            >
              <X className="w-4 h-4 text-slate-500" />
            </Button>
            
            {preview.type === 'image' ? (
              <div className="flex items-center gap-4">
                <img 
                  src={preview.url} 
                  alt="Transaction preview" 
                  className="w-24 h-24 object-cover rounded-lg shadow-sm"
                />
                <div>
                  <p className="font-medium text-slate-900">{preview.name}</p>
                  <p className="text-sm text-emerald-600 flex items-center gap-1 mt-1">
                    {uploading ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      'Ready to submit'
                    )}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <div className="w-24 h-24 bg-white rounded-lg shadow-sm flex items-center justify-center">
                  <FileText className="w-10 h-10 text-indigo-400" />
                </div>
                <div>
                  <p className="font-medium text-slate-900">{preview.name}</p>
                  <p className="text-sm text-emerald-600 flex items-center gap-1 mt-1">
                    {uploading ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      'Ready to submit'
                    )}
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`
              relative rounded-xl border-2 border-dashed transition-all duration-300 cursor-pointer
              ${dragActive 
                ? 'border-indigo-400 bg-indigo-50' 
                : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
              }
            `}
          >
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={handleChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            
            <div className="p-8 text-center">
              <div className={`
                mx-auto w-14 h-14 rounded-full flex items-center justify-center mb-4 transition-colors
                ${dragActive ? 'bg-indigo-100' : 'bg-slate-100'}
              `}>
                <Upload className={`w-6 h-6 ${dragActive ? 'text-indigo-600' : 'text-slate-400'}`} />
              </div>
              
              <p className="font-medium text-slate-900 mb-1">
                Drop your transaction proof here
              </p>
              <p className="text-sm text-slate-500 mb-4">
                or click to browse files
              </p>
              
              <div className="flex items-center justify-center gap-4 text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <Image className="w-3 h-3" /> Images
                </span>
                <span className="flex items-center gap-1">
                  <FileText className="w-3 h-3" /> PDF
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}