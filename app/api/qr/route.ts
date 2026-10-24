import QRCode from "qrcode";

export async function GET(req: Request) {
  const url = new URL(req.url).searchParams.get("url") || "";
  const svg = await QRCode.toString(url, { type: "svg", margin: 1, color: { dark: "#0b1a33", light: "#ffffff" } });
  return new Response(svg, { headers: { "Content-Type": "image/svg+xml" } });
}
