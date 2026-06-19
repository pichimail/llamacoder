"use client";

import { memo, useState, useCallback, useEffect } from "react";
import type { ChatStatus } from "ai";
import { cn } from "./utils/cn";

type InputConfig = {
  inputBarPlaceholder: string;
  attachmentButtonPosition: "left" | "right";
  attachmentPreviewStyle: "thumbnail" | "chip" | "hidden";
};

const DEFAULT_INPUT_CONFIG: InputConfig = {
  inputBarPlaceholder: "Send a message...",
  attachmentButtonPosition: "left",
  attachmentPreviewStyle: "thumbnail",
};

function PromptInputControlledSync({ value }: { value: string }) {
  const controller = usePromptInputController();

  useEffect(() => {
    if (controller.textInput.value !== value) {
      controller.textInput.setInput(value);
    }
  }, [controller, value]);

  return null;
}

import {
  IconChevronDown,
  IconChevronUp,
  IconMessageCircleQuestion,
  IconX,
} from "@tabler/icons-react";
import { FileAttachment } from "./input/file-attachment";
import {
  PromptInput,
  PromptInputBody,
  PromptInputButton,
  PromptInputFooter,
  PromptInputHeader,
  PromptInputProvider,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  usePromptInputController,
} from "@/components/ai-elements/prompt-input";
import { Plus } from "lucide-react";
import { useInputTyping } from "./input/input-typing";
import { QuestionPrompt } from "./question/question-prompt";
import { Suggestions, type SuggestionItem } from "./input/suggestions";
import type {
  QuestionAnswer,
  QuestionConfig,
} from "./question/question-prompt";

export type AttachedImage = {
  id: string;
  filename: string;
  url: string;
  size?: number;
};

export type AttachedFile = {
  id: string;
  filename: string;
  size?: number;
};

export type InputBarProps = {
  onSend: (message: { role: "user"; content: string }) => void;
  status: ChatStatus;
  onStop: () => void;
  placeholder?: string;
  className?: string;

  // Attachment support
  onAttach?: () => void;
  attachedImages?: AttachedImage[];
  attachedFiles?: AttachedFile[];
  onRemoveImage?: (id: string) => void;
  onRemoveFile?: (id: string) => void;
  onPaste?: (e: React.ClipboardEvent) => void;
  isDragOver?: boolean;
  /**
   * When true (default) clicking a staged image attachment opens a
   * fullscreen lightbox preview. Set to false to render thumbnails as
   * plain non-interactive previews.
   */
  enableImagePreview?: boolean;

  // Controlled mode
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  suggestions?:
    | SuggestionItem[]
    | {
        items: SuggestionItem[];
        className?: string;
        itemClassName?: string;
      };
  onSuggestionSelect?: (item: SuggestionItem) => void;

  // Typing animation
  typingAnimation?: {
    text: string;
    duration: number;
    image?: string;
    isActive: boolean;
    onComplete: () => void;
  };

  infoBar?: {
    title?: string;
    description?: string;
    onClose?: () => void;
    position?: "top" | "bottom";
    /** Optional primary action rendered on the right (e.g. "Upgrade"). */
    action?: {
      label: string;
      onClick: () => void;
    };
  };

  questionBar?: {
    id: string;
    questions: QuestionConfig[];
    questionIndex?: number;
    totalQuestions?: number;
    onPreviousQuestion?: () => void;
    onNextQuestion?: () => void;
    submitLabel?: string;
    skipLabel?: string;
    allowSkip?: boolean;
    onSubmit: (answer: QuestionAnswer) => void;
    onSkip?: () => void;
  };

  /** Content rendered on the left of the toolbar, next to the attachment button. */
  leftActions?: React.ReactNode;
  /** Content rendered on the right of the toolbar, before the send button. */
  rightActions?: React.ReactNode;
};

