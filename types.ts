export type Sport = 'motogp' | 'f1';

export interface Rider {
    id: number;
    name: string;
    team: string;
    bike: string;
    price: number;
    initial_price: number;
    condition?: string; // e.g., 'Rider on fire'
}

export interface Participant {
    id: number;
    name:string;
}

export interface TeamSnapshot {
    id: number;
    participant_id: number;
    team_ids: number[];
    created_at: string;
    race_id: number | null;
}

export interface Race {
    id: number;
    round: number;
    gp_name: string;
    location: string;
    race_date: string;
    prices_adjusted: boolean;
}

export type RiderRoundPoints = number;
export type AllRiderPoints = Record<number, Record<number, RiderRoundPoints>>;