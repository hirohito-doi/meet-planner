import { createHash, randomBytes } from "node:crypto";

/** 推測できないランダムなトークン(32バイト、URL に入れられる43文字) */
export const newToken = () => randomBytes(32).toString("base64url");

/** DB にはトークンそのものではなく、このハッシュ値を保存する (ADR 0001) */
export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

/** 日程調整や候補の ID */
export const newId = () => randomBytes(12).toString("base64url");
