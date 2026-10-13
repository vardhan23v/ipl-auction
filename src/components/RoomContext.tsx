"use client";
import { createContext, useContext } from "react";
import type { RoomAccess } from "@/types/auction";
export const RoomCtx = createContext<{ code: string; access: RoomAccess | null }>({ code: "", access: null });
export const useRoom = () => useContext(RoomCtx);
export const roomApi = (code: string, path: string) => `/api/rooms/${code}${path}`;
