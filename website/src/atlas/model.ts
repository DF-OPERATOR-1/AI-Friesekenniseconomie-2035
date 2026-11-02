export type DataStatus =
  | 'observed'
  | 'calculated'
  | 'estimated'
  | 'scenario'
  | 'unavailable'
  | 'not_responsible';
export interface Indicator<T> {
  value: T | null;
  status: DataStatus;
  source: string[];
  year: number | null;
  geography: string;
  classification: string;
  methodology: string;
}
export interface VacancyPoint {
  year: number;
  quarter: number;
  value: number | null;
  geography: string;
  source: string;
}
export interface OccupationItem {
  uri: string;
  name: string;
  importance: string;
  description: string;
  code: string;
}
export interface SpecificOccupation {
  uri: string;
  name: string;
  description: string;
  tasks: OccupationItem[];
  skills: OccupationItem[];
}
export interface OccupationProfile {
  map_exposure: number | null;
  isco_code: string;
  title: string;
  description: Indicator<string>;
  knowledge_areas: Indicator<string[]>;
  member_count: number;
  occupation_names: string[];
  brc2014: { code: string; title: string } | null;
  tasks: Indicator<string[]>;
  skills: Indicator<string[]>;
  ai_exposure: Indicator<number>;
  ai_complementarity: Indicator<number>;
  vacancies: Indicator<VacancyPoint[]>;
  education_inflow: Indicator<number>;
  retirement_outflow: Indicator<number>;
  outlook_2035: Indicator<number>;
  source_references: string[];
  data_status: DataStatus;
}
