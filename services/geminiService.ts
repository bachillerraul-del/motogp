import { GoogleGenAI, Type } from "@google/genai";
import type { Rider, Participant, TeamSnapshot } from '../types';

type AllRiderPoints = Record<number, Record<number, number>>;

export interface AIResult {
    riderName: string;
    points: number;
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