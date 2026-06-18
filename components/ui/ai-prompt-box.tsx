"use client";

import React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowUp,
  FileText,
  Square,
  X,
  StopCircle,
  Mic,
  Globe,
  BrainCog,
  FolderCode,
  Plus,
  Github,
} from "lucide-react";
import { motion } from "framer-motion";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";

const PROMPT_BOX_STYLES = `
  .ai-prompt-box textarea::-webkit-scrollbar {
    width: 6px;
  }
  .ai-prompt-box textarea::-webkit-scrollbar-track {
    background: transparent;
  }
  .ai-prompt-box textarea::-webkit-scrollbar-thumb {
    background-color: #444444;
    border-radius: 3px;
  }
  .ai-prompt-box textarea::-webkit-scrollbar-thumb:hover {
    background-color: #555555;
  }
`;

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  className?: string;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      className={cn(
        "flex min-h-[44px] w-full resize-none rounded-md border-none bg-transparent px-3 py-2.5 text-base text-gray-100 placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      ref={ref}
      rows={1}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";

const TooltipProvider = TooltipPrimitive.Provider;
const Tooltip = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;
const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      "z-50 overflow-hidden rounded-md border border-[#333333] bg-[#1F2023] px-3 py-1.5 text-sm text-white shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
      className,
    )}
    {...props}
  />
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

