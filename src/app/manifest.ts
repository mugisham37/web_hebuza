import type { MetadataRoute } from "next";
import { images } from "@/lib/assets";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "HEBUZA — POSIBA",
    short_name: "HEBUZA",
    description: "Business, tax & investment services online — track, pay by MoMo, get documents.",
    start_url: "/rw",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#1d2b7e",
    lang: "rw",
    icons: [
      { src: images.brandFavicon, sizes: "1247x1248", type: "image/png", purpose: "any" },
      { src: images.brandFavicon, sizes: "1247x1248", type: "image/png", purpose: "maskable" },
    ],
  };
}
