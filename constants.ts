import type { Rider, Race } from './types';

// MotoGP Constants
export const MOTOGP_TEAM_SIZE = 5;
export const MOTOGP_BUDGET = 1150;
export const MOTOGP_MAIN_RACE_POINTS = [25, 20, 16, 13, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
export const MOTOGP_SPRINT_RACE_POINTS = [12, 9, 7, 6, 5, 4, 3, 2, 1];


export const MOTOGP_RIDERS: Rider[] = [
    { id: 1, name: 'Marc Marquez', team: 'Ducati Lenovo Team', bike: 'Ducati', price: 600, initial_price: 600 },
    { id: 2, name: 'Jorge Martin', team: 'Aprilia Racing', bike: 'Aprilia', price: 260, initial_price: 260 },
    { id: 3, name: 'Pedro Acosta', team: 'Red Bull KTM Factory Racing', bike: 'KTM', price: 310, initial_price: 310 },
    { id: 4, name: 'Marco Bezzecchi', team: 'Aprilia Racing', bike: 'Aprilia', price: 390, initial_price: 390 },
    { id: 5, name: 'Luca Marini', team: 'Honda HRC Castrol', bike: 'Honda', price: 190, initial_price: 190 },
    { id: 6, name: 'Ai Ogura', team: 'Trackhouse MotoGP Team', bike: 'Aprilia', price: 170, initial_price: 170 },
    { id: 7, name: 'Franco Morbidelli', team: 'Pertamina Enduro VR46 MotoGP Team', bike: 'Ducati', price: 210, initial_price: 210 },
    { id: 8, name: 'Fabio Di giannantonio', team: 'Pertamina Enduro VR46 MotoGP Team', bike: 'Ducati', price: 200, initial_price: 200 },
    { id: 9, name: 'Brad Binder', team: 'Red Bull KTM Factory Racing', bike: 'KTM', price: 250, initial_price: 250 },
    { id: 10, name: 'Miguel Oliveira', team: 'Prima Pramac Yamaha', bike: 'Yamaha', price: 100, initial_price: 100 },
    { id: 11, name: 'Alex Rins', team: 'Monster Energy Yamaha MotoGP™', bike: 'Yamaha', price: 110, initial_price: 110 },
    { id: 12, name: 'Francesco Bagnaia', team: 'Ducati Lenovo Team', bike: 'Ducati', price: 320, initial_price: 320 },
    { id: 13, name: 'Pol Espargaró', team: 'Red Bull KTM Factory Racing', bike: 'KTM', price: 160, initial_price: 160 },
    { id: 14, name: 'Fabio Quartararo', team: 'Monster Energy Yamaha MotoGP™', bike: 'Yamaha', price: 190, initial_price: 190 },
    { id: 15, name: 'Fermin Aldeguer', team: 'Gresini Racing MotoGP™', bike: 'Ducati', price: 240, initial_price: 240 },
    { id: 16, name: 'Enea Bastianini', team: 'Red Bull KTM Tech 3', bike: 'KTM', price: 190, initial_price: 190 },
    { id: 17, name: 'Joan Mir', team: 'Honda HRC Castrol', bike: 'Honda', price: 110, initial_price: 110 },
    { id: 18, name: 'Alex Marquez', team: 'Gresini Racing MotoGP™', bike: 'Ducati', price: 290, initial_price: 290 },
    { id: 19, name: 'Jack Miller', team: 'Prima Pramac Yamaha', bike: 'Yamaha', price: 100, initial_price: 100 },
    { id: 20, name: 'Augusto Fernandez', team: 'Prima Pramac Yamaha', bike: 'Yamaha', price: 110, initial_price: 110, condition: 'Rider is unavailable' },
    { id: 21, name: 'Somkiat Chantra', team: 'LCR Honda', bike: 'Honda', price: 100, initial_price: 100, condition: 'Rider is injured' },
    { id: 22, name: 'Raul Fernandez', team: 'Trackhouse MotoGP Team', bike: 'Aprilia', price: 180, initial_price: 180 },
    { id: 23, name: 'Maverick Viñales', team: 'Red Bull KTM Tech 3', bike: 'KTM', price: 160, initial_price: 160, condition: 'Rider is injured' },
    { id: 24, name: 'Lorenzo Savadori', team: 'Aprilia Racing', bike: 'Aprilia', price: 100, initial_price: 100, condition: 'Rider is unavailable' },
    { id: 25, name: 'Johann Zarco', team: 'LCR Honda', bike: 'Honda', price: 110, initial_price: 110 },
    { id: 26, name: 'Taka Nakagami', team: 'Honda HRC Castrol', bike: 'Honda', price: 130, initial_price: 130, condition: 'Rider is unavailable' },
    { id: 27, name: 'Aleix Espargaró', team: 'Honda HRC Castrol', bike: 'Honda', price: 130, initial_price: 130, condition: 'Rider is unavailable' }
];

// F1 Constants
export const F1_TEAM_SIZE = 5;
export const F1_BUDGET = 659; // Represents $65.9M
export const F1_MAIN_RACE_POINTS = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];
export const F1_SPRINT_RACE_POINTS = [8, 7, 6, 5, 4, 3, 2, 1];

