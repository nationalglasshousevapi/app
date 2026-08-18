import { describe, it, expect, vi, afterEach } from "vitest";
import { whatsAppShareUrl, documentShareMessage } from "@/lib/whatsapp";
import { DEFAULT_WEBSITE_URL, publicWebsiteUrl } from "@/lib/website";

describe("whatsapp", () => {
  it("builds a share URL without phone", () => {
    const url = whatsAppShareUrl({ text: "Hello" });
    expect(url).toBe(`https://api.whatsapp.com/send?text=${encodeURIComponent("Hello")}`);
  });

  it("normalizes an Indian phone number with 91 prefix", () => {
    const url = whatsAppShareUrl({ phone: "+91 98241 10798", text: "Hi" });
    expect(url).toContain("phone=919824110798");
  });

  it("does not double-prefix a number already starting with 91", () => {
    const url = whatsAppShareUrl({ phone: "919824110798", text: "Hi" });
    expect(url).toContain("phone=919824110798");
  });

  it("documentShareMessage includes the website when provided", () => {
    const msg = documentShareMessage({
      docTypeLabel: "Invoice",
      docNumber: "INV-25-26-0001",
      customerName: "Ramesh",
      totalAmount: 1234.5,
      pdfUrl: "https://app.example/api/documents/abc/pdf",
      website: DEFAULT_WEBSITE_URL,
    });
    expect(msg).toContain("Dear Ramesh,");
    expect(msg).toContain("INV-25-26-0001");
    expect(msg).toContain("₹ 1,234.5");
    expect(msg).toContain("View PDF: https://app.example/api/documents/abc/pdf");
    expect(msg).toContain(DEFAULT_WEBSITE_URL);
    expect(msg).toContain("Thank you!");
    // website appears before the closing thank you
    expect(msg.indexOf(DEFAULT_WEBSITE_URL)).toBeLessThan(msg.indexOf("Thank you!"));
  });

  it("documentShareMessage omits the website when not provided", () => {
    const msg = documentShareMessage({
      docTypeLabel: "Quotation",
      docNumber: "QTN-25-26-0002",
      customerName: "Suresh",
      totalAmount: 500,
      pdfUrl: "https://app.example/pdf",
    });
    expect(msg).not.toContain(DEFAULT_WEBSITE_URL);
    expect(msg).toContain("Thank you!");
  });

  it("formats the total using Indian number grouping", () => {
    const msg = documentShareMessage({
      docTypeLabel: "Invoice",
      docNumber: "INV-1",
      customerName: "A",
      totalAmount: 123456.78,
      pdfUrl: "x",
    });
    expect(msg).toContain("₹ 1,23,456.78");
  });
});

describe("website URL", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns the default URL when env is not set", () => {
    expect(publicWebsiteUrl()).toBe(DEFAULT_WEBSITE_URL);
  });

  it("uses NEXT_PUBLIC_COMPANY_WEBSITE when set", () => {
    vi.stubEnv("NEXT_PUBLIC_COMPANY_WEBSITE", "https://example.com");
    expect(publicWebsiteUrl()).toBe("https://example.com");
  });
});
