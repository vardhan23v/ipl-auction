"use client";
import { RoomCtx as C } from "@/components/RoomContext";
import type { RoomAccess } from "@/types/auction";
export function RoomCtx({ code, access, children }: { code: string; access: RoomAccess; children: React.ReactNode }) { return <C.Provider value={{ code, access }}>{children}</C.Provider>; }
