async function main() {
  const url = "http://localhost:3001/api/documents/a0841884-cfdf-4018-acc0-8366998942a7";
  try {
    const res = await fetch(url);
    console.log("Status:", res.status);
    const text = await res.text();
    console.log("Response (first 1000 chars):", text.slice(0, 1000));
  } catch (err) {
    console.error("Fetch error:", err.message);
  }
}

main();
