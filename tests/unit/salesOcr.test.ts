import { describe, it, expect, vi, afterEach } from "vitest";
import { extractSalesDocument } from "@/lib/salesOcr";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function modelResponse(content: string): Response {
  return jsonResponse(200, {
    choices: [{ message: { content } }],
  });
}

function mockExtraction(content: string) {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(modelResponse(content)));
}

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.OCR_API_KEY;
  delete process.env.OCR_MODEL;
  delete process.env.OCR_FALLBACK_MODEL;
  delete process.env.OCR_BASE_URL;
});

describe("extractSalesDocument", () => {
  it("normalizes a quotation with cgst_sgst tax and inch dimensions", async () => {
    process.env.OCR_API_KEY = "test-key";
    mockExtraction(
      JSON.stringify({
        customer_name: "Acme Interiors",
        customer_gst: "24ABCDE1234F1Z5",
        customer_address: "Surat",
        customer_contact_person: "Rahul",
        customer_contact_number: "9876543210",
        customer_email: "acme@example.com",
        doc_number: "QTN-24-25-0001",
        doc_date: "2025-04-01",
        tax_type: "cgst_sgst",
        tax_rate_percent: 18,
        items: [
          {
            description: "5mm clear glass",
            hsn_code: "7005",
            actual_length_in: 24,
            actual_width_in: 36,
            nos: 2,
            unit: "sq.ft",
            rate: 120,
            amount: 1440,
          },
        ],
      })
    );

    const result = await extractSalesDocument("aGVsbG8=", "application/pdf");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.customer_name).toBe("Acme Interiors");
    expect(result.data.doc_number).toBe("QTN-24-25-0001");
    expect(result.data.doc_date).toBe("2025-04-01");
    expect(result.data.tax_type).toBe("cgst_sgst");
    expect(result.data.tax_rate_percent).toBe(18);
    expect(result.data.items).toEqual([
      {
        description: "5mm clear glass",
        hsn_code: "7005",
        actual_length_in: 24,
        actual_width_in: 36,
        nos: 2,
        unit: "sq.ft",
        rate: 120,
        amount: 1440,
      },
    ]);
  });

  it("normalizes an order with no tax, DD/MM/YYYY date, and nos unit", async () => {
    process.env.OCR_API_KEY = "test-key";
    mockExtraction(
      JSON.stringify({
        customer_name: "Walk-in Customer",
        customer_gst: "",
        customer_address: "",
        customer_contact_person: "",
        customer_contact_number: "",
        customer_email: "",
        doc_number: "ORD-24-25-0099",
        doc_date: "15/03/2025",
        tax_type: "none",
        tax_rate_percent: 0,
        items: [
          {
            description: "Mirror",
            hsn_code: "7009",
            actual_length_in: 0,
            actual_width_in: 0,
            nos: 3,
            unit: "nos",
            rate: 500,
            amount: 1500,
          },
        ],
      })
    );

    const result = await extractSalesDocument("aGVsbG8=", "application/pdf");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.doc_date).toBe("2025-03-15");
    expect(result.data.tax_type).toBe("none");
    expect(result.data.tax_rate_percent).toBe(0);
    expect(result.data.items[0].unit).toBe("nos");
    expect(result.data.items[0].nos).toBe(3);
  });

  it("parses markdown-fenced JSON from an IGST performa invoice", async () => {
    process.env.OCR_API_KEY = "test-key";
    mockExtraction(
      "```json\n" +
        JSON.stringify({
          customer_name: "Builder Co",
          doc_number: "PFI-24-25-0010",
          doc_date: "2025-05-10",
          tax_type: "igst",
          tax_rate_percent: 18,
          items: [
            {
              description: "Bevelled edge",
              hsn_code: "7005",
              actual_length_in: 24,
              actual_width_in: 24,
              nos: 4,
              unit: "rn ft",
              rate: 50,
              amount: 1600,
            },
          ],
        }) +
        "\n```"
    );

    const result = await extractSalesDocument("aGVsbG8=", "application/pdf");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.tax_type).toBe("igst");
    expect(result.data.doc_number).toBe("PFI-24-25-0010");
    expect(result.data.items[0].unit).toBe("rn ft");
    expect(result.data.items[0].nos).toBe(4);
  });

  it("accepts a document identified by number when customer name is missing", async () => {
    process.env.OCR_API_KEY = "test-key";
    mockExtraction(
      JSON.stringify({
        customer_name: "",
        doc_number: "INV-24-25-0007",
        doc_date: "",
        tax_type: "cgst_sgst",
        tax_rate_percent: 18,
        items: [
          {
            description: "Glass",
            hsn_code: "",
            actual_length_in: 0,
            actual_width_in: 0,
            nos: 1,
            unit: "sq.ft",
            rate: 0,
            amount: 0,
          },
        ],
      })
    );

    const result = await extractSalesDocument("aGVsbG8=", "application/pdf");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.customer_name).toBe("");
    expect(result.data.doc_number).toBe("INV-24-25-0007");
  });

  it("rejects a document with no line items", async () => {
    process.env.OCR_API_KEY = "test-key";
    mockExtraction(
      JSON.stringify({
        customer_name: "Some Customer",
        doc_number: "ORD-1",
        items: [],
      })
    );

    const result = await extractSalesDocument("aGVsbG8=", "application/pdf");

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toContain("No line items");
  });

  it("accepts a document with items when both customer and number are missing", async () => {
    process.env.OCR_API_KEY = "test-key";
    mockExtraction(
      JSON.stringify({
        customer_name: "",
        doc_number: "",
        items: [
          {
            description: "Glass",
            hsn_code: "",
            actual_length_in: 0,
            actual_width_in: 0,
            nos: 1,
            unit: "sq.ft",
            rate: 0,
            amount: 0,
          },
        ],
      })
    );

    const result = await extractSalesDocument("aGVsbG8=", "application/pdf");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.customer_name).toBe("");
    expect(result.data.doc_number).toBe("");
    expect(result.data.items).toHaveLength(1);
  });
});
