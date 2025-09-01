
export interface Rider {
    id: number;
    name: string;
    team: string;
    bike: string;
    price: number; // Stored as a float, e.g., 6.0 for $6.00m
    priceChange: number; // Stored as an integer in thousands, e.g., 200 for +200K
    condition?: string; // e.g., 'Rider on fire'
    totalPoints: number;
    totalPodiums: number;
    last3Races: (number | string)[]; // Can be numbers or '--'
}

export interface Participant {
    id: number;
    name: string;
    teamIds: number[];
}