const Dialog = DialogPrimitive.Root;
const DialogPortal = DialogPrimitive.Portal;
const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className,
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-[90vw] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-2xl border border-[#333333] bg-[#1F2023] p-0 shadow-xl duration-300 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 md:max-w-[800px]",
        className,
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 z-10 rounded-full bg-[#2E3033]/80 p-2 transition-all hover:bg-[#2E3033]">
        <X className="h-5 w-5 text-gray-200 hover:text-white" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold leading-none tracking-tight text-gray-100", className)}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    const variantClasses = {
      default: "bg-white hover:bg-white/80 text-black",
      outline: "border border-[#444444] bg-transparent hover:bg-[#3A3A40]",
      ghost: "bg-transparent hover:bg-[#3A3A40]",
    };
    const sizeClasses = {
      default: "h-10 px-4 py-2",
      sm: "h-8 px-3 text-sm",
      lg: "h-12 px-6",
      icon: "h-8 w-8 rounded-full aspect-[1/1]",
    };
    return (
      <button
        className={cn(
          "inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

interface VoiceRecorderProps {
  isRecording: boolean;
  onStartRecording: () => void;
  onStopRecording: (duration: number) => void;
  visualizerBars?: number;
}

const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  isRecording,
  onStartRecording,
  onStopRecording,
  visualizerBars = 32,
}) => {
  const [time, setTime] = React.useState(0);
  const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const wasRecordingRef = React.useRef(false);

  React.useEffect(() => {
    if (isRecording && !wasRecordingRef.current) {
      onStartRecording();
      setTime(0);
      timerRef.current = setInterval(() => setTime((t) => t + 1), 1000);
    }

    if (!isRecording && wasRecordingRef.current) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      onStopRecording(time);
      setTime(0);
    }

    wasRecordingRef.current = isRecording;

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording, onStartRecording, onStopRecording, time]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div
      className={cn(
        "flex w-full flex-col items-center justify-center py-3 transition-all duration-300",
        isRecording ? "opacity-100" : "h-0 opacity-0",
      )}
    >
      <div className="mb-3 flex items-center gap-2">
        <div className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
        <span className="font-mono text-sm text-white/80">{formatTime(time)}</span>
      </div>
      <div className="flex h-10 w-full items-center justify-center gap-0.5 px-4">
        {[...Array(visualizerBars)].map((_, i) => (
          <div
            key={i}
            className="w-0.5 animate-pulse rounded-full bg-white/50"
            style={{
              height: `${Math.max(15, ((i * 17) % 85) + 15)}%`,
              animationDelay: `${i * 0.05}s`,
              animationDuration: `${0.5 + (i % 5) * 0.1}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
};

interface ImageViewDialogProps {
  imageUrl: string | null;
  onClose: () => void;
}

const ImageViewDialog: React.FC<ImageViewDialogProps> = ({ imageUrl, onClose }) => {
  if (!imageUrl) return null;
  return (
    <Dialog open={!!imageUrl} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[90vw] border-none bg-transparent p-0 shadow-none md:max-w-[800px]">
        <DialogTitle className="sr-only">Image Preview</DialogTitle>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="relative overflow-hidden rounded-2xl bg-[#1F2023] shadow-2xl"
        >
          <img
            src={imageUrl}
            alt="Full preview"
            className="max-h-[80vh] w-full rounded-2xl object-contain"
          />
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};

interface PromptInputContextType {
  isLoading: boolean;
  value: string;
  setValue: (value: string) => void;
  maxHeight: number | string;
  onSubmit?: () => void;
  disabled?: boolean;
}

const PromptInputContext = React.createContext<PromptInputContextType>({
  isLoading: false,
  value: "",
  setValue: () => {},
  maxHeight: 240,
  onSubmit: undefined,
  disabled: false,
});

function usePromptInput() {
  const context = React.useContext(PromptInputContext);
  if (!context) throw new Error("usePromptInput must be used within a PromptInput");
  return context;
}

interface PromptInputProps {
  isLoading?: boolean;
  value?: string;
  onValueChange?: (value: string) => void;
  maxHeight?: number | string;
  onSubmit?: () => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  onDragOver?: (e: React.DragEvent) => void;
  onDragLeave?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
}

const PromptInput = React.forwardRef<HTMLDivElement, PromptInputProps>(
  (
    {
      className,
      isLoading = false,
      maxHeight = 240,
      value,
      onValueChange,
      onSubmit,
      children,
      disabled = false,
      onDragOver,
      onDragLeave,
      onDrop,
    },
    ref,
  ) => {
    const [internalValue, setInternalValue] = React.useState(value || "");
    const handleChange = (newValue: string) => {
      setInternalValue(newValue);
      onValueChange?.(newValue);
    };

    React.useEffect(() => {
      if (value !== undefined) setInternalValue(value);
    }, [value]);

    return (
      <TooltipProvider>
        <PromptInputContext.Provider
          value={{
            isLoading,
            value: value ?? internalValue,
            setValue: onValueChange ?? handleChange,
            maxHeight,
            onSubmit,
            disabled,
          }}
        >
          <div
            ref={ref}
            className={cn(
              "ai-prompt-box rounded-3xl border border-[#444444] bg-[#1F2023] p-2 shadow-[0_8px_30px_rgba(0,0,0,0.24)] transition-all duration-300",
              isLoading && "border-red-500/70",
              className,
            )}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
          >
            {children}
          </div>
        </PromptInputContext.Provider>
      </TooltipProvider>
    );
  },
);
PromptInput.displayName = "PromptInput";

interface PromptInputTextareaProps {
  disableAutosize?: boolean;
  placeholder?: string;
}

const PromptInputTextarea: React.FC<
  PromptInputTextareaProps & React.ComponentProps<typeof Textarea>
> = ({ className, onKeyDown, disableAutosize = false, placeholder, ...props }) => {
  const { value, setValue, maxHeight, onSubmit, disabled } = usePromptInput();
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    if (disableAutosize || !textareaRef.current) return;
    textareaRef.current.style.height = "auto";
    textareaRef.current.style.height =
      typeof maxHeight === "number"
        ? `${Math.min(textareaRef.current.scrollHeight, maxHeight)}px`
        : `min(${textareaRef.current.scrollHeight}px, ${maxHeight})`;
  }, [value, maxHeight, disableAutosize]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit?.();
    }
    onKeyDown?.(e);
  };

  return (
    <Textarea
      ref={textareaRef}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={handleKeyDown}
      className={cn("text-base", className)}
      disabled={disabled}
      placeholder={placeholder}
      {...props}
    />
  );
};

interface PromptInputActionsProps extends React.HTMLAttributes<HTMLDivElement> {}

const PromptInputActions: React.FC<PromptInputActionsProps> = ({
  children,
  className,
  ...props
}) => (
  <div className={cn("flex items-center gap-2", className)} {...props}>
    {children}
  </div>
);

interface PromptInputActionProps extends React.ComponentProps<typeof Tooltip> {
  tooltip: React.ReactNode;
  children: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  className?: string;
}

const PromptInputAction: React.FC<PromptInputActionProps> = ({
  tooltip,
  children,
  className,
  side = "top",
  ...props
}) => {
  const { disabled } = usePromptInput();
  return (
    <Tooltip {...props}>
      <TooltipTrigger asChild disabled={disabled}>
        {children}
      </TooltipTrigger>
      <TooltipContent side={side} className={className}>
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
};

export interface PromptInputBoxProps {
  onSend?: (message: string, files?: File[]) => void;
  onRepoImported?: (chatId: string) => void;
  onStop?: () => void;
  isLoading?: boolean;
  placeholder?: string;
  className?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  thinkEnabled?: boolean;
  onThinkChange?: (enabled: boolean) => void;
  showVoice?: boolean;
  accept?: string;
  maxFileSizeMb?: number;
  toolbarEnd?: React.ReactNode;
}

export const PromptInputBox = React.forwardRef<HTMLDivElement, PromptInputBoxProps>(
  (props, ref) => {
    const {
      onSend = () => {},
      onRepoImported,
      onStop,
      isLoading = false,
      placeholder = "Type your message here...",
      className,
      value: controlledValue,
      onValueChange,
      disabled = false,
      thinkEnabled,
      onThinkChange,
      showVoice = false,
      accept = "image/*",
      maxFileSizeMb = 10,
      toolbarEnd,
    } = props;

    const [input, setInput] = React.useState(controlledValue ?? "");
    const [files, setFiles] = React.useState<File[]>([]);
    const [filePreviews, setFilePreviews] = React.useState<Record<string, string>>({});
    const [selectedImage, setSelectedImage] = React.useState<string | null>(null);
    const [isRecording, setIsRecording] = React.useState(false);
    const [showGitHubImport, setShowGitHubImport] = React.useState(false);
    const [gitHubUrl, setGitHubUrl] = React.useState("");
    const [isImportingGitHub, setIsImportingGitHub] = React.useState(false);
    const [addMenuOpen, setAddMenuOpen] = React.useState(false);
    const [showSearch, setShowSearch] = React.useState(false);
    const [showThink, setShowThink] = React.useState(thinkEnabled ?? false);
    const [showCanvas, setShowCanvas] = React.useState(false);
    const uploadInputRef = React.useRef<HTMLInputElement>(null);
    const promptBoxRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
      if (controlledValue !== undefined) setInput(controlledValue);
    }, [controlledValue]);

    React.useEffect(() => {
      if (thinkEnabled !== undefined) setShowThink(thinkEnabled);
    }, [thinkEnabled]);

    React.useEffect(() => {
      if (!showGitHubImport) {
        setGitHubUrl("");
      }
    }, [showGitHubImport]);

    React.useEffect(() => {
      if (showGitHubImport) {
        setAddMenuOpen(false);
      }
    }, [showGitHubImport]);

    React.useEffect(() => {
      if (typeof document === "undefined") return;
      const id = "ai-prompt-box-styles";
      if (document.getElementById(id)) return;
      const styleSheet = document.createElement("style");
      styleSheet.id = id;
      styleSheet.innerText = PROMPT_BOX_STYLES;
      document.head.appendChild(styleSheet);
    }, []);

    const setPromptValue = (next: string) => {
      setInput(next);
      onValueChange?.(next);
    };

    const handleToggleChange = (value: string) => {
      if (value === "search") {
        setShowSearch((prev) => !prev);
        setShowThink(false);
        onThinkChange?.(false);
      } else if (value === "think") {
        const next = !showThink;
        setShowThink(next);
        setShowSearch(false);
        onThinkChange?.(next);
      }
    };

    const handleCanvasToggle = () => setShowCanvas((prev) => !prev);

    const isImageFile = (file: File) => file.type.startsWith("image/");

    const processFile = React.useCallback(
      (file: File) => {
        if (file.size > maxFileSizeMb * 1024 * 1024) return;
        setFiles([file]);
        if (isImageFile(file)) {
          const reader = new FileReader();
          reader.onload = (e) =>
            setFilePreviews({ [file.name]: e.target?.result as string });
          reader.readAsDataURL(file);
        } else {
          setFilePreviews({});
        }
      },
      [maxFileSizeMb],
    );

    const handleDragOver = React.useCallback((e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    }, []);

    const handleDragLeave = React.useCallback((e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    }, []);

    const handleDrop = React.useCallback(
      (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const dropped = Array.from(e.dataTransfer.files);
        if (dropped.length > 0) processFile(dropped[0]);
      },
      [processFile],
    );

    const handleRemoveFile = () => {
      setFiles([]);
      setFilePreviews({});
    };

    const openImageModal = (imageUrl: string) => setSelectedImage(imageUrl);

    const handleImportGitHub = React.useCallback(async () => {
      const url = gitHubUrl.trim();
      if (!url) {
        toast({
          title: "GitHub URL required",
          description: "Paste a public GitHub repository or file URL.",
          variant: "destructive",
        });
        return;
      }

      const looksLikeRepo =
        /github\.com\/[^/]+\/[^/]+(?:\.git)?\/?$/i.test(url) ||
        /github\.com\/[^/]+\/[^/]+\/tree\//i.test(url);

      setIsImportingGitHub(true);
      try {
        if (looksLikeRepo) {
          const response = await fetch("/api/import-github-repo", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url }),
          });
          const body = await response.json().catch(() => null);
          if (!response.ok) {
            throw new Error(body?.error || "Could not import GitHub repository");
          }

          toast({
            title: "Repository imported",
            description: `${body.fileCount ?? 0} files loaded. Opening live preview…`,
          });
          setShowGitHubImport(false);
          if (body.chatId) onRepoImported?.(body.chatId);
          return;
        }

        const response = await fetch("/api/github-import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });
        if (!response.ok) {
          const body = await response.json().catch(() => null);
          throw new Error(body?.error || "Could not import from GitHub");
        }

        const filename = response.headers.get("x-filename") || "github-import";
        const contentType = response.headers.get("content-type") || "text/plain";
        const blob = await response.blob();
        const file = new File([blob], filename, { type: contentType });
        processFile(file);
        setShowGitHubImport(false);
      } catch (error) {
        toast({
          title: "Import failed",
          description: error instanceof Error ? error.message : "Could not import from GitHub.",
          variant: "destructive",
        });
      } finally {
        setIsImportingGitHub(false);
      }
    }, [gitHubUrl, onRepoImported, processFile]);

    const handlePaste = React.useCallback(
      (e: ClipboardEvent) => {
        const items = e.clipboardData?.items;
        if (!items) return;
        for (const item of Array.from(items)) {
          if (!item.type.startsWith("image/")) continue;
          const file = item.getAsFile();
          if (!file) continue;
          e.preventDefault();
          processFile(file);
          break;
        }
      },
      [processFile],
    );

    React.useEffect(() => {
      document.addEventListener("paste", handlePaste);
      return () => document.removeEventListener("paste", handlePaste);
    }, [handlePaste]);

    const handleSubmit = () => {
      if (!input.trim() && files.length === 0) return;
      let messagePrefix = "";
      if (showSearch) messagePrefix = "[Search: ";
      else if (showThink) messagePrefix = "[Think: ";
      else if (showCanvas) messagePrefix = "[Canvas: ";
      const formattedInput = messagePrefix ? `${messagePrefix}${input}]` : input;
      onSend(formattedInput, files);
      setPromptValue("");
      setFiles([]);
      setFilePreviews({});
    };

    const handleStartRecording = () => undefined;

    const handleStopRecording = (duration: number) => {
      setIsRecording(false);
      onSend(`[Voice message - ${duration} seconds]`, []);
    };

    const hasContent = input.trim() !== "" || files.length > 0;
    const isDisabled = disabled || isLoading || isRecording;

    return (
      <>
        <PromptInput
          value={input}
          onValueChange={setPromptValue}
          isLoading={isLoading}
          onSubmit={handleSubmit}
          className={cn(
            "w-full border-[#444444] bg-[#1F2023] shadow-[0_8px_30px_rgba(0,0,0,0.24)] transition-all duration-300 ease-in-out",
            isRecording && "border-red-500/70",
            className,
          )}
          disabled={isDisabled}
          ref={ref ?? promptBoxRef}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {files.length > 0 && !isRecording && (
            <div className="flex flex-wrap gap-2 p-0 pb-1 transition-all duration-300">
              {files.map((file, index) => (
                <div key={`${file.name}-${index}`} className="group relative">
                  {file.type.startsWith("image/") && filePreviews[file.name] ? (
                    <button
                      type="button"
                      className="h-16 w-16 cursor-pointer overflow-hidden rounded-xl transition-all duration-300"
                      onClick={() => openImageModal(filePreviews[file.name])}
                      aria-label={`Preview ${file.name}`}
                    >
                      <img
                        src={filePreviews[file.name]}
                        alt={file.name}
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveFile();
                        }}
                        className="absolute right-1 top-1 rounded-full bg-black/70 p-0.5 opacity-100 transition-opacity"
                        aria-label={`Remove ${file.name}`}
                      >
                        <X className="h-3 w-3 text-white" aria-hidden="true" />
                      </button>
                    </button>
                  ) : (
                    <div className="flex h-16 min-w-[120px] items-center gap-2 rounded-xl border border-[#444444] bg-[#2E3033] px-3">
                      <FileText className="h-4 w-4 text-[#9CA3AF]" />
                      <span className="max-w-[96px] truncate text-xs text-gray-200">
                        {file.name}
                      </span>
                      <button
                        type="button"
                        onClick={handleRemoveFile}
                        className="rounded-full bg-black/70 p-0.5"
                        aria-label={`Remove ${file.name}`}
                      >
                        <X className="h-3 w-3 text-white" aria-hidden="true" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div
            className={cn(
              "transition-all duration-300",
              isRecording ? "h-0 overflow-hidden opacity-0" : "opacity-100",
            )}
          >
            <PromptInputTextarea
              placeholder={
                showSearch
                  ? "Search the web..."
                  : showThink
                    ? "Think deeply..."
                    : showCanvas
                      ? "Create on canvas..."
                      : placeholder
              }
              aria-label="Message"
              className="text-base"
            />
          </div>

          {isRecording && (
            <VoiceRecorder
              isRecording={isRecording}
              onStartRecording={handleStartRecording}
              onStopRecording={handleStopRecording}
            />
          )}

          <PromptInputActions className="flex items-center justify-between gap-2 p-0 pt-2">
            <div
              className={cn(
                "flex items-center gap-1 transition-opacity duration-300",
                isRecording ? "invisible h-0 opacity-0" : "visible opacity-100",
              )}
            >
              <DropdownMenu open={addMenuOpen} onOpenChange={setAddMenuOpen}>
                <PromptInputAction tooltip="Add files, GitHub, or modes">
                  <DropdownMenuTrigger asChild>
                    <motion.button
                      type="button"
                      aria-label="Add options"
                      disabled={isRecording || disabled}
                      whileHover={{ rotate: 90, scale: 1.06 }}
                      whileTap={{ rotate: 135, scale: 0.96 }}
                      transition={{ type: "spring", stiffness: 320, damping: 18 }}
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-full border border-[#353535] bg-[#2A2A2E] text-[#D1D5DB] transition-colors",
                        "hover:border-[#5b5b62] hover:bg-[#34343a] hover:text-white disabled:cursor-not-allowed disabled:opacity-40",
                      )}
                    >
                      <Plus className="h-4 w-4" aria-hidden="true" />
                    </motion.button>
                  </DropdownMenuTrigger>
                </PromptInputAction>
                <DropdownMenuContent
                  align="start"
                  sideOffset={10}
                  className="z-[999] w-64 rounded-2xl border border-[#36363a] bg-[#1F2023] p-2 text-[#F4F4F5] shadow-2xl"
                >
                  <DropdownMenuLabel className="px-2 py-1 text-xs font-medium text-[#A1A1AA]">
                    Actions
                  </DropdownMenuLabel>
                  <DropdownMenuItem
                    className="flex cursor-pointer items-center gap-2 rounded-xl px-2.5 py-2 text-sm outline-none transition hover:bg-white/5 focus:bg-white/5"
                    onSelect={(event) => {
                      setAddMenuOpen(false);
                      uploadInputRef.current?.click();
                    }}
                  >
                    <FileText className="h-4 w-4" />
                    Upload file
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="flex cursor-pointer items-center gap-2 rounded-xl px-2.5 py-2 text-sm outline-none transition hover:bg-white/5 focus:bg-white/5"
                    onSelect={(event) => {
                      setAddMenuOpen(false);
                      setShowGitHubImport(true);
                    }}
                  >
                    <Github className="h-4 w-4" />
                    Import from GitHub
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="my-2 h-px bg-white/10" />
                  <DropdownMenuItem
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-xl px-2.5 py-2 text-sm outline-none transition hover:bg-white/5 focus:bg-white/5",
                      showSearch && "text-cyan-300",
                    )}
                    onSelect={(event) => {
                      setAddMenuOpen(false);
                      handleToggleChange("search");
                    }}
                  >
                    <Globe className="h-4 w-4" />
                    Web search
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-xl px-2.5 py-2 text-sm outline-none transition hover:bg-white/5 focus:bg-white/5",
                      showThink && "text-violet-300",
                    )}
                    onSelect={(event) => {
                      setAddMenuOpen(false);
                      handleToggleChange("think");
                    }}
                  >
                    <BrainCog className="h-4 w-4" />
                    Deep thinking
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-xl px-2.5 py-2 text-sm outline-none transition hover:bg-white/5 focus:bg-white/5",
                      showCanvas && "text-orange-300",
                    )}
                    onSelect={(event) => {
                      setAddMenuOpen(false);
                      handleCanvasToggle();
                    }}
                  >
                    <FolderCode className="h-4 w-4" />
                    Canvas
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <input
                ref={uploadInputRef}
                type="file"
                className="hidden"
                aria-label="Attach file"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    processFile(e.target.files[0]);
                  }
                  if (e.target) e.target.value = "";
                }}
                accept={accept}
                disabled={disabled}
              />
            </div>

            <div className="flex items-center gap-1.5">
              {toolbarEnd}
              <PromptInputAction
                tooltip={
                  isLoading
                    ? "Stop generation"
                    : isRecording
                      ? "Stop recording"
                      : hasContent
                        ? "Send message"
                        : showVoice
                          ? "Voice message"
                          : "Send message"
                }
              >
                <Button
                  variant="default"
                  size="icon"
                  aria-label={
                    isLoading
                      ? "Stop generation"
                      : isRecording
                        ? "Stop recording"
                        : hasContent
                          ? "Send message"
                          : showVoice
                            ? "Start voice recording"
                            : "Send message"
                  }
                  className={cn(
                    "h-8 w-8 rounded-full transition-all duration-200",
                    isRecording
                      ? "bg-transparent text-red-500 hover:bg-gray-600/30 hover:text-red-400"
                      : hasContent
                        ? "bg-white text-[#1F2023] hover:bg-white/80"
                        : "bg-transparent text-[#9CA3AF] hover:bg-gray-600/30 hover:text-[#D1D5DB]",
                  )}
                  onClick={() => {
                    if (isLoading && onStop) {
                      onStop();
                      return;
                    }
                    if (isRecording) setIsRecording(false);
                    else if (hasContent) handleSubmit();
                    else if (showVoice) setIsRecording(true);
                  }}
                  disabled={disabled && !hasContent}
                >
                  {isLoading ? (
                    <Square className="h-4 w-4 animate-pulse fill-[#1F2023]" />
                  ) : isRecording ? (
                    <StopCircle className="h-5 w-5 text-red-500" />
                  ) : hasContent ? (
                    <ArrowUp className="h-4 w-4 text-[#1F2023]" />
                  ) : showVoice ? (
                    <Mic className="h-5 w-5 text-[#1F2023] transition-colors" />
                  ) : (
                    <ArrowUp className="h-4 w-4 text-[#9CA3AF]" />
                  )}
                </Button>
              </PromptInputAction>
            </div>
          </PromptInputActions>
        </PromptInput>

        <Dialog open={showGitHubImport} onOpenChange={setShowGitHubImport}>
          <DialogContent className="max-w-[560px] border-[#343438] bg-[#1F2023]">
            <DialogTitle className="px-6 pt-6 text-white">Import from GitHub</DialogTitle>
            <div className="space-y-4 px-6 pb-6">
              <p className="text-sm text-[#A1A1AA]">
                Paste any public GitHub repository URL to import the project, install dependencies from
                package.json, and open a live sandbox preview. Single file URLs still work too.
              </p>
              <Input
                value={gitHubUrl}
                onChange={(e) => setGitHubUrl(e.target.value)}
                placeholder="https://github.com/owner/repo"
                aria-label="GitHub repository or file URL"
                className="border-[#343438] bg-[#111113] text-white placeholder:text-[#71717a]"
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowGitHubImport(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => void handleImportGitHub()}
                  disabled={isImportingGitHub}
                >
                  {isImportingGitHub ? "Importing..." : "Import project"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <ImageViewDialog imageUrl={selectedImage} onClose={() => setSelectedImage(null)} />
      </>
    );
  },
);
PromptInputBox.displayName = "PromptInputBox";
