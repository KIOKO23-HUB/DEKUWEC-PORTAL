/**
 * Minimal dependency-free PDF writer for admin tables. It only needs the
 * standard Helvetica fonts, so it works on serverless runtimes without native
 * libraries or extra packages.
 */

import { DEKUWEC_LOGO_JPEG } from "./dekuwec-logo";

const PAGE_WIDTH = 842; // A4 landscape
const PAGE_HEIGHT = 595;
const MARGIN = 36;
const ROW_HEIGHT = 20;
const ROWS_PER_PAGE = 18;
const LOGO_SIZE = 46;
const HEADER_GREEN = "0.05 0.30 0.18";

type Column = { header: string; width: number };

const COLUMNS: Column[] = [
  { header: "Participant", width: 160 },
  { header: "Reg. No", width: 105 },
  { header: "Phone", width: 105 },
  { header: "Email", width: 190 },
  { header: "Ticket", width: 95 },
  { header: "Paid", width: 60 },
  { header: "Poster", width: 55 },
];

const TABLE_WIDTH = COLUMNS.reduce((total, column) => total + column.width, 0);

function ascii(value: unknown): string {
  return String(value ?? "")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\r?\n/g, " ")
    .replace(/[^\x20-\x7E]/g, "?");
}

function escapePdf(value: unknown): string {
  return ascii(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function fit(value: unknown, width: number, fontSize = 9): string {
  const text = ascii(value);
  const maxChars = Math.max(3, Math.floor((width - 8) / (fontSize * 0.5)));
  return text.length > maxChars ? `${text.slice(0, maxChars - 1)}...` : text;
}

function textLine(value: string, x: number, y: number, size = 9, bold = false, color?: string) {
  const colorCommand = color ? `${color} rg\n` : "";
  return `${colorCommand}BT /${bold ? "F2" : "F1"} ${size} Tf ${x.toFixed(1)} ${y.toFixed(1)} Td (${escapePdf(value)}) Tj ET`;
}

function centeredText(value: string, y: number, size: number, bold = false, color?: string) {
  const width = ascii(value).length * size * 0.52;
  const x = Math.max(MARGIN + LOGO_SIZE + 10, (PAGE_WIDTH - width) / 2);
  return textLine(value, x, y, size, bold, color);
}

function jpegInfo(buffer: Buffer): { width: number; height: number; colorSpace: string } {
  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = buffer[offset + 1];
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9)) {
      offset += 2;
      continue;
    }
    const length = buffer.readUInt16BE(offset + 2);
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      const height = buffer.readUInt16BE(offset + 5);
      const width = buffer.readUInt16BE(offset + 7);
      const components = buffer[offset + 9];
      const colorSpace = components === 1 ? "/DeviceGray" : components === 4 ? "/DeviceCMYK" : "/DeviceRGB";
      return { width, height, colorSpace };
    }
    offset += 2 + length;
  }
  return { width: LOGO_SIZE, height: LOGO_SIZE, colorSpace: "/DeviceRGB" };
}

function horizontalRule(y: number, color = "0.82 0.82 0.82") {
  return `${color} RG 0.6 w ${MARGIN} ${y.toFixed(1)} m ${(MARGIN + TABLE_WIDTH).toFixed(1)} ${y.toFixed(1)} l S`;
}

