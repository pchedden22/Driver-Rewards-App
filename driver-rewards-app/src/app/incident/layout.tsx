import styles from './incident.module.css';

export default function IncidentLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1>Incident Report</h1>
                <p>View incident details for drivers.</p>
            </header>

            

            {children}
        </div>
    );
}
