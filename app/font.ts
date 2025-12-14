// app/fonts.ts
import { Pattaya, Roboto } from "next/font/google"

export const pattaya = Pattaya({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-pattaya",
})

export const roboto = Roboto({
  subsets: ["latin"],
  weight: ["100", "300", "400", "500", "700"],
  variable: "--font-roboto",
})
