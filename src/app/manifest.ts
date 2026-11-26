import type { MetadataRoute } from "next";
import { images } from "@/lib/assets";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "HEBUZA, POSIBA",
    short_name: "HEBUZA",
    description: "Business, tax & investment services online, track, pay by MoMo, get documents.",
    start_url: "/rw",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#1d2b7e",
    lang: "rw",
    icons: [
      { src: "/brand/hebuza-mark.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/brand/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
