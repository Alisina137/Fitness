import React, { useState, useEffect } from "react";
import { useCreateWorkoutTemplate } from "@workspace/api-client-react";
import { LayoutTemplate } from "lucide-react";
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

interface SaveAsTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workoutId: number;
  workoutName: string;
}

export function SaveAsTemplateDialog({
  open,
  onOpenChange,
  workoutId,
  workoutName,
}: SaveAsTemplateDialogProps) {
  const { toast } = useToast();
  const createTemplate = useCreateWorkoutTemplate();

  const [templateName, setTemplateName] = useState("");
  const [inlineError, setInlineError] = useState("");

  // Reset state whenever the dialog opens
  useEffect(() => {
    if (open) {
      setTemplateName("");
      setInlineError("");
    }
  }, [open]);

  async function handleSave() {
    const name = templateName.trim();

    if (!name) {
      setInlineError("Template name is required.");
      return;
    }

    setInlineError("");

    try {
      await createTemplate.mutateAsync({ data: { name, workoutId } });
      onOpenChange(false);
      toast({
        title: "Template saved",
        description: `"${name}" is ready to reuse anytime.`,
      });
    } catch (err: any) {
      // 409 conflict: duplicate name
      const serverMsg: string | undefined =
        err?.error ?? err?.message ?? undefined;

      if (serverMsg?.toLowerCase().includes("already exists")) {
        setInlineError("A template with this name already exists. Choose a different name.");
      } else if (serverMsg) {
        setInlineError(serverMsg);
      } else {
        toast({
          variant: "destructive",
          title: "Could not save template",
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
            <LayoutTemplate className="h-5 w-5 text-primary" />
            Save as Template
          </DialogTitle>
          <DialogDescription>
            Save &ldquo;{workoutName}&rdquo; as a reusable template.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 pt-2">
          <label htmlFor="template-name" className="text-sm font-medium">
            Template Name *
          </label>
          <Input
            id="template-name"
            placeholder="e.g., My Push Day"
            value={templateName}
            onChange={(e) => {
              setTemplateName(e.target.value);
              if (inlineError) setInlineError("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
            }}
            className={inlineError ? "border-destructive focus-visible:ring-destructive" : ""}
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
            disabled={createTemplate.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={createTemplate.isPending || !templateName.trim()}
            className="text-black font-bold"
          >
            {createTemplate.isPending ? "Saving…" : "Save Template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
