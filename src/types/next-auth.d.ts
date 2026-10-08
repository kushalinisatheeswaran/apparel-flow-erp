import { DefaultSession, DefaultUser } from "next-auth";
import { JWT as DefaultJWT } from "next-auth/jwt";
import { UserRole } from "@/lib/roles";

declare module "next-auth" {
  interface User extends DefaultUser {
    id: string;
    role: UserRole;
    fullName?: string;
  }

  interface Session {
    user: {
      id: string;
      role: UserRole;
      fullName?: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    role: UserRole;
    fullName?: string;
  }
}
