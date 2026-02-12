'use client';

import { useFetch } from '@/hooks/useFetch';
import { Container, Card, CardHeader, CardBody, Spinner, Button } from '@/components/ui';
import type { HealthResponse } from '@/types/api';

export default function HealthPage() {
    const { status, refetch, ...rest } = useFetch<HealthResponse>('/api/health');

    return (
        <main style={{ paddingTop: 'var(--space-3xl)', paddingBottom: 'var(--space-3xl)' }}>
            <Container size="sm">
                <Card>
                    <CardHeader>
                        <h3>Health Check</h3>
                    </CardHeader>
                    <CardBody>
                        {status === 'loading' && (
                            <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-xl)' }}>
                                <Spinner size="lg" />
                            </div>
                        )}

                        {status === 'error' && 'error' in rest && (
                            <div>
                                <p style={{ color: 'var(--color-danger)', marginBottom: 'var(--space-md)' }}>
                                    Error: {rest.error}
                                </p>
                                <p style={{ color: 'var(--foreground-muted)', marginBottom: 'var(--space-lg)', fontSize: 'var(--text-sm)' }}>
                                    Make sure the backend is running on{' '}
                                    {process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5062'}
                                </p>
                                <Button variant="secondary" size="sm" onClick={refetch}>
                                    Retry
                                </Button>
                            </div>
                        )}

                        {status === 'success' && 'data' in rest && (
                            <pre
                                style={{
                                    background: 'var(--background-secondary)',
                                    padding: 'var(--space-lg)',
                                    borderRadius: 'var(--radius-md)',
                                    overflowX: 'auto',
                                    fontSize: 'var(--text-sm)',
                                    fontFamily: 'var(--font-mono)',
                                }}
                            >
                                {JSON.stringify(rest.data, null, 2)}
                            </pre>
                        )}
                    </CardBody>
                </Card>
            </Container>
        </main>
    );
}
