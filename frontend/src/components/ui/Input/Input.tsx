import { type InputHTMLAttributes, type ReactNode } from 'react';
import styles from './Input.module.css';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    trailing?: ReactNode;
}

export function Input({ label, trailing, className, id, ...props }: InputProps) {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
    const classes = [styles.input, trailing ? styles.hasTrailing : '', className]
        .filter(Boolean)
        .join(' ');

    return (
        <div className={styles.wrapper}>
            {label && (
                <label htmlFor={inputId} className={styles.label}>
                    {label}
                </label>
            )}
            <div className={styles.inputContainer}>
                <input id={inputId} className={classes} {...props} />
                {trailing && <span className={styles.trailingButton}>{trailing}</span>}
            </div>
        </div>
    );
}
