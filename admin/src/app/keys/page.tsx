"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "../route.module.css";

type AccessKey = { name: string; prefix: string; scope: string; status: string; created: string };
const seed: AccessKey[] = [
  { name: "Tích hợp ERP", prefix: "hf_live_7a2...", scope: "recognize, checkin", status: "Đang hoạt động", created: "24/09/2026" },
  { name: "Camera biên 01", prefix: "hf_cam_19f...", scope: "recognize", status: "Đang hoạt động", created: "21/09/2026" },
];

export default function KeysPage() {
  const [keys, setKeys] = useState<AccessKey[]>(seed);
  const [notice, setNotice] = useState("");
  useEffect(() => { const saved = localStorage.getItem("hera-keys"); if (saved) setKeys(JSON.parse(saved)); }, []);
  useEffect(() => { localStorage.setItem("hera-keys", JSON.stringify(keys)); }, [keys]);
  const create = () => { const key = { name: `Khóa tích hợp ${keys.length + 1}`, prefix: `hf_live_${Math.random().toString(36).slice(2, 8)}...`, scope: "recognize, checkin", status: "Đang hoạt động", created: "Hôm nay" }; setKeys((items) => [key, ...items]); setNotice("Đã tạo khóa truy cập mới."); };
  const revoke = (prefix: string) => { setKeys((items) => items.map((key) => key.prefix === prefix ? { ...key, status: "Đã thu hồi" } : key)); setNotice("Đã thu hồi khóa truy cập."); };
  return <main className={styles.page}>
    <Link className={styles.back} href="/">← Quay lại bảng điều khiển</Link>
    <span className={styles.kicker}>Quản trị API</span><h1>Khóa truy cập</h1>
    <p className={styles.intro}>Tạo, phân quyền và thu hồi khóa dùng để kết nối ERP hoặc camera với HeraFace.</p>
    {notice && <div className={styles.notice}>{notice}</div>}
    <section className={styles.card}><div className={styles.routeHeader}><div><span className={styles.kicker}>Access key</span><h2>Danh sách khóa API</h2></div><button className={styles.primary} onClick={create}>Tạo khóa +</button></div><div className={styles.keyTable}><div className={styles.keyHead}><span>Tên khóa</span><span>Phạm vi</span><span>Trạng thái</span><span>Ngày tạo</span><span></span></div>{keys.map((key) => <div className={styles.keyLine} key={key.prefix}><div><b>{key.name}</b><small>{key.prefix}</small></div><span>{key.scope}</span><span className={key.status === "Đang hoạt động" ? styles.statusBlue : styles.statusMuted}>{key.status}</span><span>{key.created}</span>{key.status === "Đang hoạt động" ? <button className={styles.primarySmall} onClick={() => revoke(key.prefix)}>Thu hồi</button> : <span />}</div>)}</div></section>
  </main>;
}
