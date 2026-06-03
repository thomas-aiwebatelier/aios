import styles from "./GradientMenu.module.css";

export interface GradientMenuItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

export interface GradientMenuProps {
  items: GradientMenuItem[];
  className?: string;
}

export default function GradientMenu({ items, className }: GradientMenuProps) {
  return (
    <nav className={className ? `${styles.menu} ${className}` : styles.menu}>
      <ul className={styles.list}>
        {items.map((item) => (
          <li key={item.href} className={styles.item}>
            <a className={styles.link} href={item.href} aria-label={item.label}>
              <span className={styles.icon} aria-hidden="true">
                {item.icon}
              </span>
              <span className={styles.label}>{item.label}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