export const F1_DRIVERS: Rider[] = [
    // Prices are * 10, e.g. 220 = $22.0M
    { id: 101, name: 'Max Verstappen', team: 'Red Bull Racing', bike: 'Honda RBPT', price: 220, initial_price: 220 },
    { id: 102, name: 'Yuki Tsunoda', team: 'Red Bull Racing', bike: 'Honda RBPT', price: 80, initial_price: 80 },
    { id: 103, name: 'George Russell', team: 'Mercedes', bike: 'Mercedes', price: 205, initial_price: 205 },
    { id: 104, name: 'Andrea Kimi Antonelli', team: 'Mercedes', bike: 'Mercedes', price: 85, initial_price: 85 },
    { id: 105, name: 'Charles Leclerc', team: 'Ferrari', bike: 'Ferrari', price: 205, initial_price: 205 },
    { id: 106, name: 'Lewis Hamilton', team: 'Ferrari', bike: 'Ferrari', price: 160, initial_price: 160 },
    { id: 107, name: 'Pierre Gasly', team: 'Alpine', bike: 'Renault', price: 95, initial_price: 95 },
    { id: 108, name: 'Franco Colapinto', team: 'Alpine', bike: 'Renault', price: 60, initial_price: 60 },
    { id: 109, name: 'Lando Norris', team: 'McLaren', bike: 'Mercedes', price: 220, initial_price: 220 },
    { id: 110, name: 'Oscar Piastri', team: 'McLaren', bike: 'Mercedes', price: 240, initial_price: 240 },
    { id: 111, name: 'Fernando Alonso', team: 'Aston Martin', bike: 'Mercedes', price: 115, initial_price: 115 },
    { id: 112, name: 'Lance Stroll', team: 'Aston Martin', bike: 'Mercedes', price: 100, initial_price: 100 },
    { id: 113, name: 'Nico Hülkenberg', team: 'Kick Sauber', bike: 'Ferrari', price: 120, initial_price: 120 },
    { id: 114, name: 'Gabriel Bortoleto', team: 'Kick Sauber', bike: 'Ferrari', price: 90, initial_price: 90 },
    { id: 115, name: 'Liam Lawson', team: 'Visa Cash App RB', bike: 'Honda RBPT', price: 60, initial_price: 60 },
    { id: 116, name: 'Isack Hadjar', team: 'Visa Cash App RB', bike: 'Honda RBPT', price: 90, initial_price: 90 },
    { id: 117, name: 'Carlos Sainz', team: 'Williams', bike: 'Mercedes', price: 80, initial_price: 80 },
    { id: 118, name: 'Alexander Albon', team: 'Williams', bike: 'Mercedes', price: 115, initial_price: 115 },
    { id: 119, name: 'Oliver Bearman', team: 'Haas F1 Team', bike: 'Ferrari', price: 100, initial_price: 100 },
    { id: 120, name: 'Esteban Ocon', team: 'Haas F1 Team', bike: 'Ferrari', price: 105, initial_price: 105 },
];

