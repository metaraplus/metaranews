/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Article {
  id: string;
  title: string;
  date: string; // Format: YYYY-MM-DD
  category: string; // ID of the category (e.g., Politik, Ekonomi)
  type: 'Karya Sendiri' | 'Rilis'; // News type as requested
  reporter: string; // Liputan / Meliput (Journalist Name)
  writer: string; // Penulis (Journalist Name)
  documenter: string; // Dokumentasi (Journalist Name or "Tidak ada / Admin")
  status: 'Tayang' | 'Draft';
  views: number; // For extra dashboard monitoring flavor
  url?: string;
}

export interface Journalist {
  id: string;
  name: string;
  role: 'Reporter' | 'Redaktur' | 'Fotografer' | 'Kontributor' | 'Magang';
}

export interface Category {
  id: string;
  name: string;
  color: string; // Tailwind tint variant, e.g., "indigo"
}
