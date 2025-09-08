import { GoogleGenAI, Type } from "@google/genai";
import type { Rider, Round, Participant, TeamSnapshot } from '../types';

type AllRiderPoints = Record<number, Record<number, number>>;

export interface AISuggestion {
    riderId: number;
    newPrice: number;
    reasoning: string;
}

export interface AIResult {
    riderName: string;
    points: number;
}

const getTeamForRound = (participantId: number, roundDate: string | null, snapshots: TeamSnapshot[]): number[] => {
    if (!roundDate) return [];
    
    const participantSnapshots = snapshots
        .filter(s => s.participant_id === participantId && new Date(s.created_at) < new Date(roundDate))
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        
    return participantSnapshots.length > 0 ? participantSnapshots[0].team_ids : [];
};


export async function suggestRiderPriceChanges(
    riders: Rider[],
    participants: Participant[],
    teamSnapshots: TeamSnapshot[],
    roundToEvaluate: Round,
    allRiderPoints: AllRiderPoints
): Promise<AISuggestion[]> {
    // Calculate rider selection counts for the given round
    const riderSelectionCounts: Record<number, number> = {};
    participants.forEach(participant => {
        const team = getTeamForRound(participant.id, roundToEvaluate.round_date, teamSnapshots);
        team.forEach(riderId => {
            riderSelectionCounts[riderId] = (riderSelectionCounts[riderId] || 0) + 1;
        });
    });

    const roundPoints = allRiderPoints[roundToEvaluate.id] || {};

    const riderDataForAI = riders.map(rider => ({
        id: rider.id,
        name: rider.name,
        currentPrice: rider.price,
        pointsInSelectedRound: roundPoints[rider.id] || 0,
        selectionCount: riderSelectionCounts[rider.id] || 0
    }));

    const prompt = `
        You are an expert analyst for a MotoGP fantasy league. Your task is to suggest new prices for riders based on their performance and popularity in a specific round.
        The goal is to adjust prices to reflect current form and market demand.
        - Good performances should increase a rider's price. A great performance by an unpopular rider (low selection count) should result in a significant price increase.
        - Poor performances should decrease a rider's price. A poor performance by a popular rider (high selection count) should result in a significant price decrease.
        - A rider with a high selection count but mediocre points might see a small price drop or stay the same.
        - Make reasonable adjustments, typically between 5% and 20% of the current price. Avoid drastic changes unless justified by an exceptional mismatch between performance and popularity.

        Here is the data for the riders from the round "${roundToEvaluate.name}":
        Total participants in the league: ${participants.length}
        ${JSON.stringify(riderDataForAI, null, 2)}

        Analyze this data and provide a list of suggested price changes. For each suggestion, provide a brief reasoning that considers both points and popularity.
        Return your response as a JSON array of objects, where each object has "riderId", "newPrice", and "reasoning".
        Only include riders for whom you are suggesting a price change. Do not include riders whose price should remain the same.
    `;
    
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
        
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            riderId: { type: Type.INTEGER },
                            newPrice: { type: Type.INTEGER },
                            reasoning: { type: Type.STRING },
                        },
                        required: ["riderId", "newPrice", "reasoning"],
                    },
                },
            },
        });

        const jsonResponse = JSON.parse(response.text);
        return jsonResponse as AISuggestion[];

    } catch (error) {
        console.error("Error calling Gemini API:", error);
        throw new Error("Failed to get suggestions from AI.");
    }
}

export async function fetchRaceResultsFromAI(
    roundName: string,
    allRiderNames: string[],
    year: number
): Promise<AIResult[]> {
    const prompt = `
        You are an expert MotoGP data analyst. Your task is to find the official race results (not sprint race) for a specific Grand Prix and return the points awarded to each rider for the ${year} season.

        Grand Prix to search for: "${roundName}" from the ${year} MotoGP season.

        Provide the results for the main race only. The points system is: 1st=25, 2nd=20, 3rd=16, 4th=13, 5th=11, 6th=10, 7th=9, 8th=8, 9th=7, 10th=6, 11th=5, 12th=4, 13th=3, 14th=2, 15th=1. Riders outside the top 15 get 0 points.

        It is CRUCIAL that you match the rider names as closely as possible to the names in this list. If a rider from the official results is on this list, use the name from this list. If they are not on this list, you can omit them.
        List of known rider names:
        ${allRiderNames.join(', ')}

        Return your response as a JSON array of objects. Each object must have "riderName" (string, closely matching a name from the provided list) and "points" (integer).
        Only include riders who scored points (points > 0).
    `;

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
        
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            riderName: { type: Type.STRING },
                            points: { type: Type.INTEGER },
                        },
                        required: ["riderName", "points"],
                    },
                },
            },
        });

        const jsonResponse = JSON.parse(response.text);
        return jsonResponse as AIResult[];

    } catch (error) {
        console.error("Error calling Gemini API for race results:", error);
        throw new Error("Failed to get race results from AI.");
    }
}