export const InputBar = memo(function InputBar({
  onSend,
  status,
  onStop,
  placeholder,
  className,
  onAttach,
  attachedImages = [],
  attachedFiles = [],
  onRemoveImage,
  onRemoveFile,
  onPaste,
  isDragOver,
  enableImagePreview = true,
  value: controlledValue,
  onChange: controlledOnChange,
  disabled,
  autoFocus,
  suggestions = [],
  onSuggestionSelect,
  typingAnimation,
  infoBar,
  questionBar,
  leftActions,
  rightActions,
}: InputBarProps) {
  const [internalInput, setInternalInput] = useState("");
  const [isInfoBarOpen, setIsInfoBarOpen] = useState(true);
  const [dismissedQuestionId, setDismissedQuestionId] = useState<string | null>(
    null,
  );
  const [questionBarIndex, setQuestionBarIndex] = useState(1);
  const isControlled = controlledValue !== undefined;
  const input = isControlled ? controlledValue : internalInput;
  const setInput = useCallback(
    (v: string) => {
      if (isControlled) {
        controlledOnChange?.(v);
      } else {
        setInternalInput(v);
      }
    },
    [isControlled, controlledOnChange],
  );
  const config = DEFAULT_INPUT_CONFIG;

  const isStreaming = status === "streaming" || status === "submitted";
  const isTyping = typingAnimation?.isActive ?? false;

  const { displayedText, showImage } = useInputTyping(
    typingAnimation?.text ?? "",
    typingAnimation?.duration ?? 2000,
    isTyping,
    typingAnimation?.onComplete ?? (() => {}),
  );

  const effectivePlaceholder = placeholder ?? config.inputBarPlaceholder;

  const showAttach = Boolean(onAttach);
  const attachRight = config.attachmentButtonPosition === "right";

  const handleSubmit = useCallback(
    (content: string) => {
      const trimmed = content.trim();
      if (!trimmed || isStreaming || disabled) return;
      onSend({ role: "user", content: trimmed });
      setInput("");
    },
    [isStreaming, disabled, onSend, setInput],
  );

  const handleInfoBarClose = useCallback(() => {
    setIsInfoBarOpen(false);
    infoBar?.onClose?.();
  }, [infoBar]);

  const infoBarPosition = infoBar?.position ?? "top";
  const shouldShowInfoBar = Boolean(
    infoBar && (infoBar.title || infoBar.description),
  );
  const infoBarData = infoBar ?? {};

  const infoBarNode = shouldShowInfoBar ? (
    <div
      className={cn(
        "flex items-center justify-between gap-3 px-3 h-[34px]",
        "transition-all duration-150 ease-out overflow-hidden",
        isInfoBarOpen ? "opacity-100 max-h-[34px]" : "opacity-0 max-h-0",
        infoBarPosition === "top"
          ? "rounded-t-an-input-border-radius"
          : "rounded-b-an-input-border-radius",
      )}
    >
      <div className="min-w-0 truncate text-xs text-an-foreground">
        {infoBarData.title && (
          <span className="font-medium">{infoBarData.title}</span>
        )}
        {infoBarData.description && (
          <span className="text-an-foreground-muted/80">
            {infoBarData.title
              ? ` ${infoBarData.description}`
              : infoBarData.description}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {infoBarData.action && (
          <button
            type="button"
            onClick={infoBarData.action.onClick}
            className="h-6 px-2 rounded-[4px] text-xs font-medium bg-an-primary-color text-an-send-button-color hover:bg-an-primary-color/90 active:scale-[0.98] transition-[background-color,transform] duration-150"
          >
            {infoBarData.action.label}
          </button>
        )}
        {infoBarData.onClose && (
          <button
            type="button"
            onClick={handleInfoBarClose}
            className="shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-md text-an-foreground-muted/70 hover:text-an-foreground hover:bg-an-background-secondary"
            aria-label="Close"
          >
            <IconX className="w-3.5 h-3.5" strokeWidth={2} />
          </button>
        )}
      </div>
    </div>
  ) : null;

  const shouldShowQuestionBar = Boolean(
    questionBar && questionBar.id !== dismissedQuestionId,
  );
  const questionBarData = questionBar;
  const questionSet = questionBarData?.questions ?? [];
  const hasQuestions = questionSet.length > 0;
  const derivedTotal = hasQuestions ? questionSet.length : 1;
  const totalQuestions = questionBarData?.totalQuestions ?? derivedTotal;
  const hasExternalQuestionNavigation = Boolean(
    questionBarData?.onPreviousQuestion || questionBarData?.onNextQuestion,
  );
  const questionIndex = hasExternalQuestionNavigation
    ? (questionBarData?.questionIndex ?? 1)
    : questionBarIndex;
  const clampedQuestionIndex = Math.max(
    1,
    Math.min(questionIndex, totalQuestions),
  );
  const activeQuestion = hasQuestions
    ? questionSet[clampedQuestionIndex - 1]
    : undefined;
  const showQuestionNavigation = totalQuestions > 1;
  const canGoPrev = clampedQuestionIndex > 1;
  const canGoNext = clampedQuestionIndex < totalQuestions;

  const handleQuestionPrevious = useCallback(() => {
    if (!canGoPrev) return;
    if (questionBarData?.onPreviousQuestion) {
      questionBarData.onPreviousQuestion();
      return;
    }
    setQuestionBarIndex((prev) => Math.max(1, prev - 1));
  }, [canGoPrev, questionBarData]);

  const handleQuestionNext = useCallback(() => {
    if (!canGoNext) return;
    if (questionBarData?.onNextQuestion) {
      questionBarData.onNextQuestion();
      return;
    }
    setQuestionBarIndex((prev) => Math.min(totalQuestions, prev + 1));
  }, [canGoNext, questionBarData, totalQuestions]);

  const questionBarNode =
    shouldShowQuestionBar && activeQuestion ? (
      <div
        className={cn(
          "border-t border-x border-border max-w-[calc(100%-24px)] w-full mx-auto",
          !shouldShowInfoBar || infoBarPosition === "bottom"
            ? "rounded-t-an-input-border-radius"
            : null,
        )}
      >
        <div className="h-7 border-b border-border px-3 flex items-center justify-between text-xs text-an-tool-color-muted">
          <div className="inline-flex items-center gap-1.5">
            <IconMessageCircleQuestion className="w-3.5 h-3.5" />
            Question
          </div>
          {showQuestionNavigation && (
            <div className="inline-flex items-center gap-1">
              <button
                type="button"
                onClick={handleQuestionPrevious}
                disabled={!canGoPrev}
                className="size-5 inline-flex items-center justify-center rounded-[4px] hover:bg-an-background-secondary disabled:opacity-40"
                aria-label="Previous question"
              >
                <IconChevronUp className="w-3.5 h-3.5" />
              </button>
              <span>
                {clampedQuestionIndex} of {totalQuestions}
              </span>
              <button
                type="button"
                onClick={handleQuestionNext}
                disabled={!canGoNext}
                className="size-5 inline-flex items-center justify-center rounded-[4px] hover:bg-an-background-secondary disabled:opacity-40"
                aria-label="Next question"
              >
                <IconChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
        <QuestionPrompt
          key={`${clampedQuestionIndex}-${activeQuestion?.title ?? "question"}`}
          questions={questionSet}
          questionIndex={clampedQuestionIndex}
          totalQuestions={totalQuestions}
          submitLabel={questionBarData!.submitLabel}
          skipLabel={questionBarData!.skipLabel}
          allowSkip={questionBarData!.allowSkip}
          onSubmit={(answer) => {
            questionBarData!.onSubmit(answer);
            setDismissedQuestionId(questionBarData!.id);
          }}
          onSkip={() => {
            questionBarData!.onSkip?.();
          }}
        />
      </div>
    ) : null;

  const hasInput = input.trim().length > 0;
  const hasContextItems = attachedImages.length > 0 || attachedFiles.length > 0;
  const showContextItems =
    hasContextItems && config.attachmentPreviewStyle !== "hidden";
  const imageDisplayMode =
    config.attachmentPreviewStyle === "thumbnail" ? "image-only" : "chip";

  const handleSuggestionSelect = useCallback(
    (item: SuggestionItem) => {
      if (disabled || isStreaming) return;
      if (onSuggestionSelect) {
        onSuggestionSelect(item);
        return;
      }
      setInput(item.value ?? item.label);
    },
    [disabled, isStreaming, onSuggestionSelect, setInput],
  );

  const suggestionItems = Array.isArray(suggestions)
    ? suggestions
    : (suggestions?.items ?? []);
  const suggestionsClassName = Array.isArray(suggestions)
    ? undefined
    : suggestions?.className;
  const suggestionItemClassName = Array.isArray(suggestions)
    ? undefined
    : suggestions?.itemClassName;

  return (
    <div className={cn("shrink-0 px-3 pb-3", className)}>
      <div className="mx-auto max-w-an">
        <div
          className={cn(
            "flex flex-col gap-0",
            shouldShowInfoBar
              ? "bg-an-background-tertiary rounded-an-input-border-radius"
              : null,
          )}
        >
          {infoBarPosition === "top" && infoBarNode}
          {questionBarNode}
          <PromptInputProvider initialInput={input}>
            <PromptInputControlledSync value={input} />
            <PromptInput
              className={cn(
                "rounded-an-input-border-radius border-an-input-border-color/80 bg-an-input-background shadow-none",
                isDragOver && "border-an-primary-color/50",
              )}
              onSubmit={(message) => {
                handleSubmit(message.text);
              }}
            >
              {showContextItems ? (
                <PromptInputHeader className="gap-[6px] px-an-context-padding pt-an-context-padding pb-0.5">
                  {attachedImages.map((img) => (
                    <FileAttachment
                      key={img.id}
                      id={img.id}
                      filename={img.filename}
                      size={img.size}
                      isImage
                      url={img.url}
                      display={imageDisplayMode}
                      enableImagePreview={enableImagePreview}
                      onRemove={
                        onRemoveImage ? () => onRemoveImage(img.id) : undefined
                      }
                    />
                  ))}
                  {attachedFiles.map((file) => (
                    <FileAttachment
                      key={file.id}
                      id={file.id}
                      filename={file.filename}
                      size={file.size}
                      onRemove={
                        onRemoveFile ? () => onRemoveFile(file.id) : undefined
                      }
                    />
                  ))}
                </PromptInputHeader>
              ) : null}

              <PromptInputBody>
                {isTyping && typingAnimation?.image && showImage ? (
                  <div className="flex flex-wrap gap-2 px-3 pt-3">
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md">
                      <img
                        src={typingAnimation.image}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </div>
                  </div>
                ) : null}

                {isTyping ? (
                  <div className="min-h-16 px-3.5 py-3 text-[14px] leading-[1.6] text-an-foreground-muted">
                    <span>{displayedText}</span>
                    <span className="ml-px inline-block h-[1em] w-[2px] animate-an-blink bg-an-foreground align-text-bottom" />
                  </div>
                ) : (
                  <PromptInputTextarea
                    placeholder={effectivePlaceholder}
                    aria-label={effectivePlaceholder}
                    disabled={disabled}
                    autoFocus={autoFocus}
                    onPaste={onPaste}
                    onChange={(event) => setInput(event.currentTarget.value)}
                    className="min-h-11 border-0 bg-transparent px-3.5 py-3 text-[14px] leading-[1.6] text-an-foreground shadow-none placeholder:text-an-input-placeholder-color focus-visible:ring-0"
                  />
                )}
              </PromptInputBody>

              <PromptInputFooter className="px-2 pb-2 pt-1">
                <PromptInputTools className="min-w-0">
                  {!attachRight && showAttach && onAttach ? (
                    <PromptInputButton
                      aria-label="Attach file"
                      onClick={onAttach}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Plus className="size-4" />
                    </PromptInputButton>
                  ) : null}
                  {leftActions}
                </PromptInputTools>
                <PromptInputTools>
                  {rightActions}
                  {attachRight && showAttach && onAttach ? (
                    <PromptInputButton
                      aria-label="Attach file"
                      onClick={onAttach}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Plus className="size-4" />
                    </PromptInputButton>
                  ) : null}
                  <PromptInputSubmit
                    status={status}
                    onStop={onStop}
                    disabled={disabled || (!hasInput && !isStreaming)}
                    className="bg-an-primary-color text-an-send-button-color hover:bg-an-primary-color/90"
                  />
                </PromptInputTools>
              </PromptInputFooter>
            </PromptInput>
          </PromptInputProvider>
          {suggestionItems.length > 0 && (
            <Suggestions
              items={suggestionItems}
              onSelect={handleSuggestionSelect}
              disabled={disabled || isStreaming}
              className={cn("mt-4 px-3", suggestionsClassName)}
              itemClassName={suggestionItemClassName}
            />
          )}
          {infoBarPosition === "bottom" && infoBarNode}
        </div>
      </div>
    </div>
  );
});
