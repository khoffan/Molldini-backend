import { Request } from "express";
import { Users, Merchant } from "../../generated/prisma/client";

export interface AuthenticatedRequest extends Request {
    user?: Users;
    merchant?: Merchant;
}