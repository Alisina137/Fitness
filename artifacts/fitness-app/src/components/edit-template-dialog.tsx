import React, { useState, useEffect } from "react";
import {
  useUpdateWorkoutTemplate,
  getListUserWorkoutTemplatesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface EditTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateId: number;
  currentName: string;
}

export function EditTemplateDialog({
  open,
  onOpenChange,
  templateId,
  currentName,
}: EditTemplateDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const updateTemplate = useUpdateWorkoutTemplate();

  const [name, setName] = useState(currentName);
  const [inlineError, setInlineError] = useState("");

  // Sync name when dialog opens with a new template
  useEffect(() => {
    if (open) {
      setName(currentName);
      setInlineError("");
    }
  }, [open, currentName]);

  async function handleSave() {
    const trimmed = name.trim();

    if (!trimmed) {
      setInlineError("Template name is required.");
      return;
    }

    setInlineError("");

    try {
      await updateTemplate.mutateAsync({
        id: templateId,
        data: { name: trimmed },
      });

      queryClient.invalidateQueries({
        queryKey: getListUserWorkoutTemplatesQueryKey(),
      });

      onOpenChange(false);
      toast({
        title: "Template updated",
        description: `Renamed to "${trimmed}".`,
      });
    } catch (err: any) {
      const serverMsg: string | undefined = err?.error ?? err?.message;

      if (serverMsg?.toLowerCase().includes("already exists")) {
        setInlineError(
          "A template with this name already exists. Choose a different name.",
        );
      } else if (serverMsg?.toLowerCase().includes("not found")) {
        setInlineError("Template not found. It may have been deleted.");
      } else if (serverMsg) {
        setInlineError(serverMsg);
      } else {
        toast({
          variant: "destructive",
          title: "Could not update template",
          description: "Something went wrong. Please try again.",
        });
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5 text-primary" />
            Edit Template
          </DialogTitle>
          <DialogDescription>
            Update the name for this template. The linked workout won&apos;t be
            changed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 pt-2">
          <label htmlFor="edit-template-name" className="text-sm font-medium">
            Template Name *
          </label>
          <Input
            id="edit-template-name"
            placeholder="e.g., My Push Day"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (inlineError) setInlineError("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
            }}
            className={
              inlineError
                ? "border-destructive focus-visible:ring-destructive"
                : ""
            }
            autoFocus
          />
          {inlineError && (
            <p className="text-xs text-destructive">{inlineError}</p>
          )}
        </div>

        <DialogFooter className="pt-2 gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={updateTemplate.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={updateTemplate.isPending || !name.trim()}
            className="text-black font-bold"
          >
            {updateTemplate.isPending ? "Saving…" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
