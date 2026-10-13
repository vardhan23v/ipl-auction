"use client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, CartesianGrid } from "recharts";
import { ROLE_LABEL, moneyShort } from "@/lib/format";
type D = { teams: { name: string; color: string; spent: number; purse: number; bids: number; overseas: number }[]; roles: { name: string; value: number }[]; squads: Record<string, string | number>[]; prices: { name: string; price: number }[] };
const ROLE_COLORS = ["#f5b82e", "#ff2e4d", "#34d399", "#60a5fa"];
const Box = ({ title, children }: { title: string; children: React.ReactNode }) => <div className="card p-4"><h3 className="display mb-2 text-lg">{title}</h3><div className="h-64">{children}</div></div>;
const tip = { contentStyle: { background: "#141b2d", border: "1px solid #1f2a44", borderRadius: 8 } };
const fmt = (v: number) => moneyShort(v);
export function Charts({ data }: { data: D }) {
  return (
    <div className="mt-6 grid gap-4 md:grid-cols-2">
      <Box title="Franchise spending"><ResponsiveContainer><BarChart data={data.teams}><CartesianGrid stroke="#1f2a44" vertical={false} /><XAxis dataKey="name" stroke="#8b95ad" /><YAxis stroke="#8b95ad" tickFormatter={fmt} /><Tooltip {...tip} formatter={(v) => fmt(Number(v))} /><Bar dataKey="spent" radius={[6, 6, 0, 0]}>{data.teams.map((t) => <Cell key={t.name} fill={t.color} />)}</Bar></BarChart></ResponsiveContainer></Box>
      <Box title="Purse remaining"><ResponsiveContainer><BarChart data={data.teams}><CartesianGrid stroke="#1f2a44" vertical={false} /><XAxis dataKey="name" stroke="#8b95ad" /><YAxis stroke="#8b95ad" tickFormatter={fmt} /><Tooltip {...tip} formatter={(v) => fmt(Number(v))} /><Bar dataKey="purse" fill="#f5b82e" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></Box>
      <Box title="Squad composition"><ResponsiveContainer><BarChart data={data.squads}><CartesianGrid stroke="#1f2a44" vertical={false} /><XAxis dataKey="name" stroke="#8b95ad" /><YAxis stroke="#8b95ad" /><Tooltip {...tip} /><Legend />{["BATSMAN", "BOWLER", "ALL_ROUNDER", "WICKETKEEPER"].map((r, i) => <Bar key={r} dataKey={r} name={ROLE_LABEL[r]} stackId="a" fill={ROLE_COLORS[i]} />)}</BarChart></ResponsiveContainer></Box>
      <Box title="Player roles in pool"><ResponsiveContainer><PieChart><Pie data={data.roles.map((r) => ({ ...r, name: ROLE_LABEL[r.name] }))} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} label>{data.roles.map((_, i) => <Cell key={i} fill={ROLE_COLORS[i % 4]} />)}</Pie><Tooltip {...tip} /><Legend /></PieChart></ResponsiveContainer></Box>
      <Box title="Bid activity"><ResponsiveContainer><BarChart data={data.teams}><CartesianGrid stroke="#1f2a44" vertical={false} /><XAxis dataKey="name" stroke="#8b95ad" /><YAxis stroke="#8b95ad" /><Tooltip {...tip} /><Bar dataKey="bids" radius={[6, 6, 0, 0]}>{data.teams.map((t) => <Cell key={t.name} fill={t.color} />)}</Bar></BarChart></ResponsiveContainer></Box>
      <Box title="Top player prices"><ResponsiveContainer><BarChart data={data.prices} layout="vertical" margin={{ left: 40 }}><XAxis type="number" stroke="#8b95ad" tickFormatter={fmt} /><YAxis type="category" dataKey="name" width={110} stroke="#8b95ad" tick={{ fontSize: 11 }} /><Tooltip {...tip} formatter={(v) => fmt(Number(v))} /><Bar dataKey="price" fill="#f5b82e" radius={[0, 6, 6, 0]} /></BarChart></ResponsiveContainer></Box>
    </div>
  );
}
