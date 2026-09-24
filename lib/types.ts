export type Role = "user" | "admin";

export type Profile = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  role: Role;
  banned: boolean;
};

export type Sheet = {
  id: string;
  created_at: string;
  owner_id: string;
  author_name: string;
  title: string;
  grade: 4 | 5 | 6;
  subject: string;
  term: 1 | 2;
  exam: "midterm" | "final" | "other";
  description: string | null;
  file_path: string | null;
  link_url: string | null;
  like_count: number;
  open_count: number;
  hidden: boolean;
};

export type Report = {
  id: string;
  created_at: string;
  sheet_id: string;
  reporter_id: string;
  reason: string;
  resolved: boolean;
};

export type AdminUser = Profile & { email: string; created_at: string; sheet_count: number };
