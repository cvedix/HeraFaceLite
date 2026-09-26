import styles from "./page.module.css";

export default function DailyBars({ daily }: { daily: Record<string, number> }) {
  const entries = Object.entries(daily).sort(([left], [right]) => left.localeCompare(right)).slice(-14);
  if (entries.length === 0) return <div className={styles.chartEmpty}>Chưa có request theo ngày.</div>;
  const max = Math.max(...entries.map(([, count]) => count), 1);
  return <div className={styles.dailyChart} aria-label="Biểu đồ request theo ngày">{entries.map(([day, count]) => <div className={styles.barColumn} key={day}><span className={styles.barValue}>{count}</span><div className={styles.barTrack}><i style={{ height: `${Math.max((count / max) * 100, 4)}%` }} /></div><small>{day.slice(5)}</small></div>)}</div>;
}
