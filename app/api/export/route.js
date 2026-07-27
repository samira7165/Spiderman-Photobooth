import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import ExcelJS from "exceljs";

// =============================================================
// GET /api/export
// =============================================================
// Downloads all photo records as an Excel (.xlsx) file.
// Columns: Code, Name, Phone, Hall, Template, Status, API Used,
//          Image URL, Created At
// =============================================================

export async function GET() {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const records = await prisma.photoRequest.findMany({
      orderBy: { createdAt: "desc" },
    });

    // Create workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Spiderman Photobooth";
    workbook.created = new Date();

    const sheet = workbook.addWorksheet("Photo Records");

    // Define columns
    sheet.columns = [
      { header: "Code", key: "code", width: 15 },
      { header: "Name", key: "name", width: 25 },
      { header: "Phone", key: "phone", width: 18 },
      { header: "Hall", key: "hall", width: 8 },
      { header: "Template", key: "templateId", width: 10 },
      { header: "Status", key: "status", width: 12 },
      { header: "API Used", key: "usedApi", width: 10 },
      { header: "Image URL", key: "imageUrl", width: 50 },
      { header: "QR Code URL", key: "qrCodeUrl", width: 50 },
      { header: "Created At", key: "createdAt", width: 22 },
    ];

    // Style header row
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF2563EB" },
    };
    sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };

    // Add data
    for (const record of records) {
      sheet.addRow({
        code: record.code || "—",
        name: record.name,
        phone: record.phone,
        hall: record.hall,
        templateId: record.templateId,
        status: record.status,
        usedApi: record.usedApi || "—",
        imageUrl: record.imageUrl || "—",
        qrCodeUrl: record.qrCodeUrl || "—",
        createdAt: record.createdAt.toISOString(),
      });
    }

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Return as downloadable file
    return new NextResponse(buffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="photobooth-records-${Date.now()}.xlsx"`,
      },
    });
  } catch (err) {
    console.error("[/api/export] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
