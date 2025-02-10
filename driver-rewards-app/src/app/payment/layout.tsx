import React from 'react';
import styles from './payment.module.css';

export default function PaymentLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className={styles.mainBackground}>
            <div className={styles.paymentHeader}>
            <h1>Payment Summary</h1>
        </div>
            <div className={styles.paymentContainer}>
                <main>{children}</main>
            </div>
        </div>
    );
}
