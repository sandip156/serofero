// app/fonts.ts
import { Fraunces, Cormorant_Garamond, Marcellus, Merienda } from 'next/font/google';

export const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  axes: ['SOFT','WONK'], // enables the organic feel if supported
  weight: ['300','400','700','900'],
  display: 'swap',
});

export const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  variable: '--font-cormorant',
  weight: ['400','600','700'],
  display: 'swap',
});

export const marcellus = Marcellus({
  subsets: ['latin'],
  variable: '--font-marcellus',
  weight: '400',
  display: 'swap',
});

export const merienda = Merienda({
  subsets: ['latin'],
  variable: '--font-merienda',
  weight: ['400','700'],
  display: 'swap',
});
