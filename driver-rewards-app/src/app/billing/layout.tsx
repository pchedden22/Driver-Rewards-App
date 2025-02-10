import styles from './billing.module.css';

export default function BillingLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className={styles.container}>

            
            {children}
            
        </div>
    );
}
