/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Article, Journalist, Category } from './types';

export const INITIAL_JOURNALISTS: Journalist[] = [
  { id: 'j1', name: 'Budi Santoso', role: 'Reporter' },
  { id: 'j2', name: 'Siti Aminah', role: 'Redaktur' },
  { id: 'j3', name: 'Hendra Wijaya', role: 'Fotografer' },
  { id: 'j4', name: 'Ahmad Fauzi', role: 'Reporter' },
  { id: 'j5', name: 'Diana Lestari', role: 'Reporter' },
  { id: 'j6', name: 'Rian Hidayat', role: 'Magang' },
  { id: 'j7', name: 'Eko Prasetyo', role: 'Kontributor' },
  { id: 'j8', name: 'Zulian Efendi', role: 'Fotografer' },
  { id: 'j9', name: 'Admin Redaksi', role: 'Redaktur' }
];

export const INITIAL_CATEGORIES: Category[] = [
  { id: 'politik', name: 'Politik', color: 'red' },
  { id: 'ekonomi', name: 'Ekonomi', color: 'emerald' },
  { id: 'jatim', name: 'Jawa Timur', color: 'blue' },
  { id: 'kediri', name: 'Kediri Raya', color: 'purple' },
  { id: 'budaya', name: 'Budaya & Hiburan', color: 'pink' },
  { id: 'olahraga', name: 'Olahraga', color: 'orange' },
  { id: 'kriminal', name: 'Kriminal & Hukum', color: 'rose' },
  { id: 'tekno', name: 'Tekno', color: 'cyan' },
  { id: 'nasional', name: 'Nasional', color: 'slate' }
];

