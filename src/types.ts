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
  coverage?: string;
}

export interface Category {
  id: string;
  name: string;
  color: string; // Tailwind tint variant, e.g., "indigo"
}

export interface Personnel {
  id: string;
  username: string;
  password?: string;
  role: 'Admin' | 'Manager' | 'Staff';
  fullName: string;
  journalistId?: string;
}

export interface QuotationItem {
  id: string;
  name: string;
  description: string;
  quantity: number;
  unit: string;
  price: number;
}

export interface Quotation {
  id: string;
  letterNumber: string;
  date: string;
  attachments: string;
  subject: string;
  recipientName: string;
  recipientTitle: string;
  recipientCompany: string;
  recipientAddress: string;
  bodyOpening: string;
  items: QuotationItem[];
  bodyClosing: string;
  signerName: string;
  signerTitle: string;
  vatPercent: number;
  showVat: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface SpjItem {
  id: string;
  description: string;
  quantity: number;
  period: string;
  price: number;
}

export interface Spj {
  id: string;
  invoiceNumber: string;
  date: string;
  recipientName: string;
  recipientAddress: string;
  items: SpjItem[];
  bankName: string;
  bankAccount: string;
  bankOwner: string;
  signerName: string;
  signerTitle: string;
  createdAt?: string;
  updatedAt?: string;
  paymentDate?: string;
  danaMasuk?: number;
  feeInsentif?: number;
  isPaid?: boolean;
}
