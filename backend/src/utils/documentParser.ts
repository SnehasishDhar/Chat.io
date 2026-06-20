import fs from "fs";
import pdfParse from "pdf-parse";
import mammoth from "mammoth";

export async function parseDocument(filePath: string, mimeType: string): Promise<string> {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const fileMime = mimeType.toLowerCase();
  
  if (
    fileMime === "text/plain" || 
    fileMime === "text/markdown" || 
    filePath.endsWith(".txt") || 
    filePath.endsWith(".md")
  ) {
    return fs.readFileSync(filePath, "utf-8");
  } 
  
  if (fileMime === "application/pdf" || filePath.endsWith(".pdf")) {
    const buffer = fs.readFileSync(filePath);
    const data = await pdfParse(buffer);
    return data.text || "";
  } 
  
  if (
    fileMime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || 
    filePath.endsWith(".docx")
  ) {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value || "";
  }

  // Fallback: Attempt to read as UTF-8 text
  try {
    return fs.readFileSync(filePath, "utf-8");
  } catch (err: any) {
    throw new Error(`Unsupported file type and failed to parse as text: ${err.message}`);
  }
}