// Omit 'id' and 'prices_adjusted' for seeding
type RaceSeed = Omit<Race, 'id' | 'prices_adjusted'>;

export const F1_RACES: RaceSeed[] = [
  { round: 1, gp_name: 'Bahrain Grand Prix', location: 'Sakhir', race_date: '2025-03-02T15:00:00Z' },
  { round: 2, gp_name: 'Saudi Arabian Grand Prix', location: 'Jeddah', race_date: '2025-03-09T17:00:00Z' },
  { round: 3, gp_name: 'Australian Grand Prix', location: 'Melbourne', race_date: '2025-03-23T04:00:00Z' },
  { round: 4, gp_name: 'Japanese Grand Prix', location: 'Suzuka', race_date: '2025-04-06T05:00:00Z' },
  { round: 5, gp_name: 'Chinese Grand Prix', location: 'Shanghai', race_date: '2025-04-20T07:00:00Z' },
  { round: 6, gp_name: 'Miami Grand Prix', location: 'Miami', race_date: '2025-05-04T19:30:00Z' },
  { round: 7, gp_name: 'Emilia Romagna Grand Prix', location: 'Imola', race_date: '2025-05-18T13:00:00Z' },
  { round: 8, gp_name: 'Monaco Grand Prix', location: 'Monaco', race_date: '2025-05-25T13:00:00Z' },
  { round: 9, gp_name: 'Spanish Grand Prix', location: 'Barcelona', race_date: '2025-06-01T13:00:00Z' },
  { round: 10, gp_name: 'Canadian Grand Prix', location: 'Montreal', race_date: '2025-06-15T18:00:00Z' },
  { round: 11, gp_name: 'Austrian Grand Prix', location: 'Spielberg', race_date: '2025-06-29T13:00:00Z' },
  { round: 12, gp_name: 'British Grand Prix', location: 'Silverstone', race_date: '2025-07-06T14:00:00Z' },
  { round: 13, gp_name: 'Belgian Grand Prix', location: 'Spa-Francorchamps', race_date: '2025-07-27T13:00:00Z' },
  { round: 14, gp_name: 'Hungarian Grand Prix', location: 'Budapest', race_date: '2025-08-03T13:00:00Z' },
  { round: 15, gp_name: 'Dutch Grand Prix', location: 'Zandvoort', race_date: '2025-08-31T13:00:00Z' },
  { round: 16, gp_name: 'Italian Grand Prix', location: 'Monza', race_date: '2025-09-07T13:00:00Z' },
  { round: 17, gp_name: 'Azerbaijan Grand Prix', location: 'Baku City Circuit', race_date: '2025-09-21T09:00:00Z' },
  { round: 18, gp_name: 'Singapore Grand Prix', location: 'Marina Bay', race_date: '2025-10-05T06:00:00Z' },
  { round: 19, gp_name: 'United States Grand Prix', location: 'Las Américas', race_date: '2025-10-20T02:00:00Z' },
  { round: 20, gp_name: 'Mexico City Grand Prix', location: 'Hermanos Rodríguez', race_date: '2025-10-27T02:00:00Z' },
  { round: 21, gp_name: 'São Paulo Grand Prix', location: 'Interlagos', race_date: '2025-11-09T21:00:00Z' },
  { round: 22, gp_name: 'Las Vegas Grand Prix', location: 'Las Vegas', race_date: '2025-11-23T13:00:00Z' },
  { round: 23, gp_name: 'Qatar Grand Prix', location: 'Losail', race_date: '2025-11-30T14:00:00Z' },
  { round: 24, gp_name: 'Abu Dhabi Grand Prix', location: 'Yas Marina', race_date: '2025-12-07T10:00:00Z' },
];