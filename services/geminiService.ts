import { GoogleGenAI, Type } from "@google/genai";
import type { Rider, Participant, TeamSnapshot, Sport } from '../types';

type AllRiderPoints = Record<number, Record<number, number>>;

export interface AIResult {
    riderName: string;
    points: number;
}

export interface AIMotogpResult {
    mainRace: { position: number, riderName: string }[];
    sprintRace: { position: number, riderName: string }[];
}

export interface AIF1RacePositionsResult {
    mainRace: { position: number, riderName: string }[];
    sprintRace: { position: number, riderName: string }[];
}


export async function fetchRaceResultsFromAI(
    roundName: string,
    allRiderNames: string[],
    year: number,
    sport: Sport
): Promise<AIResult[]> {

    const sportContext = {
        motogp: {
            name: "MotoGP",
            pointsSystem: "1st=25, 2nd=20, 3rd=16, 4th=13, 5th=11, 6th=10, 7th=9, 8th=8, 9th=7, 10th=6, 11th=5, 12th=4, 13th=3, 14th=2, 15th=1. Riders outside the top 15 get 0 points."
        },
        f1: {
            name: "Formula 1",
            pointsSystem: "1st=25, 2nd=18, 3rd=15, 4th=12, 5th=10, 6th=8, 7th=6, 8th=4, 9th=2, 10th=1. Riders outside the top 10 get 0 points. Do not include points for fastest lap."
        }
    }

    const prompt = `
        You are an expert ${sportContext[sport].name} data analyst. Your task is to find the official race results (not sprint race) for a specific Grand Prix and return the points awarded to each driver/rider for the ${year} season.

        Grand Prix to search for: "${roundName}" from the ${year} ${sportContext[sport].name} season.

        Provide the results for the main race only. The points system is: ${sportContext[sport].pointsSystem}

        It is CRUCIAL that you match the driver/rider names as closely as possible to the names in this list. If a driver/rider from the official results is on this list, use the name from this list. If they are not on this list, you can omit them.
        List of known driver/rider names:
        ${allRiderNames.join(', ')}

        Return your response as a JSON array of objects. Each object must have "riderName" (string, closely matching a name from the provided list) and "points" (integer).
        Only include drivers/riders who scored points (points > 0).
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

        // FIX: Added .trim() to response.text before parsing, as recommended by Gemini API guidelines.
        const jsonResponse = JSON.parse(response.text.trim());
        return jsonResponse as AIResult[];

    } catch (error) {
        console.error("Error calling Gemini API for race results:", error);
        throw new Error("Failed to get race results from AI.");
    }
}

export async function fetchMotogpRacePositionsFromAI(
    roundName: string,
    allRiderNames: string[],
    year: number
): Promise<AIMotogpResult> {

    const prompt = `
        You are an expert MotoGP data analyst. Your task is to find the official results for both the main race (top 15) and the sprint race (top 9) for a specific Grand Prix from the ${year} MotoGP season.

        Grand Prix to search for: "${roundName}" from the ${year} season.

        It is CRUCIAL that you match the rider names as closely as possible to the names in this list. If a rider from the official results is on this list, use the name from this list. If they are not on this list, you can omit them.
        List of known rider names:
        ${allRiderNames.join(', ')}

        Return your response as a JSON object with two keys: "mainRace" and "sprintRace".
        - "mainRace" should be an array of objects for the top 15 finishers. Each object must have "position" (integer) and "riderName" (string).
        - "sprintRace" should be an array of objects for the top 9 finishers. Each object must have "position" (integer) and "riderName" (string).
        If a race (sprint or main) did not happen or results are not available, return an empty array for that key.
    `;

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        mainRace: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    position: { type: Type.INTEGER },
                                    riderName: { type: Type.STRING },
                                },
                                required: ["position", "riderName"],
                            },
                        },
                        sprintRace: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    position: { type: Type.INTEGER },
                                    riderName: { type: Type.STRING },
                                },
                                required: ["position", "riderName"],
                            },
                        },
                    },
                    required: ["mainRace", "sprintRace"],
                },
            },
        });

        const jsonResponse = JSON.parse(response.text.trim());
        return jsonResponse as AIMotogpResult;

    } catch (error) {
        console.error("Error calling Gemini API for MotoGP race positions:", error);
        throw new Error("Failed to get race positions from AI.");
    }
}

export async function fetchF1RacePositionsFromAI(
    roundName: string,
    allRiderNames: string[],
    year: number
): Promise<AIF1RacePositionsResult> {

    const prompt = `
        You are an expert Formula 1 data analyst. Your task is to find the official results for both the main race (top 10) and the sprint race (top 8) for a specific Grand Prix from the ${year} Formula 1 season.

        Grand Prix to search for: "${roundName}" from the ${year} season.

        It is CRUCIAL that you match the driver names as closely as possible to the names in this list. If a driver from the official results is on this list, use the name from this list. If they are not on this list, you can omit them.
        List of known driver names:
        ${allRiderNames.join(', ')}

        Return your response as a JSON object with two keys: "mainRace" and "sprintRace".
        - "mainRace" should be an array of objects for the top 10 finishers. Each object must have "position" (integer) and "riderName" (string).
        - "sprintRace" should be an array of objects for the top 8 finishers. Each object must have "position" (integer) and "riderName" (string).
        If a race (sprint or main) did not happen or results are not available, return an empty array for that key.
    `;

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        mainRace: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    position: { type: Type.INTEGER },
                                    riderName: { type: Type.STRING },
                                },
                                required: ["position", "riderName"],
                            },
                        },
                        sprintRace: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    position: { type: Type.INTEGER },
                                    riderName: { type: Type.STRING },
                                },
                                required: ["position", "riderName"],
                            },
                        },
                    },
                    required: ["mainRace", "sprintRace"],
                },
            },
        });

        const jsonResponse = JSON.parse(response.text.trim());
        return jsonResponse as AIF1RacePositionsResult;

    } catch (error) {
        console.error("Error calling Gemini API for F1 race positions:", error);
        throw new Error("Failed to get race positions from AI.");
    }
}


export async function getAITeamAdvice(
    team: Rider[],
    remainingBudget: number,
    availableRiders: Rider[],
    sport: Sport
): Promise<string> {
    const sportContext = {
        motogp: {
            name: "MotoGP",
            rules: "El equipo debe tener 5 pilotos y un presupuesto máximo de 1150€. Los precios son en euros."
        },
        f1: {
            name: "Fórmula 1",
            rules: "El equipo debe tener 5 pilotos y un presupuesto máximo de 65.9M$. Los precios están multiplicados por 10 (ej. 220 es 22.0M$).",
        }
    };

    const teamComposition = team.map(r => `${r.name} (Precio: ${r.price})`).join('\n');
    const availableRidersList = availableRiders.map(r => `${r.name} (Precio: ${r.price})`).join(', ');

    const prompt = `
        Eres un experto analista de la liga de fantasía de ${sportContext[sport].name}. Un usuario te pide consejo sobre su equipo.
        Reglas de la liga: ${sportContext[sport].rules}

        Equipo actual del usuario:
        ${teamComposition.length > 0 ? teamComposition : "Aún no ha seleccionado a nadie."}
        
        Presupuesto restante: ${remainingBudget}

        Pilotos disponibles para fichar: ${availableRidersList}

        Tu tarea es analizar su equipo y darle consejos estratégicos. Sé conciso y directo. Tu respuesta debe tener el siguiente formato:
        
        **Análisis del Equipo:**
        *   **Fortalezas:** (Describe 1 o 2 puntos fuertes. Por ejemplo: "Gran potencial de puntos con tus pilotos de élite" o "Buena diversificación entre equipos").
        *   **Debilidades:** (Describe 1 o 2 puntos débiles. Por ejemplo: "Demasiada dependencia de un solo equipo" o "Pilotos de gama media arriesgados").

        **Sugerencias:**
        (Ofrece 1 o 2 sugerencias de cambio CONCRETAS y ACCIONABLES. Menciona a un piloto del equipo actual y por quién podría cambiarlo de la lista de disponibles, explicando el porqué del cambio. Por ejemplo: "Considera cambiar a [Piloto A] por [Piloto B]. Esto te daría [X] de presupuesto extra para mejorar otra posición y [Piloto B] está en buena forma.").

        Sé positivo y alentador. No uses más de 150 palabras en total.
    `;

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
        
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
        });

        return response.text;

    } catch (error) {
        console.error("Error calling Gemini API for team advice:", error);
        throw new Error("Failed to get team advice from AI.");
    }
}