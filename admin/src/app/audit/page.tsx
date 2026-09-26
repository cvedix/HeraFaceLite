"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "../route.module.css";

type Audit = { action: string; detail: string; user: string; time: string };
const seed: Audit[] = [
  { action: "Nhận diện khuôn mặt", detail: "NV001 · Cổng A", user: "ERP API", time: "Hôm nay, 08:42" },
  { action: "Đăng ký khuôn mặt", detail: "NV027 · 3 embedding", user: "admin@hera.local", time: "Hôm qua, 16:12" },
  { action: "Tạo khóa truy cập", detail: "Camera biên 01", user: "admin@hera.local", time: "21/09/2026" },
];

export default function AuditPage() {
  const [logs, setLogs] = useState<Audit[]>(seed);
  const [filter, setFilter] = useState("");
  useEffect(() => { const saved = localStorage.getItem("hera-logs"); if (saved) setLogs(JSON.parse(saved)); }, []);
  const filtered = logs.filter((log) => `${log.action} ${log.detail} ${log.user}`.toLowerCase().includes(filter.toLowerCase()));
  return <main className={styles.page}>
    <Link className={styles.back} href="/">← Quay lại bảng điều khiển</Link>
    <span className={styles.kicker}>Kiểm soát hoạt động</span><h1>Nhật ký kiểm toán</h1>
    <p className={styles.intro}>Theo dõi mọi thao tác quản trị, request API và sự kiện nhận diện trên thiết bị.</p>
    <section className={styles.card}><div className={styles.routeHeader}><div><span className={styles.kicker}>Audit trail</span><h2>{filtered.length} sự kiện</h2></div><button className={styles.primary} onClick={() => window.print()}>In báo cáo</button></div><input className={styles.search} placeholder="Tìm theo hành động, người dùng hoặc chi tiết..." value={filter} onChange={(event) => setFilter(event.target.value)} />{filtered.map((log, index) => <div className={styles.auditLine} key={`${log.action}-${index}`}><span className={styles.auditDot}>◷</span><div><b>{log.action}</b><small>{log.detail}</small></div><span>{log.user}</span><time>{log.time}</time></div>)}</section>
  </main>;
}
