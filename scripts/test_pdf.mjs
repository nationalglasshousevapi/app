import fs from "fs";

async function main() {
  const url = "http://localhost:3001/api/documents/a0841884-cfdf-4018-acc0-8366998942a7/pdf";
  try {
    const res = await fetch(url);
    console.log("Status:", res.status);
    console.log("Headers:", Object.fromEntries(res.headers.entries()));
    if (res.status === 200) {
      const buffer = await res.arrayBuffer();
      fs.writeFileSync("test_output.pdf", Buffer.from(buffer));
      console.log("Saved PDF to test_output.pdf, size:", buffer.byteLength);
    } else {
      const text = await res.text();
      console.log("Response text:", text);
    }
  } catch (err) {
    console.error("Fetch error:", err.message);
  }
}

main();
