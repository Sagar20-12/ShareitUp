import { cn } from "@/lib/utils";
import React, { useState } from "react";
import { IconUpload, IconX, IconQrcode, IconCopy, IconDownload } from "@tabler/icons-react";
import { useDropzone, FileRejection } from "react-dropzone";
import { createClient } from '@/lib/client';
import { Alert, AlertDescription } from "@/components/ui/alert";
import GenerateShortUrl from "@/lib/actionShortUrl";
import { motion, AnimatePresence } from 'framer-motion';
import Confetti from 'react-confetti';
import JSZip from 'jszip';

const supabase = createClient();
const mainVariant = {
  initial: { x: 0, y: 0 },
  animate: { x: 20, y: -20, opacity: 0.9 },
};

const secondaryVariant = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
};

interface FileUploadProps {
  onChange?: (files: File[]) => void;
}
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}
const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children }) => (
  <AnimatePresence>
    {isOpen && (
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-md"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="bg-secondary/80 rounded-xl p-6 w-full max-w-lg relative shadow-2xl border border-gray-700"
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0.8 }}
          onClick={(e) => e.stopPropagation()} 
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 rounded-full hover:bg-neutral-800 transition-colors text-gray-400 hover:text-gray-200"
            aria-label="Close modal"
          >
            <IconX className="w-5 h-5" />
          </button>
          {children}
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

export const FileUpload: React.FC<FileUploadProps> = ({ onChange }) => {
  const [files, setFiles] = useState<File[]>([]);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "complete" | "error">("idle");
  const [downloadUrl, setDownloadUrl] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [showQR, setShowQR] = useState<boolean>(true);
  const [shortUrl, setShortUrl] = useState<string>("");
  const [showConfetti, setShowConfetti] = useState(false);

  const handleFileChange = (newFiles: File[]) => {
    setFiles(prev => [...prev, ...newFiles]);
    onChange?.(newFiles);
    setDownloadUrl("");
    setError("");
    setShowQR(true);
  };

  const createZipFile = async (files: File[]): Promise<Blob> => {
    const zip = new JSZip();
    
    for (const file of files) {
      const arrayBuffer = await file.arrayBuffer();
      zip.file(file.name, arrayBuffer);
    }
    
    return await zip.generateAsync({ type: "blob" });
  };

  const handleUpload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (files.length === 0) {
        throw new Error('Please select at least one file');
    }
    
    setUploadStatus("uploading");
    setError("");
    
    let uploadFile: File | Blob;
    let fileName: string;
    
    if (files.length === 1) {
        // Use the original filename but add random numbers and date
        const fileExt = files[0].name.split('.').pop(); // Get file extension
        const baseFileName = files[0].name.slice(0, -(fileExt?.length ?? 0) - 1); // Remove extension
        const randomNum = Math.floor(Math.random() * 900 + 100); // Random 3-digit number
        const today = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
        fileName = `${baseFileName}-${randomNum}-${today}.${fileExt}`;
        uploadFile = files[0];
    } else {
        // For multiple files, create a zip with random numbers and date
        uploadFile = await createZipFile(files);
        const randomNum = Math.floor(Math.random() * 900 + 100); // Random 3-digit number
        const today = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
        fileName = `archive-${randomNum}-${today}.zip`;
    }
    
    const filePath = `public/${fileName}`;
        const { error: uploadError } = await supabase.storage
            .from('files')
            .upload(filePath, uploadFile, {
                cacheControl: '3600',
                upsert: false,
                contentType: files.length === 1 ? files[0].type : 'application/zip'
            });

        if (uploadError) {
            throw uploadError;
        }

        const { data: { publicUrl } } = supabase.storage
            .from('files')
            .getPublicUrl(filePath);

        const shortURL = await GenerateShortUrl(publicUrl);
        setShortUrl(shortURL);
        setDownloadUrl(publicUrl);
        setUploadStatus("complete");
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 5000);

    } catch (err) {
        console.error('Upload error:', err);
        setError(err instanceof Error ? err.message : 'Error uploading file');
        setUploadStatus("error");
    }
};


  const removeFile = (index: number) => (e: React.MouseEvent) => {
    e.stopPropagation();
    setFiles(prev => prev.filter((_, i) => i !== index));
    if (files.length === 1) {
      onChange?.([]);
      setDownloadUrl("");
      setError("");
      setShowQR(false);
    }
  };

  const copyToClipboard = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(shortUrl);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const toggleQR = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowQR(!showQR);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    multiple: true,
    noClick: false,
    maxSize: 50 * 1024 * 1024,
    onDrop: handleFileChange,
    onDropRejected: (fileRejections: FileRejection[]) => {
      const error = fileRejections[0]?.errors[0]?.message || "File upload failed";
      setError(error);
    },
  });

  const getTotalSize = () => {
    return files.reduce((acc, file) => acc + file.size, 0);
  };

  return (
    <div className="w-full" {...getRootProps()}>
      {showConfetti && (
        <div className="fixed inset-0 z-[60] pointer-events-none">
          <Confetti width={window.innerWidth} height={window.innerHeight} />
        </div>
      )}
      <motion.div
        whileHover="animate"
        className="p-10 group/file block rounded-xl cursor-pointer w-full relative overflow-hidden"
      >
        <input {...getInputProps()} className="hidden" />
        <div className="absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,white,transparent)]">
          <GridPattern />
        </div>
        <div className="flex flex-col items-center justify-center">
          <p className="relative z-20 font-sans font-bold text-neutral-300 text-base">
            Upload files
          </p>
          <p className="relative z-20 font-sans font-normal text-neutral-400 text-base mt-2">
            Drag or drop your files here or click to upload
          </p>
          <div className="relative w-full mt-10 max-w-xl mx-auto">
            {files.length > 0 ? (
              <div onClick={(e) => e.stopPropagation()}>
                <div className="space-y-4">
                  {files.map((file, index) => (
                    <motion.div
                      key={`${file.name}-${index}`}
                      layoutId={`file-upload-${index}`}
                      className={cn(
                        "relative overflow-hidden z-40 bg-neutral-900 flex flex-col items-start justify-start md:h-24 p-4 w-full mx-auto rounded-md",
                        "shadow-sm"
                      )}
                    >
                      <div className="flex justify-between w-full items-center gap-4">
                        <motion.p
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          layout
                          className="text-base text-neutral-300 truncate max-w-xs"
                        >
                          {file.name}
                        </motion.p>
                        <motion.p
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          layout
                          className="rounded-lg px-2 py-1 w-fit flex-shrink-0 text-sm bg-neutral-800 text-white shadow-input"
                        >
                          {(file.size / (1024 * 1024)).toFixed(2)} MB
                        </motion.p>
                      </div>
                      <div className="flex text-sm md:flex-row flex-col items-start md:items-center w-full mt-2 justify-between text-neutral-600 dark:text-neutral-400">
                        <motion.p
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          layout
                          className="px-4 py-0.5 rounded-md bg-neutral-800"
                        >
                          {file.type || 'application/octet-stream'}
                        </motion.p>
                        <motion.p
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          layout
                        >
                          modified {new Date(file.lastModified).toLocaleDateString()}
                        </motion.p>
                      </div>
                      <button
                        onClick={removeFile(index)}
                        className="absolute top-0 right-0 text-green-500 hover:text-neutral-300"
                      >
                        <IconX className="w-5 h-5" />
                      </button>
                    </motion.div>
                  ))}
                </div>

                {files.length > 1 && (
                  <div className="mt-4 p-4 bg-neutral-900 rounded-md">
                    <p className="text-neutral-300">
                      Total Size: {(getTotalSize() / (1024 * 1024)).toFixed(2)} MB
                    </p>
                    <p className="text-neutral-400 text-sm">
                      Files will be compressed into a ZIP archive
                    </p>
                  </div>
                )}

                {!downloadUrl && (
                  <button 
                    onClick={handleUpload}
                    disabled={uploadStatus === "uploading"}
                    className="bg-green-500 text-black px-4 py-2 font-semibold rounded-lg mt-4 w-full hover:bg-green-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploadStatus === "uploading" ? "Uploading..." : "Upload"}
                  </button>
                )}

                {error && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Modal isOpen={Boolean(downloadUrl)} onClose={() => setDownloadUrl('')}>
                  <h2 className="text-2xl font-bold mb-6 text-green-400">Download Ready!</h2>
                  <div className="space-y-6">
                    <div>
                      <p className="text-gray-300 mb-2">Download Link:</p>
                      <div className="flex items-center space-x-2 bg-neutral-900 rounded-lg p-2">
                        <input
                          type="text"
                          value={shortUrl || downloadUrl}
                          readOnly
                          className="bg-transparent text-green-300 flex-grow outline-none"
                        />
                        <button
                          onClick={copyToClipboard}
                          className="p-2 hover:bg-neutral-800 rounded-md transition-colors"
                          aria-label="Copy link"
                        >
                          <IconCopy className="w-5 h-5 text-green-500" />
                        </button>
                        <button
                          onClick={toggleQR}
                          className="p-2 hover:bg-neutral-800 rounded-md transition-colors"
                          aria-label="Toggle QR code"
                        >
                          <IconQrcode className="w-5 h-5 text-green-500" />
                        </button>
                        <a
                          href={downloadUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 hover:bg-neutral-800 rounded-md transition-colors"
                          aria-label="Download file"
                        >
                          <IconDownload className="w-5 h-5 text-green-500" />
                        </a>
                      </div>
                    </div>
                    <AnimatePresence>
                      {showQR && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="flex justify-center overflow-hidden"
                        >
                          <div className="relative w-48 h-48">
                            <img
                              src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                                downloadUrl
                              )}&color=42C773&bgcolor=000000`}
                              alt="QR Code"
                              className="rounded-3xl p-2 border-2 border-green-400"
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </Modal>
              </div>
            ) : (
              <motion.div
                layoutId="file-upload"
                variants={mainVariant}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 20,
                }}
                className={cn(
                  "relative group-hover/file:shadow-2xl z-40 bg-neutral-900 flex items-center justify-center h-32 mt-4 w-full max-w-[8rem] mx-auto rounded-md",
                  "shadow-[0px_10px_50px_rgba(0,0,0,0.1)]"
                )}
              >
                {isDragActive ? (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-neutral-600 flex flex-col items-center"
                  >
                    Drop them
                    <IconUpload className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
                  </motion.p>
                ) : (
                  <IconUpload className="h-4 w-4 text-neutral-600 dark:text-neutral-300" />
                )}
              </motion.div>
            )}
            {!files.length && (
              <motion.div
                variants={secondaryVariant}
                className="absolute opacity-0 border border-dashed border-green-400 inset-0 z-30 bg-transparent flex items-center justify-center h-32 mt-4 w-full max-w-[8rem] mx-auto rounded-md"
              ></motion.div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
export function GridPattern(): JSX.Element {
  const columns = 41;
  const rows = 11;
  return (
    <div className="flex bg-neutral-900 flex-shrink-0 flex-wrap justify-center items-center gap-x-px gap-y-px scale-105">
      {Array.from({ length: rows }).map((_, row) =>
        Array.from({ length: columns }).map((_, col) => {
          const index = row * columns + col;
          return (
            <div
              key={`${col}-${row}`}
              className={`w-10 h-10 flex flex-shrink-0 rounded-[2px] ${
                index % 2 === 0
                  ? "bg-neutral-950"
                  : "bg-neutral-950 shadow-[0px_0px_1px_3px_rgba(0,0,0,1)_inset]"
              }`}
            />
          );
        })
      )}
    </div>
  );
}