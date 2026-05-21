import { api } from './api';

export interface BusinessSettings {
  id?: number;
  businessName: string;
  email: string;
  phone: string;
  address: string;
  currency: string;
  tax: number;
}

export const businessSettingsApi = {
  get: () => api.get<BusinessSettings>('/business-settings'),
  save: (settings: BusinessSettings) => api.put<BusinessSettings>('/business-settings', settings),
};