function renderPage(
  title: string,
  rows: string[][],
  pageIndex: number,
  pageCount: number
): string {
  const commands: string[] = [];
  const logoY = PAGE_HEIGHT - 30 - LOGO_SIZE;

  commands.push(`q ${LOGO_SIZE} 0 0 ${LOGO_SIZE} ${MARGIN} ${logoY} cm /Im1 Do Q`);
  commands.push(centeredText("DEDAN KIMATHI UNIVERSITY OF TECHNOLOGY", PAGE_HEIGHT - 38, 13, true, HEADER_GREEN));
  commands.push(centeredText("DEKUT WILDLIFE AND ENVIRONMENT CLUB", PAGE_HEIGHT - 55, 11, true, HEADER_GREEN));
  commands.push(centeredText(title, PAGE_HEIGHT - 72, 10.5, true));
  commands.push(
    centeredText(
      `${rows.length} registration${rows.length === 1 ? "" : "s"} on this page - Page ${pageIndex + 1} of ${pageCount} - Generated ${new Date().toLocaleDateString("en-GB")}`,
      PAGE_HEIGHT - 87,
      8.5
    )
  );
  commands.push(`0.05 0.30 0.18 RG 1 w ${MARGIN} ${(PAGE_HEIGHT - 98).toFixed(1)} m ${(PAGE_WIDTH - MARGIN).toFixed(1)} ${(PAGE_HEIGHT - 98).toFixed(1)} l S`);

  const headerY = PAGE_HEIGHT - 122;
  commands.push(`0.94 0.96 0.95 rg ${MARGIN} ${(headerY - 14).toFixed(1)} ${TABLE_WIDTH} 22 re f`);
  commands.push("0 0 0 rg");

  let x = MARGIN;
  COLUMNS.forEach((column) => {
    commands.push(textLine(column.header, x + 4, headerY, 9, true));
    x += column.width;
  });
  commands.push(horizontalRule(headerY - 15));

  let y = headerY - 33;
  rows.forEach((row) => {
    let cellX = MARGIN;
    row.forEach((cell, index) => {
      commands.push(textLine(fit(cell, COLUMNS[index].width), cellX + 4, y, 8.5));
      cellX += COLUMNS[index].width;
    });
    commands.push(horizontalRule(y - 7, "0.9 0.9 0.9"));
    y -= ROW_HEIGHT;
  });

  return commands.join("\n");
}

export function buildRegistrationPdf(
  eventName: string,
  registrations: Array<Record<string, any>>
): Buffer {
  const allRows: string[][] = registrations.map((registration): string[] => [
    String(registration.fullName || registration.name || "Member"),
    String(registration.registrationNumber || registration.regNo || "-"),
    String(registration.phoneNumber || registration.phone || "-"),
    String(registration.email || "-"),
    String(registration.tierLabel || registration.tierId || "-"),
    String(registration.paymentStatus || "Unknown"),
    registration.posterPhotoUrl ? "Yes" : "No",
  ]);

  const pages: string[][][] = [];
  for (let index = 0; index < allRows.length; index += ROWS_PER_PAGE) {
    pages.push(allRows.slice(index, index + ROWS_PER_PAGE));
  }
  if (pages.length === 0) pages.push([]);

  const contents = pages.map((rows, index) =>
    renderPage(`Event Applicants - ${eventName}`, rows, index, pages.length)
  );

  // Object 1: catalog, 2: pages, 3/4: fonts, 5: logo, then page + content pairs.
  const objects: (string | Buffer)[] = [];
  const pageNumbers = contents.map((_, index) => 6 + index * 2);
  const logo = jpegInfo(DEKUWEC_LOGO_JPEG);

  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[2] = `<< /Type /Pages /Kids [${pageNumbers
    .map((number) => `${number} 0 R`)
    .join(" ")}] /Count ${contents.length} >>`;
  objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";
  objects[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>";
  objects[5] = Buffer.concat([
    Buffer.from(
      `<< /Type /XObject /Subtype /Image /Width ${logo.width} /Height ${logo.height} ` +
        `/ColorSpace ${logo.colorSpace} /BitsPerComponent 8 /Filter /DCTDecode /Length ${DEKUWEC_LOGO_JPEG.length} >>\nstream\n`,
      "latin1"
    ),
    DEKUWEC_LOGO_JPEG,
    Buffer.from("\nendstream", "latin1"),
  ]);

  contents.forEach((content, index) => {
    const pageNumber = pageNumbers[index];
    const contentNumber = pageNumber + 1;
    objects[pageNumber] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] ` +
      `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> /XObject << /Im1 5 0 R >> >> /Contents ${contentNumber} 0 R >>`;
    objects[contentNumber] = `<< /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}\nendstream`;
  });

  const chunks: Buffer[] = [];
  let offset = 0;
  const push = (value: string | Buffer) => {
    const buffer = typeof value === "string" ? Buffer.from(value, "latin1") : value;
    chunks.push(buffer);
    offset += buffer.length;
  };

  push("%PDF-1.4\n");
  const offsets: number[] = [];
  for (let index = 1; index < objects.length; index += 1) {
    offsets[index] = offset;
    push(`${index} 0 obj\n`);
    push(objects[index]);
    push("\nendobj\n");
  }

  const xrefStart = offset;
  let xref = `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let index = 1; index < objects.length; index += 1) {
    xref += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }
  xref += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;
  push(xref);

  return Buffer.concat(chunks);
}
