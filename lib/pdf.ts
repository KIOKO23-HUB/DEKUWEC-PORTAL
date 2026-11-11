/**
 * Minimal dependency-free PDF writer for admin tables. It only needs the
 * standard Helvetica fonts, so it works on serverless runtimes without native
 * libraries or extra packages.
 */

const PAGE_WIDTH = 842; // A4 landscape
const PAGE_HEIGHT = 595;
const MARGIN = 36;
const ROW_HEIGHT = 20;
const ROWS_PER_PAGE = 18;

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

function textLine(value: string, x: number, y: number, size = 9, bold = false) {
  return `BT /${bold ? "F2" : "F1"} ${size} Tf ${x.toFixed(1)} ${y.toFixed(1)} Td (${escapePdf(value)}) Tj ET`;
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
  const top = PAGE_HEIGHT - 44;

  commands.push(textLine(title, MARGIN, top, 14, true));
  commands.push(
    textLine(
      `${rows.length} registration${rows.length === 1 ? "" : "s"} on this page - Page ${pageIndex + 1} of ${pageCount} - Generated ${new Date().toLocaleDateString("en-GB")}`,
      MARGIN,
      top - 18,
      9
    )
  );

  const headerY = top - 48;
  commands.push(`0.94 0.96 0.95 rg ${MARGIN} ${(headerY - 14).toFixed(1)} ${TABLE_WIDTH} 22 re f`);

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

  // Object 1: catalog, 2: pages, 3/4: fonts, then page + content pairs.
  const objects: string[] = [];
  const pageNumbers = contents.map((_, index) => 5 + index * 2);

  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[2] = `<< /Type /Pages /Kids [${pageNumbers
    .map((number) => `${number} 0 R`)
    .join(" ")}] /Count ${contents.length} >>`;
  objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";
  objects[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>";

  contents.forEach((content, index) => {
    const pageNumber = pageNumbers[index];
    const contentNumber = pageNumber + 1;
    objects[pageNumber] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] ` +
      `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentNumber} 0 R >>`;
    objects[contentNumber] = `<< /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}\nendstream`;
  });

  const chunks: Buffer[] = [];
  let offset = 0;
  const push = (value: string) => {
    const buffer = Buffer.from(value, "latin1");
    chunks.push(buffer);
    offset += buffer.length;
  };

  push("%PDF-1.4\n");
  const offsets: number[] = [];
  for (let index = 1; index < objects.length; index += 1) {
    offsets[index] = offset;
    push(`${index} 0 obj\n${objects[index]}\nendobj\n`);
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
