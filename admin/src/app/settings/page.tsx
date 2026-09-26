"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "../route.module.css";

export default function SettingsPage() {
  const [threshold, setThreshold] = useState("0.70");
  const [camera, setCamera] = useState("gate-01");
  const [saved, setSaved] = useState(false);
  return <main className={styles.page}>
    <Link className={styles.back} href="/">← Quay lại bảng điều khiển</Link>
    <span className={styles.kicker}>Chính sách nhận diện</span>
    <h1>Cài đặt thiết bị</h1>
    <p className={styles.intro}>Cấu hình hành vi thiết bị trước khi áp dụng chính sách cho runtime nhận diện.</p>
    <div className={styles.grid}>
      <section className={styles.card}><label className={styles.setting}>Ngưỡng tương đồng<input type="range" min="0.5" max="0.95" step="0.01" value={threshold} onChange={(event) => setThreshold(event.target.value)} /><b>{threshold}</b></label><label className={styles.setting}>Mã camera mặc định<input value={camera} onChange={(event) => setCamera(event.target.value)} /></label><label className={styles.check}><input type="checkbox" defaultChecked /> Bật model nhận diện khẩu trang</label><label className={styles.check}><input type="checkbox" defaultChecked /> Lưu sự kiện vào ra</label><button className={styles.primary} onClick={() => setSaved(true)}>Lưu cài đặt</button>{saved && <p className={styles.saved}>Đã lưu cài đặt cho thiết bị 01.</p>}</section>
      <section className={styles.card}><span className={styles.kicker}>Runtime</span><h2>Thông tin thiết bị</h2><div className={styles.apiRow}><span>Node</span><b>HeraFace node 01</b></div><div className={styles.apiRow}><span>Model</span><b>SeetaFace6</b></div><div className={styles.apiRow}><span>Cơ sở dữ liệu</span><b>42 embeddings</b></div><div className={styles.apiRow}><span>Thời gian hoạt động</span><b>3 ngày, 4 giờ</b></div></section>
    </div>
  </main>;
}
