// FIX: Corrected typo from 'motogogp' to 'motogp'.
export type Sport = 'motogp' | 'f1';
export type View = 'home' | 'builder' | 'results' | 'rules' | 'stats';

export interface Rider {
    id: number;
    name: string;
    team: string;
    bike: string;
    price: number;
    initial_price: number;
    condition?: string | null;
    constructor_id: number;
    is_official: boolean;
}

export interface Constructor {
    id: number;
    name: string;
    price: number;
    initial_price: number;
}

export interface Participant {
    id: number;
    name:string;
}

export interface TeamSnapshot {
    id: number;
    participant_id: number;
    rider_ids: number[];
    constructor_id: number;
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

export type TeamSelection = {
    riderIds: number[];
    constructorId: number | null;
};

export type RiderRoundPoints = {
    total: number;
    main: number;
    sprint: number;
};
export type AllRiderPoints = Record<number, Record<number, RiderRoundPoints>>;