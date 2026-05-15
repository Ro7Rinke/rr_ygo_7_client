export interface User {
  id: number;
  email: string;
  nickname: string;
  is_admin: number;

  rp: number;
  cash: number;
  wins: number;
  loses: number;
  draws: number;

  createdAt: string;
}