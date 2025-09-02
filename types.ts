
export interface Rider {
    id: number;
    name: string;
    team: string;
    bike: string;
    price: number;
    condition?: string; // e.g., 'Rider on fire'
}

export interface Participant {
    id: number;
    name:string;
    team_ids: number[];
}

export interface Round {
    id: number;
    name: string;
    // FIX: Add created_at property to match the data fetched from the 'rounds' table in Supabase. This resolves a TypeScript error in Results.tsx.
    created_at: string;
}