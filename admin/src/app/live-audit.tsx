"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from "react";
import styles from "./page.module.css";

const serviceUrl = process.env.NEXT_PUBLIC_HERAFACE_API_URL || "http://127.0.0.1:18083";
type Event = { timestamp: string; action: string; success: boolean; detail: { endpoint?: string; status?: number; latency_ms?: number } };

export default function LiveAudit() {
  const [events, setEvents] = useState<Event[]>([]);
  const [error, setError] = useState("");
  async function load() { try { const response = await fetch(`${serviceUrl}/api/v1/audit?limit=100`); if (!response.ok) throw new Error(); setEvents((await response.json()).items ?? []); setError(""); } catch { setError("Không đọc được audit log từ REST service."); } }
  useEffect(() => { load(); const timer = window.setInterval(load, 5000); return () => window.clearInterval(timer); }, []);
  return <section className={styles.card}><div className={styles.cardHead}><div><span className={styles.kicker}>Observability</span><h3>Audit log hệ thống</h3></div><button className={styles.secondary} onClick={load}>Làm mới</button></div>{error && <div className={styles.notice}>{error}</div>}{events.length === 0 ? <Empty text="Chưa có audit event." /> : <div className={styles.auditTable}><div className={styles.auditHead}><span>Thời gian</span><span>Hành động</span><span>Endpoint</span><span>Status</span><span>Latency</span></div>{events.map((event, index) => <div className={styles.auditLine} key={`${event.timestamp}-${index}`}><span>{event.timestamp}</span><b>{event.action}</b><span>{event.detail.endpoint ?? "—"}</span><strong className={event.success ? styles.statusBlue : styles.statusMuted}>{event.detail.status ?? "—"}</strong><span>{event.detail.latency_ms ?? 0} ms</span></div>)}</div>}</section>;
}
function Empty({ text }: { text: string }) { return <div className={styles.empty}>{text}</div>; }
