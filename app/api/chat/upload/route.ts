import { NextRequest, NextResponse } from "next/server";
import { uploadChatAttachmentToCloudinary } from "@/lib/cloudinary";
import {
  parseAdminSessionFromCookieHeader,
  verifySessionCookieValue,
} from "@/lib/adminSession";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const token = parseAdminSessionFromCookieHeader(
      request.headers.get("cookie")
    );
    const isAdmin = await verifySessionCookieValue(token);

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const clientId = String(formData.get("clientId") ?? "").trim();

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { success: false, error: "file is required" },
        { status: 400 }
      );
    }

    if (!isAdmin && !clientId) {
      return NextResponse.json(
        { success: false, error: "clientId is required" },
        { status: 400 }
      );
    }

    const uploaded = await uploadChatAttachmentToCloudinary(file);

    return NextResponse.json({
      success: true,
      url: uploaded.url,
      mimeType: uploaded.mimeType,
      fileName: uploaded.fileName,
      isImage: uploaded.isImage,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Upload failed";
    const status = msg.includes("2 MB") ? 400 : 500;
    return NextResponse.json(
      { success: false, error: msg },
      { status }
    );
  }
}
