export interface ReportDraftData {
    startDate: string;
    endDate: string;
    rkoYear: number;
    updateDate: string;
    tableADateLabel: string;
    hasGenerated: boolean;
    rkoTable: any[];
    productBlocks: any[];
    catatanTambahanBullets: string[];
    isPabrikProgressActive: boolean;
    pabrikPlanBlocks: any[];
}

export interface ReportVersionDraft {
    id: string;
    name: string;
    isNamed: boolean;
    createdAt: string; // ISO string
    createdBy: string;
    data: ReportDraftData;
}

const DRAFT_VERSIONS_KEY = 'sipp_template_laporan_version_drafts_v1';
const ACTIVE_VERSION_ID_KEY = 'sipp_template_laporan_active_version_id_v1';

export const reportDraftService = {
    /** Get all saved draft versions from localStorage synchronously */
    getVersions: (): ReportVersionDraft[] => {
        if (typeof window === 'undefined') return [];
        try {
            const raw = localStorage.getItem(DRAFT_VERSIONS_KEY);
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            console.error('Failed to parse report draft versions from localStorage:', e);
            return [];
        }
    },

    /** Fetch draft versions from DB (Supabase API) and sync with localStorage */
    fetchVersionsFromDB: async (): Promise<{ versions: ReportVersionDraft[]; activeVersionId: string | null }> => {
        try {
            const res = await fetch('/api/reports/draft-versions', { cache: 'no-store' });
            if (res.ok) {
                const data = await res.json();
                const versions: ReportVersionDraft[] = Array.isArray(data.versions) ? data.versions : [];
                const activeVersionId: string | null = data.activeVersionId || null;

                if (typeof window !== 'undefined') {
                    localStorage.setItem(DRAFT_VERSIONS_KEY, JSON.stringify(versions));
                    if (activeVersionId) {
                        localStorage.setItem(ACTIVE_VERSION_ID_KEY, activeVersionId);
                    }
                }
                return { versions, activeVersionId };
            }
        } catch (err) {
            console.error('Failed to fetch draft versions from DB API:', err);
        }
        return { versions: reportDraftService.getVersions(), activeVersionId: reportDraftService.getActiveVersionId() };
    },

    /** Sync versions to DB (Supabase API) */
    syncVersionsToDB: async (versions: ReportVersionDraft[], activeVersionId: string | null) => {
        try {
            const res = await fetch('/api/reports/draft-versions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ versions, activeVersionId }),
            });
            if (!res.ok) {
                console.error('syncVersionsToDB failed with status:', res.status);
            }
        } catch (err) {
            console.error('Failed to sync report draft versions to DB:', err);
        }
    },

    /** Save a new version draft */
    saveVersion: async (data: ReportDraftData, createdBy: string = 'User', customName?: string): Promise<ReportVersionDraft> => {
        const versions = reportDraftService.getVersions();
        const now = new Date();

        // Default name formatted like Google Docs: e.g. "10 Agustus, 11.15"
        const dateStr = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long' });
        const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace(':', '.');
        const defaultName = `${dateStr}, ${timeStr}`;

        const isNamed = !!(customName && customName.trim());
        const newVersion: ReportVersionDraft = {
            id: `draft_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            name: isNamed ? customName!.trim() : defaultName,
            isNamed,
            createdAt: now.toISOString(),
            createdBy: createdBy || 'User',
            data: JSON.parse(JSON.stringify(data)),
        };

        // Add to beginning of array (newest first)
        const updatedVersions = [newVersion, ...versions];
        try {
            localStorage.setItem(DRAFT_VERSIONS_KEY, JSON.stringify(updatedVersions));
            localStorage.setItem(ACTIVE_VERSION_ID_KEY, newVersion.id);
        } catch (e) {
            console.error('Failed to save report draft version to localStorage:', e);
        }

        // Sync to DB
        await reportDraftService.syncVersionsToDB(updatedVersions, newVersion.id);

        return newVersion;
    },

    /** Rename an existing version draft */
    renameVersion: async (id: string, newName: string): Promise<boolean> => {
        const versions = reportDraftService.getVersions();
        const idx = versions.findIndex(v => v.id === id);
        if (idx === -1) return false;

        const trimmed = newName.trim();
        versions[idx].name = trimmed || versions[idx].name;
        versions[idx].isNamed = !!trimmed;

        const activeId = reportDraftService.getActiveVersionId();

        try {
            localStorage.setItem(DRAFT_VERSIONS_KEY, JSON.stringify(versions));
        } catch (e) {
            console.error('Failed to rename report draft version:', e);
            return false;
        }

        // Sync to DB
        await reportDraftService.syncVersionsToDB(versions, activeId);

        return true;
    },

    /** Delete a draft version */
    deleteVersion: async (id: string): Promise<boolean> => {
        const versions = reportDraftService.getVersions();
        const filtered = versions.filter(v => v.id !== id);

        let activeId = localStorage.getItem(ACTIVE_VERSION_ID_KEY);

        try {
            localStorage.setItem(DRAFT_VERSIONS_KEY, JSON.stringify(filtered));

            // Clear active ID if it was deleted
            if (activeId === id) {
                if (filtered.length > 0) {
                    activeId = filtered[0].id;
                    localStorage.setItem(ACTIVE_VERSION_ID_KEY, activeId);
                } else {
                    activeId = null;
                    localStorage.removeItem(ACTIVE_VERSION_ID_KEY);
                }
            }
        } catch (e) {
            console.error('Failed to delete report draft version:', e);
            return false;
        }

        // Sync to DB
        await reportDraftService.syncVersionsToDB(filtered, activeId);

        return true;
    },

    /** Get active version ID */
    getActiveVersionId: (): string | null => {
        if (typeof window === 'undefined') return null;
        return localStorage.getItem(ACTIVE_VERSION_ID_KEY);
    },

    /** Set active version ID */
    setActiveVersionId: async (id: string | null) => {
        if (typeof window === 'undefined') return;
        if (id) {
            localStorage.setItem(ACTIVE_VERSION_ID_KEY, id);
        } else {
            localStorage.removeItem(ACTIVE_VERSION_ID_KEY);
        }
        await reportDraftService.syncVersionsToDB(reportDraftService.getVersions(), id);
    }
};
