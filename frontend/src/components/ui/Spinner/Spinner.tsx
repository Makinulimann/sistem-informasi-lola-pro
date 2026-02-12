import styles from './Spinner.module.css';

type SpinnerSize = 'sm' | 'md' | 'lg';

interface SpinnerProps {
    size?: SpinnerSize;
    className?: string;
}

export function Spinner({ size = 'md', className }: SpinnerProps) {
    const classes = [styles.spinner, styles[size], className].filter(Boolean).join(' ');
    return <span className={classes} role="status" aria-label="Loading" />;
}
