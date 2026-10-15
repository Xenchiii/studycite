import { getDocumentProxy, extractText as pdfExtract } from "unpdf";
import { unzipSync, strFromU8 } from "fflate";

export const ALLOWED = new Set(["pdf", "docx", "txt", "md"]);

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

function docxText(bytes) {
  const files = unzipSync(bytes, {
    filter: (f) => f.name === "word/document.xml",
  });
  const xml = files["word/document.xml"];
  if (!xml) throw new Error("Not a valid DOCX");
  return strFromU8(xml)
    .replace(/<\/w:p>/g, "\n\n")
    .replace(/<w:(tab|br)\b[^>]*\/>/g, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&(#x?[0-9a-f]+|\w+);/gi, (m, e) => {
      if (e[0] === "#") {
        const code =
          e[1].toLowerCase() === "x"
            ? parseInt(e.slice(2), 16)
            : parseInt(e.slice(1), 10);
        return Number.isFinite(code) ? String.fromCodePoint(code) : m;
      }
      return ENTITIES[e] ?? m;
    });
}

export async function extractText(buffer, ext) {
  const bytes = new Uint8Array(buffer);
  if (ext === "pdf") {
    const pdf = await getDocumentProxy(bytes);
    const { text } = await pdfExtract(pdf, { mergePages: true });
    return text;
  }
  if (ext === "docx") return docxText(bytes);
  return new TextDecoder("utf-8").decode(bytes);
}
