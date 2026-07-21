export interface Admin {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}
