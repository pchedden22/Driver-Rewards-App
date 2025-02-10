import styles from './login.module.css';
import "@/app/globals.css";

export default function LoginLayout({
    children,
  }: Readonly<{
    children: React.ReactNode;
  }>) {
    return (
      <div className={styles.authpage}>
          {children}
      </div>
    );
  }