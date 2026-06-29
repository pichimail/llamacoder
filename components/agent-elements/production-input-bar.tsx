"use client";

import { AttachmentGroup, AttachmentItem } from "@/components/ui/attachment-group";
import { FileAttachment } from "@/components/agent-elements/input/file-attachment";
import {
  InputBar,
  type AttachedFile,
  type AttachedImage,
  type InputBarProps,
} from "@/components/agent-elements/input-bar";

type ProductionInputBarProps = InputBarProps & {
  attachedImages?: AttachedImage[];
  attachedFiles?: AttachedFile[];
};

export function ProductionInputBar({
  attachedImages = [],
  attachedFiles = [],
  onRemoveImage,
  onRemoveFile,
  enableImagePreview = true,
  ...props
}: ProductionInputBarProps) {
  const hasAttachments = attachedImages.length > 0 || attachedFiles.length > 0;

  return (
    <div className="space-y-2">
      {hasAttachments ? (
        <div className="mx-auto w-full max-w-an px-3">
          <AttachmentGroup>
            {attachedImages.map((image) => (
              <AttachmentItem key={image.id}>
                <FileAttachment
                  id={image.id}
                  filename={image.filename}
                  size={image.size}
                  isImage
                  url={image.url}
                  display="image-only"
                  enableImagePreview={enableImagePreview}
                  onRemove={onRemoveImage ? () => onRemoveImage(image.id) : undefined}
                />
              </AttachmentItem>
            ))}
            {attachedFiles.map((file) => (
              <AttachmentItem key={file.id}>
                <FileAttachment
                  id={file.id}
                  filename={file.filename}
                  size={file.size}
                  onRemove={onRemoveFile ? () => onRemoveFile(file.id) : undefined}
                />
              </AttachmentItem>
            ))}
          </AttachmentGroup>
        </div>
      ) : null}
      <InputBar
        {...props}
        attachedImages={[]}
        attachedFiles={[]}
        onRemoveImage={onRemoveImage}
        onRemoveFile={onRemoveFile}
        enableImagePreview={enableImagePreview}
      />
    </div>
  );
}

export type { AttachedFile, AttachedImage };
