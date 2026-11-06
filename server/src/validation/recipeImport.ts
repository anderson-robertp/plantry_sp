import { z } from "zod";

export const previewImportInput = z.object({
  url: z.string().trim().min(8, "Paste the address of a recipe page.").max(2000),
});
export type PreviewImportInput = z.infer<typeof previewImportInput>;