export const INITIAL_ARTICLES: Article[] = [
  {
    id: 'a1',
    title: 'Gebrakan Baru, Kediri Fashion Show Angkat Tenun Ikat Lokal ke Kancah Nasional',
    date: '2026-06-18',
    category: 'kediri',
    type: 'Karya Sendiri',
    reporter: 'Diana Lestari',
    writer: 'Siti Aminah',
    documenter: 'Hendra Wijaya',
    status: 'Tayang',
    views: 1240,
    url: 'https://metaranews.co/kediri-fashion-show-2026'
  },
  {
    id: 'a2',
    title: 'Pilkada Jatim 2026: Suhu Politik Mulai Memanas di Wilayah Mataraman',
    date: '2026-06-19',
    category: 'politik',
    type: 'Karya Sendiri',
    reporter: 'Budi Santoso',
    writer: 'Budi Santoso',
    documenter: 'Eko Prasetyo',
    status: 'Tayang',
    views: 3102,
    url: 'https://metaranews.co/pilkada-jatim-2026-mataraman'
  },
  {
    id: 'a3',
    title: 'Genjot Wisata Kuliner, Pemkot Kediri Siapkan Kampung Tahu Terintegrasi',
    date: '2026-06-15',
    category: 'kediri',
    type: 'Karya Sendiri',
    reporter: 'Diana Lestari',
    writer: 'Siti Aminah',
    documenter: 'Diana Lestari',
    status: 'Tayang',
    views: 840,
    url: 'https://metaranews.co/kampung-tahu-kediri-2026'
  },
  {
    id: 'a4',
    title: 'Polisi Ringkus Komplotan Curanmor yang Kerap Beraksi di Sekitar Kampus Kediri',
    date: '2026-06-17',
    category: 'kriminal',
    type: 'Karya Sendiri',
    reporter: 'Ahmad Fauzi',
    writer: 'Ahmad Fauzi',
    documenter: 'Tidak ada / Admin',
    status: 'Tayang',
    views: 2450
  },
  {
    id: 'a5',
    title: 'Rilis: BI Jatim Prediksi Inflasi Terkendali Menjelang Hari Raya Idul Adha 2026',
    date: '2026-06-16',
    category: 'ekonomi',
    type: 'Rilis',
    reporter: 'Admin Redaksi',
    writer: 'Siti Aminah',
    documenter: 'Tidak ada / Admin',
    status: 'Tayang',
    views: 650
  },
  {
    id: 'a6',
    title: 'Persik Kediri Sabet Kemenangan Perdana di Kandang Baru dengan Skor Tipis',
    date: '2026-06-10',
    category: 'olahraga',
    type: 'Karya Sendiri',
    reporter: 'Rian Hidayat',
    writer: 'Ahmad Fauzi',
    documenter: 'Zulian Efendi',
    status: 'Tayang',
    views: 4120
  },
  {
    id: 'a7',
    title: 'Seni Reog Ponorogo Pukau Ribuan Pengunjung Festival Budaya Selomangleng',
    date: '2026-06-12',
    category: 'budaya',
    type: 'Karya Sendiri',
    reporter: 'Budi Santoso',
    writer: 'Siti Aminah',
    documenter: 'Hendra Wijaya',
    status: 'Tayang',
    views: 1890
  },
  {
    id: 'a8',
    title: 'Rilis: BPBD Himbau Warga Waspadai Potensi Angin Kencang di Lereng Gunung Wilis',
    date: '2026-06-14',
    category: 'jatim',
    type: 'Rilis',
    reporter: 'Admin Redaksi',
    writer: 'Admin Redaksi',
    documenter: 'Tidak ada / Admin',
    status: 'Tayang',
    views: 520
  },
  {
    id: 'a9',
    title: 'Menelusuri Jejak Sejarah Jembatan Lama Kediri yang Berusia Lebih dari Satu Abad',
    date: '2026-05-28',
    category: 'budaya',
    type: 'Karya Sendiri',
    reporter: 'Diana Lestari',
    writer: 'Diana Lestari',
    documenter: 'Zulian Efendi',
    status: 'Tayang',
    views: 1980
  },
  {
    id: 'a10',
    title: 'Pasar Bandar Kediri Direvitalisasi, Pedagang Mulai Tempati Kios Baru Lebih Bersih',
    date: '2026-06-05',
    category: 'kediri',
    type: 'Karya Sendiri',
    reporter: 'Ahmad Fauzi',
    writer: 'Siti Aminah',
    documenter: 'Hendra Wijaya',
    status: 'Tayang',
    views: 940
  },
  {
    id: 'a11',
    title: 'Polres Kediri Kota Gencarkan Razia Balap Liar dan Knalpot Tidak Standar',
    date: '2026-06-03',
    category: 'kriminal',
    type: 'Karya Sendiri',
    reporter: 'Budi Santoso',
    writer: 'Budi Santoso',
    documenter: 'Eko Prasetyo',
    status: 'Tayang',
    views: 1430
  },
  {
    id: 'a12',
    title: 'Rilis: PLN Jatim Tambah Dukungan Pasokan Listrik Selama Ujian Nasional Menengah Pertama',
    date: '2026-06-11',
    category: 'jatim',
    type: 'Rilis',
    reporter: 'Admin Redaksi',
    writer: 'Admin Redaksi',
    documenter: 'Tidak ada / Admin',
    status: 'Tayang',
    views: 310
  },
  {
    id: 'a13',
    title: 'Mengintip Suksesnya Budidaya Melon Hidroponik Petani Millennial Kabupaten Nganjuk',
    date: '2026-05-24',
    category: 'ekonomi',
    type: 'Karya Sendiri',
    reporter: 'Eko Prasetyo',
    writer: 'Eko Prasetyo',
    documenter: 'Tidak ada / Admin',
    status: 'Tayang',
    views: 3200
  },
  {
    id: 'a14',
    title: 'DPRD Jatim Gelar Reses di Kediri Raya, Soroti Distribusi Pupuk Subsidi Petani Tebu',
    date: '2026-06-02',
    category: 'politik',
    type: 'Karya Sendiri',
    reporter: 'Budi Santoso',
    writer: 'Siti Aminah',
    documenter: 'Hendra Wijaya',
    status: 'Tayang',
    views: 1120
  },
  {
    id: 'a15',
    title: 'Kisah Inspiratif Kelompok Difabel Kediri yang Sukses Ekspor Kerajinan Bambu ke Eropa',
    date: '2026-06-08',
    category: 'ekonomi',
    type: 'Karya Sendiri',
    reporter: 'Diana Lestari',
    writer: 'Diana Lestari',
    documenter: 'Zulian Efendi',
    status: 'Tayang',
    views: 5690
  },
  {
    id: 'a16',
    title: 'Rilis: Dinas Kesehatan Gelar Imunisasi Tambahan Serentak Mulai Pekan Depan',
    date: '2026-06-06',
    category: 'jatim',
    type: 'Rilis',
    reporter: 'Admin Redaksi',
    writer: 'Siti Aminah',
    documenter: 'Tidak ada / Admin',
    status: 'Tayang',
    views: 450
  },
  {
    id: 'a17',
    title: 'Suhu Dingin Malam Hari di Jawa Timur, BMKG: Ini Puncak Musim Kemarau (Bediding)',
    date: '2026-06-20',
    category: 'nasional',
    type: 'Karya Sendiri',
    reporter: 'Rian Hidayat',
    writer: 'Rian Hidayat',
    documenter: 'Tidak ada / Admin',
    status: 'Tayang',
    views: 4890
  },
  {
    id: 'a18',
    title: 'Arak-arakan Tumpeng Hasil Bumi Meriahkan Bersih Desa Semen Kediri',
    date: '2026-05-15',
    category: 'budaya',
    type: 'Karya Sendiri',
    reporter: 'Ahmad Fauzi',
    writer: 'Siti Aminah',
    documenter: 'Hendra Wijaya',
    status: 'Tayang',
    views: 1540
  },
  {
    id: 'a19',
    title: 'Teknologi AI Mulai Diadopsi UKM Kediri untuk Otomatisasi Penjualan Online',
    date: '2026-06-19',
    category: 'tekno',
    type: 'Karya Sendiri',
    reporter: 'Diana Lestari',
    writer: 'Diana Lestari',
    documenter: 'Hendra Wijaya',
    status: 'Tayang',
    views: 1100
  },
  {
    id: 'a20',
    title: 'Rilis: Telkom Jatim Tingkatkan Keandalan Kabel Serat Optik Bawah Laut',
    date: '2026-06-07',
    category: 'tekno',
    type: 'Rilis',
    reporter: 'Admin Redaksi',
    writer: 'Eko Prasetyo',
    documenter: 'Tidak ada / Admin',
    status: 'Tayang',
    views: 420
  }
];

export const MONTHS = [
  { value: '2026-01', label: 'Januari 2026' },
  { value: '2026-02', label: 'Februari 2026' },
  { value: '2026-03', label: 'Maret 2026' },
  { value: '2026-04', label: 'April 2026' },
  { value: '2026-05', label: 'Mei 2026' },
  { value: '2026-06', label: 'Juni 2026' },
  { value: '2026-07', label: 'Juli 2026' },
  { value: '2026-08', label: 'Agustus 2026' },
  { value: '2026-09', label: 'September 2026' },
  { value: '2026-10', label: 'Oktober 2026' },
  { value: '2026-11', label: 'November 2026' },
  { value: '2026-12', label: 'Desember 2026' }
];
