
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
    created_at: string;
    round_date: string | null;
}

export interface TeamSnapshot {
    id: number;
    participant_id: number;
    team_ids: number[];
    created_at: string;
}

export interface LeagueSettings {
    id: number;
    market_deadline: string | null;
}

export type RiderRoundPoints = number;
export type AllRiderPoints = Record<number, Record<number, RiderRoundPoints>>;